import { redirect } from "next/navigation";
import Link from "next/link";
import { sessaoAtual, exigirModulo } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { valorOrcamento, soEscolhida } from "@/lib/orcamentos/modelos";
import { DESFECHOS, PERIODOS, fmtMoney, fmtDate, fmtDateTime, desfechoInfo, dataLimite } from "@/lib/orcamentos/constantes";
import { fmtPct } from "@/lib/orcamentos/motor";
import type { PrecificacaoTier } from "@/lib/orcamentos/types";
import { LinhaComDica, type DicaLinha } from "./LinhaComDica";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { ExcluirHistoricoButton } from "./ExcluirHistoricoButton";
import { VerLegado } from "./VerLegado";
import { medidasDoReq, temMedidasParaComparar, textoMedidas } from "@/lib/orcamentos/medidas";

export const dynamic = "force-dynamic";

type SP = { aba?: string; periodo?: string; q?: string };

// Os rótulos completos de DESFECHOS ("Aguardando retorno do cliente", "Negativo — orçamento
// perdido") são longos demais pra coluna estreita e vazavam sobre a coluna Ações. Na lista vai o
// nome curto; o completo fica no title (aparece ao passar o mouse ou manter o toque).
const DESFECHO_CURTO: Record<string, string> = {
  AGUARDANDO: "Aguardando",
  POSITIVO: "Positivo",
  NEGATIVO: "Negativo",
  SEM_RETORNO: "Sem retorno",
};

const PILL_STYLE: Record<string, string> = {
  good: "bg-good-soft text-good",
  bad: "bg-bad-soft text-bad",
  neutral: "bg-secondary text-muted-foreground",
};

