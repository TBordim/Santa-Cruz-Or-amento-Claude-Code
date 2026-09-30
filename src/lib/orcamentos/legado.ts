import { prisma } from "@/lib/db";
import { chave } from "./chave";
import { formatarCodigoInterno } from "./codigo-interno";
import { codigosDoConjunto, mesmosCodigos, modelosDoDoc, soEscolhida } from "./modelos";
import type { Modelo, PrecificacaoTier } from "./types";
import type { OrcamentoAnteriorRef } from "./tiers";

export { chave };

// Equivalente a ultimoPreco(): o ÚLTIMO FORNECIMENTO do mesmo cliente com os mesmos modelos —
// resposta do Thiago em 30/09/2026 ("o que importa é o último fornecimento"). Conta como
// fornecimento:
//   1. orçamento do sistema com desfecho Positivo (virou pedido), usando a SO que o cliente
//      escolheu — com os MESMOS códigos internos (o conjunto inteiro, não um modelo solto; o
//      papel não importa);
//   2. senão, registro do Arquivo legado com o mesmo código interno (só pra orçamento de um
//      modelo: a folha antiga é sempre de um produto só).
// Até 30/09/2026 valia qualquer orçamento aprovado pela Diretoria, mesmo que o cliente nunca
// tivesse fechado — comparava com um preço que nunca foi praticado.
//
// Casa por código interno, nunca por descrição (descrição digitada com uma leve diferença de um
// pedido pro outro quebrava o casamento — bug relatado em 19/09/2026). Aceita o código com ou
// sem pontuação, pra continuar casando com códigos antigos salvos sem formato (ex.: "0524003").
export async function buscarOrcamentoAnterior(
  clienteChave: string,
  modelos: Modelo[],
  excludeId?: string,
): Promise<OrcamentoAnteriorRef | null> {
  const codigos = codigosDoConjunto(modelos);
  if (!clienteChave || !codigos) return null;

  const positivos = await prisma.orcamento.findMany({
    where: { id: excludeId ? { not: excludeId } : undefined, clienteChave, origem: "NOVO", desfecho: "POSITIVO" },
    orderBy: [{ desfechoEm: "desc" }, { criadoEm: "desc" }],
  });
  const fornecimento = positivos.find((d) => mesmosCodigos(codigosDoConjunto(modelosDoDoc(d)), codigos));
  if (fornecimento) {
    const tiers = (fornecimento.precificacao as PrecificacaoTier[] | null) ?? [];
    // Cards de antes da escolha de SO (30/09/2026) não marcaram qual o cliente fechou: fica a
    // primeira faixa, como era.
    const t = soEscolhida(tiers) ?? tiers[0];
    if (t) {
      return {
        id: fornecimento.id,
        precoFinal: t.precoFinal ?? null,
        quantidade: t.quantidade ?? null,
        numeroLotes: t.numeroLotes ?? null,
        numeroSetups: t.numeroSetups ?? null,
        acabamento: fornecimento.acabamento ?? null,
        custoPrimarioPct: t.custoPrimarioPct ?? null,
        margemP2Pct: t.margemP2Pct ?? null,
      };
    }
  }

  if (codigos.length !== 1) return null;
  const codFormatado = formatarCodigoInterno(codigos[0]);
  const variantes = codFormatado === codigos[0] ? [codigos[0]] : [codigos[0], codFormatado];
  const legado = await prisma.orcamento.findFirst({
    where: { id: excludeId ? { not: excludeId } : undefined, clienteChave, origem: "LEGADO", codInterno: { in: variantes } },
    orderBy: { criadoEm: "desc" },
  });
  if (!legado) return null;
  return {
    id: legado.id,
    precoFinal: legado.precoAtual ? Number(legado.precoAtual) : null,
    quantidade: legado.quantidade ? String(legado.quantidade) : null,
    numeroLotes: null,
    numeroSetups: null,
    acabamento: null,
    custoPrimarioPct: legado.custoPrimarioPct ? Number(legado.custoPrimarioPct) : null,
    margemP2Pct: legado.margemP2Pct ? Number(legado.margemP2Pct) : null,
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
