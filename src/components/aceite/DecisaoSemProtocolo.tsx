"use client";

import { useState } from "react";
import { useFormActionSemReset } from "@/hooks/use-form-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dispensarArteAction, reabrirArteAction } from "@/app/(app)/protocolos/actions";

// Vendas diz que o arquivo recebido não é arte (ou não precisa de protocolo), com o motivo; ou reabre se foi engano.
export function DispensarArte({ arteId }: { arteId: string }) {
  const [aberto, setAberto] = useState(false);
  const [state, onSubmit, pending] = useFormActionSemReset(dispensarArteAction, undefined);
  if (!aberto) {
    return (
      <button type="button" className="self-start text-xs underline" onClick={() => setAberto(true)}>
        Não precisa de protocolo
      </button>
    );
  }
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="arteId" value={arteId} />
      <Input name="motivo" required placeholder="Motivo (ex.: é um e-mail, não é arte)" aria-label="Motivo de não precisar de protocolo" className="h-8 max-w-80 text-xs" autoFocus />
      <Button type="submit" size="sm" variant="outline" className="h-8 px-2 text-xs" disabled={pending}>
        {pending ? "Salvando…" : "Dispensar protocolo"}
      </Button>
      <button type="button" className="text-xs text-muted-foreground underline" onClick={() => setAberto(false)}>
        cancelar
      </button>
      {state?.erro && <span className="text-xs text-bad">{state.erro}</span>}
    </form>
  );
}

export function ReabrirArte({ arteId }: { arteId: string }) {
  const [state, onSubmit, pending] = useFormActionSemReset(reabrirArteAction, undefined);
  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      <input type="hidden" name="arteId" value={arteId} />
      <Button type="submit" size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={pending}>
        {pending ? "Reabrindo…" : "Reabrir (era arte)"}
      </Button>
      {state?.erro && <span className="text-xs text-bad">{state.erro}</span>}
    </form>
  );
}
