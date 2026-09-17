import { redirect } from "next/navigation";
import Link from "next/link";
import { sessaoAtual } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { fmtMoney, fmtDateTime } from "@/lib/orcamentos/constantes";
import type { PrecificacaoTier } from "@/lib/orcamentos/types";

export const dynamic = "force-dynamic";

// Equivalente a viewDiretoria() — registro dos já decididos (aprovados, automático ou manual).
// Os pendentes de decisão aparecem só no Painel, coluna "4. Diretoria".
export default async function DiretoriaPage() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");

  const decididos = await prisma.orcamento.findMany({
    where: { origem: "NOVO", statusDiretoria: { in: ["APROVADO", "AUTO_APROVADO"] } },
    orderBy: { atualizadoEm: "desc" },
  });

  return (
    <>
      <div className="view-header">
        <div>
          <h2>Painel Diretoria</h2>
          <p>Registro dos orçamentos já decididos: aprovados por você e os aprovados automaticamente. O que ainda aguarda decisão fica no Painel, coluna &quot;4. Diretoria&quot;.</p>
        </div>
      </div>

      {decididos.length === 0 ? (
        <div className="empty-state">Nenhum orçamento aprovado ainda.</div>
      ) : (
        decididos.map((d) => {
          const tiers = (d.precificacao as unknown as PrecificacaoTier[] | null) ?? [];
          return (
            <div key={d.id} className="panel" style={{ marginBottom: 14, maxWidth: "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "flex-start" }}>
                <div>
                  <strong>{d.cliente}</strong> — {d.produtoDescricao}
                  <div className="hint">
                    {d.statusDiretoria === "AUTO_APROVADO" ? "Auto-aprovado" : "Aprovado"}
                    {tiers[0]?.decididoEm ? ` em ${fmtDateTime(new Date(tiers[0].decididoEm))}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className={`pill ${d.statusDiretoria === "AUTO_APROVADO" ? "good" : "good"}`}>
                    {d.statusDiretoria === "AUTO_APROVADO" ? "Auto-aprovado" : "Aprovado por você"}
                  </span>
                  <Link href={`/painel/${d.id}`} className="btn secondary">Ver</Link>
                </div>
              </div>
              <div className="compare-box" style={{ marginTop: 12 }}>
                {tiers.length > 1 ? (
                  tiers.map((t, i) => (
                    <div key={i} className="compare-row"><span>{t.quantidade}</span><span className="v">{fmtMoney(t.precoFinal)}</span></div>
                  ))
                ) : (
                  <div className="compare-row"><span>Preço final</span><span className="v">{fmtMoney(tiers[0]?.precoFinal)}</span></div>
                )}
              </div>
            </div>
          );
        })
      )}
    </>
  );
}
