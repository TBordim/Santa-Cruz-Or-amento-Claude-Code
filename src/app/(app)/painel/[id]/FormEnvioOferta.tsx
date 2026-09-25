"use client";

import { marcarFinalizado, salvarNumeroOrcamento } from "../actions";
import type { OrcamentoComAnexos } from "@/lib/orcamentos/doc-type";
import type { PrecificacaoTier } from "@/lib/orcamentos/types";
import { fmtMoney } from "@/lib/orcamentos/constantes";
import { FormSection, Field, ResumoBox, DiretrizBlock } from "@/components/form-section";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function FormEnvioOferta({ doc }: { doc: OrcamentoComAnexos }) {
  const tiers = (doc.precificacao as unknown as PrecificacaoTier[] | null) ?? [];

  return (
    <>
      <ResumoBox
        rows={[
          { label: "Cliente", value: doc.cliente },
          { label: "Produto", value: doc.produtoDescricao },
        ]}
      />

      <div className="mt-4">
        <FormSection title="Faixas de preço">
          <div className="flex flex-col gap-1.5">
            {tiers.map((t, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t.quantidade}</span>
                <span className="font-mono font-semibold">{fmtMoney(t.precoFinal ?? t.precoFinalSugerido)}</span>
              </div>
            ))}
          </div>
        </FormSection>
      </div>

      <div className="mt-4">
        <DiretrizBlock>Gere e envie a oferta ao cliente antes de seguir para o Retorno do Cliente.</DiretrizBlock>
      </div>

      <form action={salvarNumeroOrcamento} className="mt-4">
        <input type="hidden" name="id" value={doc.id} />
        <FormSection title="Número no sistema">
          <Field label="Nº de Orçamento">
            <Input name="numeroOrcamento" defaultValue={doc.numeroOrcamento ?? ""} />
          </Field>
        </FormSection>
        <div className="mt-4">
          <Button type="submit" variant="ghost">Salvar número</Button>
        </div>
      </form>

      <form action={marcarFinalizado} className="mt-4">
        <input type="hidden" name="id" value={doc.id} />
        <Button type="submit">Marcar oferta como enviada</Button>
      </form>

    </>
  );
}
