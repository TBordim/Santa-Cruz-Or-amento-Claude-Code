// Lotes de um Aceite (16/10/2026). Sem acesso ao banco: serve às Server Actions e às telas.
//
// Vendas pode dividir o pedido em lotes na etapa Vendas, com a quantidade de CADA MODELO em cada lote.
// A soma por modelo, em todos os lotes, tem que bater com o pedido do Aceite. Cada lote é uma produção
// separada (papel, PM, OF, datas, negociação e entrega próprios); faca, clichê, cadastro e montagem
// ficam no Aceite, porque a Engenharia analisa uma vez só.
//
// Aceite SEM divisão não tem linhas de lote: é um lote implícito só, que lê e grava nas colunas do
// próprio Aceite (que têm os mesmos nomes das colunas do lote). `lotesDoAceite` devolve sempre uma
// lista, com o implícito quando não há divisão, pra as telas não terem dois caminhos.

import { aProduzir, calcularMontagens, folhasEstimadas, lerItens, producaoTotal, type ItemAceite } from "./montagem";
import { lerDatasCliente, type DataCliente } from "./datas-cliente";
import { lerSuportes, suportesGarantidos, situacaoGeral, type SuporteAceite } from "./suportes";
import type { EtapaAceiteKey } from "./constantes";

// O que o lote guarda de cada modelo: só as quantidades (a montagem e as posições vêm do Aceite).
export type ItemLote = { modeloId: string; quantidade: number | null; emEstoque?: number | null };

export function lerItensLote(json: unknown): ItemLote[] {
  if (!Array.isArray(json)) return [];
  return (json as Partial<ItemLote>[])
    .filter((i) => typeof i?.modeloId === "string")
    .map((i) => ({
      modeloId: i.modeloId as string,
      quantidade: typeof i.quantidade === "number" ? i.quantidade : null,
      emEstoque: typeof i.emEstoque === "number" ? i.emEstoque : null,
    }));
}

// ---------- divisão ----------

function fmt(n: number): string {
  return n.toLocaleString("pt-BR");
}

// Confere a divisão que Vendas montou. Devolve a frase do primeiro problema, ou null se está certa:
// ao menos 2 lotes, nenhum vazio, soma por modelo igual ao pedido e estoque de produto acabado
// repartido sem passar do que há.
export function erroNaDivisao(itensAceite: ItemAceite[], lotes: { itens: ItemLote[] }[]): string | null {
  if (lotes.length < 2) return "Para dividir, informe ao menos 2 lotes (com um lote só, o pedido não é dividido).";
  const conhecidos = new Set(itensAceite.map((i) => i.modeloId));
  for (const [n, l] of lotes.entries()) {
    if (l.itens.some((i) => !conhecidos.has(i.modeloId))) return `O lote ${n + 1} tem um modelo que não é deste pedido.`;
    const total = l.itens.reduce((s, i) => s + (i.quantidade ?? 0), 0);
    if (total <= 0) return `O lote ${n + 1} está sem quantidade.`;
    for (const i of l.itens) {
      if ((i.quantidade ?? 0) < 0 || (i.emEstoque ?? 0) < 0) return `O lote ${n + 1} tem quantidade negativa.`;
      if ((i.emEstoque ?? 0) > (i.quantidade ?? 0)) return `Lote ${n + 1}: o estoque usado não pode passar da quantidade do lote.`;
    }
  }
  for (const m of itensAceite) {
    const pedido = m.quantidade ?? 0;
    const soma = lotes.reduce((s, l) => s + (l.itens.find((i) => i.modeloId === m.modeloId)?.quantidade ?? 0), 0);
    const nome = m.descricao || "um modelo";
    if (soma < pedido) return `${nome}: faltam ${fmt(pedido - soma)} para fechar o pedido de ${fmt(pedido)} (os lotes somam ${fmt(soma)}).`;
    if (soma > pedido) return `${nome}: os lotes passam ${fmt(soma - pedido)} do pedido de ${fmt(pedido)} (somam ${fmt(soma)}).`;
    const estoque = lotes.reduce((s, l) => s + (l.itens.find((i) => i.modeloId === m.modeloId)?.emEstoque ?? 0), 0);
    const doAceite = m.emEstoque ?? 0;
    if (estoque !== doAceite) return `${nome}: o estoque de produto acabado nos lotes soma ${fmt(estoque)}, mas o pedido usa ${fmt(doAceite)} do estoque.`;
  }
  return null;
}

// Divide igualmente cada modelo em `n` lotes; o resto vai um a um para os primeiros lotes. O estoque
// de produto acabado vai inteiro para o primeiro lote que couber (Vendas ajusta se quiser).
export function dividirIgualmente(itensAceite: ItemAceite[], n: number): ItemLote[][] {
  const lotes: ItemLote[][] = Array.from({ length: n }, () => []);
  for (const m of itensAceite) {
    const q = m.quantidade ?? 0;
    const base = Math.floor(q / n);
    const resto = q - base * n;
    let estoque = m.emEstoque ?? 0;
    lotes.forEach((l, k) => {
      const quantidade = base + (k < resto ? 1 : 0);
      const doEstoque = Math.min(estoque, quantidade);
      estoque -= doEstoque;
      l.push({ modeloId: m.modeloId, quantidade, emEstoque: doEstoque || null });
    });
  }
  return lotes;
}

