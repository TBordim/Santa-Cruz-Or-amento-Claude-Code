"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

type Painel = { key: string; titulo: string; cor: string; children: ReactNode };

// Quadros retráteis com o que foi preenchido nas etapas anteriores, no topo da gaveta — cada
// setor enxerga tudo que veio antes dele. Sanfona (só um aberto por vez) e todos recolhidos ao
// abrir, pra não empurrar o formulário da etapa atual pra baixo (decisão do Thiago e da equipe
// em 24/09/2026). O conteúdo de cada quadro é montado no servidor (EtapasAnteriores.tsx).
export function AcordeaoEtapas({ paineis }: { paineis: Painel[] }) {
  const [aberto, setAberto] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Etapas anteriores</div>
      {paineis.map((p) => {
        const on = aberto === p.key;
        return (
          <div key={p.key} className="rounded-lg border border-border" style={{ borderLeftColor: p.cor, borderLeftWidth: 4 }}>
            <button
              type="button"
              aria-expanded={on}
              onClick={() => setAberto(on ? null : p.key)}
              className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-foreground hover:bg-muted/40"
            >
              <span>{p.titulo}</span>
              {on ? <ChevronUp className="h-3.5 w-3.5 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0" />}
            </button>
            {on && <div className="flex flex-col gap-3 border-t border-border p-3">{p.children}</div>}
          </div>
        );
      })}
    </div>
  );
}
