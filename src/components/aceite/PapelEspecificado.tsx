"use client";

import { useState } from "react";
import { useFormActionSemReset } from "@/hooks/use-form-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { salvarPapelEspecificado } from "@/app/(app)/aceite/actions";
import { textoSuporte, type SuporteAceite } from "@/lib/aceite/suportes";
import type { FormState } from "@/lib/aceite/servidor";

type Especificado = NonNullable<SuporteAceite["doOrcamento"]>;

// Papel ESPECIFICADO (o que o cliente pediu), visível a todos os setores. Vendas pode corrigi-lo aqui quando a
// especificação mudou; a Engenharia sempre vê o especificado, além do papel que será utilizado.
export function PapelEspecificado({ aceiteId, suporteId, valor, editavel }: { aceiteId: string; suporteId: string; valor: Especificado; editavel: boolean }) {
  const [editando, setEditando] = useState(false);
  const [state, onSubmit, pending] = useFormActionSemReset(async (p: FormState, fd: FormData) => {
    const r = await salvarPapelEspecificado(p, fd);
    if (r?.ok) setEditando(false);
    return r;
  }, undefined as FormState);

  if (editando && editavel) {
    return (
      <form onSubmit={onSubmit} className="flex w-full flex-col gap-2 md:items-end">
        <input type="hidden" name="id" value={aceiteId} />
        <input type="hidden" name="suporteId" value={suporteId} />
        <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
          <Input name="descricao" defaultValue={valor.descricao} placeholder="Tipo de papel" aria-label="Tipo de papel especificado" className="h-8 text-xs" autoFocus />
          <Input name="gramatura" defaultValue={valor.gramatura} inputMode="numeric" placeholder="Gramatura (g)" aria-label="Gramatura especificada" className="h-8 text-xs" />
          <Input name="codigo" defaultValue={valor.codigo} placeholder="Código" aria-label="Código do papel especificado" className="h-8 text-xs" />
          <Input name="formato" defaultValue={valor.formato} placeholder="Formato" aria-label="Formato especificado" className="h-8 text-xs" />
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={pending}>
            {pending ? "Salvando…" : "Salvar papel especificado"}
          </Button>
          <button type="button" className="text-xs text-muted-foreground underline" onClick={() => setEditando(false)}>
            cancelar
          </button>
          {state?.erro && <span className="text-xs text-bad">{state.erro}</span>}
        </div>
      </form>
    );
  }
  return (
    <span className="text-right">
      {textoSuporte(valor)} · código {valor.codigo || "—"}
      {editavel && (
        <button type="button" className="ml-2 whitespace-nowrap text-xs underline" onClick={() => setEditando(true)}>
          alterar
        </button>
      )}
      {valor.alteradoPor && (
        <span className="block text-xs text-muted-foreground">
          alterado por {valor.alteradoPor}
          {valor.original ? ` (no orçamento: ${valor.original})` : ""}
        </span>
      )}
    </span>
  );
}
