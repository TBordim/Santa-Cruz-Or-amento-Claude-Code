// "Acabamento" da planilha do PCP: Sim quando o pedido tem algum processo especial. Definição do
// Thiago: em 08/10/2026, hot stamping, relevo e high gloss (verniz UV, corte e vinco e colagem NÃO são
// especiais); em 11/10/2026 entraram também acetato, perolado, blister (PVC e PET), fungicida,
// impermeabilizante e qualquer plastificação. Lido do que a Solicitação de Orçamento marcou.

const ESPECIAIS = [
  "Hot-Stamping",
  "Relevo Seco",
  "Relevo Brailler",
  "High Gloss",
  "Acetato",
  "Perolado",
  "Blister PVC",
  "Blister PET",
  "Fungicida",
  "Impermeabilizante",
];

export function acabamentosEspeciais(
  reqCliente: { acabamentos?: string[]; verniz?: string[]; plastico?: string[] } | null | undefined,
): string[] {
  if (!reqCliente) return [];
  const especiais = [...(reqCliente.acabamentos ?? []), ...(reqCliente.verniz ?? [])].filter((x) => ESPECIAIS.includes(x));
  // Plastificação (polietileno, BOPP, brilho, fosco...): qualquer uma é processo especial.
  return reqCliente.plastico?.length ? [...especiais, "Plastificação"] : especiais;
}
