import type { PrecificacaoTier } from "./types";

// Texto de cada campo que passou do limite: "Último preço: 1.000 → 1.080 (+8%)". Sem acesso ao banco.
export function textoItemDiscrepancia(x: { label: string; anterior: number; atual: number; variacao: number }): string {
  const n = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  return `${x.label}: ${n(x.anterior)} → ${n(x.atual)} (${x.atual >= x.anterior ? "+" : "−"}${n(x.variacao)}%)`;
}

// SOs de um orçamento com discrepância acima do limite, pra lista da Diretoria e o quadro.
export function discrepanciasDoOrcamento(tiers: PrecificacaoTier[] | null | undefined) {
  return (tiers ?? []).filter((t) => t.discrepancia?.itens?.length).map((t) => t.discrepancia!);
}