// Itens do lote no formato do Aceite: a quantidade e o estoque são do lote; descrição, código,
// montagem e posições vêm do Aceite (a Engenharia define uma vez). Modelo que o lote não leva fica com 0.
export function itensDoLote(itensAceite: ItemAceite[], lote: { itens: ItemLote[] }): ItemAceite[] {
  return itensAceite.map((m) => {
    const d = lote.itens.find((i) => i.modeloId === m.modeloId);
    return { ...m, quantidade: d?.quantidade ?? 0, emEstoque: d?.emEstoque ?? null };
  });
}

// ---------- papel por lote ----------

// Papel inicial de um lote: o mesmo do Aceite, com a situação no estoque a confirmar e as folhas
// recalculadas pela quantidade DO LOTE (quantidade a produzir ÷ quantidade por folha).
export function suportesIniciaisDoLote(suportesAceite: SuporteAceite[], itens: ItemAceite[]): SuporteAceite[] {
  const producao = producaoTotal(itens);
  return suportesAceite.map((s, n) => ({
    ...s,
    situacao: "NAO_VERIFICADO",
    obs: "",
    folhas: n === 0 ? folhasEstimadas(producao || null, s.qtdFolha) : s.folhas,
  }));
}

// Folhas sugeridas para o papel principal do lote.
export function folhasSugeridasDoLote(itens: ItemAceite[], suportes: SuporteAceite[]): number | null {
  return folhasEstimadas(producaoTotal(itens) || null, suportes[0]?.qtdFolha ?? null);
}

// Folhas de cada montagem do lote (a montagem e as posições são as do Aceite).
export function montagensDoLote(itens: ItemAceite[]) {
  return calcularMontagens(itens);
}

// ---------- visão única: lote real ou implícito ----------

type DecimalLike = { toString(): string } | number | null | undefined;

// Colunas que o Aceite e o lote têm com o MESMO nome.
type CamposComuns = {
  dataCliente?: Date | null;
  datasCliente?: unknown;
  suportes?: unknown;
  situacaoPapel?: string;
  numeroOF?: string | null;
  dataEntregaSugerida?: Date | null;
  dataEntrega?: Date | null;
  pcpEm?: Date | null;
  pcpPor?: string | null;
  pcpObs?: string | null;
  pedidoCadastradoEm?: Date | null;
  pedidoCadastradoPor?: string | null;
  clienteInformadoEm?: Date | null;
  clienteInformadoPor?: string | null;
  entregueEm?: Date | null;
  entregaConfirmadaEm?: Date | null;
  entregaConfirmadaPor?: string | null;
  entregaObs?: string | null;
  entregaSaldoCancelado?: DecimalLike;
  entregaCancelamentoMotivo?: string | null;
};

export type LoteRow = CamposComuns & { id: string; numero: number; etapa: string; itens: unknown; obs?: string | null };
export type AceiteComLotes = CamposComuns & {
  etapa: string;
  itens?: unknown;
  lotes?: LoteRow[] | null;
  // Colunas antigas do papel único (lerSuportes).
  suporteCodigo?: string | null;
  suporteDescricao?: string | null;
  suporteQtdFolha?: number | null;
  suporteFolhas?: number | null;
  suporteUtilizarCodigo?: string | null;
  suporteUtilizarDescricao?: string | null;
  papelObs?: string | null;
};

export type LoteView = {
  // null = lote implícito (Aceite sem divisão).
  id: string | null;
  numero: number;
  de: number;
  implicito: boolean;
  etapa: EtapaAceiteKey;
  itens: ItemAceite[];
  // Quantidade pedida neste lote (soma dos modelos).
  total: number;
  datasCliente: DataCliente[];
  suportes: SuporteAceite[];
  situacaoPapel: string;
  obs: string;
  numeroOF: string | null;
  dataEntregaSugerida: Date | null;
  dataEntrega: Date | null;
  pcpEm: Date | null;
  pcpPor: string | null;
  pcpObs: string | null;
  pedidoCadastradoEm: Date | null;
  pedidoCadastradoPor: string | null;
  clienteInformadoEm: Date | null;
  clienteInformadoPor: string | null;
  entregueEm: Date | null;
  entregaConfirmadaEm: Date | null;
  entregaConfirmadaPor: string | null;
  entregaObs: string | null;
  entregaSaldoCancelado: number | null;
  entregaCancelamentoMotivo: string | null;
};

const num = (v: DecimalLike): number | null => (v === null || v === undefined ? null : Number(v.toString()));

