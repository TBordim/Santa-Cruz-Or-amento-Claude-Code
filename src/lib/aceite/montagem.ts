// Itens do Aceite e montagem. Sem acesso ao banco: serve às Server Actions e às telas.
//
// No formulário de papel, os números (1), (2), (3)... ao lado de cada modelo eram a MONTAGEM:
// modelos com o mesmo número saem juntos na mesma folha. Numa folha em que cabem 8, podem ir 4 de
// cada, ou 6 de um e 2 de outro, conforme os múltiplos e o pedido do cliente (explicação do Thiago
// em 08/10/2026). A data de entrega continua uma só para o Aceite.

import { parseQuantidade } from "@/lib/orcamentos/motor";
import type { Modelo, PrecificacaoTier } from "@/lib/orcamentos/types";

export type ItemAceite = {
  modeloId: string;
  descricao: string;
  codInterno: string;
  // Quantidade que o cliente pediu deste modelo (Vendas).
  quantidade: number | null;
  // Quanto do pedido sai do produto acabado em estoque (sobra na expedição); só o resto é produzido.
  emEstoque?: number | null;
  // Grupo de montagem e posições deste modelo na folha (Engenharia).
  montagem: number | null;
  posicoes: number | null;
};

// Na abertura do Aceite: um item por modelo. Com um modelo só, a quantidade é a da SO fechada; com
// vários, Vendas reparte conforme o pedido do cliente.
export function itensIniciais(modelos: Modelo[], so: PrecificacaoTier | null, qtdFolha: number | null): ItemAceite[] {
  const qtdSO = so ? parseQuantidade(so.quantidade) : null;
  return modelos.map((m) => ({
    modeloId: m.id,
    descricao: m.descricao,
    codInterno: m.codInterno,
    quantidade: modelos.length === 1 ? qtdSO : null,
    montagem: modelos.length === 1 ? 1 : null,
    posicoes: modelos.length === 1 ? qtdFolha : null,
  }));
}

export function lerItens(json: unknown): ItemAceite[] {
  return Array.isArray(json) ? (json as ItemAceite[]) : [];
}

// Quantidade a produzir de um modelo: o pedido menos o que sai do estoque de produto acabado.
export function aProduzir(i: Pick<ItemAceite, "quantidade" | "emEstoque">): number {
  return Math.max(0, (i.quantidade ?? 0) - (i.emEstoque ?? 0));
}

export function producaoTotal(itens: ItemAceite[]): number {
  return itens.reduce((s, i) => s + aProduzir(i), 0);
}

// Folhas de papel pela conta do formulário: quantidade ÷ quantidade por folha, arredondado pra cima.
export function folhasEstimadas(quantidadeTotal: number | null, qtdFolha: number | null): number | null {
  if (!quantidadeTotal || !qtdFolha) return null;
  return Math.ceil(quantidadeTotal / qtdFolha);
}

export function quantidadeTotal(itens: ItemAceite[]): number {
  return itens.reduce((s, i) => s + (i.quantidade ?? 0), 0);
}

export type Montagem = {
  grupo: number;
  itens: (ItemAceite & { produzido: number; excedente: number })[];
  posicoesUsadas: number;
  folhas: number;
};

// Folhas de cada montagem: o modelo que pede mais folhas manda (quantidade ÷ posições, pra cima);
// os outros da mesma folha saem com excedente.
export function calcularMontagens(itens: ItemAceite[]): Montagem[] {
  const grupos = new Map<number, ItemAceite[]>();
  for (const i of itens) {
    if (!i.montagem) continue;
    grupos.set(i.montagem, [...(grupos.get(i.montagem) ?? []), i]);
  }
  return [...grupos.entries()]
    .sort(([a], [b]) => a - b)
    .map(([grupo, lista]) => {
      const folhas = Math.max(0, ...lista.map((i) => (aProduzir(i) && i.posicoes ? Math.ceil(aProduzir(i) / i.posicoes) : 0)));
      return {
        grupo,
        folhas,
        posicoesUsadas: lista.reduce((s, i) => s + (i.posicoes ?? 0), 0),
        itens: lista.map((i) => {
          const produzido = folhas * (i.posicoes ?? 0);
          return { ...i, produzido, excedente: Math.max(0, produzido - aProduzir(i)) };
        }),
      };
    });
}

// Regras pra Engenharia confirmar a montagem. `capacidade` = quantas cabem na folha (orçamento).
export function erroNaMontagem(itens: ItemAceite[], capacidade: number | null): string | null {
  for (const i of itens) {
    if (!i.quantidade) return `Falta a quantidade de ${i.descricao || "um modelo"} (Vendas).`;
    if (!i.montagem) return `Informe a montagem de ${i.descricao || "um modelo"}.`;
    if (!i.posicoes) return `Informe quantas posições ${i.descricao || "um modelo"} ocupa na folha.`;
  }
  if (capacidade) {
    for (const m of calcularMontagens(itens)) {
      if (m.posicoesUsadas > capacidade) {
        return `A montagem ${m.grupo} usa ${m.posicoesUsadas} posições, mas cabem ${capacidade} por folha.`;
      }
    }
  }
  return null;
}
