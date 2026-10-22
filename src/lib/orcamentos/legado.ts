import { prisma } from "@/lib/db";
import { chave } from "./chave";
import { formatarCodigoInterno, normalizarCodigoInterno } from "./codigo-interno";
import { codigosDoConjunto, mesmosCodigos, modelosDoDoc, soEscolhida } from "./modelos";
import type { Modelo, PrecificacaoTier } from "./types";
import type { OrcamentoAnteriorRef } from "./tiers";
import { medidasDoReq, medidasIguais, mesmoCliente, temMedidasParaComparar, textoMedidas } from "./medidas";

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
  card?: CardParaRastrear,
): Promise<OrcamentoAnteriorRef | null> {
  const porCodigo = await buscarPorCodigo(modelos, excludeId);
  if (porCodigo) return { ...porCodigo, via: "codigo" };

  // Segunda linha de rastreio: produto que o cliente não aprovou nunca ganha Código interno, então
  // o pedido que volta não acha o anterior pelo código. Só entra quando algum modelo do card está
  // sem código (card todo com código e sem histórico fica sem comparação, como sempre).
  if (card && modelos.some((m) => !normalizarCodigoInterno(m.codInterno))) {
    return buscarPorMedidas(card, excludeId);
  }
  return null;
}

// O que o card atual informa pra ser rastreado por medidas.
export type CardParaRastrear = {
  clienteId: string | null;
  clienteChave: string | null;
  cnpj: string | null;
  reqCliente: unknown;
};

async function buscarPorCodigo(modelos: Modelo[], excludeId?: string): Promise<OrcamentoAnteriorRef | null> {
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

// Candidato a "anterior" por medidas: só os campos que a escolha precisa (serve pro orçamento do
// fluxo e pro registro do legado, que são a mesma tabela).
export type CandidatoMedidas = {
  id: string;
  origem: "NOVO" | "LEGADO";
  cliente: string | null;
  clienteId: string | null;
  clienteChave: string | null;
  cnpj: string | null;
  reqCliente: unknown;
  precificacao: unknown;
  desfecho: string | null;
  acabamento: string | null;
  precoAtual: unknown;
  quantidade: unknown;
  custoPrimarioPct: unknown;
  margemP2Pct: unknown;
  criadoEm: Date;
};

// Escolhe o anterior por medidas (função pura, testável sem banco). Mesmo cliente + medidas
// exatas. Orçamento do fluxo vem primeiro (o mais recente, de QUALQUER desfecho — o caso aqui é
// justamente o orçamento que o cliente não aprovou — desde que tenha chegado a um preço final); sem
// ele, o registro do Arquivo legado mais recente. As listas chegam da mais nova pra mais antiga.
export function escolherPorMedidas(
  card: CardParaRastrear,
  sistema: CandidatoMedidas[],
  legado: CandidatoMedidas[],
): OrcamentoAnteriorRef | null {
  const meu = medidasDoReq(card.reqCliente);
  if (!temMedidasParaComparar(meu)) return null;
  const casa = (c: CandidatoMedidas) => mesmoCliente(card, c) && medidasIguais(meu, medidasDoReq(c.reqCliente));

  for (const c of sistema.filter(casa)) {
    const tiers = (c.precificacao as PrecificacaoTier[] | null) ?? [];
    // A SO que o cliente fechou; sem ela, a primeira que chegou a um preço final.
    const t = soEscolhida(tiers) ?? tiers.find((x) => x.precoFinal != null);
    if (!t || t.precoFinal == null) continue;
    return {
      id: c.id,
      precoFinal: t.precoFinal,
      quantidade: t.quantidade ?? null,
      numeroLotes: t.numeroLotes ?? null,
      numeroSetups: t.numeroSetups ?? null,
      acabamento: c.acabamento ?? null,
      custoPrimarioPct: t.custoPrimarioPct ?? null,
      margemP2Pct: t.margemP2Pct ?? null,
      via: "medidas",
      rastreio: { origem: "NOVO", cliente: c.cliente, data: c.criadoEm.toISOString(), desfecho: c.desfecho, medidas: textoMedidas(medidasDoReq(c.reqCliente)) },
    };
  }

  const l = legado.find(casa);
  if (!l) return null;
  return {
    id: l.id,
    precoFinal: l.precoAtual ? Number(l.precoAtual) : null,
    quantidade: l.quantidade ? String(l.quantidade) : null,
    numeroLotes: null,
    numeroSetups: null,
    acabamento: null,
    custoPrimarioPct: l.custoPrimarioPct ? Number(l.custoPrimarioPct) : null,
    margemP2Pct: l.margemP2Pct ? Number(l.margemP2Pct) : null,
    via: "medidas",
    rastreio: { origem: "LEGADO", cliente: l.cliente, data: l.criadoEm.toISOString(), desfecho: null, medidas: textoMedidas(medidasDoReq(l.reqCliente)) },
  };
}

async function buscarPorMedidas(card: CardParaRastrear, excludeId?: string): Promise<OrcamentoAnteriorRef | null> {
  if (!temMedidasParaComparar(medidasDoReq(card.reqCliente))) return null;
  const base = { id: excludeId ? { not: excludeId } : undefined };
  // Um teto generoso: o conjunto é filtrado em memória (JSON de medidas e nome de cliente não se
  // comparam bem no banco) e o histórico da Santa Cruz é de centenas, não de milhões.
  const [sistema, legado] = await Promise.all([
    prisma.orcamento.findMany({ where: { ...base, origem: "NOVO" }, orderBy: { criadoEm: "desc" }, take: 1000 }),
    prisma.orcamento.findMany({ where: { ...base, origem: "LEGADO" }, orderBy: { criadoEm: "desc" }, take: 1000 }),
  ]);
  return escolherPorMedidas(card, sistema as CandidatoMedidas[], legado as CandidatoMedidas[]);
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
