"use client";

import { useFormActionSemReset } from "@/hooks/use-form-action";
import { Button } from "@/components/ui/button";
import { marcarAnexoComoArte } from "@/app/(app)/atendimento/arte/actions";

// Arquivos da ordem de compra que ainda não estão na fila de protocolo: se algum for a arte do cliente,
// Atendimento ou Vendas o envia para protocolo com um clique.
export function MarcarComoArte({ anexos }: { anexos: { id: string; nome: string }[] }) {
  if (!anexos.length) return null;
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-warn/30 bg-warn-soft p-3 text-sm">
      <p className="font-medium text-foreground">Algum destes arquivos é a arte do cliente?</p>
      <p className="text-xs text-muted-foreground">Arte precisa de protocolo de Vendas, e o Aceite só segue para a Engenharia depois dele. Arquivos da ordem de compra não entram na fila sozinhos.</p>
      {anexos.map((a) => (
        <LinhaArte key={a.id} anexo={a} />
      ))}
    </div>
  );
}

function LinhaArte({ anexo }: { anexo: { id: string; nome: string } }) {
  const [state, onSubmit, pending] = useFormActionSemReset(marcarAnexoComoArte, undefined);
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="anexoId" value={anexo.id} />
      <span className="min-w-0 truncate text-xs text-foreground">{anexo.nome}</span>
      <Button type="submit" size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={pending || !!state?.ok}>
        {pending ? "Enviando…" : state?.ok ? "Enviado" : "É arte: enviar para protocolo"}
      </Button>
      {state?.erro && <span className="text-xs text-bad">{state.erro}</span>}
    </form>
  );
}
