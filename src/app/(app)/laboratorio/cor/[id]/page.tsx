import { notFound, redirect } from "next/navigation";
import { sessaoAtual, podeEditar } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deltaE2000 } from "@/lib/cor/deltae";
import { labToCssColor } from "@/lib/cor/lab-to-rgb";
import { NovaRodadaForm } from "./NovaRodadaForm";
import { NovaLeituraForm } from "./NovaLeituraForm";

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
};

// Lote padrão do Quick Peek — a quantidade de tinta necessária pro teste é fixa em 10g (ver
// brainstorm do usuário), então a coluna de gramas na composição é só percentual × este valor.
const LOTE_QUICKPEEK_G = 10;

const CONTEXTO_LABEL: Record<string, string> = {
  QUICKPEEK_FAIXA_1: "Quick Peek · faixa 1",
  QUICKPEEK_FAIXA_2: "Quick Peek · faixa 2",
  QUICKPEEK_FAIXA_3: "Quick Peek · faixa 3",
  QUICKPEEK_FAIXA_4: "Quick Peek · faixa 4",
  QUICKPEEK_FAIXA_5: "Quick Peek · faixa 5",
  FINAL: "Final aprovada",
  PRODUCAO: "Produção",
};

// A "bancada única" — tudo sobre UMA cor numa tela só (LAB alvo, rodadas, composições,
// leituras), em vez do card-list do painel de orçamentos. Fase 1: só registro, o ΔE2000
// mostrado aqui é informativo — não é sugestão de ajuste (isso é Fase 3).
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

  return (
    <>
      <PageHeader title={cor.codigo} description={[cor.cliente, cor.referenciaDeclarada].filter(Boolean).join(" · ") || undefined} />

      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
          {labAlvo ? (
            <span
              className="h-14 w-14 shrink-0 rounded-xl border border-border"
              style={{ background: labToCssColor(labAlvo) }}
              title="Apoio visual — não substitui a cabine de luz D50"
            />
          ) : (
            <span className="h-14 w-14 shrink-0 rounded-xl border border-dashed border-border" />
          )}
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">LAB alvo</span>
            <span className="font-mono text-sm">
              {labAlvo ? `L* ${labAlvo.l} · a* ${labAlvo.a} · b* ${labAlvo.b}` : "não registrado"}
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

      <div className="flex flex-col gap-5">
        {cor.rodadas.length === 0 && <div className="empty-state">Nenhuma rodada registrada ainda.</div>}

        {cor.rodadas.map((r) => {
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
                        <TableHead>Contexto</TableHead>
                        <TableHead>LAB</TableHead>
                        <TableHead className="text-right">ΔE2000</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {r.leituras.map((l) => {
                        const leituraLab = { l: Number(l.l), a: Number(l.a), b: Number(l.b) };
                        const de = labAlvo ? deltaE2000(labAlvo, leituraLab) : null;
                        return (
                          <TableRow key={l.id}>
                            <TableCell>{CONTEXTO_LABEL[l.contexto] ?? l.contexto}</TableCell>
                            <TableCell className="font-mono text-xs">
                              {leituraLab.l} / {leituraLab.a} / {leituraLab.b}
                            </TableCell>
                            <TableCell className="text-right font-mono">{de != null ? de.toFixed(2) : "—"}</TableCell>
                            <TableCell>{l.vencedora && <Badge variant="secondary">vencedora</Badge>}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {podeRegistrar && <NovaLeituraForm rodadaId={r.id} corId={cor.id} />}
            </div>
          );
        })}
      </div>

      {podeRegistrar && (
        <div className="mt-6">
          <NovaRodadaForm corId={cor.id} bases={bases} proximoNumero={(cor.rodadas.at(-1)?.numero ?? 0) + 1} />
        </div>
      )}
    </>
  );
}
