// Código interno (Santa Cruz) — unificação de "Código do produto" (antigo campo do
// representante) e "Código interno" (antigo campo da Engenharia), que eram redundantes. É o
// único campo usado pra casar repetições (Diretoria compara pelo código interno, não mais por
// cliente+descrição do produto) — pedido do Thiago em 19/09/2026.
//
// Formato exigido a partir de agora: 0.000.000 (1 dígito, ponto, 3 dígitos, ponto, 3 dígitos —
// 7 dígitos ao todo). Guardado no banco só com os dígitos (sem pontuação); a formatação é só de
// exibição/digitação, pra não quebrar o casamento com códigos antigos que foram salvos sem
// pontuação nenhuma (ex.: "0524003").

export function normalizarCodigoInterno(v: string | null | undefined): string {
  return (v || "").replace(/\D/g, "").slice(0, 7);
}

// Só zeros ("0.000.000") não é código: é o que se digita para "contornar" o campo. Gravado, viraria um código
// falso igual em todo produto novo (erro de "código repetido" e comparação com o produto errado na Diretoria).
export function codigoZerado(v: string | null | undefined): boolean {
  return /^0+$/.test(normalizarCodigoInterno(v));
}

// Código vindo de um formulário: só zeros vale como "sem código" (produto novo ainda não tem).
export function normalizarCodigoDeEntrada(v: string | null | undefined): string {
  return codigoZerado(v) ? "" : normalizarCodigoInterno(v);
}

export function codigoInternoValido(v: string | null | undefined): boolean {
  return /^\d{7}$/.test(normalizarCodigoInterno(v)) && !codigoZerado(v);
}

export function formatarCodigoInterno(v: string | null | undefined): string {
  const d = normalizarCodigoInterno(v);
  if (!d) return "";
  if (d.length <= 1) return d;
  if (d.length <= 4) return `${d.slice(0, 1)}.${d.slice(1)}`;
  return `${d.slice(0, 1)}.${d.slice(1, 4)}.${d.slice(4)}`;
}
