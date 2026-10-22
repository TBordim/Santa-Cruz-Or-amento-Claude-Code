// Apresentação dos treinamentos: rótulo e cor do módulo, duração. Funções puras (sem banco), podem ser usadas
// também em componentes de cliente.
import { MODULOS, type ModuloKey } from "@/lib/modulos";

// Módulos que podem ter treinamento (o seletor da tela de gerenciar usa esta lista).
export const MODULOS_COM_TREINAMENTO: { key: ModuloKey; label: string }[] = MODULOS.filter(
  (m) => m.key !== "administracao" && m.key !== "treinamentos",
).map((m) => ({ key: m.key, label: m.label }));

export function rotuloDoModulo(chave: string): string {
  return MODULOS.find((m) => m.key === chave)?.label ?? chave;
}

// Cores dos selos de módulo (as mesmas do cartão na página de entrada).
const COR_DO_MODULO: Record<string, string> = {
  orcamento: "#26405C",
  laboratorio: "#7A3B69",
  treinamentos: "#2F6B5E",
  administracao: "#233248",
};
export function corDoModulo(chave: string): string {
  return COR_DO_MODULO[chave] ?? "#5B6270";
}

export function formatarDuracao(segundos: number | null): string | null {
  if (!segundos || segundos <= 0) return null;
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return min === 0 ? `${seg} s` : seg === 0 ? `${min} min` : `${min} min ${seg} s`;
}
