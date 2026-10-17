"use client";

import { useFormActionSemReset } from "@/hooks/use-form-action";
import { enviarArteParaVendas } from "./actions";
import { AnexosNovo } from "@/components/orcamento/AnexosNovo";
import { Field } from "@/components/form-section";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Opcao = { id: string; rotulo: string };

export function EnviarArteForm({ orcamentos }: { orcamentos: Opcao[] }) {
  const [estado, onSubmit, pending] = useFormActionSemReset(enviarArteParaVendas, undefined);

  return (
    <form onSubmit={onSubmit} className="flex max-w-[760px] flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <Field label="Orçamento" hint="O orçamento (pedido) a que esta arte pertence.">
        <select name="orcamentoId" required defaultValue="" className="h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base md:h-8 md:text-sm">
          <option value="" disabled>Escolha o orçamento…</option>
          {orcamentos.map((o) => <option key={o.id} value={o.id}>{o.rotulo}</option>)}
        </select>
      </Field>
      <Field label="Quando a arte chegou">
        <select name="origem" defaultValue="ATENDIMENTO" className="h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base md:h-8 md:text-sm">
          <option value="ATENDIMENTO">Pelo Atendimento (e-mail, mensagem...)</option>
          <option value="ORDEM_DE_COMPRA">Junto da ordem de compra</option>
        </select>
      </Field>
      <Field label="Arquivos da arte" hint="Imagens ou PDF. Opcional se você informar o link.">
        <AnexosNovo />
      </Field>
      <Field label="Link da arte (Drive, WeTransfer...)" hint="Opcional se você anexou arquivos.">
        <Input name="link" inputMode="url" placeholder="https://drive.google.com/..." />
      </Field>
      {estado?.erro && <div className="anexo-erro">{estado.erro}</div>}
      {estado?.ok && <div className="rounded-lg border border-border bg-good-soft px-3 py-2 text-sm text-good">{estado.ok}</div>}
      <div>
        <Button type="submit" disabled={pending}>{pending ? "Enviando…" : "Enviar para Vendas"}</Button>
      </div>
    </form>
  );
}
