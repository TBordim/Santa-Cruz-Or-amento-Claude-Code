import type { ReqCliente } from "./types";

// Quantidade total de uma opção com a divisão por modelo, quando houver:
// "50.000 (Uva 20.000 + Morango 30.000)". Sem divisão, só o total. Sem acesso ao banco.
export function detalheDaQuantidade(total: string, c: ReqCliente | null | undefined): { descricao: string; quantidade: string }[] | null {
  const itens = c?.quantidadesPorModelo?.[total.replace(/\D/g, "")];
  return itens && itens.length > 1 ? itens : null;
}

const fmt = (v: string) => (parseInt(v.replace(/\D/g, ""), 10) || 0).toLocaleString("pt-BR");

export function textoQuantidade(total: string, c: ReqCliente | null | undefined): string {
  const itens = detalheDaQuantidade(total, c);
  if (!itens) return total;
  return `${total} (${itens.map((x) => `${x.descricao || "Modelo"} ${fmt(x.quantidade)}`).join(" + ")})`;
}

export function textoQuantidades(c: ReqCliente | null | undefined): string {
  return (c?.quantidadesLista ?? []).filter(Boolean).map((q) => textoQuantidade(q, c)).join("; ");
}
