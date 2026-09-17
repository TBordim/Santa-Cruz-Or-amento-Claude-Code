import { prisma } from "@/lib/db";
import type { PrecificacaoTier } from "./types";
import type { LegadoRef, OrcamentoAnteriorRef } from "./tiers";

export function chave(s: string | null | undefined): string {
  return (s || "").toString().trim().toUpperCase();
}

// Equivalente a ultimoPreco() — casamento interno exato por clienteChave+produtoChave, entre
// orçamentos "novo" já decididos (aprovado/auto_aprovado) OU registros do Arquivo legado
// (que raramente batem letra por letra, mas quando batem contam como o mesmo caso).
export async function buscarOrcamentoAnterior(
  clienteChave: string,
  produtoChave: string,
  excludeId?: string,
): Promise<OrcamentoAnteriorRef | null> {
  if (!clienteChave || !produtoChave) return null;

  const anterior = await prisma.orcamento.findFirst({
    where: {
      id: excludeId ? { not: excludeId } : undefined,
      clienteChave,
      produtoChave,
      OR: [
        { origem: "NOVO", statusDiretoria: { in: ["AUTO_APROVADO", "APROVADO"] } },
        { origem: "LEGADO" },
      ],
    },
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
