"use client";

import { marcarFinalizado, salvarNumeroOrcamento } from "../actions";
import type { OrcamentoComAnexos } from "@/lib/orcamentos/doc-type";
import type { PrecificacaoTier } from "@/lib/orcamentos/types";
import { fmtMoney } from "@/lib/orcamentos/constantes";

export function FormEnvioOferta({ doc }: { doc: OrcamentoComAnexos }) {
  const tiers = (doc.precificacao as unknown as PrecificacaoTier[] | null) ?? [];

  return (
    <>
      <div className="compare-box numeros-box">
        <div className="compare-row"><span>Cliente</span><span className="v txt">{doc.cliente}</span></div>
        <div className="compare-row"><span>Produto</span><span className="v txt">{doc.produtoDescricao}</span></div>
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

      <div className="checklist-block">
        <div className="label" style={{ marginBottom: 4 }}>Diretriz da etapa</div>
        <div>Gere e envie a oferta ao cliente antes de marcar como finalizado.</div>
      </div>

      <form action={salvarNumeroOrcamento} className="form-section">
        <input type="hidden" name="id" value={doc.id} />
        <h4>Número no sistema</h4>
        <div className="field">
          <label>Nº de Orçamento</label>
          <input name="numeroOrcamento" defaultValue={doc.numeroOrcamento ?? ""} />
        </div>
        <div className="btn-row">
          <button type="submit" className="btn ghost">Salvar número</button>
        </div>
      </form>

      <form action={marcarFinalizado}>
        <input type="hidden" name="id" value={doc.id} />
        <div className="btn-row">
          <button type="submit" className="btn">Marcar como finalizado</button>
        </div>
      </form>
    </>
  );
}
