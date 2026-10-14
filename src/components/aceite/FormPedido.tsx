"use client";

import { useFormActionSemReset } from "@/hooks/use-form-action";
import { salvarPedido, salvarNumeroOF, salvarPedidoInterno } from "@/app/(app)/aceite/actions";
import { FormSection, Field, DiretrizBlock, AcoesBar } from "@/components/form-section";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Cadastro do pedido (TP de Vendas 3.2.2): Vendas cadastra no sistema informatizado e passa o Aceite
// ao Atendimento ao Cliente, que envia a data ao cliente e/ou representante (ver FormInformarCliente).
export function FormPedido({ aceiteId, numero, dataEntrega, pedidoInterno }: { aceiteId: string; numero: string | null; dataEntrega: string; pedidoInterno: string | null }) {
  const [state, onSubmit, pending] = useFormActionSemReset(salvarPedido, undefined);
  return (
    <form id="form-aceite-pedido" onSubmit={onSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={aceiteId} />
      <FormSection title="Pedido">
        <DiretrizBlock>
          Cadastre o pedido{numero ? ` ${numero}` : ""} no sistema informatizado com a data de entrega ({dataEntrega}). Em seguida o Aceite vai para o Atendimento ao Cliente, que envia a data ao cliente e/ou representante.
        </DiretrizBlock>
        <Field label="Pedido interno" hint={pedidoInterno ? undefined : "Obrigatório para cadastrar o pedido (ainda não foi informado)."}>
          <Input name="pedidoInterno" defaultValue={pedidoInterno ?? ""} required />
        </Field>
        <Field label="Nº da OF" hint="Se a Ordem de Fabricação ainda não foi aberta, deixe em branco: fica como pendência de Vendas até ser registrada.">
          <Input name="numeroOF" />
        </Field>
      </FormSection>
      {state?.erro && <div className="anexo-erro">{state.erro}</div>}
      <AcoesBar>
        <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Cadastrei: passar ao Atendimento"}</Button>
      </AcoesBar>
    </form>
  );
}

// Depois de concluído: Vendas registra o Nº da OF quando abrir a Ordem de Fabricação.
export function FormNumeroOF({ aceiteId, atual }: { aceiteId: string; atual: string | null }) {
  const [state, onSubmit, pending] = useFormActionSemReset(salvarNumeroOF, undefined);
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={aceiteId} />
      <Field label="Nº da OF">
        <Input name="numeroOF" defaultValue={atual ?? ""} className="w-40" />
      </Field>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Salvando…" : atual ? "Atualizar OF" : "Registrar OF"}
      </Button>
      {state?.erro && <span className="text-sm text-bad">{state.erro}</span>}
      {!state?.erro && state?.ok && <span className="text-sm text-good">{state.ok}</span>}
    </form>
  );
}

// Pendência de Vendas: depois da Engenharia, informar o pedido interno (pode ser a qualquer momento).
export function FormPedidoInterno({ aceiteId }: { aceiteId: string }) {
  const [state, onSubmit, pending] = useFormActionSemReset(salvarPedidoInterno, undefined);
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2 rounded-lg border border-warn/40 bg-warn-soft/40 p-3">
      <input type="hidden" name="id" value={aceiteId} />
      <Field label="Pedido interno (a Engenharia já confirmou: falta informar)">
        <Input name="pedidoInterno" className="w-56" required />
      </Field>
      <Button type="submit" size="sm" disabled={pending}>{pending ? "Salvando…" : "Registrar pedido interno"}</Button>
      {state?.erro && <span className="text-sm text-bad">{state.erro}</span>}
      {!state?.erro && state?.ok && <span className="text-sm text-good">{state.ok}</span>}
    </form>
  );
}
