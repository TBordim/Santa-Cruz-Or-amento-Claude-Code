"use client";

import { useActionState } from "react";
import { salvarCadastroProduto } from "../actions";
import type { OrcamentoComAnexos } from "@/lib/orcamentos/doc-type";
import { fmtDateTime } from "@/lib/orcamentos/constantes";
import { Field, ResumoBox, DiretrizBlock, AcoesBar } from "@/components/form-section";
import { Button } from "@/components/ui/button";
import { CodigoInternoInput } from "@/components/orcamento/CodigoInternoInput";

// Etapa 7 — produto novo que o cliente aprovou, esperando o Nº de Cadastro de Produto. Lançado o
// número, o card volta pra Retorno do Cliente e segue sozinho pro Histórico (ver
// salvarCadastroProduto). `podeCadastrar` vem do Drawer: quem não tem a área CADASTRO_PRODUTO vê
// só o aviso de que está aguardando, sem o campo.
export function FormCadastroProduto({ doc, podeCadastrar }: { doc: OrcamentoComAnexos; podeCadastrar: boolean }) {
  const [state, action, pending] = useActionState(salvarCadastroProduto, undefined);

  return (
    <>
      <ResumoBox
        rows={[
          { label: "Cliente", value: doc.cliente },
          { label: "Produto", value: doc.produtoDescricao },
          { label: "Nº de Orçamento", value: doc.numeroOrcamento || "—" },
          { label: "Aprovado pelo cliente em", value: fmtDateTime(doc.desfechoEm) },
        ]}
      />

      <div className="mt-4">
        <DiretrizBlock>
          O cliente aprovou este orçamento de produto novo. Lance o Nº de Cadastro de Produto para liberar o card para o Histórico.
        </DiretrizBlock>
      </div>

      {podeCadastrar ? (
        <form id="form-cadastro-produto" action={action} className="mt-4">
          <input type="hidden" name="id" value={doc.id} />
          <Field label="Nº de Cadastro de Produto" hint="Formato 0.000.000.">
            <CodigoInternoInput name="codInterno" required />
          </Field>
        </form>
      ) : (
        <div className="mt-4 rounded-lg border border-warn/30 bg-warn-soft p-3 text-sm text-warn">
          Aguardando quem cuida do cadastro de produto lançar o número.
        </div>
      )}

      {state?.erro && <div className="anexo-erro mt-4">{state.erro}</div>}
      {podeCadastrar && (
        <AcoesBar>
          <Button type="submit" form="form-cadastro-produto" disabled={pending}>
            {pending ? "Salvando…" : "Salvar e liberar para o Histórico"}
          </Button>
        </AcoesBar>
      )}
    </>
  );
}
