import { notFound, redirect } from "next/navigation";
import { sessaoAtual, podeEditar } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deltaE2000 } from "@/lib/cor/deltae";
import { labToCssColor } from "@/lib/cor/lab-to-rgb";
import { NovaRodadaForm } from "./NovaRodadaForm";
import { NovaPuxadaForm } from "./NovaPuxadaForm";
import { aprovarRodada } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  EM_DESENVOLVIMENTO: "Em desenvolvimento",
  APROVADO: "Aprovado",
  ALTERNATIVA: "Alternativa",
  AGUARDANDO_APROVACAO_CLIENTE: "Aguardando cliente",
  CANCELADO: "Cancelado",
};

const ORIGEM_LABEL: Record<string, string> = {
  FORNECEDOR: "Fornecedor",
  SUGESTAO_SISTEMA: "Sugestão do sistema",
  AJUSTE_MANUAL: "Ajuste manual",
  IMPORTADO: "Importada da planilha (só a final)",
};

// Lote padrão do Quick Peek — a quantidade de tinta necessária pro teste é fixa em 10g (ver
// brainstorm do usuário), então a coluna de gramas na composição é só percentual × este valor.
const LOTE_QUICKPEEK_G = 10;

// Tolerância de aprovação da Santa Cruz: ΔE2000 menor que 1,00.
const TOLERANCIA_DE = 1;

const CONTEXTO_LABEL: Record<string, string> = {
  PUXADA: "Puxada (Quick Peek) · melhor LAB",
  FINAL: "Final da planilha antiga",
  PRODUCAO: "Produção",
};

