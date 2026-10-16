"use client";

import { useState } from "react";
import { useFormActionSemReset } from "@/hooks/use-form-action";
import { confirmarEntrega } from "@/app/(app)/pcp/actions";
import { fmtQuantidade, lerQuantidade } from "@/lib/aceite/constantes";
import { FormSection, Field, DiretrizBlock, AcoesBar } from "@/components/form-section";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Escolha } from "./Escolha";

// Entrega ao cliente (11/10/2026): o PCP confirma e isso conclui o Aceite. Pode ser total, parcial
// (o saldo fica pendente, com nova previsão) ou cancelar o saldo (com motivo).
export function FormEntrega({ aceiteId, loteId, dataEntrega, saldo }: { aceiteId: string; loteId?: string | null; dataEntrega: string; saldo: number | null }) {
  const [state, onSubmit, pending] = useFormActionSemReset(confirmarEntrega, undefined);
  const [modo, setModo] = useState("total");
  const [qtd, setQtd] = useState("");
  const hoje = new Date().toLocaleDateString("en-CA");
  const q = lerQuantidade(qtd);
  const resta = saldo !== null && q !== null ? Math.max(0, saldo - q) : null;
  const botao = modo === "parcial" ? "Registrar entrega parcial" : modo === "cancelar" ? "Cancelar o saldo e concluir" : "Confirmar entrega e concluir";

  return (
    <form id="form-aceite-entrega" onSubmit={onSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={aceiteId} />
      <input type="hidden" name="loteId" value={loteId ?? ""} />
      <input type="hidden" name="modo" value={modo} />
      <FormSection title="Entrega ao cliente">
        <DiretrizBlock>
          O cliente já foi avisado da data ({dataEntrega}). Confirme a entrega: o Aceite só é concluído quando tudo foi entregue ou o saldo foi cancelado.
          {saldo !== null && <> Saldo a entregar: <b>{fmtQuantidade(saldo)} un.</b></>}
        </DiretrizBlock>
        <Escolha
          rotulo="Como foi a entrega"
          valor={modo}
          onChange={setModo}
          opcoes={[
            { key: "total", label: "Entregue tudo", tom: "good" },
            { key: "parcial", label: "Entrega parcial (fica saldo)", tom: "warn" },
            { key: "cancelar", label: "Cancelar o saldo", tom: "bad" },
          ]}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Data da entrega">
            <Input type="date" name="entregueEm" defaultValue={hoje} max={hoje} required />
          </Field>
          {modo !== "total" && (
            <Field label={modo === "cancelar" ? "Entregue agora (opcional)" : "Quantidade entregue"}>
              <Input name="quantidade" inputMode="decimal" required={modo === "parcial"} value={qtd} onChange={(e) => setQtd(e.target.value)} />
            </Field>
          )}
          {modo === "parcial" && (
            <>
              <Field label="Previsão do saldo">
                <Input type="date" name="dataSaldo" required />
              </Field>
              {resta !== null && (
                <div className="self-end rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Saldo pendente</div>
                  <div className="font-mono font-semibold text-warn">{fmtQuantidade(resta)} un.</div>
                </div>
              )}
            </>
          )}
        </div>
        {modo === "cancelar" && (
          <Field label="Motivo de cancelar o saldo" hint="Obrigatório: fica registrado no Aceite.">
            <Input name="motivo" required />
          </Field>
        )}
        <Field label="Observação (opcional)">
          <Input name="entregaObs" placeholder="Ex.: NF 12345" />
        </Field>
      </FormSection>
      {state?.erro && <div className="anexo-erro">{state.erro}</div>}
      {state?.ok && <div className="text-sm text-good">{state.ok}</div>}
      <AcoesBar>
        <Button type="submit" disabled={pending}>{pending ? "Salvando…" : botao}</Button>
      </AcoesBar>
    </form>
  );
}
