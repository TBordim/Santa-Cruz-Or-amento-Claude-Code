"use client";

import { useActionState } from "react";
import { CamposComerciaisFields } from "@/components/orcamento/CamposComerciaisFields";
import { AnexoUpload } from "@/components/anexos/AnexoUpload";
import { salvarAberto, avancarEngenharia } from "../actions";
import type { OrcamentoComAnexos } from "@/lib/orcamentos/doc-type";
import type { ReqCliente } from "@/lib/orcamentos/types";

export function FormAberto({ doc }: { doc: OrcamentoComAnexos }) {
  const [state, salvarAction, salvando] = useActionState(salvarAberto, undefined);
  const [state2, avancarAction, avancando] = useActionState(avancarEngenharia, undefined);
  const erro = state?.erro ?? state2?.erro;

  return (
    <>
      <div className="checklist-block">
        <div className="label" style={{ marginBottom: 4 }}>Diretriz da etapa</div>
        <div>Preencha os dados comerciais, técnicos básicos e anexe a arte do cliente antes de enviar para a Engenharia.</div>
      </div>

      <form id="form-aberto">
        <input type="hidden" name="id" value={doc.id} form="form-aberto" />
        <CamposComerciaisFields
          defaults={{
            origemPedido: doc.origemPedido,
            classificacao: doc.classificacao,
            classificacaoDetalhe: doc.classificacaoDetalhe,
            analiseCredito: doc.analiseCredito,
            fsc: doc.fsc,
            usaSelo: doc.usaSelo,
            cliente: doc.cliente,
            cnpj: doc.cnpj,
            endereco: doc.endereco,
            representante: doc.representante,
            comissaoCev: doc.comissaoCev,
            telefone: doc.telefone,
            email: doc.email,
            contatoCompras: doc.contatoCompras,
            contatoTecnico: doc.contatoTecnico,
            condPagamento: doc.condPagamento,
            modalidade: doc.modalidade,
            entregaLocalidade: doc.entregaLocalidade,
            qtdEntregas: doc.qtdEntregas,
            entregaDatas: doc.entregaDatas,
            produtoDescricao: doc.produtoDescricao,
            produtoCodigo: doc.produtoCodigo,
            codInterno: doc.codInterno,
            obs: doc.obs,
            reqCliente: doc.reqCliente as ReqCliente | null,
          }}
        />
      </form>

      <AnexoUpload
        orcamentoId={doc.id}
        tipo="ARTE"
        anexos={doc.anexos.filter((a) => a.tipo === "ARTE")}
      />

      {erro && <div className="anexo-erro">{erro}</div>}
      <div className="btn-row">
        <button type="submit" form="form-aberto" formAction={salvarAction} className="btn secondary" disabled={salvando}>
          Salvar sem liberar
        </button>
        <button type="submit" form="form-aberto" formAction={avancarAction} className="btn" disabled={avancando}>
          {avancando ? "Enviando…" : "Liberar para Engenharia"}
        </button>
      </div>
    </>
  );
}
