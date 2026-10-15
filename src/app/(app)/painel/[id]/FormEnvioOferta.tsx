"use client";

import { marcarFinalizado, salvarNumeroOrcamento } from "../actions";
import type { OrcamentoComAnexos } from "@/lib/orcamentos/doc-type";
import type { PrecificacaoTier } from "@/lib/orcamentos/types";
import { modelosDoDoc } from "@/lib/orcamentos/modelos";
import { FormSection, Field, ResumoBox, DiretrizBlock } from "@/components/form-section";
import { LinhasSO } from "@/components/orcamento/LinhasSO";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function FormEnvioOferta({ doc }: { doc: OrcamentoComAnexos }) {
  const tiers = (doc.precificacao as unknown as PrecificacaoTier[] | null) ?? [];
  const modelos = modelosDoDoc(doc);

  return (
    <>
      <ResumoBox
        rows={[
          { label: "Cliente", value: doc.cliente },
          { label: modelos.length > 1 ? `Modelos (${modelos.length})` : "Produto", value: doc.produtoDescricao },
        ]}
      />

      <div className="mt-4">
        {/* Uma linha por SO na oferta, com o papel na descrição quando houver mais de uma opção —
            resposta do Thiago em 30/09/2026. O cliente fecha uma delas. */}
        <FormSection title={tiers.length > 1 ? "Linhas da oferta — uma por SO" : "Preço"}>
          <LinhasSO tiers={tiers} />
        </FormSection>
      </div>

      <div className="mt-4">
        <DiretrizBlock>Gere e envie a oferta ao cliente antes de seguir para o Retorno do Cliente.</DiretrizBlock>
      </div>

      {/* Um formulário só pros dois botões: "Marcar oferta como enviada" também grava o Nº de
          Orçamento digitado. Antes eram dois formulários separados e o número se perdia se a
          pessoa não clicasse em "Salvar número" primeiro (achado no teste de 30/09/2026). */}
      <form action={salvarNumeroOrcamento} className="mt-4">
        <input type="hidden" name="id" value={doc.id} />
        <FormSection title="Número no sistema">
          <Field label="Nº de Orçamento">
            <Input name="numeroOrcamento" defaultValue={doc.numeroOrcamento ?? ""} />
          </Field>
        </FormSection>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="submit" variant="ghost">Salvar número</Button>
          <Button type="submit" formAction={marcarFinalizado}>Marcar oferta como enviada</Button>
        </div>
      </form>

    </>
  );
}
