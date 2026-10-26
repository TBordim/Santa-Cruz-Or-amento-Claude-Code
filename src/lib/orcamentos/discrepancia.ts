import type { PrecificacaoTier } from "./types";

// Texto de cada campo que passou do limite: "Último preço: 1.000 → 1.080 (+8%)". Sem acesso ao banco.
export function textoItemDiscrepancia(x: { label: string; anterior: number; atual: number; variacao: number; pontos?: boolean }): string {
  const n = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  return `${x.label}: ${n(x.anterior)} → ${n(x.atual)} (${x.atual >= x.anterior ? "+" : "−"}${n(x.variacao)}${x.pontos ? " pontos" : "%"})`;
}

type Item = { label: string; anterior: number; atual: number; variacao: number; pontos?: boolean };

// Alertas gravados antes de 26/10/2026 mediam custo primário e margem P2 em variação relativa (0,52% -> 0%
// dava "-100%"). Agora esses dois campos contam em pontos percentuais; ao ler, refaz a conta dos antigos
// e descarta o que não passa de 2,5 pontos. Sem mexer no que está gravado.
export function itensVigentes(itens: Item[] | undefined): Item[] {
  return (itens ?? [])
    .map((x) => (x.pontos === undefined && /^(Custo|Margem)/.test(x.label) ? { ...x, pontos: true, variacao: Math.abs(x.atual - x.anterior) } : x))
    .filter((x) => x.variacao > 2.5);
}

// SOs de um orçamento com discrepância acima do limite, pra lista da Diretoria e o quadro.
export function discrepanciasDoOrcamento(tiers: PrecificacaoTier[] | null | undefined) {
  return (tiers ?? [])
    .map((t) => (t.discrepancia ? { ...t.discrepancia, itens: itensVigentes(t.discrepancia.itens) } : null))
    .filter((d): d is NonNullable<typeof d> => !!d && d.itens.length > 0);
}
