"use client";

import { useFormActionSemReset } from "@/hooks/use-form-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/form-section";
import { salvarCodigoCliente } from "@/app/(app)/aceite/actions";

// Vendas inclui ou altera o código do cliente de cada modelo (o cliente pode mandar depois do desfecho).
export function CodigoClienteAceite({ aceiteId, modelos }: { aceiteId: string; modelos: { id: string; descricao: string; codigoCliente: string }[] }) {
  const [state, onSubmit, pending] = useFormActionSemReset(salvarCodigoCliente, undefined);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2.5 rounded-lg border border-border p-3">
      <input type="hidden" name="id" value={aceiteId} />
      <span className="text-sm font-semibold text-foreground">Código do cliente</span>
      <p className="text-xs text-muted-foreground">Opcional. Se o cliente mandou o código depois do pedido, ou pediu para trocá-lo, atualize aqui; a Engenharia vê o que estiver salvo.</p>
      <div className={`grid grid-cols-1 gap-2.5 ${modelos.length > 1 ? "md:grid-cols-2" : ""}`}>
        {modelos.map((m) => (
          <Field key={m.id} label={modelos.length > 1 ? `Código do cliente · ${m.descricao || "modelo"}` : "Código do cliente"}>
            <Input name={`codigoCliente_${m.id}`} defaultValue={m.codigoCliente} />
          </Field>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "Salvando…" : "Salvar código do cliente"}
        </Button>
        {state?.ok && <span className="text-xs text-good">{state.ok}</span>}
        {state?.erro && <span className="text-xs text-bad">{state.erro}</span>}
      </div>
    </form>
  );
}
