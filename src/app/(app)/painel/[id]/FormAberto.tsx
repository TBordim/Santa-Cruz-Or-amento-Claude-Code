"use client";

import { useActionState } from "react";
import { CamposComerciaisFields } from "@/components/orcamento/CamposComerciaisFields";
import { AnexoUpload } from "@/components/anexos/AnexoUpload";
import { salvarAberto, avancarEngenharia } from "../actions";
import type { OrcamentoComAnexos } from "@/lib/orcamentos/doc-type";
import type { ReqCliente } from "@/lib/orcamentos/types";
import { Button } from "@/components/ui/button";
import { useSalvoToast } from "@/hooks/use-salvo-toast";

export function FormAberto({ doc }: { doc: OrcamentoComAnexos }) {
  const [state, salvarAction, salvando] = useActionState(salvarAberto, undefined);
  const [state2, avancarAction, avancando] = useActionState(avancarEngenharia, undefined);
  const erro = state?.erro ?? state2?.erro;
  useSalvoToast(salvando, state?.erro, "Dados salvos.");

  return (
    <>
      <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
        <div className="mb-1 font-semibold text-foreground">Diretriz da etapa</div>
        <div className="text-muted-foreground">Preencha os dados comerciais, técnicos básicos e anexe a arte do cliente antes de enviar para a Engenharia.</div>
      </div>

      <form id="form-aberto" className="mt-4">
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

      <div className="mt-2">
        <AnexoUpload
          orcamentoId={doc.id}
          tipo="ARTE"
          anexos={doc.anexos.filter((a) => a.tipo === "ARTE")}
        />
      </div>

      {erro && <div className="anexo-erro">{erro}</div>}
      <div className="mt-4 flex gap-2">
        <Button type="submit" form="form-aberto" formAction={salvarAction} variant="outline" disabled={salvando}>
          Salvar sem liberar
        </Button>
        <Button type="submit" form="form-aberto" formAction={avancarAction} disabled={avancando}>
          {avancando ? "Enviando…" : "Liberar para Engenharia"}
        </Button>
      </div>
    </>
  );
}
