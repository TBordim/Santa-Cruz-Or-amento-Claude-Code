"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TableRow } from "@/components/ui/table";

export type DicaLinha = { k: string; v: string };

// Passar o mouse (ou focar, via teclado) na linha mostra dados que não cabem em nenhuma coluna
// da tabela — custo primário, margem P2, quem decidiu e quando, comentário da diretoria — sem
// precisar abrir o card. Pedido do Thiago em 18/09/2026, mesmo padrão do
// santa-cruz-orcamentos.html original (tooltip rico do Histórico).
export function LinhaComDica({ linhas, children }: { linhas: DicaLinha[]; children: React.ReactNode }) {
  if (linhas.length === 0) return <TableRow>{children}</TableRow>;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <TableRow>{children}</TableRow>
      </TooltipTrigger>
      <TooltipContent side="top" align="center" className="flex-col items-start gap-1 py-2 text-left">
        {linhas.map((l) => (
          <div key={l.k} className="flex w-full items-center justify-between gap-4">
            <span className="opacity-75">{l.k}</span>
            <span className="font-mono font-semibold">{l.v}</span>
          </div>
        ))}
      </TooltipContent>
    </Tooltip>
  );
}
