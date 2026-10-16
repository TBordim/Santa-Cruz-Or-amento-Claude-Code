"use client";

import { useFormActionSemReset } from "@/hooks/use-form-action";
import { informarCliente } from "@/app/(app)/atendimento/actions";
import { FormSection, Field, DiretrizBlock, AcoesBar } from "@/components/form-section";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Último passo do Aceite, no módulo Atendimento ao Cliente (TP de Vendas 3.2.3): enviar a data
// prevista de entrega ao cliente e/ou representante.
export function FormInformarCliente({ aceiteId, loteId, dataEntrega, representante }: { aceiteId: string; loteId?: string | null; dataEntrega: string; representante: string | null }) {
  const [state, onSubmit, pending] = useFormActionSemReset(informarCliente, undefined);
  return (
    <form id="form-aceite-atendimento" onSubmit={onSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={aceiteId} />
      <input type="hidden" name="loteId" value={loteId ?? ""} />
      <FormSection title="Informar o cliente">
        <DiretrizBlock>Envie a data prevista de entrega ({dataEntrega}) ao cliente e/ou representante{representante ? ` (${representante})` : ""} e registre aqui.</DiretrizBlock>
        <Marcar name="avisouCliente" texto="Enviei a data ao cliente" />
        <Marcar name="avisouRepresentante" texto="Enviei a data ao representante" />
        <Field label="Observação (opcional)" hint="Ex.: por e-mail ao comprador; cliente pediu para antecipar se possível.">
          <Input name="obs" />
        </Field>
      </FormSection>
      {state?.erro && <div className="anexo-erro">{state.erro}</div>}
      <AcoesBar>
        <Button type="submit" disabled={pending}>{pending ? "Concluindo…" : "Concluir o Aceite"}</Button>
      </AcoesBar>
    </form>
  );
}

function Marcar({ name, texto }: { name: string; texto: string }) {
  return (
    <label className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-muted/50">
      <input type="checkbox" name={name} className="h-4 w-4 accent-primary" />
      {texto}
    </label>
  );
}
