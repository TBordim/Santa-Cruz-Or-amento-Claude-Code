// Contas do papel no Pedido de Material (11/10/2026). Sem acesso ao banco: serve à tela (cálculo na
// hora) e ao servidor (que recalcula ao salvar).
//
// Peso = folhas × largura (m) × altura (m) × gramatura (g/m²) ÷ 1000. Conferido com o PM 656:
// 1.625 folhas de Vitamax 300 g em 96×66 = 308,88 kg.

// Lê um formato em cm ("96x66", "96 x 66", "48,5x65", "96X60,5") como largura × altura em metros.
export function lerFormatoCm(formato: string | null | undefined): { l: number; a: number } | null {
  const m = String(formato ?? "").match(/(\d+(?:[.,]\d+)?)\s*[xX×]\s*(\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  const l = Number(m[1].replace(",", ".")) / 100;
  const a = Number(m[2].replace(",", ".")) / 100;
  return l > 0 && a > 0 ? { l, a } : null;
}

// Folhas que de fato se compram: o que falta, ou o pedido mínimo do fornecedor se for maior.
export function quantidadeComprada(quantidade: number | null, minimo: number | null): number | null {
  if (quantidade === null) return minimo;
  return minimo !== null && minimo > quantidade ? minimo : quantidade;
}

// Sobra que fica no fornecedor: pedido mínimo menos o que falta (nunca negativa).
export function sobraDoMinimo(quantidade: number | null, minimo: number | null): number | null {
  if (quantidade === null || minimo === null) return null;
  return Math.max(0, minimo - quantidade);
}

// Peso em kg de uma quantidade na unidade do PM. Em kg, é a própria quantidade; em folhas, precisa
// do formato e da gramatura. Sem dado suficiente, null.
export function pesoKg(quantidade: number | null, unidade: string, formato: string | null | undefined, gramatura: number | null): number | null {
  if (quantidade === null) return null;
  const un = unidade.trim().toLowerCase();
  if (un === "kg") return quantidade;
  if (!["fls", "fl", "folha", "folhas"].includes(un)) return null;
  const f = lerFormatoCm(formato);
  if (!f || !gramatura) return null;
  return Math.round(quantidade * f.l * f.a * gramatura) / 1000;
}
