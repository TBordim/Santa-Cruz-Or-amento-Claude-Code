import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import type { PrecificacaoTier } from "./types";
import type { LegadoRef, OrcamentoAnteriorRef } from "./tiers";

export function chave(s: string | null | undefined): string {
  return (s || "").toString().trim().toUpperCase();
}

// Equivalente a ultimoPreco() — casamento interno por clienteChave+produtoChave (orçamentos
// "novo" já decididos, aprovado/auto_aprovado, OU registros do Arquivo legado) OU, quando
// disponível, clienteChave+codInterno.
//
// O HTML original excluía codInterno de propósito ("ainda não é gerado automaticamente, usá-lo
// seria pior do que o código do cliente"). Isso mudou: codInterno hoje é obrigatório antes de
// sair da Engenharia (validarLiberarOrcamento), e na prática é o identificador que a equipe usa
// para "é o mesmo produto de novo" — mais confiável que produtoCodigo, que raramente é
// preenchido pelo representante. Sem esse casamento extra, um card ficava sem nenhuma
// comparação na Diretoria mesmo tendo um Histórico do mesmo código, só porque a descrição do
// produto foi digitada com uma leve diferença de um pedido pro outro. Achado em teste real
// (Thiago, 18/09/2026 — SC:0524003).
export async function buscarOrcamentoAnterior(
  clienteChave: string,
  produtoChave: string,
  excludeId?: string,
  codInterno?: string | null,
): Promise<OrcamentoAnteriorRef | null> {
  const codInternoTrim = (codInterno || "").trim();
  if (!clienteChave || (!produtoChave && !codInternoTrim)) return null;

  const condicoes: Prisma.OrcamentoWhereInput[] = [];
  if (produtoChave) {
    condicoes.push(
      { clienteChave, produtoChave, origem: "NOVO", statusDiretoria: { in: ["AUTO_APROVADO", "APROVADO"] } },
      { clienteChave, produtoChave, origem: "LEGADO" },
    );
  }
  if (codInternoTrim) {
    condicoes.push({
      clienteChave,
      codInterno: { equals: codInternoTrim, mode: "insensitive" },
      origem: "NOVO",
      statusDiretoria: { in: ["AUTO_APROVADO", "APROVADO"] },
    });
  }

  const anterior = await prisma.orcamento.findFirst({
    where: { id: excludeId ? { not: excludeId } : undefined, OR: condicoes },
    orderBy: { criadoEm: "desc" },
  });
  if (!anterior) return null;

  if (anterior.origem === "LEGADO") {
    return {
      id: anterior.id,
      precoFinal: anterior.precoAtual ? Number(anterior.precoAtual) : null,
      quantidade: anterior.quantidade ? String(anterior.quantidade) : null,
      numeroLotes: null,
      numeroSetups: null,
      acabamento: null,
      custoPrimarioPct: anterior.custoPrimarioPct ? Number(anterior.custoPrimarioPct) : null,
      margemP2Pct: anterior.margemP2Pct ? Number(anterior.margemP2Pct) : null,
    };
  }

  const tiers = (anterior.precificacao as PrecificacaoTier[] | null) ?? [];
  const t0 = tiers[0];
  if (!t0) return null;
  return {
    id: anterior.id,
    precoFinal: t0.precoFinal ?? null,
    quantidade: t0.quantidade ?? null,
    numeroLotes: t0.numeroLotes ?? null,
    numeroSetups: t0.numeroSetups ?? null,
    acabamento: anterior.acabamento ?? null,
    custoPrimarioPct: t0.custoPrimarioPct ?? null,
    margemP2Pct: t0.margemP2Pct ?? null,
  };
}

// Equivalente a legadosDoCliente() — busca por substring normalizada (sem caixa/acento), não
// exige match perfeito de produto.
export async function legadosDoCliente(clienteNome: string) {
  const needle = chave(clienteNome);
  if (!needle) return [];
  const todos = await prisma.orcamento.findMany({
    where: { origem: "LEGADO" },
    orderBy: { criadoEm: "desc" },
  });
  return todos.filter((l) => l.clienteChave?.includes(needle));
}

// Converte um registro do Arquivo legado casado por cliente/produto em LegadoRef (2º nível do
// fallback de "dado anterior" usado por avaliarDiscrepanciaLegado — ver tiers.ts).
export async function buscarLegadoRef(clienteChave: string, produtoChave: string): Promise<LegadoRef | null> {
  if (!clienteChave || !produtoChave) return null;
  const legado = await prisma.orcamento.findFirst({
    where: { origem: "LEGADO", clienteChave, produtoChave },
    orderBy: { criadoEm: "desc" },
  });
  if (!legado) return null;
  return {
    precoAtual: legado.precoAtual ? Number(legado.precoAtual) : null,
    custoPrimarioPct: legado.custoPrimarioPct ? Number(legado.custoPrimarioPct) : null,
    margemP2Pct: legado.margemP2Pct ? Number(legado.margemP2Pct) : null,
    quantidade: legado.quantidade ? String(legado.quantidade) : null,
  };
}

// Valor total do orçamento (preço final × milheiros a produzir, somado por faixa) — usado no
// Histórico/Resumo, não o preço por milheiro isolado (pedido do Thiago em 10/09/2026).
// O preço lançado no Orçamento é "por milheiro" (a cada 1.000 unidades) — a quantidade em si é
// gravada em unidades (ex.: "5000"), então o valor total é preço × (unidades / 1000), não
// preço × unidades direto (bug encontrado em teste real: dava 1000x o valor correto).
export function valorTotalOrcamento(precificacao: PrecificacaoTier[] | null | undefined): number {
  if (!precificacao || !precificacao.length) return 0;
  return precificacao.reduce((soma, t) => {
    const preco = t.precoFinal ?? t.precoFinalSugerido ?? 0;
    const unidades = parseFloat(String(t.quantidade).replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
    return soma + preco * (unidades / 1000);
  }, 0);
}
