"use client";

import { useFormActionSemReset } from "@/hooks/use-form-action";
import { salvarCadastroProduto } from "../actions";
import type { OrcamentoComAnexos } from "@/lib/orcamentos/doc-type";
import type { PrecificacaoTier } from "@/lib/orcamentos/types";
import { fmtDateTime } from "@/lib/orcamentos/constantes";
import { formatarCodigoInterno } from "@/lib/orcamentos/codigo-interno";
import { modelosDoDoc, soEscolhida, rotuloSO } from "@/lib/orcamentos/modelos";
import { Field, ResumoBox, DiretrizBlock, AcoesBar } from "@/components/form-section";
import { Button } from "@/components/ui/button";
import { CodigoInternoInput } from "@/components/orcamento/CodigoInternoInput";

// Etapa 7 — o cliente aprovou e algum modelo ainda não tem Nº de Cadastro de Produto. Cada
// modelo novo precisa do próprio número (decisão do Thiago em 30/09/2026: 3 modelos novos = 3
// códigos). Lançados todos, o card volta pra Retorno do Cliente e segue sozinho pro Histórico
// (ver salvarCadastroProduto). `podeCadastrar` vem do Drawer: quem não tem a área
// CADASTRO_PRODUTO vê só o aviso de que está aguardando, sem os campos.
//
// Envio pelo onSubmit (useFormActionSemReset), não por <form action>/formAction: com action o
// React limpa o formulário quando ela termina — inclusive quando volta com erro de validação —
// e tudo que a pessoa digitou e ainda não estava salvo sumia da tela (achado no teste de
// 30/09/2026: modelo novo e Observações apagados depois de um "Liberar" com erro).
export function FormCadastroProduto({ doc, podeCadastrar }: { doc: OrcamentoComAnexos; podeCadastrar: boolean }) {
  const [state, onSubmit, pending] = useFormActionSemReset(salvarCadastroProduto, undefined);
  const modelos = modelosDoDoc(doc);
  const faltam = modelos.filter((m) => !m.codInterno);
  const escolhida = soEscolhida((doc.precificacao as unknown as PrecificacaoTier[] | null) ?? []);

  return (
    <>
      <ResumoBox
        rows={[
          { label: "Cliente", value: doc.cliente },
          { label: modelos.length > 1 ? `Modelos (${modelos.length})` : "Produto", value: doc.produtoDescricao },
          { label: "Nº de Orçamento", value: doc.numeroOrcamento || "—" },
          ...(escolhida?.numeroSequencial ? [{ label: "SO fechada", value: `SO ${escolhida.numeroSequencial} — ${rotuloSO(escolhida)}` }] : []),
          { label: "Aprovado pelo cliente em", value: fmtDateTime(doc.desfechoEm) },
        ]}
      />

      <div className="mt-4">
        <DiretrizBlock>
          {faltam.length > 1
            ? `O cliente aprovou este orçamento. Lance o Nº de Cadastro de Produto de cada um dos ${faltam.length} modelos novos para liberar o card para o Histórico.`
            : "O cliente aprovou este orçamento de produto novo. Lance o Nº de Cadastro de Produto para liberar o card para o Histórico."}
        </DiretrizBlock>
      </div>

      {podeCadastrar ? (
        <form id="form-cadastro-produto" onSubmit={onSubmit} className="mt-4 flex flex-col gap-4">
          <input type="hidden" name="id" value={doc.id} />
          {modelos.map((m, i) =>
            m.codInterno ? (
              modelos.length > 1 && (
                <Field key={m.id} label={`Nº de Cadastro — ${m.descricao || `Modelo ${i + 1}`}`} hint="Já cadastrado.">
                  <div className="font-mono text-sm text-foreground">{formatarCodigoInterno(m.codInterno)}</div>
                </Field>
              )
            ) : (
              <Field
                key={m.id}
                label={modelos.length > 1 ? `Nº de Cadastro — ${m.descricao || `Modelo ${i + 1}`}` : "Nº de Cadastro de Produto"}
                hint="Formato 0.000.000."
              >
                <CodigoInternoInput name={`codInterno_${m.id}`} required />
              </Field>
            ),
          )}
        </form>
      ) : (
        <div className="mt-4 rounded-lg border border-warn/30 bg-warn-soft p-3 text-sm text-warn">
          Aguardando quem cuida do cadastro de produto lançar {faltam.length > 1 ? "os números" : "o número"}.
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
