"use client";

import { useFormActionSemReset } from "@/hooks/use-form-action";
import { salvarPcp } from "@/app/(app)/pcp/actions";
import { useState } from "react";
import { fmtDia } from "@/lib/aceite/constantes";
import { FormSection, Field, DiretrizBlock, AcoesBar } from "@/components/form-section";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Data de entrega de um Aceite, no módulo PCP. Por enquanto o PCP digita a data; as melhorias do
// módulo (branch própria) vão sugerir a data por capacidade e regras, e este passo confirma a sugestão.
export function FormPcp({
  aceiteId,
  chegadaPapel,
  dataCliente,
  sugestao,
}: {
  aceiteId: string;
  chegadaPapel: string | null;
  dataCliente: string | null;
  // Data sugerida pelas regras do PCP (lib/pcp/sugestao.ts), em AAAA-MM-DD, com o passo a passo.
  sugestao?: { data: string; passos: string[]; ajustada: boolean };
}) {
  const [state, onSubmit, pending] = useFormActionSemReset(salvarPcp, undefined);
  const [data, setData] = useState("");
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
        {sugestao && (
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-foreground">
                Sugestão do sistema: <b className="font-mono">{fmtDia(new Date(sugestao.data + "T00:00:00.000Z"))}</b>
                {!sugestao.ajustada && <span className="ml-2 text-xs text-warn">(prazos ainda não ajustados pelo PCP)</span>}
              </span>
              <Button type="button" size="sm" variant="outline" onClick={() => setData(sugestao.data)}>
                Usar esta data
              </Button>
            </div>
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">Como foi calculada</summary>
              <ol className="mt-1 list-decimal pl-5">
                {sugestao.passos.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ol>
            </details>
          </div>
        )}
        <Field label="Data de entrega acordada">
          <Input type="date" name="dataEntrega" required min={chegadaPapel ?? undefined} value={data} onChange={(e) => setData(e.target.value)} />
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
