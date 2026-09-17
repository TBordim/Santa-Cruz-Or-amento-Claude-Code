import Link from "next/link";
import { prisma } from "@/lib/db";
import { ETAPAS, fmtMoney } from "@/lib/orcamentos/constantes";
import type { PrecificacaoTier } from "@/lib/orcamentos/types";
import { desfechoInfo } from "@/lib/orcamentos/constantes";

function precoExibicao(precificacao: PrecificacaoTier[] | null): string {
  if (!precificacao || !precificacao.length) return "—";
  if (precificacao.length === 1) {
    const t = precificacao[0];
    return fmtMoney(t.precoFinal ?? t.precoFinalSugerido ?? t.precoProjetado);
  }
  return precificacao.length + " faixas";
}

export async function PainelBoard() {
  // Um card em FINALIZADO some do kanban assim que o desfecho é registrado (deixa de ser
  // "aguardando") — continua acessível pelo Histórico. Mesma regra do viewPainel() original.
  const docs = await prisma.orcamento.findMany({
    where: {
      origem: "NOVO",
      NOT: { etapa: "FINALIZADO", AND: { desfecho: { not: null }, NOT: { desfecho: "AGUARDANDO" } } },
    },
    orderBy: { atualizadoEm: "desc" },
  });

  const cols = ETAPAS.map((et) => {
    const itens = docs.filter((d) => d.etapa === et.key);
    return { et, itens };
  });

  return (
    <div className="board">
      {cols.map(({ et, itens }) => (
        <div key={et.key} className="col" style={{ ["--stage-color" as string]: et.color }}>
          <div className="col-head">
            <span className="label">{et.label}</span>
            <span className="n">{itens.length}</span>
          </div>
          <div className="col-body">
            {itens.length === 0 ? (
              <div className="empty-col">Sem cards</div>
            ) : (
              itens.map((d) => {
                const tiers = d.precificacao as unknown as PrecificacaoTier[] | null;
                const pendFlag = (d.etapa === "DIRETORIA" && d.statusDiretoria === "PENDENTE") || d.aguardandoCompras;
                let pill: { texto: string; classe: string } | null = null;
                if (d.etapa === "DIRETORIA" && d.statusDiretoria === "PENDENTE") pill = { texto: "Aguarda diretoria", classe: "pend" };
                else if (d.etapa === "ORCAMENTO" && d.aguardandoCompras) pill = { texto: "Aguarda Compras", classe: "pend" };
                else if (d.statusDiretoria === "REVISAO") pill = { texto: "Revisão solicitada", classe: "bad" };
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
                    className={`card${pendFlag ? " pend-flag" : ""}`}
                    style={{ ["--stage-color" as string]: et.color }}
                    title={`${d.cliente} — ${d.produtoDescricao}`}
                  >
                    <div className="cliente">{d.cliente}</div>
                    <div className="produto">{d.produtoDescricao}</div>
                    {pill && <span className={`pill ${pill.classe}`}>{pill.texto}</span>}
                    <div className="meta">
                      <span className="preco">{precoExibicao(tiers)}</span>
                      {d.numeroSequencial && <span className="mono" style={{ fontSize: 11 }}>Nº {d.numeroSequencial}</span>}
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
