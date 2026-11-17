"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { SEM_PEDIDO_INTERNO } from "@/lib/aceite/constantes";

// Pedido interno com a saída "sem pedido": calendários, envelopes e outros pedidos internos da gráfica não entram na
// carteira e só geram número de OF. Marcado, o campo deixa de ser obrigatório e o Aceite para de cobrar o número.
export function CampoPedidoInterno({ valorInicial, obrigatorio = false, className }: { valorInicial?: string | null; obrigatorio?: boolean; className?: string }) {
  const [sem, setSem] = useState(valorInicial === SEM_PEDIDO_INTERNO);
  return (
    <div className="flex flex-col gap-1.5">
      <Input name="pedidoInterno" className={className} defaultValue={valorInicial && valorInicial !== SEM_PEDIDO_INTERNO ? valorInicial : ""} required={obrigatorio && !sem} disabled={sem} aria-label="Pedido interno" />
      <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
        <input type="checkbox" name="semPedidoInterno" className="h-3.5 w-3.5 accent-primary" checked={sem} onChange={(e) => setSem(e.target.checked)} />
        Pedido interno da gráfica (calendário, envelope…): não gera pedido, só OF
      </label>
    </div>
  );
}
