"use client";

import { useFormActionSemReset, porBotao } from "@/hooks/use-form-action";
import { CamposComerciaisFields } from "@/components/orcamento/CamposComerciaisFields";
import { AnexoUpload } from "@/components/anexos/AnexoUpload";
import { salvarAberto, avancarEngenharia } from "../actions";
import type { OrcamentoComAnexos } from "@/lib/orcamentos/doc-type";
import type { ReqCliente } from "@/lib/orcamentos/types";
import { modelosDoDoc, anexosDoModelo } from "@/lib/orcamentos/modelos";
import { Button } from "@/components/ui/button";
import { AcoesBar } from "@/components/form-section";
import { useSalvoToast } from "@/hooks/use-salvo-toast";

// Envio pelo onSubmit (useFormActionSemReset), não por <form action>/formAction: com action o
// React limpa o formulário quando ela termina — inclusive quando volta com erro de validação —
// e tudo que a pessoa digitou e ainda não estava salvo sumia da tela (achado no teste de
// 30/09/2026: modelo novo e Observações apagados depois de um "Liberar" com erro).
export function FormAberto({ doc }: { doc: OrcamentoComAnexos }) {
  const [state, salvarSubmit, salvando] = useFormActionSemReset(salvarAberto, undefined);
  const [state2, avancarSubmit, avancando] = useFormActionSemReset(avancarEngenharia, undefined);
  const erro = state?.erro ?? state2?.erro;
  useSalvoToast(salvando, state?.erro, "Dados salvos.");
  const modelos = modelosDoDoc(doc);
  const artes = doc.anexos.filter((a) => a.tipo === "ARTE");

  return (
    <>
      <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
        <div className="mb-1 font-semibold text-foreground">Diretriz da etapa</div>
        <div className="text-muted-foreground">Preencha os dados comerciais, técnicos básicos e anexe a arte do cliente antes de enviar para a Engenharia.</div>
      </div>

      <form id="form-aberto" className="mt-4" onSubmit={porBotao({ salvar: salvarSubmit, avancar: avancarSubmit }, "salvar")}>
        <input type="hidden" name="id" value={doc.id} form="form-aberto" />
        <CamposComerciaisFields
          defaults={{
            origemPedido: doc.origemPedido,
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
            condPagamento: doc.condPagamento,
            modalidade: doc.modalidade,
            entregaLocalidade: doc.entregaLocalidade,
            qtdEntregas: doc.qtdEntregas,
            entregaDatas: doc.entregaDatas,
            modelos,
            obs: doc.obs,
            reqCliente: doc.reqCliente as ReqCliente | null,
          }}
        />
      </form>

      {/* Uma arte por modelo. Modelo acabado de adicionar só ganha id ao salvar — até lá não
          tem onde pendurar a arte, por isso o aviso. */}
      <div className="mt-2 flex flex-col gap-4">
        {modelos.map((m, i) => (
          <AnexoUpload
            key={m.id}
            orcamentoId={doc.id}
            tipo="ARTE"
            modeloId={m.id === "principal" ? undefined : m.id}
            titulo={modelos.length > 1 ? `Arte — ${m.descricao || `Modelo ${i + 1}`}` : undefined}
            anexos={anexosDoModelo(artes, modelos, i)}
          />
        ))}
        {modelos.length > 0 && (
          <p className="-mt-2 text-xs text-muted-foreground">Adicionou um modelo? Clique em &quot;Salvar sem liberar&quot; para anexar a arte dele.</p>
        )}
      </div>

      {erro && <div className="anexo-erro">{erro}</div>}
      <AcoesBar>
        <Button type="submit" form="form-aberto" value="salvar" variant="outline" disabled={salvando}>
          Salvar sem liberar
        </Button>
        <Button type="submit" form="form-aberto" value="avancar" disabled={avancando}>
          {avancando ? "Enviando…" : "Liberar para Engenharia"}
        </Button>
      </AcoesBar>
    </>
  );
}
