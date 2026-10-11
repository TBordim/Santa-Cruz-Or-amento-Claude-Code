// "Acabamento" da planilha do PCP: Sim quando o pedido tem algum processo especial. Especiais: hot
// stamping, relevo e high gloss. Verniz UV, corte e vinco e colagem não são especiais (definição do
// Thiago em 08/10/2026). Lido do que a Solicitação de Orçamento marcou (acabamentos e verniz).

const ESPECIAIS = ["Hot-Stamping", "Relevo Seco", "Relevo Brailler", "High Gloss"];

export function acabamentosEspeciais(reqCliente: { acabamentos?: string[]; verniz?: string[] } | null | undefined): string[] {
  if (!reqCliente) return [];
  return [...(reqCliente.acabamentos ?? []), ...(reqCliente.verniz ?? [])].filter((x) => ESPECIAIS.includes(x));
}
