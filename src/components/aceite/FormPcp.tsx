"use client";

import { useFormActionSemReset } from "@/hooks/use-form-action";
import { salvarPcp } from "@/app/(app)/pcp/actions";
import { fmtDia } from "@/lib/aceite/constantes";
import { FormSection, Field, DiretrizBlock, AcoesBar } from "@/components/form-section";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Data de entrega de um Aceite, no módulo PCP. Por enquanto o PCP digita a data; as melhorias do
// módulo (branch própria) vão sugerir a data por capacidade e regras, e este passo confirma a sugestão.
export function FormPcp({ aceiteId, chegadaPapel, dataCliente }: { aceiteId: string; chegadaPapel: string | null; dataCliente: string | null }) {
  const [state, onSubmit, pending] = useFormActionSemReset(salvarPcp, undefined);
  return (
    <form id="form-aceite-pcp" onSubmit={onSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={aceiteId} />
      <FormSection title="PCP: data de entrega">
        <DiretrizBlock>
          {chegadaPapel
            ? `O papel que falta chega em ${fmtDia(chegadaPapel)}. Defina a data de entrega a partir daí e do tempo de produção.`
            : "O papel está reservado em estoque. Defina a data de entrega pelo tempo de produção."}
        </DiretrizBlock>
        {dataCliente && <p className="text-sm text-muted-foreground">O cliente pediu para: {dataCliente}.</p>}
        <Field label="Data de entrega acordada">
          <Input type="date" name="dataEntrega" required min={chegadaPapel ?? undefined} />
        </Field>
        <Field label="Observação (opcional)">
          <Input name="pcpObs" />
        </Field>
      </FormSection>
      {state?.erro && <div className="anexo-erro">{state.erro}</div>}
      <AcoesBar>
        <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Definir data e devolver a Vendas"}</Button>
      </AcoesBar>
    </form>
  );
}
