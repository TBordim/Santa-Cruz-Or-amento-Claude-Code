// Margem bruta = P1 + P2 (pedido do Thiago em 28/10/2026). P1 é a margem de contribuição para os custos
// fixos e vai no máximo até 15%; o que passa disso é P2. Por isso, com P2 acima de zero o P1 é sempre
// 15 e a margem bruta é 15 + P2 (ex.: 15 + 2 = 17%). Quando P2 é zero ou não existe, a margem pode estar
// abaixo de 15 e é preciso dizer qual é o P1. Sem acesso ao banco: serve às telas e às ações.

export const LIMITE_P1 = 15;

// "1.234,5", "12,5%" ou "12.5" -> número; vazio ou inválido -> null.
export function numeroDoCampo(bruto: unknown): number | null {
  const t = String(bruto ?? "").replace(/[%\s]/g, "");
  if (!t) return null;
  const n = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
  return Number.isFinite(n) ? n : null;
}

export const p2ZeradaOuVazia = (p2: number | null | undefined) => !(typeof p2 === "number" && p2 > 0);

export type MargemBruta = {
  p1: number | null;
  p2: number | null;
  // Soma P1 + P2; null quando não dá para saber (P2 zerada e P1 não informado).
  bruta: number | null;
  // "17% (P1 15 + P2 2)", "12% (P1 12, P2 zerada)", "P2 zerada, P1 não informado" ou "—".
  texto: string;
};

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

export function margemBruta(p2: number | null | undefined, p1: number | null | undefined): MargemBruta {
  const dois = typeof p2 === "number" ? p2 : null;
  if (dois !== null && dois > 0) {
    return { p1: LIMITE_P1, p2: dois, bruta: LIMITE_P1 + dois, texto: `${fmt(LIMITE_P1 + dois)}% (P1 ${LIMITE_P1} + P2 ${fmt(dois)})` };
  }
  if (typeof p1 === "number") return { p1, p2: 0, bruta: p1, texto: `${fmt(p1)}% (P1 ${fmt(p1)}, P2 zerada)` };
  return { p1: null, p2: dois, bruta: null, texto: dois === 0 ? "P2 zerada, P1 não informado" : "—" };
}

// Mensagem de erro (ou null) para o P1 informado junto com o P2: P2 zerada exige P1 de 0 a 15; P1 acima de
// 15 não existe (vira P2).
export function erroNaMargem(p2: number | null | undefined, p1: number | null | undefined): string | null {
  if (typeof p1 === "number" && (p1 < 0 || p1 > LIMITE_P1)) return `A margem P1 vai de 0 a ${LIMITE_P1}%: o que passa de ${LIMITE_P1}% é P2.`;
  if (p2ZeradaOuVazia(p2) && typeof p1 !== "number") return `Margem P2 zerada: informe a margem P1 (de 0 a ${LIMITE_P1}%).`;
  return null;
}

// O P1 que fica gravado: 15 quando há P2; o informado quando P2 é zero; null se não informado.
export function p1Gravado(p2: number | null | undefined, p1: number | null | undefined): number | null {
  if (!p2ZeradaOuVazia(p2)) return LIMITE_P1;
  return typeof p1 === "number" && p1 >= 0 && p1 <= LIMITE_P1 ? p1 : null;
}

// O P1 do registro do Arquivo legado mora em reqCliente.margemP1Pct (sem coluna própria).
export function p1DoReqCliente(req: unknown): number | null {
  const v = (req as { margemP1Pct?: unknown } | null)?.margemP1Pct;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