function comuns(c: CamposComuns) {
  return {
    numeroOF: c.numeroOF ?? null,
    dataEntregaSugerida: c.dataEntregaSugerida ?? null,
    dataEntrega: c.dataEntrega ?? null,
    pcpEm: c.pcpEm ?? null,
    pcpPor: c.pcpPor ?? null,
    pcpObs: c.pcpObs ?? null,
    pedidoCadastradoEm: c.pedidoCadastradoEm ?? null,
    pedidoCadastradoPor: c.pedidoCadastradoPor ?? null,
    clienteInformadoEm: c.clienteInformadoEm ?? null,
    clienteInformadoPor: c.clienteInformadoPor ?? null,
    entregueEm: c.entregueEm ?? null,
    entregaConfirmadaEm: c.entregaConfirmadaEm ?? null,
    entregaConfirmadaPor: c.entregaConfirmadaPor ?? null,
    entregaObs: c.entregaObs ?? null,
    entregaSaldoCancelado: num(c.entregaSaldoCancelado),
    entregaCancelamentoMotivo: c.entregaCancelamentoMotivo ?? null,
    situacaoPapel: c.situacaoPapel ?? "NAO_VERIFICADO",
    datasCliente: lerDatasCliente(c),
  };
}

export function estaDividido(a: Pick<AceiteComLotes, "lotes">): boolean {
  return !!a.lotes && a.lotes.length > 0;
}

// Os lotes do Aceite, em ordem. Sem divisão, um lote implícito com os dados do próprio Aceite.
export function lotesDoAceite(a: AceiteComLotes): LoteView[] {
  const itensAceite = lerItens(a.itens);
  if (!estaDividido(a)) {
    return [
      {
        id: null,
        numero: 1,
        de: 1,
        implicito: true,
        etapa: a.etapa as EtapaAceiteKey,
        itens: itensAceite,
        total: itensAceite.reduce((s, i) => s + (i.quantidade ?? 0), 0),
        suportes: lerSuportes(a),
        obs: "",
        ...comuns(a),
      },
    ];
  }
  const lotes = [...a.lotes!].sort((x, y) => x.numero - y.numero);
  return lotes.map((l) => {
    const itens = itensDoLote(itensAceite, { itens: lerItensLote(l.itens) });
    return {
      id: l.id,
      numero: l.numero,
      de: lotes.length,
      implicito: false,
      etapa: l.etapa as EtapaAceiteKey,
      itens,
      total: itens.reduce((s, i) => s + (i.quantidade ?? 0), 0),
      suportes: Array.isArray(l.suportes) ? (l.suportes as SuporteAceite[]) : [],
      obs: l.obs ?? "",
      ...comuns(l),
    };
  });
}

// "Lote 2/4"; vazio para o lote implícito (Aceite sem divisão não mostra nada de lote).
export function rotuloLote(l: Pick<LoteView, "numero" | "de" | "implicito">): string {
  return l.implicito ? "" : `Lote ${l.numero}/${l.de}`;
}

// ---------- papel e PM do lote ----------

type PMComLote = { status: string; prazoPrevisto: Date | string | null; loteId?: string | null; alertaEm?: Date | null; alertaVistoEm?: Date | null };

// PMs de um lote. No lote implícito, todos os PMs do Aceite.
export function pmsDoLote<T extends PMComLote>(lote: Pick<LoteView, "id">, pms: T[]): T[] {
  return lote.id ? pms.filter((p) => p.loteId === lote.id) : pms;
}

// PMs de um Aceite dividido que ainda não têm lote (por exemplo, depois de refazer a divisão).
export function pmsSemLote<T extends PMComLote>(a: Pick<AceiteComLotes, "lotes">, pms: T[]): T[] {
  return estaDividido(a) ? pms.filter((p) => p.status !== "CANCELADO" && !p.loteId) : [];
}

// Papel do lote garantido: cada papel do lote reservado por inteiro, ou com PM do lote com prazo.
export function loteGarantido(lote: LoteView, pms: PMComLote[]): boolean {
  return suportesGarantidos(lote.suportes, pmsDoLote(lote, pms));
}

// Situação geral do papel de um lote, a partir de cada papel dele.
export function situacaoDoLote(suportes: SuporteAceite[]) {
  return situacaoGeral(suportes);
}

// ---------- andamento do Aceite ----------

// Aceite dividido só conclui quando TODOS os lotes estão concluídos.
export function todosConcluidos(lotes: Pick<LoteView, "etapa">[]): boolean {
  return lotes.length > 0 && lotes.every((l) => l.etapa === "CONCLUIDO");
}

// Quanto da produção de um lote sai do estoque e quanto é produzido (para telas e totais).
export function producaoDoLote(l: Pick<LoteView, "itens">): { pedido: number; doEstoque: number; produzir: number } {
  return {
    pedido: l.itens.reduce((s, i) => s + (i.quantidade ?? 0), 0),
    doEstoque: l.itens.reduce((s, i) => s + (i.emEstoque ?? 0), 0),
    produzir: l.itens.reduce((s, i) => s + aProduzir(i), 0),
  };
}

// Chave da funcionalidade. Fica desligada enquanto Compras, Engenharia, PCP e Atendimento ainda não
// trabalham com lotes: a divisão só é oferecida em Vendas quando o resto está pronto (16/10/2026).
export const LOTES_ATIVOS = false;
