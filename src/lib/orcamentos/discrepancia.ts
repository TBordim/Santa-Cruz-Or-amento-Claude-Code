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

// O que o próprio sistema já explica sobre a discrepância, sem a orçamentista escrever (pedido do
// Thiago em 26/10/2026): a quantidade pedida mudou (a diferença de quantidade é auto-explicativa) ou
// alguma premissa mudou em relação ao orçamento anterior (quantidade produzida, lotes, setups,
// acabamento), o que justifica preço, custo e margem diferentes. Sem nada disso, o motivo não está
// claro e a orçamentista precisa escrever.
type ComDiscrepancia = Pick<
  PrecificacaoTier,
  "discrepancia" | "premissasDivergentes" | "quantidadeAnterior" | "numeroLotesAnterior" | "numeroSetupsAnterior" | "acabamentoAnterior"
>;

// Só conta a premissa que o sistema consegue comparar de verdade: o anterior vindo do Arquivo legado não
// tem lotes, setups nem acabamento, e aí "mudou" seria só falta de dado.
function premissasComparaveis(t: ComDiscrepancia): string[] {
  const tem = (v: string | null | undefined) => !!v && v.trim() !== "";
  return (t.premissasDivergentes ?? []).filter((p) => {
    if (p === "Número de lotes") return tem(t.numeroLotesAnterior);
    if (p === "Número de setups") return tem(t.numeroSetupsAnterior);
    if (p === "Acabamento") return tem(t.acabamentoAnterior);
    if (p === "Quantidade produzida") return tem(t.quantidadeAnterior);
    return true;
  });
}

export function explicacaoDoSistema(t: ComDiscrepancia): string | null {
  const itens = itensVigentes(t.discrepancia?.itens);
  if (!itens.length) return null;
  const premissas = premissasComparaveis(t);
  if (premissas.length) return `Mudou em relação ao orçamento anterior: ${premissas.join(", ")}.`;
  if (itens.every((x) => x.label.startsWith("Quantidade"))) return "Mudou a quantidade pedida pelo cliente.";
  return null;
}

export function precisaDeMotivo(t: ComDiscrepancia): boolean {
  return itensVigentes(t.discrepancia?.itens).length > 0 && explicacaoDoSistema(t) === null;
}
