"use client";

import { decidirDiretoriaFaixa, salvarRascunhoDiretoria } from "../actions";
import type { OrcamentoComAnexos } from "@/lib/orcamentos/doc-type";
import type { PrecificacaoTier } from "@/lib/orcamentos/types";
import { fmtPct as fmtPctHelper, paraCampoBR } from "@/lib/orcamentos/motor";
import { LIMITE_CUSTO, LIMITE_MARGEM } from "@/lib/orcamentos/motor";
import { fmtMoney } from "@/lib/orcamentos/constantes";
import { AnexoUpload } from "@/components/anexos/AnexoUpload";

function fmtMoneyOrDash(n: number | null | undefined) {
  return n === null || n === undefined ? "—" : fmtMoney(n);
}

function CritRow({ ok, label }: { ok: boolean | null; label: string }) {
  const cls = ok === null ? "na" : ok ? "good" : "bad";
  return (
    <div className="crit-row">
      <span className={`crit-dot ${cls}`} />
      <span>{label}</span>
    </div>
  );
}

function TierCard({ doc, tier, idx, total }: { doc: OrcamentoComAnexos; tier: PrecificacaoTier; idx: number; total: number }) {
  const titulo = total > 1 ? `Quantidade: ${tier.quantidade}` : "Precificação";
  const pendente = tier.statusDiretoria === "pendente";

  return (
    <div className="form-section" style={idx === 0 ? { borderTop: "none", marginTop: 0, paddingTop: 0 } : undefined}>
      <h4>{titulo}</h4>

      {!tier.produtoNovo && (
        <div className="compare-box premissas">
          {tier.premissasDivergentes.length === 0 ? (
            <div className="compare-row"><span>Premissas</span><span className="v txt">Iguais ao orçamento anterior</span></div>
          ) : (
            <div className="compare-row dif"><span>Premissas divergentes</span><span className="v txt">{tier.premissasDivergentes.join(", ")}</span></div>
          )}
          <div className="compare-row"><span>Preço anterior</span><span className="v">{fmtMoneyOrDash(tier.precoAnterior)}</span></div>
          <div className="compare-row"><span>Preço projetado</span><span className="v">{fmtMoney(tier.precoProjetado)}</span></div>
          <div className="compare-row"><span>Variação</span><span className="v">{fmtPctHelper(tier.variacaoPct)}</span></div>
        </div>
      )}

      <div className="criteria">
        <CritRow ok={tier.custoPrimarioPct !== null && tier.custoPrimarioPct <= LIMITE_CUSTO} label={`Custo primário até ${LIMITE_CUSTO}% (atual: ${fmtPctHelper(tier.custoPrimarioPct)})`} />
        <CritRow ok={tier.margemP2Pct !== null && tier.margemP2Pct >= LIMITE_MARGEM} label={`Margem P2 ≥ ${LIMITE_MARGEM}% (atual: ${fmtPctHelper(tier.margemP2Pct)})`} />
        {tier.motivoPendencia && <div className="hint" style={{ marginTop: 6 }}>{tier.motivoPendencia}</div>}
      </div>

      {pendente ? (
        <form action={decidirDiretoriaFaixa}>
          <input type="hidden" name="id" value={doc.id} />
          <input type="hidden" name="idx" value={idx} />
          <div className="row2">
            <div className="field">
              <label>Preço final</label>
              <input name="precoFinal" defaultValue={paraCampoBR(tier.rascunhoPrecoFinal ?? tier.precoFinal ?? tier.precoFinalSugerido)} />
              <span className="hint">Sugerido: {fmtMoney(tier.precoFinalSugerido)}</span>
            </div>
            <div className="field">
              <label>Comentário</label>
              <input name="comentario" defaultValue={tier.rascunhoComentario ?? ""} />
            </div>
          </div>
          <div className="btn-row">
            <button type="submit" name="aprovado" value="true" className="btn">Aprovar</button>
            <button type="submit" name="aprovado" value="false" className="btn danger">Solicitar revisão</button>
            <button type="submit" formAction={salvarRascunhoDiretoria} formNoValidate className="btn ghost">
              Salvar rascunho
            </button>
          </div>
        </form>
      ) : (
        <div className="compare-box">
          <div className="compare-row"><span>Status</span><span className="v txt">{tier.statusDiretoria === "auto_aprovado" ? "Auto-aprovado" : tier.statusDiretoria}</span></div>
          <div className="compare-row"><span>Preço final</span><span className="v">{fmtMoneyOrDash(tier.precoFinal)}</span></div>
          {tier.decididoPor && <div className="compare-row"><span>Decidido por</span><span className="v txt">{tier.decididoPor}</span></div>}
        </div>
      )}
    </div>
  );
}

export function PainelDiretoria({ doc }: { doc: OrcamentoComAnexos }) {
  const tiers = (doc.precificacao as unknown as PrecificacaoTier[] | null) ?? [];

  return (
    <>
      {doc.conflitoClassificacao && (
        <div className="banner banner-erro">
          Classificado como &quot;repetição sem alteração&quot;, mas as premissas mudaram — confira com atenção.
        </div>
      )}
      <div className="compare-box numeros-box">
        <div className="compare-row"><span>Cliente</span><span className="v txt">{doc.cliente}</span></div>
        <div className="compare-row"><span>Produto</span><span className="v txt">{doc.produtoDescricao}</span></div>
        <div className="compare-row"><span>Nº de SOPP</span><span className="v">{doc.numeroSequencial || "—"}</span></div>
      </div>

      {tiers.map((t, i) => (
        <TierCard key={i} doc={doc} tier={t} idx={i} total={tiers.length} />
      ))}

      <AnexoUpload orcamentoId={doc.id} tipo="ARTE" anexos={doc.anexos.filter((a) => a.tipo === "ARTE")} somenteLeitura />
      <AnexoUpload orcamentoId={doc.id} tipo="ENGENHARIA" anexos={doc.anexos.filter((a) => a.tipo === "ENGENHARIA")} somenteLeitura />
    </>
  );
}
