import { prisma } from "@/lib/db";
import { chave } from "./chave";
import { formatarCodigoInterno, normalizarCodigoInterno } from "./codigo-interno";
import { codigosDoConjunto, mesmosCodigos, modelosDoDoc, soEscolhida } from "./modelos";
import type { Modelo, PrecificacaoTier } from "./types";
import type { OrcamentoAnteriorRef } from "./tiers";

export { chave };

// Equivalente a ultimoPreco(): o ÚLTIMO FORNECIMENTO dos mesmos modelos — resposta do Thiago em
// 30/09/2026 ("o que importa é o último fornecimento"). Casa SÓ pelo código interno, nunca pelo
// nome do cliente nem pela descrição: os dois são digitados por pessoas e variam ("Compactor" x
// "Compactor Ltda") — correção pedida em 01/10/2026, quando um Arquivo legado deixou de
// aparecer na Diretoria por diferença no nome. Conta como fornecimento:
//   1. orçamento do sistema com desfecho Positivo (virou pedido), usando a SO que o cliente
//      escolheu — com os MESMOS códigos internos (o conjunto inteiro, não um modelo solto; o
//      papel não importa);
//   2. senão, registro do Arquivo legado com o código de QUALQUER modelo do card (a folha antiga
//      é de um produto só, então basta um modelo bater). Com vários modelos, vale o legado mais
//      recente entre os códigos do card.
// Aceita o código com ou sem pontuação, pra continuar casando com códigos antigos salvos sem
// formato (ex.: "0524003").
export async function buscarOrcamentoAnterior(
  modelos: Modelo[],
  excludeId?: string,
): Promise<OrcamentoAnteriorRef | null> {
  const codigos = [...new Set(modelos.map((m) => normalizarCodigoInterno(m.codInterno)).filter(Boolean))];
  if (!codigos.length) return null;

  const conjunto = codigosDoConjunto(modelos);
  if (conjunto) {
    const positivos = await prisma.orcamento.findMany({
      where: { id: excludeId ? { not: excludeId } : undefined, origem: "NOVO", desfecho: "POSITIVO" },
      orderBy: [{ desfechoEm: "desc" }, { criadoEm: "desc" }],
    });
    const fornecimento = positivos.find((d) => mesmosCodigos(codigosDoConjunto(modelosDoDoc(d)), conjunto));
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
  }

  const variantes = codigos.flatMap((c) => [c, formatarCodigoInterno(c)]);
  const legado = await prisma.orcamento.findFirst({
    where: { id: excludeId ? { not: excludeId } : undefined, origem: "LEGADO", codInterno: { in: variantes } },
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
