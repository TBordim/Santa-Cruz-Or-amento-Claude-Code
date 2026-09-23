import Link from "next/link";
import { prisma } from "@/lib/db";
import { ETAPAS, fmtMoney, desfechoInfo } from "@/lib/orcamentos/constantes";
import type { PrecificacaoTier } from "@/lib/orcamentos/types";
import { Badge } from "@/components/ui/badge";

function precoExibicao(precificacao: PrecificacaoTier[] | null): string {
  if (!precificacao || !precificacao.length) return "—";
  if (precificacao.length === 1) {
    const t = precificacao[0];
    return fmtMoney(t.precoFinal ?? t.precoFinalSugerido ?? t.precoProjetado);
  }
  return precificacao.length + " faixas";
}

const PILL_STYLE: Record<string, string> = {
  pend: "bg-warn-soft text-warn",
  good: "bg-good-soft text-good",
  bad: "bg-bad-soft text-bad",
  neutral: "bg-secondary text-muted-foreground",
};

export async function PainelBoard() {
  // Um card em FINALIZADO (Retorno do Cliente) some do kanban assim que o desfecho é
  // registrado (deixa de ser "aguardando") — continua acessível pelo Histórico. Mesma regra do
  // viewPainel() original. EXCETO desfecho POSITIVO sem Código de Produto Interno ainda: aí o
  // card fica retido aqui até a pendência ser resolvida (ver PendenciaCodigoProduto em
  // FormFinalizado.tsx e o mesmo filtro em historico/page.tsx).
  const docs = await prisma.orcamento.findMany({
    where: {
      origem: "NOVO",
      OR: [
        { NOT: { etapa: "FINALIZADO" } },
        { etapa: "FINALIZADO", desfecho: null },
        { etapa: "FINALIZADO", desfecho: "AGUARDANDO" },
        { etapa: "FINALIZADO", desfecho: "POSITIVO", OR: [{ codInterno: null }, { codInterno: "" }] },
      ],
    },
    orderBy: { atualizadoEm: "desc" },
  });

  const cols = ETAPAS.map((et) => ({ et, itens: docs.filter((d) => d.etapa === et.key) }));

  return (
    // .board/.col (globals.css) — as 6 colunas sempre cabem na tela, dividindo o espaço igual em
    // repouso; passar o mouse expande a coluna (e encolhe as outras) em vez de precisar rolar.
    <div className="board gap-3 pb-3">
      {cols.map(({ et, itens }, colIdx) => (
        <div
          key={et.key}
          style={{ "--stage-color": et.color } as React.CSSProperties}
          className="col flex flex-col gap-2.5 rounded-2xl border p-2.5"
          data-stage-bg
        >
          <style>{`[data-stage-bg]{border-color:color-mix(in srgb, var(--stage-color) 24%, var(--border));background:color-mix(in srgb, var(--stage-color) 5%, var(--secondary));}`}</style>
          <div
            className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5"
            style={{ background: "color-mix(in srgb, var(--stage-color) 16%, var(--card))" }}
          >
            <span className="truncate text-[11.5px] font-bold" style={{ color: et.color }}>
              {et.label}
            </span>
            <span
              className="flex min-w-5 shrink-0 items-center justify-center rounded-full bg-card px-2 py-0.5 font-mono text-[11px] font-semibold"
              style={{ color: et.color }}
            >
              {itens.length}
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {itens.length === 0 ? (
              <div className="rounded-lg border border-dashed border-line-strong p-4 text-center text-[11.5px] text-muted-foreground">
                Sem cards
              </div>
            ) : (
              itens.map((d, i) => {
                const tiers = d.precificacao as unknown as PrecificacaoTier[] | null;
                const pendenteCodigo = d.etapa === "FINALIZADO" && d.desfecho === "POSITIVO" && !d.codInterno;
                const pendFlag = (d.etapa === "DIRETORIA" && d.statusDiretoria === "PENDENTE") || d.aguardandoCompras || pendenteCodigo;
                let pill: { texto: string; classe: string } | null = null;
                if (d.etapa === "DIRETORIA" && d.statusDiretoria === "PENDENTE") pill = { texto: "Aguarda diretoria", classe: "pend" };
                else if (d.etapa === "ORCAMENTO" && d.aguardandoCompras) pill = { texto: "Aguarda Compras", classe: "pend" };
                else if (d.statusDiretoria === "REVISAO") pill = { texto: "Revisão solicitada", classe: "bad" };
                else if (pendenteCodigo) pill = { texto: "Gerar código de produto", classe: "pend" };
                else if (d.etapa === "FINALIZADO" && d.desfecho) {
                  const info = desfechoInfo(d.desfecho);
                  pill = { texto: info.label.split(" —")[0].split(" (")[0], classe: info.pill };
                } else if (d.statusDiretoria === "AUTO_APROVADO" || d.statusDiretoria === "APROVADO") {
                  pill = { texto: "Aprovado", classe: "good" };
                }

                return (
                  <Link
                    key={d.id}
                    href={`/painel/${d.id}`}
                    title={`${d.cliente} — ${d.produtoDescricao}`}
                    style={{
                      borderLeftColor: pendFlag ? "var(--color-warn)" : et.color,
                      animationDelay: `${colIdx * 60 + i * 45}ms`,
                    }}
                    className="group flex animate-in flex-col gap-1.5 rounded-xl border border-l-4 bg-card p-3.5 text-left no-underline shadow-sm fade-in slide-in-from-bottom-1 duration-300 fill-mode-backwards hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="truncate text-sm font-semibold text-foreground">{d.cliente}</div>
                    <div className="truncate text-xs text-muted-foreground">{d.produtoDescricao}</div>
                    {pill && (
                      <Badge className={`w-fit rounded-full border-0 font-mono text-[10.5px] font-bold ${PILL_STYLE[pill.classe]}`}>
                        {pill.texto}
                      </Badge>
                    )}
                    <div className="mt-0.5 flex min-w-0 items-center justify-between gap-1.5 border-t border-dashed border-line-strong pt-1.5">
                      <span className="truncate font-mono text-xs font-semibold text-muted-foreground">{precoExibicao(tiers)}</span>
                      {d.numeroSequencial && (
                        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">Nº {d.numeroSequencial}</span>
                      )}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
