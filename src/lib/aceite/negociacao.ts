// Negociação de data de entrega (08/10/2026): o cliente não aceita a data prevista, o Atendimento
// registra a data que ele quer, o PCP reanalisa e responde, e o Atendimento informa o cliente. Sem
// acesso ao banco: serve às ações e às telas.

export const RESULTADOS_NEGOCIACAO = [
  { key: "ATENDE", label: "Dá para atender a data pedida" },
  { key: "OUTRA_DATA", label: "Dá para outra data" },
  { key: "MANTIDA", label: "Não dá para mudar: mantém a data" },
] as const;

export type ResultadoNegociacaoKey = (typeof RESULTADOS_NEGOCIACAO)[number]["key"];

export function resultadoLabel(key: string | null | undefined): string {
  return RESULTADOS_NEGOCIACAO.find((r) => r.key === key)?.label ?? "—";
}

export const STATUS_NEGOCIACAO_LABEL: Record<string, string> = {
  AGUARDANDO_PCP: "Esperando o PCP reanalisar",
  AGUARDANDO_ATENDIMENTO: "PCP respondeu: falta informar o cliente",
  ENCERRADA: "Encerrada",
};

type NegResumo = { status: string };

export function negociacaoAberta<T extends NegResumo>(negs: T[] | undefined): T | undefined {
  return negs?.find((n) => n.status !== "ENCERRADA");
}
