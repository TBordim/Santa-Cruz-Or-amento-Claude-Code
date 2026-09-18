import { prisma } from "@/lib/db";
import { normalizarCodigoInterno, formatarCodigoInterno } from "./codigo-interno";
import type { PrecificacaoTier } from "./types";
import type { OrcamentoAnteriorRef } from "./tiers";

export function chave(s: string | null | undefined): string {
  return (s || "").toString().trim().toUpperCase();
}

// Equivalente a ultimoPreco() — casamento por clienteChave+código interno, contra QUALQUER
// registro de histórico (orçamento "novo" já decidido, aprovado/auto_aprovado, OU registro do
// Arquivo legado — os dois contam como "histórico" igualmente, pedido do Thiago em 19/09/2026).
// Não casa mais por produto/descrição: essa era a fonte do bug relatado (descrição digitada com
// uma leve diferença de um pedido pro outro já quebrava o casamento). Código interno é
// obrigatório antes de sair da Engenharia pra pedidos novos e agora também no Arquivo legado —
// é o identificador que a equipe realmente usa pra dizer "é o mesmo produto de novo".
//
// Aceita tanto a forma normalizada (só dígitos) quanto a formatada com pontos, pra continuar
// casando com códigos antigos que foram salvos sem o formato novo (ex.: "0524003").
export async function buscarOrcamentoAnterior(
  clienteChave: string,
  codInterno: string | null | undefined,
  excludeId?: string,
): Promise<OrcamentoAnteriorRef | null> {
  const codDigitos = normalizarCodigoInterno(codInterno);
  if (!clienteChave || !codDigitos) return null;
  const codFormatado = formatarCodigoInterno(codDigitos);
  const variantes = codFormatado === codDigitos ? [codDigitos] : [codDigitos, codFormatado];

  const anterior = await prisma.orcamento.findFirst({
    where: {
      id: excludeId ? { not: excludeId } : undefined,
      clienteChave,
      codInterno: { in: variantes },
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
