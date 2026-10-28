"use client";

import { useState } from "react";
import { useFormActionSemReset } from "@/hooks/use-form-action";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { salvarCodigoCliente } from "@/app/(app)/aceite/actions";
import type { FormState } from "@/lib/aceite/servidor";

// Código do cliente na linha do produto (junto da descrição e do Nº de Cadastro). Com `aceiteId`, Vendas inclui ou
// troca o código ali mesmo (o cliente pode mandar ou mudar depois do desfecho); sem ele, só mostra.
export function CodigoClienteInline({ modeloId, codigo, aceiteId }: { modeloId: string; codigo: string; aceiteId?: string }) {
  const [editando, setEditando] = useState(false);
  const [state, onSubmit, pending] = useFormActionSemReset(async (p: FormState, fd: FormData) => {
    const r = await salvarCodigoCliente(p, fd);
    if (r?.ok) setEditando(false);
    return r;
  }, undefined as FormState);
  if (editando && aceiteId) {
    return (
      <form onSubmit={onSubmit} className="mt-1 flex flex-wrap items-center gap-1.5">
        <input type="hidden" name="id" value={aceiteId} />
        <Input name={`codigoCliente_${modeloId}`} defaultValue={codigo} placeholder="Código do cliente" aria-label="Código do cliente" className="h-7 w-44 text-xs" autoFocus />
        <Button type="submit" size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={pending}>
          {pending ? "Salvando…" : "Salvar"}
        </Button>
        <button type="button" className="text-xs text-muted-foreground underline" onClick={() => setEditando(false)}>
          cancelar
        </button>
        {state?.erro && <span className="text-xs text-bad">{state.erro}</span>}
      </form>
    );
  }
  return (
    <span className="mt-0.5 block text-xs text-muted-foreground">
      Cód. cliente: <span className="font-mono text-foreground">{codigo || "—"}</span>
      {aceiteId && (
        <button type="button" className="ml-2 underline" onClick={() => setEditando(true)}>
          {codigo ? "alterar" : "incluir"}
        </button>
      )}
    </span>
  );
}
