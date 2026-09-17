"use client";

import { registrarDesfecho } from "../actions";
import type { OrcamentoComAnexos } from "@/lib/orcamentos/doc-type";
import type { PrecificacaoTier } from "@/lib/orcamentos/types";
import { fmtMoney, fmtDateTime, DESFECHOS } from "@/lib/orcamentos/constantes";
import { AnexoUpload } from "@/components/anexos/AnexoUpload";

export function FormFinalizado({ doc }: { doc: OrcamentoComAnexos }) {
  const tiers = (doc.precificacao as unknown as PrecificacaoTier[] | null) ?? [];

  return (
    <>
      <div className="compare-box numeros-box">
        <div className="compare-row"><span>Cliente</span><span className="v txt">{doc.cliente}</span></div>
        <div className="compare-row"><span>Produto</span><span className="v txt">{doc.produtoDescricao}</span></div>
        <div className="compare-row"><span>Nº de Orçamento</span><span className="v">{doc.numeroOrcamento || "—"}</span></div>
      </div>

      <div className="form-section" style={{ borderTop: "none", marginTop: 0, paddingTop: 0 }}>
        <h4>Faixas de preço</h4>
        {tiers.map((t, i) => (
          <div key={i} className="compare-row">
            <span>{t.quantidade}</span>
            <span className="v">{fmtMoney(t.precoFinal ?? t.precoFinalSugerido)}</span>
          </div>
        ))}
      </div>

      <div className="compare-box">
        <div className="compare-row"><span>Oferta enviada em</span><span className="v">{fmtDateTime(doc.finalizadoEm)}</span></div>
        {doc.desfechoEm && <div className="compare-row"><span>Desfecho registrado em</span><span className="v">{fmtDateTime(doc.desfechoEm)}</span></div>}
      </div>

      <form action={registrarDesfecho} className="form-section">
        <input type="hidden" name="id" value={doc.id} />
        <h4>Retorno do cliente</h4>
        <div className="field">
          <label>Desfecho</label>
          <select name="desfecho" defaultValue={doc.desfecho ?? "AGUARDANDO"}>
            {DESFECHOS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Motivo (opcional)</label>
          <input name="motivo" defaultValue={doc.desfechoMotivo ?? ""} />
        </div>
        <div className="btn-row">
          <button type="submit" className="btn">Registrar desfecho</button>
        </div>
      </form>

      <AnexoUpload orcamentoId={doc.id} tipo="ARTE" anexos={doc.anexos.filter((a) => a.tipo === "ARTE")} somenteLeitura />
      <AnexoUpload orcamentoId={doc.id} tipo="ENGENHARIA" anexos={doc.anexos.filter((a) => a.tipo === "ENGENHARIA")} somenteLeitura />
    </>
  );
}
