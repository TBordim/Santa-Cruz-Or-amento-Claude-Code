"use client";

import { useActionState } from "react";
import { AnexoUpload } from "@/components/anexos/AnexoUpload";
import { SuportesLista } from "@/components/orcamento/SuportesLista";
import { salvarRequisitos, avancarOrcamento } from "../actions";
import type { OrcamentoComAnexos } from "@/lib/orcamentos/doc-type";
import type { ReqCliente, ReqTecnicos } from "@/lib/orcamentos/types";
import { OPCOES_ANEXOS_ENGENHARIA } from "@/lib/orcamentos/constantes";

export function FormEngenharia({ doc }: { doc: OrcamentoComAnexos }) {
  const [state, salvarAction, salvando] = useActionState(salvarRequisitos, undefined);
  const [state2, avancarAction, avancando] = useActionState(avancarOrcamento, undefined);
  const erro = state?.erro ?? state2?.erro;

  const c = doc.reqCliente as ReqCliente | null;
  const r = doc.reqTecnicos as ReqTecnicos | null;
  const ehRepeticao = !!doc.classificacao?.startsWith("REPETICAO");

  return (
    <>
      <div className="compare-box numeros-box">
        <div className="compare-row"><span>Cliente</span><span className="v txt">{doc.cliente}</span></div>
        <div className="compare-row"><span>Produto</span><span className="v txt">{doc.produtoDescricao}</span></div>
        <div className="compare-row"><span>Classificação</span><span className="v txt">{doc.classificacao}</span></div>
      </div>

      <div className="checklist-block">
        <div className="label" style={{ marginBottom: 4 }}>Diretriz da etapa</div>
        <div>Preencha os requisitos técnicos (formato suporte, anexos previstos) antes de enviar para o Orçamento.</div>
      </div>

      <form id="form-engenharia">
        <input type="hidden" name="id" value={doc.id} form="form-engenharia" />

        <div className="form-section" style={{ borderTop: "none", marginTop: 0, paddingTop: 0 }}>
          <h4>Pré cadastro</h4>
          <div className="row2">
            <div className="field">
              <label>Nº de Pré Cadastro</label>
              <input name="preCadastro" defaultValue={doc.preCadastro ?? ""} form="form-engenharia" />
              <span className="hint">Obrigatório para liberar para a etapa seguinte.</span>
            </div>
            <div className="field">
              <label>Código interno (Santa Cruz)</label>
              <input name="codInterno" defaultValue={doc.codInterno ?? ""} form="form-engenharia" />
              <span className="hint">{ehRepeticao ? "Veio da Solicitação — ajuste se necessário." : "Obrigatório nesta etapa em produto novo."}</span>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h4>Suporte — formato e código</h4>
          <div className="hint" style={{ marginBottom: 10 }}>Descrição e gramatura já vieram da Solicitação — preencha aqui o formato e o código.</div>
          <SuportesLista
            campoA="suporteTecFormato"
            campoB="suporteTecCodigo"
            labelA="Formato"
            labelB="Código"
            valoresIniciais={
              (r?.suportes?.length ? r.suportes.map((s) => ({ a: s.formato, b: s.codigo })) : c?.suportes?.map(() => ({ a: "", b: "" }))) ?? undefined
            }
          />
        </div>

        <div className="form-section">
          <h4>Formato suporte</h4>
          <div className="row2">
            <div className="field"><label>Qtd. por Folha Inteira</label><input name="qtdFolha" defaultValue={r?.qtdFolha ?? ""} form="form-engenharia" /></div>
            <div className="field"><label>Fls. Acerto</label><input name="flsAcerto" defaultValue={r?.flsAcerto ?? ""} form="form-engenharia" /></div>
          </div>
          <div className="row2">
            <div className="field"><label>Fator — Comprimento (cm)</label><input name="fatorC" defaultValue={r?.fatorC ?? ""} form="form-engenharia" /></div>
            <div className="field"><label>Fator — Largura (cm)</label><input name="fatorL" defaultValue={r?.fatorL ?? ""} form="form-engenharia" /></div>
          </div>
          <div className="row2">
            <div className="field"><label>Corte</label><input name="corte" defaultValue={r?.corte ?? ""} form="form-engenharia" /></div>
            <div className="field"><label>Qtd./ch.</label><input name="qtdCh" defaultValue={r?.qtdCh ?? ""} form="form-engenharia" /></div>
          </div>
          <div className="row2">
            <div className="field"><label>Formato Ideal — Comprimento (cm)</label><input name="idealC" defaultValue={r?.idealC ?? ""} form="form-engenharia" /></div>
            <div className="field"><label>Formato Ideal — Largura (cm)</label><input name="idealL" defaultValue={r?.idealL ?? ""} form="form-engenharia" /></div>
          </div>
        </div>

        <div className="form-section">
          <h4>Anexos previstos</h4>
          <div className="opt-grid">
            {OPCOES_ANEXOS_ENGENHARIA.map((op) => (
              <label key={op} className="checkline">
                <input type="checkbox" name="anexosPrevistos" value={op} defaultChecked={r?.anexos?.includes(op)} form="form-engenharia" />
                <span>{op}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-section">
          <h4>Observações</h4>
          <div className="field"><label>Informações complementares</label><textarea name="infoComplementares" rows={2} defaultValue={r?.infoComplementares ?? ""} form="form-engenharia" /></div>
          <div className="field"><label>Observações de engenharia</label><textarea name="obsEngenharia" rows={2} defaultValue={doc.obsEngenharia ?? ""} form="form-engenharia" /></div>
        </div>
      </form>

      <AnexoUpload orcamentoId={doc.id} tipo="ENGENHARIA" anexos={doc.anexos.filter((a) => a.tipo === "ENGENHARIA")} />

      {erro && <div className="anexo-erro">{erro}</div>}
      <div className="btn-row">
        <button type="submit" form="form-engenharia" formAction={salvarAction} className="btn secondary" disabled={salvando}>
          Salvar sem liberar
        </button>
        <button type="submit" form="form-engenharia" formAction={avancarAction} className="btn" disabled={avancando}>
          {avancando ? "Enviando…" : "Liberar para Orçamento"}
        </button>
      </div>
    </>
  );
}
