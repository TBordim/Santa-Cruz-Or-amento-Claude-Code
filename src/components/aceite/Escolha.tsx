"use client";

export type OpcaoEscolha = {
  key: string;
  label: string;
  // Cor quando escolhida: verde (bom), âmbar (atenção), vermelho (problema) ou a cor principal.
  tom?: "good" | "warn" | "bad" | "primaria";
};

const ESCOLHIDA: Record<NonNullable<OpcaoEscolha["tom"]>, string> = {
  good: "border-good bg-good-soft text-good",
  warn: "border-warn bg-warn-soft text-warn",
  bad: "border-bad bg-bad-soft text-bad",
  primaria: "border-primary bg-accent text-accent-foreground",
};

const PONTO: Record<NonNullable<OpcaoEscolha["tom"]>, string> = {
  good: "border-good bg-good",
  warn: "border-warn bg-warn",
  bad: "border-bad bg-bad",
  primaria: "border-primary bg-primary",
};

// Botões de escolha única das telas do Aceite (situação do papel, tipo de material, resposta do
// PCP…). Antes eram contornos claros que pareciam apagados (pedido do Thiago em 11/10/2026): agora
// cada opção tem fundo branco, borda marcada e um círculo de seleção, e a escolhida fica colorida.
export function Escolha({
  opcoes,
  valor,
  onChange,
  rotulo,
}: {
  opcoes: readonly OpcaoEscolha[];
  valor: string;
  onChange: (key: string) => void;
  rotulo: string;
}) {
  return (
    <div role="radiogroup" aria-label={rotulo} className="flex flex-wrap gap-2">
      {opcoes.map((o) => {
        const sel = valor === o.key;
        const tom = o.tom ?? "primaria";
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={sel}
            onClick={() => onChange(o.key)}
            className={`inline-flex min-h-9 items-center gap-2 rounded-lg border-[1.5px] px-3.5 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
              sel ? `${ESCOLHIDA[tom]} font-semibold shadow-sm` : "border-line-strong bg-card font-medium text-foreground hover:border-foreground/40 hover:bg-muted/40"
            }`}
          >
            <span
              aria-hidden
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px] ${sel ? PONTO[tom] : "border-line-strong bg-card"}`}
            >
              {sel && <span className="h-1.5 w-1.5 rounded-full bg-card" />}
            </span>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