// A "bancada única" — tudo sobre UMA cor numa tela só. O ciclo do laboratório: fórmula → puxada
// (Quick Peek) → registra o MELHOR LAB → ajuste (manual ou por sugestão) → nova rodada… até o menor
// ΔE → aprovação. O ΔE mostrado é informativo — a sugestão automática de ajuste é Fase 3.
export default async function CorDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");

  const { id } = await params;
  const cor = await prisma.cor.findUnique({
    where: { id },
    include: {
      rodadas: {
        orderBy: { numero: "asc" },
        include: {
          composicoes: { include: { base: true }, orderBy: { percentual: "desc" } },
          leituras: { orderBy: { lidaEm: "asc" } },
        },
      },
    },
  });
  if (!cor) notFound();

  const podeRegistrar = (await podeEditar("COR_LABORATORIO")) || (await podeEditar("COR_ENGENHARIA"));
  const bases = await prisma.base.findMany({ where: { ativa: true }, orderBy: { codigo: "asc" } });

  const temLabAlvo = cor.labAlvoL != null && cor.labAlvoA != null && cor.labAlvoB != null;
  const labAlvo = temLabAlvo
    ? { l: Number(cor.labAlvoL), a: Number(cor.labAlvoA), b: Number(cor.labAlvoB) }
    : null;

  // Cor importada da planilha antiga só tem o LAB da fórmula final (o alvo nunca foi registrado):
  // usa ele pra amostra e pro texto, identificado como "final" — e sem ΔE, que exigiria um alvo.
  const leituraFinal = cor.rodadas.flatMap((r) => r.leituras).filter((l) => l.contexto === "FINAL").at(-1);
  const labFinal = leituraFinal ? { l: Number(leituraFinal.l), a: Number(leituraFinal.a), b: Number(leituraFinal.b) } : null;
  const labExibido = labAlvo ?? labFinal;

  // Resultado de cada rodada = o LAB da puxada e o ΔE dele contra o alvo.
  const resultados = cor.rodadas.map((r) => {
    const puxada = r.leituras.find((l) => l.contexto === "PUXADA");
    const lab = puxada ? { l: Number(puxada.l), a: Number(puxada.a), b: Number(puxada.b) } : null;
    const de = lab && labAlvo ? deltaE2000(labAlvo, lab) : null;
    return { rodada: r, lab, de };
  });
  const menorDe = resultados.reduce<number | null>((m, x) => (x.de != null && (m == null || x.de < m) ? x.de : m), null);
  const ultimaComposicao = cor.rodadas.at(-1)?.composicoes.map((c) => ({ baseId: c.baseId, percentual: Number(c.percentual) })) ?? [];

  return (
    <>
      <PageHeader title={cor.codigo} description={[cor.cliente, cor.referenciaDeclarada].filter(Boolean).join(" · ") || undefined} />

      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
          {labExibido ? (
            <span
              className="h-14 w-14 shrink-0 rounded-xl border border-border"
              style={{ background: labToCssColor(labExibido) }}
              title="Apoio visual — não substitui a cabine de luz D50"
            />
          ) : (
            <span className="h-14 w-14 shrink-0 rounded-xl border border-dashed border-border" />
          )}
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              {labAlvo || !labFinal ? "LAB alvo" : "LAB final (alvo não registrado)"}
            </span>
            <span className="font-mono text-sm">
              {labExibido ? `L* ${labExibido.l} · a* ${labExibido.a} · b* ${labExibido.b}` : "não registrado"}
            </span>
          </div>
        </div>
        <div className="flex flex-col justify-center gap-1 rounded-xl border border-border bg-card p-4 text-sm">
          <div>
            <span className="text-muted-foreground">Substrato:</span> {cor.substrato ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Acabamento:</span> {cor.acabamento ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Status:</span>{" "}
            <Badge variant="secondary">{STATUS_LABEL[cor.status] ?? cor.status}</Badge>
          </div>
        </div>
      </div>

      {labAlvo && resultados.some((x) => x.de != null) && (
        <div className="mb-6 rounded-xl border border-border bg-card p-4">
          <div className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Evolução do ΔE2000 por rodada (meta &lt; {TOLERANCIA_DE.toFixed(2)})
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-sm">
            {resultados.map((x, i) => (
              <span key={x.rodada.id} className="flex items-center gap-2">
                {i > 0 && <span className="text-muted-foreground">→</span>}
                <span className={x.de != null && x.de === menorDe ? "font-semibold text-good" : "text-foreground"}>
                  R{x.rodada.numero}: {x.de != null ? x.de.toFixed(2) : "—"}
                </span>
              </span>
            ))}
          </div>
          {menorDe != null && (
            <div className="mt-2 text-xs text-muted-foreground">
              Menor até agora: <span className="font-mono">{menorDe.toFixed(2)}</span>
              {menorDe < TOLERANCIA_DE ? " — dentro da tolerância." : " — ainda acima da tolerância."}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-5">
        {cor.rodadas.length === 0 && <div className="empty-state">Nenhuma rodada registrada ainda.</div>}

        {resultados.map(({ rodada: r, lab: labPuxada, de }) => {
          const totalPct = r.composicoes.reduce((s, c) => s + Number(c.percentual), 0);
          return (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="font-semibold text-foreground">Rodada {r.numero}</span>
                <Badge variant="secondary">{ORIGEM_LABEL[r.origem] ?? r.origem}</Badge>
                {r.aprovada && <Badge className="bg-good-soft text-good border-0">Aprovada</Badge>}
                <span className="ml-auto font-mono text-xs text-muted-foreground">
                  total: {totalPct.toFixed(2)}%{Math.abs(totalPct - 100) > 0.5 ? " ⚠" : ""}
                </span>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Base</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="text-right">g (lote {LOTE_QUICKPEEK_G}g)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.composicoes.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        {c.base.codigo} <span className="text-muted-foreground">— {c.base.nome}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono">{Number(c.percentual).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {((Number(c.percentual) / 100) * LOTE_QUICKPEEK_G).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {r.leituras.length > 0 && (
                <div className="mt-3">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Leitura</TableHead>
                        <TableHead>LAB</TableHead>
                        <TableHead className="text-right">ΔE2000</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {r.leituras.map((l) => {
                        const leituraLab = { l: Number(l.l), a: Number(l.a), b: Number(l.b) };
                        const deLeitura = labAlvo ? deltaE2000(labAlvo, leituraLab) : null;
                        return (
                          <TableRow key={l.id}>
                            <TableCell>{CONTEXTO_LABEL[l.contexto] ?? l.contexto}</TableCell>
                            <TableCell className="font-mono text-xs">
                              {leituraLab.l} / {leituraLab.a} / {leituraLab.b}
                            </TableCell>
                            <TableCell className="text-right font-mono">{deLeitura != null ? deLeitura.toFixed(2) : "—"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {podeRegistrar && r.origem !== "IMPORTADO" && (
                <NovaPuxadaForm rodadaId={r.id} corId={cor.id} atual={labPuxada} />
              )}

              {podeRegistrar && !r.aprovada && r.leituras.length > 0 && (
                <form action={aprovarRodada} className="mt-3 flex items-center gap-3">
                  <input type="hidden" name="rodadaId" value={r.id} />
                  <Button type="submit" variant="outline" size="sm">
                    Aprovar esta rodada
                  </Button>
                  {de != null && (
                    <span className="text-xs text-muted-foreground">
                      ΔE {de.toFixed(2)}
                      {de < TOLERANCIA_DE ? " — dentro da tolerância" : " — acima da tolerância"}
                    </span>
                  )}
                </form>
              )}
            </div>
          );
        })}
      </div>

      {podeRegistrar && (
        <div className="mt-6">
          <NovaRodadaForm
            corId={cor.id}
            bases={bases}
            proximoNumero={(cor.rodadas.at(-1)?.numero ?? 0) + 1}
            composicaoAnterior={ultimaComposicao}
          />
        </div>
      )}
    </>
  );
}
