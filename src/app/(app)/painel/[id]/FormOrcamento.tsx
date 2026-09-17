"use client";

import { useActionState } from "react";
import { salvarOrcamento, enviarParaDiretoria, solicitarCompras, registrarRetornoCompras } from "../actions";
import type { OrcamentoComAnexos } from "@/lib/orcamentos/doc-type";
import type { ReqCliente, PrecificacaoTier } from "@/lib/orcamentos/types";
import { fmtDateTime } from "@/lib/orcamentos/constantes";
import { paraCampoBR } from "@/lib/orcamentos/motor";

function ComprasBox({ doc }: { doc: OrcamentoComAnexos }) {
  if (doc.aguardandoCompras) {
    return (
      <div className="compras-box ativo">
        <div className="compras-status">
          <strong>Aguardando preço de Compras</strong> desde {fmtDateTime(doc.comprasPedidoEm)}
        </div>
        {doc.comprasItem && <div className="compras-item">Solicitado: {doc.comprasItem}</div>}
        <div className="btn-row">
          <form action={registrarRetornoCompras}>
            <input type="hidden" name="id" value={doc.id} />
            <button type="submit" className="btn secondary">Registrar retorno de Compras</button>
          </form>
        </div>
      </div>
    );
  }
  return (
    <ComprasFormBox doc={doc} />
  );
}

function ComprasFormBox({ doc }: { doc: OrcamentoComAnexos }) {
  const [, action, pending] = useActionState(solicitarCompras, undefined);
  return (
    <form action={action} className="compras-box">
      <input type="hidden" name="id" value={doc.id} />
      {doc.comprasRetornoEm ? (
        <div className="compras-status">
          Compras respondeu em {fmtDateTime(doc.comprasRetornoEm)} (solicitado em {fmtDateTime(doc.comprasPedidoEm)}).
        </div>
      ) : (
        <div className="compras-status">Se faltar preço de matéria-prima ou insumo, registre aqui — o orçamento fica em espera até você lançar o retorno.</div>
      )}
      <div className="field"><label>O que falta cotar</label><input name="item" placeholder="Ex.: papel cartão 270g, cola bico" /></div>
      <div className="btn-row">
        <button type="submit" className="btn ghost" disabled={pending}>Solicitar preço a Compras</button>
      </div>
    </form>
  );
}

export function FormOrcamento({ doc }: { doc: OrcamentoComAnexos }) {
  const [state, salvarAction, salvando] = useActionState(salvarOrcamento, undefined);
  const [state2, enviarAction, enviando] = useActionState(enviarParaDiretoria, undefined);
  const erro = state?.erro ?? state2?.erro;

  const c = doc.reqCliente as ReqCliente | null;
  const quantidades = c?.quantidadesLista ?? [];
  const tiers = (doc.precificacao as unknown as PrecificacaoTier[] | null) ?? [];

  return (
    <>
      <div className="compare-box numeros-box">
        <div className="compare-row"><span>Cliente</span><span className="v txt">{doc.cliente}</span></div>
        <div className="compare-row"><span>Produto</span><span className="v txt">{doc.produtoDescricao}</span></div>
        <div className="compare-row"><span>Nº de Pré Cadastro</span><span className="v">{doc.preCadastro || "—"}</span></div>
      </div>

      <ComprasBox doc={doc} />

      <form id="form-orcamento">
        <input type="hidden" name="id" value={doc.id} form="form-orcamento" />

        {quantidades.length === 0 ? (
          <div className="empty-state">Nenhuma quantidade lançada na Solicitação — volte a etapa e adicione ao menos uma.</div>
        ) : (
          quantidades.map((qtd, i) => {
            const t = tiers[i];
            return (
              <div key={i} className="form-section" style={i === 0 ? { borderTop: "none", marginTop: 0, paddingTop: 0 } : undefined}>
                <h4>{quantidades.length > 1 ? `Quantidade: ${qtd}` : "Precificação"}</h4>
                <div className="row2">
                  <div className="field">
                    <label>Preço projetado</label>
                    <input name={`precoProjetado_${i}`} defaultValue={paraCampoBR(t?.precoProjetado)} placeholder="Ex.: 1.234,56" form="form-orcamento" />
                  </div>
                  <div className="field">
                    <label>Custo primário (%)</label>
                    <input name={`custoPrimarioPct_${i}`} defaultValue={paraCampoBR(t?.custoPrimarioPct)} form="form-orcamento" />
                  </div>
                </div>
                <div className="row2">
                  <div className="field">
                    <label>Margem P2 (%)</label>
                    <input name={`margemP2Pct_${i}`} defaultValue={paraCampoBR(t?.margemP2Pct)} form="form-orcamento" />
                  </div>
                  <div className="field" />
                </div>
                <div className="row2">
                  <div className="field"><label>Número de lotes</label><input name={`numeroLotes_${i}`} defaultValue={t?.numeroLotes ?? ""} form="form-orcamento" /></div>
                  <div className="field"><label>Número de setups</label><input name={`numeroSetups_${i}`} defaultValue={t?.numeroSetups ?? ""} form="form-orcamento" /></div>
                </div>
              </div>
            );
          })
        )}

        <div className="form-section">
          <h4>Comum a todas as faixas</h4>
          <div className="row2">
            <div className="field"><label>Nº de SOPP</label><input name="numeroSequencial" required defaultValue={doc.numeroSequencial ?? ""} form="form-orcamento" /></div>
            <div className="field"><label>Prazo (dias)</label><input name="prazoDias" type="number" defaultValue={doc.prazoDias ?? ""} form="form-orcamento" /></div>
          </div>
          <div className="field"><label>Acabamento</label><input name="acabamento" defaultValue={doc.acabamento ?? ""} form="form-orcamento" /></div>
          <label className="checkline" style={{ marginBottom: 8 }}>
            <input type="checkbox" name="comissaoEspecial" defaultChecked={doc.comissaoEspecial} form="form-orcamento" />
            <span>Condição comercial especial (comissão/desconto)</span>
          </label>
          <div className="field"><label>Observação da condição especial</label><input name="comissaoObs" defaultValue={doc.comissaoObs ?? ""} form="form-orcamento" /></div>
        </div>
      </form>

      {erro && <div className="anexo-erro">{erro}</div>}
      <div className="btn-row">
        <button type="submit" form="form-orcamento" formAction={salvarAction} className="btn secondary" disabled={salvando}>
          Salvar sem liberar
        </button>
        <button type="submit" form="form-orcamento" formAction={enviarAction} className="btn" disabled={enviando || doc.aguardandoCompras}>
          {enviando ? "Enviando…" : "Enviar para Diretoria"}
        </button>
      </div>
    </>
  );
}
