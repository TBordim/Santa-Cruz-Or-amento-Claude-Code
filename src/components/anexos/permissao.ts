import type { AreaKey } from "@/lib/areas";

// Áreas que controlam cada tipo de anexo — arte é anexada em Em Aberto, anexos técnicos em
// Engenharia (mesma regra de podeEditar por etapa do sistema atual). Ordem de compra do cliente: só
// quem registra o desfecho (Retorno do Cliente) anexa; Vendas e os demais só consultam no Aceite.
export type TipoAnexoKey = "ARTE" | "ENGENHARIA" | "ORDEM_COMPRA";
const AREAS_POR_TIPO: Record<TipoAnexoKey, AreaKey[]> = {
  ARTE: ["ABERTO"],
  ENGENHARIA: ["ENGENHARIA"],
  ORDEM_COMPRA: ["FINALIZADO"],
};
export const tipoDe = (v: unknown): TipoAnexoKey => (v === "ENGENHARIA" || v === "ORDEM_COMPRA" ? v : "ARTE");

export function podeAnexar(sessao: { admin: boolean; areas: string[] }, tipo: unknown): boolean {
  return sessao.admin || AREAS_POR_TIPO[tipoDe(tipo)].some((a) => sessao.areas.includes(a));
}