export default async function HistoricoPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  await exigirModulo("orcamento");

  const sp = await searchParams;
  const aba = sp.aba ?? "todos";
  const periodoKey = sp.periodo ?? "todos";
  const periodo = PERIODOS.find((p) => p.key === periodoKey) ?? PERIODOS[0];
  const q = sp.q?.trim() ?? "";

  const docs = await prisma.orcamento.findMany({
    where: {
      OR: [
        // Etapa 7 (CADASTRO_PRODUTO) fica de fora de propósito: produto novo aprovado só entra
        // no Histórico depois de ter o Nº de Cadastro de Produto (aí volta pra FINALIZADO).
        { origem: "NOVO", etapa: { in: ["ENVIO_OFERTA", "FINALIZADO"] } },
        { origem: "LEGADO" },
      ],
      ...(periodo.dias ? { criadoEm: { gte: dataLimite(periodo.dias) } } : {}),
      ...(q ? { clienteChave: { contains: q.toUpperCase() } } : {}),
    },
    orderBy: { criadoEm: "desc" },
  });

  const filtrados = aba === "todos" ? docs : docs.filter((d) => (d.desfecho ?? "AGUARDANDO") === aba);

  const stats = DESFECHOS.map((d) => {
    const itens = docs.filter((x) => x.origem === "NOVO" && (x.desfecho ?? "AGUARDANDO") === d.key);
    const total = itens.reduce((s, x) => s + valorOrcamento(x.precificacao as PrecificacaoTier[] | null), 0);
    return { ...d, count: itens.length, total };
  });

  // Uma entrada por orçamento, já com tudo que a tabela (telas largas) e os cartões (telas menores)
  // mostram — assim os dois formatos nunca divergem.
  const itens = filtrados.map((d) => {
    const tiers = (d.precificacao as unknown as PrecificacaoTier[] | null) ?? [];
    // SO fechada pelo cliente; sem ela, a primeira (só pra dica de custo/margem).
    const t0 = soEscolhida(tiers) ?? tiers[0];
    // As SOs são alternativas: vale a fechada pelo cliente, ou a de maior valor quando
    // nenhuma foi fechada — nunca a soma (ver valorOrcamento em modelos.ts).
    const valor = valorOrcamento(tiers);
    const info = desfechoInfo(d.desfecho);

    const linhas: DicaLinha[] = [];
    if (d.origem === "NOVO") {
      if (tiers.length > 1 && soEscolhida(tiers)) linhas.push({ k: "SO fechada", v: `SO ${t0.numeroSequencial}${t0.papel ? ` · ${t0.papel}` : ""} · ${t0.quantidade}` });
      else if (tiers.length > 1) linhas.push({ k: "Valor", v: `maior entre ${tiers.length} SOs (nenhuma fechada)` });
      if (t0?.custoPrimarioPct != null) linhas.push({ k: "Custo primário", v: fmtPct(t0.custoPrimarioPct) });
      if (t0?.margemP2Pct != null) linhas.push({ k: "Margem P2", v: fmtPct(t0.margemP2Pct) });
      if (t0?.decididoPor) linhas.push({ k: "Decidido por", v: t0.decididoPor + (t0.decididoEm ? ` · ${fmtDateTime(new Date(t0.decididoEm))}` : "") });
      if (t0?.comentarioDiretoria) linhas.push({ k: "Comentário", v: t0.comentarioDiretoria });
    } else if (d.quantidade) {
      linhas.push({ k: "Quantidade (folha antiga)", v: String(d.quantidade) });
    }

    const legado = d.origem === "LEGADO";
    return {
      d,
      linhas,
      info,
      legado,
      valorTexto: legado ? fmtMoney(d.precoAtual ? Number(d.precoAtual) : null) : fmtMoney(valor),
      dataTexto: legado ? (d.dataLegadoTexto || fmtDate(d.criadoEm)) : fmtDate(d.criadoEm),
      // Registro do Arquivo legado não tem card no Painel: o "Ver" dele abre os dados lançados e a
      // foto da folha digitalizada (valores já convertidos pra número, que o componente de cliente
      // não recebe Decimal do Prisma).
      paraVer: legado
        ? {
            cliente: d.cliente,
            produtoDescricao: d.produtoDescricao,
            codInterno: d.codInterno,
            precoAtual: d.precoAtual ? Number(d.precoAtual) : null,
            quantidade: d.quantidade ? Number(d.quantidade) : null,
            custoPrimarioPct: d.custoPrimarioPct ? Number(d.custoPrimarioPct) : null,
            margemP2Pct: d.margemP2Pct ? Number(d.margemP2Pct) : null,
            data: d.dataLegadoTexto || fmtDate(d.criadoEm),
            medidas: temMedidasParaComparar(medidasDoReq(d.reqCliente)) ? textoMedidas(medidasDoReq(d.reqCliente)) : "",
            obs: d.obs,
            fotoUrl: d.fotoUrl,
            fotoMime: d.fotoMime,
          }
        : null,
    };
  });

  return (
    <>
      <PageHeader title="Histórico" description="Todos os orçamentos enviados/finalizados, com filtro de período e por desfecho." />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s, i) => (
          <Card key={s.key} className="gap-2 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <div
                className="font-mono text-2xl font-semibold tabular-nums"
                style={{ color: i === 1 ? "var(--color-good)" : i === 2 ? "var(--color-bad)" : undefined }}
              >
                {s.count}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">{fmtMoney(s.total)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Button asChild variant={aba === "todos" ? "default" : "outline"} size="sm">
          <Link href="/historico?aba=todos">Todos</Link>
        </Button>
        {DESFECHOS.map((d) => (
          <Button key={d.key} asChild variant={aba === d.key ? "default" : "outline"} size="sm">
            <Link href={`/historico?aba=${d.key}`}>{d.label}</Link>
          </Button>
        ))}
      </div>

      <form className="mb-6 flex flex-wrap gap-2">
        <input type="hidden" name="aba" value={aba} />
        <Input name="q" defaultValue={q} placeholder="Buscar por cliente…" className="w-full sm:max-w-[280px]" />
        <Select name="periodo" defaultValue={periodoKey}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODOS.map((p) => (
              <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" variant="outline" className="gap-1.5">
          <Search className="h-3.5 w-3.5" /> Filtrar
        </Button>
      </form>

      {itens.length === 0 ? (
        <div className="empty-state">Nenhum orçamento encontrado.</div>
      ) : (
        <>
          {/* Telas largas (a partir de lg): tabela de 5 colunas SEM rolagem lateral. Origem e Produto
              foram pra dentro da coluna Cliente, que quebra linha e ocupa o espaço que sobra; as
              colunas curtas têm largura fixa (table-fixed). As células "td" simples são de
              propósito: o TableCell padrão não quebra linha (nowrap), que era o que estourava a
              largura quando o produto tinha vários modelos. */}
          <div className="hidden rounded-xl border border-border lg:block">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente / Produto</TableHead>
                  <TableHead className="w-[132px]">Valor</TableHead>
                  <TableHead className="w-[124px]">Data</TableHead>
                  <TableHead className="w-[124px]">Desfecho</TableHead>
                  <TableHead className="w-[100px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map(({ d, linhas, info, legado, valorTexto, dataTexto, paraVer }) => (
                  <LinhaComDica key={d.id} linhas={linhas}>
                    <td className="p-2 align-middle">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="break-words font-medium">{d.cliente}</span>
                        <Badge variant="secondary" className="border-0 text-[10px]">{legado ? "Legado" : "Fluxo"}</Badge>
                      </div>
                      {d.produtoDescricao && <div className="break-words text-muted-foreground">{d.produtoDescricao}</div>}
                    </td>
                    <TableCell className="font-mono">{valorTexto}</TableCell>
                    {/* Data curta nunca quebra no meio ("11/06/202|6"); só o texto livre do arquivo
                        legado, que pode ser longo, pode passar pra linha de baixo. */}
                    <td className={`p-2 align-middle text-muted-foreground ${dataTexto.length <= 12 ? "whitespace-nowrap" : "break-words"}`}>{dataTexto}</td>
                    <td className="p-2 align-middle">
                      {legado ? "—" : <Badge title={info.label} className={`border-0 ${PILL_STYLE[info.pill]}`}>{DESFECHO_CURTO[info.key]}</Badge>}
                    </td>
                    <td className="p-2 align-middle">
                      <div className="flex justify-end gap-0.5">
                        {d.origem === "NOVO" && (
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/painel/${d.id}`}>Ver</Link>
                          </Button>
                        )}
                        {paraVer && <VerLegado legado={paraVer} />}
                        {!legado && <ExcluirHistoricoButton id={d.id} cliente={d.cliente} compacto />}
                      </div>
                    </td>
                  </LinhaComDica>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Telas menores e celular: um cartão por orçamento, nunca precisa de rolagem lateral. O que
              na tabela aparece ao passar o mouse (custo, margem, quem decidiu...) vira "Detalhes",
              que abre ao toque — celular não tem "passar o mouse". */}
          <div className="flex flex-col gap-2.5 lg:hidden">
            {itens.map(({ d, linhas, info, legado, valorTexto, dataTexto, paraVer }) => (
              <div key={d.id} className="rounded-xl border border-border bg-card p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="break-words text-sm font-semibold text-foreground">{d.cliente}</div>
                    {d.produtoDescricao && <div className="break-words text-sm text-muted-foreground">{d.produtoDescricao}</div>}
                  </div>
                  {!legado && <Badge title={info.label} className={`shrink-0 border-0 ${PILL_STYLE[info.pill]}`}>{DESFECHO_CURTO[info.key]}</Badge>}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="border-0 text-[10px]">{legado ? "Legado" : "Fluxo"}</Badge>
                  <span className="font-mono text-foreground">{valorTexto}</span>
                  <span>{dataTexto}</span>
                </div>
                {linhas.length > 0 && (
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer text-muted-foreground">Detalhes</summary>
                    <div className="mt-1.5 flex flex-col gap-1">
                      {linhas.map((l) => (
                        <div key={l.k} className="flex items-baseline justify-between gap-3">
                          <span className="text-muted-foreground">{l.k}</span>
                          <span className="break-words text-right font-mono font-medium text-foreground">{l.v}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
                <div className="mt-2 flex justify-end gap-1">
                  {d.origem === "NOVO" && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/painel/${d.id}`}>Ver</Link>
                    </Button>
                  )}
                  {paraVer && <VerLegado legado={paraVer} variante="outline" />}
                  {!legado && <ExcluirHistoricoButton id={d.id} cliente={d.cliente} />}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
