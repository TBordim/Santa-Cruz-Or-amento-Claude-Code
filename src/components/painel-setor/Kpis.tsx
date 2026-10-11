import Link from "next/link";

export type Kpi = {
  key: string;
  n: number;
  label: string;
  // Cor da borda de cima: a do módulo, vermelho pra alerta, ou neutra.
  tom: "modulo" | "bad" | "neutro";
};

// Números do topo das telas de setor (formato "painel + agenda", escolhido em 08/10/2026). Cada
// número é um filtro: clicar mostra só aquilo na lista e na agenda; clicar de novo mostra tudo.
// `manter`: outros parâmetros da URL que os filtros não podem perder (ex.: o período da agenda do PCP).
export function Kpis({ itens, base, ativo, corModulo, manter = "" }: { itens: Kpi[]; base: string; ativo: string | null; corModulo: string; manter?: string }) {
  const semFiltro = manter ? `${base}?${manter}` : base;
  const atual = itens.find((k) => k.key === ativo);
  return (
    <div className="flex flex-col gap-2">
      <div className={`grid grid-cols-2 gap-3 ${itens.length >= 6 ? "sm:grid-cols-3 lg:grid-cols-6" : itens.length === 5 ? "lg:grid-cols-5" : itens.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        {itens.map((k) => {
          const sel = ativo === k.key;
          const cor = k.tom === "bad" ? "var(--bad)" : k.tom === "modulo" ? corModulo : "var(--line-strong)";
          return (
            <Link
              key={k.key}
              href={sel ? semFiltro : `${base}?filtro=${k.key}${manter ? `&${manter}` : ""}`}
              aria-pressed={sel}
              className={`flex flex-col gap-0.5 rounded-xl border bg-card px-4 py-3 no-underline transition-shadow hover:shadow-md ${sel ? "border-foreground/40 shadow-md ring-2 ring-foreground/15" : "border-border"}`}
              style={{ borderTopWidth: 3, borderTopColor: cor }}
            >
              <span className={`font-serif text-3xl font-semibold leading-tight ${k.tom === "bad" && k.n ? "text-bad" : "text-foreground"}`}>{k.n}</span>
              <span className="text-xs text-muted-foreground">{k.label}</span>
            </Link>
          );
        })}
      </div>
      {atual && (
        <p className="text-xs text-muted-foreground">
          Filtrando por: {atual.label}.{" "}
          <Link href={semFiltro} className="text-foreground underline">
            Mostrar tudo
          </Link>
        </p>
      )}
    </div>
  );
}
