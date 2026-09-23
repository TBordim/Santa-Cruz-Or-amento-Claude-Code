import { redirect } from "next/navigation";
import Link from "next/link";
import { sessaoAtual } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { valorTotalOrcamento } from "@/lib/orcamentos/legado";
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

export const dynamic = "force-dynamic";

type SP = { aba?: string; periodo?: string; q?: string };

const PILL_STYLE: Record<string, string> = {
  good: "bg-good-soft text-good",
  bad: "bg-bad-soft text-bad",
  neutral: "bg-secondary text-muted-foreground",
};

export default async function HistoricoPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");

  const sp = await searchParams;
  const aba = sp.aba ?? "todos";
  const periodoKey = sp.periodo ?? "todos";
  const periodo = PERIODOS.find((p) => p.key === periodoKey) ?? PERIODOS[0];
  const q = sp.q?.trim() ?? "";

  const docs = await prisma.orcamento.findMany({
    where: {
      OR: [
        { origem: "NOVO", etapa: "ENVIO_OFERTA" },
        // FINALIZADO (Retorno do Cliente) entra aqui, EXCETO enquanto estiver com a pendência
        // de Código de Produto Interno em aberto (desfecho POSITIVO sem código ainda) — esse
        // fica retido no Painel até ser resolvido. Mesmo filtro em PainelBoard.tsx.
        { origem: "NOVO", etapa: "FINALIZADO", NOT: { desfecho: "POSITIVO", OR: [{ codInterno: null }, { codInterno: "" }] } },
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
    const total = itens.reduce((s, x) => s + valorTotalOrcamento(x.precificacao as PrecificacaoTier[] | null), 0);
    return { ...d, count: itens.length, total };
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

      {filtrados.length === 0 ? (
        <div className="empty-state">Nenhum orçamento encontrado.</div>
      ) : (
        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Valor total</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Desfecho</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((d) => {
                const tiers = (d.precificacao as unknown as PrecificacaoTier[] | null) ?? [];
                const t0 = tiers[0];
                const valor = valorTotalOrcamento(d.precificacao as PrecificacaoTier[] | null);
                const info = desfechoInfo(d.desfecho);

                const linhas: DicaLinha[] = [];
                if (d.origem === "NOVO") {
                  if (t0?.custoPrimarioPct != null) linhas.push({ k: "Custo primário", v: fmtPct(t0.custoPrimarioPct) });
                  if (t0?.margemP2Pct != null) linhas.push({ k: "Margem P2", v: fmtPct(t0.margemP2Pct) });
                  if (t0?.decididoPor) linhas.push({ k: "Decidido por", v: t0.decididoPor + (t0.decididoEm ? ` · ${fmtDateTime(new Date(t0.decididoEm))}` : "") });
                  if (t0?.comentarioDiretoria) linhas.push({ k: "Comentário", v: t0.comentarioDiretoria });
                } else if (d.quantidade) {
                  linhas.push({ k: "Quantidade (folha antiga)", v: String(d.quantidade) });
                }

                return (
                  <LinhaComDica key={d.id} linhas={linhas}>
                    <TableCell className="font-medium">{d.cliente}</TableCell>
                    <TableCell className="text-muted-foreground">{d.produtoDescricao}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="border-0">{d.origem === "LEGADO" ? "Legado" : "Fluxo"}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">{d.origem === "LEGADO" ? fmtMoney(d.precoAtual ? Number(d.precoAtual) : null) : fmtMoney(valor)}</TableCell>
                    <TableCell className="text-muted-foreground">{d.origem === "LEGADO" ? (d.dataLegadoTexto || fmtDate(d.criadoEm)) : fmtDate(d.criadoEm)}</TableCell>
                    <TableCell>
                      {d.origem === "LEGADO" ? "—" : (
                        <Badge className={`border-0 ${PILL_STYLE[info.pill]}`}>{info.label}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {d.origem === "NOVO" && (
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/painel/${d.id}`}>Ver</Link>
                          </Button>
                        )}
                        {d.origem !== "LEGADO" && <ExcluirHistoricoButton id={d.id} cliente={d.cliente} />}
                      </div>
                    </TableCell>
                  </LinhaComDica>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
