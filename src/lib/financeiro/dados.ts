import "server-only";
import { linhaDoTempo } from "@/lib/orcamentos/historico-etapas";
import { margemBruta } from "@/lib/orcamentos/margem";
import { prazoDoOrcamento } from "@/lib/orcamentos/prazo";
import { renegociacoesDe, renegociacaoAberta, valorCedido } from "@/lib/orcamentos/renegociacao";
import { prisma } from "@/lib/db";
import { valorSO, valorOrcamento, soEscolhida } from "@/lib/orcamentos/modelos";
import { diasAguardando } from "@/lib/orcamentos/espera";
import { itensVigentes } from "@/lib/orcamentos/discrepancia";
import { lotesDoAceite, type AceiteComLotes } from "@/lib/aceite/lotes";
import type { PrecificacaoTier } from "@/lib/orcamentos/types";

// Números para a Diretoria decidir. Tudo é calculado a partir do que o sistema já guarda; o que o
// sistema NÃO tem (nota fiscal, baixa de pagamento, ERP) fica de fora e é dito na tela.

const UM_DIA = 86400000;
const diaSP = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
// Meia-noite UTC do dia (as colunas @db.Date do banco vêm assim).
export const hojeUTC = () => new Date(`${diaSP(new Date())}T00:00:00.000Z`);
const somaDias = (d: Date, n: number) => new Date(d.getTime() + n * UM_DIA);

// ---------- período ----------

export type Periodo = { key: string; label: string; inicio: Date; fim: Date }; // fim inclusivo (fim do dia)

export const PERIODOS_FIN = [
  { key: "semana", label: "Esta semana" },
  { key: "quinzena", label: "Esta quinzena" },
  { key: "mes", label: "Este mês" },
  { key: "30", label: "30 dias" },
  { key: "90", label: "90 dias" },
  { key: "ano", label: "Este ano" },
] as const;

function fimDoDia(d: Date) {
  return new Date(d.getTime() + UM_DIA - 1);
}

export function lerPeriodoFin(q: { p?: string; de?: string; ate?: string }): Periodo {
  const hoje = hojeUTC();
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (q.de && q.ate && re.test(q.de) && re.test(q.ate)) {
    const inicio = new Date(`${q.de}T00:00:00.000Z`);
    const fim = new Date(`${q.ate}T00:00:00.000Z`);
    if (!Number.isNaN(inicio.getTime()) && !Number.isNaN(fim.getTime()) && fim >= inicio) {
      return { key: "personalizado", label: `${q.de.split("-").reverse().join("/")} a ${q.ate.split("-").reverse().join("/")}`, inicio, fim: fimDoDia(fim) };
    }
  }
  const ano = hoje.getUTCFullYear();
  const mes = hoje.getUTCMonth();
  const dia = hoje.getUTCDate();
  switch (q.p) {
    case "semana": {
      const seg = somaDias(hoje, -((hoje.getUTCDay() + 6) % 7));
      return { key: "semana", label: "Esta semana", inicio: seg, fim: fimDoDia(somaDias(seg, 6)) };
    }
    case "quinzena": {
      const primeira = dia <= 15;
      return {
        key: "quinzena",
        label: primeira ? "1ª quinzena do mês" : "2ª quinzena do mês",
        inicio: new Date(Date.UTC(ano, mes, primeira ? 1 : 16)),
        fim: fimDoDia(primeira ? new Date(Date.UTC(ano, mes, 15)) : new Date(Date.UTC(ano, mes + 1, 0))),
      };
    }
    case "30":
      return { key: "30", label: "Últimos 30 dias", inicio: somaDias(hoje, -29), fim: fimDoDia(hoje) };
    case "90":
      return { key: "90", label: "Últimos 90 dias", inicio: somaDias(hoje, -89), fim: fimDoDia(hoje) };
    case "ano":
      return { key: "ano", label: `Ano ${ano}`, inicio: new Date(Date.UTC(ano, 0, 1)), fim: fimDoDia(new Date(Date.UTC(ano, 11, 31))) };
    default:
      return { key: "mes", label: "Este mês", inicio: new Date(Date.UTC(ano, mes, 1)), fim: fimDoDia(new Date(Date.UTC(ano, mes + 1, 0))) };
  }
}

// ---------- orçamentos: funil, fechamento, ranking ----------

export type LinhaRep = { nome: string; ofertas: number; valorOfertado: number; fechados: number; valorFechado: number; perdidos: number; taxa: number | null };

export type Orcamentos = {
  enviadas: { n: number; valor: number };
  positivo: { n: number; valor: number };
  negativo: { n: number; valor: number };
  semRetorno: { n: number; valor: number };
  taxaQtd: number | null;
  taxaValor: number | null;
  ticketMedio: number | null;
  margemP2: number | null;
  // Margem bruta (P1 + P2) média, só dos pedidos em que ela é conhecida, e quantos são.
  margemBruta: { media: number | null; conhecidos: number; total: number };
  custoPrimario: number | null;
  aguardando: { n: number; valor: number; diasMedios: number | null; maisDeSete: { n: number; valor: number }; maisAntigo: number | null; prazoVencido: { n: number; valor: number }; prazoVencendo: number };
  funil: { etapa: string; n: number; valor: number }[];
  pendentesDiretoria: { n: number; valor: number; comDiscrepancia: number };
  autoAprovadas: number;
  reps: LinhaRep[];
  clientes: { nome: string; n: number; valor: number }[];
};

const ETAPAS_FUNIL: { key: string; label: string }[] = [
  { key: "ABERTO", label: "1. Solicitação" },
  { key: "ENGENHARIA", label: "2. Engenharia" },
  { key: "ORCAMENTO", label: "3. Orçamento" },
  { key: "DIRETORIA", label: "4. Diretoria" },
  { key: "ENVIO_OFERTA", label: "5. Envio de oferta" },
];

const tiersDe = (v: unknown) => (Array.isArray(v) ? (v as PrecificacaoTier[]) : []);

export async function orcamentosDoPeriodo(p: Periodo): Promise<Orcamentos> {
  const [enviadasDocs, desfechos, aguardandoDocs, emAndamento, autoAprovadas] = await Promise.all([
    prisma.orcamento.findMany({ where: { origem: "NOVO", finalizadoEm: { gte: p.inicio, lte: p.fim } } }),
    prisma.orcamento.findMany({ where: { origem: "NOVO", desfecho: { in: ["POSITIVO", "NEGATIVO", "SEM_RETORNO"] }, desfechoEm: { gte: p.inicio, lte: p.fim } } }),
    prisma.orcamento.findMany({ where: { origem: "NOVO", etapa: "FINALIZADO", OR: [{ desfecho: null }, { desfecho: "AGUARDANDO" }] } }),
    prisma.orcamento.findMany({ where: { origem: "NOVO", etapa: { in: ["ABERTO", "ENGENHARIA", "ORCAMENTO", "DIRETORIA", "ENVIO_OFERTA"] } } }),
    prisma.orcamento.count({ where: { origem: "NOVO", statusDiretoria: "AUTO_APROVADO", atualizadoEm: { gte: p.inicio, lte: p.fim } } }),
  ]);

  const soma = (docs: { precificacao: unknown }[]) => docs.reduce((s, d) => s + valorOrcamento(tiersDe(d.precificacao)), 0);
  const positivos = desfechos.filter((d) => d.desfecho === "POSITIVO");
  const negativos = desfechos.filter((d) => d.desfecho === "NEGATIVO");
  const semRet = desfechos.filter((d) => d.desfecho === "SEM_RETORNO");
  const vPos = soma(positivos);
  const vNeg = soma(negativos);
  const vSem = soma(semRet);
  const respondidos = desfechos.length;

  // Margem e custo primário ponderados pelo valor, só do que foi fechado.
  let pesoTotal = 0;
  let margem = 0;
  let brutaSoma = 0;
  let brutaPeso = 0;
  let brutaConhecidos = 0;
  let custo = 0;
  for (const d of positivos) {
    const t = soEscolhida(tiersDe(d.precificacao));
    if (!t) continue;
    const v = valorSO(t);
    if (t.margemP2Pct !== null && t.margemP2Pct !== undefined) margem += t.margemP2Pct * v;
    const mb = margemBruta(t.margemP2Pct, t.margemP1Pct);
    if (mb.bruta !== null) {
      brutaSoma += mb.bruta * v;
      brutaPeso += v;
      brutaConhecidos += 1;
    }
    if (t.custoPrimarioPct !== null && t.custoPrimarioPct !== undefined) custo += t.custoPrimarioPct * v;
    pesoTotal += v;
  }

  const diasAg = aguardandoDocs.map((d) => diasAguardando(d.finalizadoEm ?? d.atualizadoEm) ?? 0);
  const velhos = aguardandoDocs.filter((_, i) => diasAg[i] >= 7);
  const prazos = aguardandoDocs.map((d) => prazoDoOrcamento(d.finalizadoEm ?? d.atualizadoEm));
  const vencidosDocs = aguardandoDocs.filter((_, i) => prazos[i]?.vencido);

  // Ranking de representantes: ofertas enviadas e desfechos no período.
  const reps = new Map<string, LinhaRep>();
  const rep = (nome: string | null) => {
    const k = nome?.trim() || "(sem representante)";
    if (!reps.has(k)) reps.set(k, { nome: k, ofertas: 0, valorOfertado: 0, fechados: 0, valorFechado: 0, perdidos: 0, taxa: null });
    return reps.get(k)!;
  };
  for (const d of enviadasDocs) {
    const r = rep(d.representante);
    r.ofertas += 1;
    r.valorOfertado += valorOrcamento(tiersDe(d.precificacao));
  }
  for (const d of positivos) {
    const r = rep(d.representante);
    r.fechados += 1;
    r.valorFechado += valorOrcamento(tiersDe(d.precificacao));
  }
  for (const d of [...negativos, ...semRet]) rep(d.representante).perdidos += 1;
  for (const r of reps.values()) r.taxa = r.fechados + r.perdidos > 0 ? Math.round((r.fechados / (r.fechados + r.perdidos)) * 100) : null;

  const clientes = new Map<string, { nome: string; n: number; valor: number }>();
  for (const d of positivos) {
    const k = d.cliente?.trim() || "(sem nome)";
    const c = clientes.get(k) ?? { nome: k, n: 0, valor: 0 };
    c.n += 1;
    c.valor += valorOrcamento(tiersDe(d.precificacao));
    clientes.set(k, c);
  }

  const pendentes = emAndamento.filter((d) => d.etapa === "DIRETORIA" && d.statusDiretoria === "PENDENTE");

  return {
    enviadas: { n: enviadasDocs.length, valor: soma(enviadasDocs) },
    positivo: { n: positivos.length, valor: vPos },
    negativo: { n: negativos.length, valor: vNeg },
    semRetorno: { n: semRet.length, valor: vSem },
    taxaQtd: respondidos ? Math.round((positivos.length / respondidos) * 100) : null,
    taxaValor: vPos + vNeg + vSem > 0 ? Math.round((vPos / (vPos + vNeg + vSem)) * 100) : null,
    ticketMedio: positivos.length ? vPos / positivos.length : null,
    margemP2: pesoTotal > 0 ? margem / pesoTotal : null,
    margemBruta: { media: brutaPeso > 0 ? brutaSoma / brutaPeso : null, conhecidos: brutaConhecidos, total: positivos.length },
    custoPrimario: pesoTotal > 0 ? custo / pesoTotal : null,
    aguardando: {
      n: aguardandoDocs.length,
      valor: soma(aguardandoDocs),
      diasMedios: diasAg.length ? Math.round(diasAg.reduce((a, b) => a + b, 0) / diasAg.length) : null,
      maisDeSete: { n: velhos.length, valor: soma(velhos) },
      maisAntigo: diasAg.length ? Math.max(...diasAg) : null,
      prazoVencido: { n: vencidosDocs.length, valor: soma(vencidosDocs) },
      prazoVencendo: prazos.filter((p) => p && (p.situacao === "atencao" || p.situacao === "hoje")).length,
    },
    funil: ETAPAS_FUNIL.map((e) => {
      const docs = emAndamento.filter((d) => d.etapa === e.key);
      return { etapa: e.label, n: docs.length, valor: soma(docs) };
    }),
    pendentesDiretoria: {
      n: pendentes.length,
      valor: soma(pendentes),
      comDiscrepancia: pendentes.filter((d) => tiersDe(d.precificacao).some((t) => itensVigentes(t.discrepancia?.itens).length > 0)).length,
    },
    autoAprovadas,
    reps: [...reps.values()].sort((a, b) => b.valorFechado - a.valorFechado || b.valorOfertado - a.valorOfertado),
    clientes: [...clientes.values()].sort((a, b) => b.valor - a.valor).slice(0, 8),
  };
}

// ---------- pedidos: faturamento e recebimento previstos ----------

export type Entrega = {
  aceiteId: string;
  cliente: string;
  produto: string;
  rotulo: string; // "Lote 2/3" ou ""
  valor: number;
  data: Date | null; // entrega prevista
  entregueEm: Date | null;
  concluido: boolean;
  etapa: string;
  condPagamento: string | null;
  numero: string | null;
};

// Dias de cada parcela a partir do texto livre da condição de pagamento: "28/35/42 dias" -> [28,35,42];
// "À vista" -> [0]; "30 dias" -> [30]. Sem número reconhecível -> null (aparece em "prazo não informado").
export function prazosDaCondicao(texto: string | null | undefined): number[] | null {
  const t = (texto ?? "").trim();
  if (!t) return null;
  const dias = [...t.matchAll(/\d+/g)].map((m) => parseInt(m[0], 10)).filter((n) => n >= 0 && n <= 365);
  if (dias.length) return dias;
  return /vista|antecipad/i.test(t) ? [0] : null;
}

export async function carteiraDeEntregas(): Promise<{ entregas: Entrega[]; semValor: number }> {
  const aceites = await prisma.aceite.findMany({
    where: { etapa: { not: "CANCELADO" } },
    include: { orcamento: true, lotes: true },
  });
  const entregas: Entrega[] = [];
  let semValor = 0;
  for (const a of aceites) {
    const tier = a.soEscolhida as PrecificacaoTier | null;
    const total = tier ? valorSO(tier) : 0;
    if (!total) {
      semValor += 1;
      continue;
    }
    const lotes = lotesDoAceite(a as unknown as AceiteComLotes);
    const qtdTotal = lotes.reduce((s, l) => s + l.total, 0);
    for (const l of lotes) {
      entregas.push({
        aceiteId: a.id,
        cliente: a.orcamento.cliente ?? "Cliente sem nome",
        produto: a.orcamento.produtoDescricao ?? "",
        rotulo: l.implicito ? "" : `Lote ${l.numero}/${l.de}`,
        valor: qtdTotal > 0 ? (total * l.total) / qtdTotal : total / lotes.length,
        data: l.dataEntrega,
        entregueEm: l.entregueEm,
        concluido: l.etapa === "CONCLUIDO" || !!l.entregueEm,
        etapa: l.etapa,
        condPagamento: a.orcamento.condPagamento,
        numero: a.numero,
      });
    }
  }
  return { entregas, semValor };
}

export type Faixa = { key: string; label: string; inicio: Date; fim: Date };

// Faixas de tempo a partir de hoje: semana, quinzena e mês (cada uma contém a anterior, por isso
// a tela as mostra como "totais", não como somatório) e as próximas.
export function faixasDeTempo(): Faixa[] {
  const hoje = hojeUTC();
  const ano = hoje.getUTCFullYear();
  const mes = hoje.getUTCMonth();
  const dia = hoje.getUTCDate();
  const domingo = somaDias(hoje, (7 - hoje.getUTCDay()) % 7);
  const fimQuinzena = dia <= 15 ? new Date(Date.UTC(ano, mes, 15)) : new Date(Date.UTC(ano, mes + 1, 0));
  return [
    { key: "hoje", label: "Hoje", inicio: hoje, fim: hoje },
    { key: "semana", label: "Esta semana (até domingo)", inicio: hoje, fim: domingo },
    { key: "semana2", label: "Próxima semana", inicio: somaDias(domingo, 1), fim: somaDias(domingo, 7) },
    { key: "quinzena", label: "Até o fim da quinzena", inicio: hoje, fim: fimQuinzena },
    { key: "mes", label: "Até o fim do mês", inicio: hoje, fim: new Date(Date.UTC(ano, mes + 1, 0)) },
    { key: "mes2", label: "Próximo mês", inicio: new Date(Date.UTC(ano, mes + 1, 1)), fim: new Date(Date.UTC(ano, mes + 2, 0)) },
  ];
}

const dentro = (d: Date | null, f: { inicio: Date; fim: Date }) => !!d && d >= f.inicio && d <= f.fim;

export type Previsao = {
  faixas: { key: string; label: string; valor: number; n: number }[];
  atrasado: { valor: number; n: number };
  semData: { valor: number; n: number };
  porSemana: { label: string; valor: number }[];
};

// Faturamento previsto = valor do pedido (ou do lote) na data de entrega prometida pelo PCP, ainda
// não entregue. Atrasado = data já passou e não consta entrega. É estimativa: o sistema não vê nota fiscal.
export function previsaoDeFaturamento(entregas: Entrega[]): Previsao {
  const hoje = hojeUTC();
  const abertas = entregas.filter((e) => !e.concluido);
  const faixas = faixasDeTempo().map((f) => {
    const itens = abertas.filter((e) => dentro(e.data, f));
    return { key: f.key, label: f.label, valor: itens.reduce((s, e) => s + e.valor, 0), n: itens.length };
  });
  const atrasadas = abertas.filter((e) => e.data && e.data < hoje);
  const semData = abertas.filter((e) => !e.data);
  const porSemana: Previsao["porSemana"] = [];
  const seg = somaDias(hoje, -((hoje.getUTCDay() + 6) % 7));
  for (let i = 0; i < 8; i++) {
    const ini = somaDias(seg, i * 7);
    const fim = somaDias(ini, 6);
    const itens = abertas.filter((e) => e.data && e.data >= (i === 0 ? hoje : ini) && e.data <= fim);
    porSemana.push({ label: `${ini.getUTCDate().toString().padStart(2, "0")}/${(ini.getUTCMonth() + 1).toString().padStart(2, "0")}`, valor: itens.reduce((s, e) => s + e.valor, 0) });
  }
  return {
    faixas,
    atrasado: { valor: atrasadas.reduce((s, e) => s + e.valor, 0), n: atrasadas.length },
    semData: { valor: semData.reduce((s, e) => s + e.valor, 0), n: semData.length },
    porSemana,
  };
}

// Recebimento estimado: cada parcela cai na data de entrega + o prazo da condição de pagamento
// (parcelas iguais). Entrega já feita usa a data real. O sistema não tem baixa de pagamento, então
// o que já venceu só aparece como "vencido no cálculo".
export function previsaoDeRecebimento(entregas: Entrega[]) {
  const hoje = hojeUTC();
  const parcelas: { data: Date; valor: number }[] = [];
  let semPrazo = { valor: 0, n: 0 };
  let semData = { valor: 0, n: 0 };
  for (const e of entregas) {
    const base = e.entregueEm ?? e.data;
    if (!base) {
      semData = { valor: semData.valor + e.valor, n: semData.n + 1 };
      continue;
    }
    const prazos = prazosDaCondicao(e.condPagamento);
    if (!prazos) {
      semPrazo = { valor: semPrazo.valor + e.valor, n: semPrazo.n + 1 };
      continue;
    }
    for (const d of prazos) parcelas.push({ data: somaDias(base, d), valor: e.valor / prazos.length });
  }
  const faixas = faixasDeTempo().map((f) => {
    const itens = parcelas.filter((p) => dentro(p.data, f));
    return { key: f.key, label: f.label, valor: itens.reduce((s, p) => s + p.valor, 0), n: itens.length };
  });
  const vencido = parcelas.filter((p) => p.data < hoje);
  return { faixas, vencido: { valor: vencido.reduce((s, p) => s + p.valor, 0), n: vencido.length }, semPrazo, semData };
}

// Entregas feitas no período (faturamento realizado, pela data de entrega confirmada).
export function realizadoNoPeriodo(entregas: Entrega[], p: Periodo) {
  const feitas = entregas.filter((e) => e.entregueEm && e.entregueEm >= p.inicio && e.entregueEm <= p.fim);
  return { n: feitas.length, valor: feitas.reduce((s, e) => s + e.valor, 0) };
}

// Pedidos cancelados no período (valor que se perdeu depois de fechado).
export async function canceladosNoPeriodo(p: Periodo) {
  const docs = await prisma.aceite.findMany({ where: { etapa: "CANCELADO", canceladoEm: { gte: p.inicio, lte: p.fim } } });
  const valor = docs.reduce((s, a) => s + (a.soEscolhida ? valorSO(a.soEscolhida as PrecificacaoTier) : 0), 0);
  return { n: docs.length, valor };
}

// Renegociações de preço (o cliente pediu desconto depois da oferta): quantas estão abertas agora, quantas
// foram pedidas no período e quanto o desconto custou (valor antes - valor depois, nas rodadas já concluídas).
export async function renegociacoesDoPeriodo(p: Periodo) {
  const docs = await prisma.orcamento.findMany({ where: { origem: "NOVO" }, select: { reqTecnicos: true, precificacao: true }, take: 5000 });
  let abertas = 0;
  let noPeriodo = 0;
  let cedido = 0;
  for (const d of docs) {
    const rs = renegociacoesDe(d.reqTecnicos);
    if (!rs.length) continue;
    if (renegociacaoAberta(d.reqTecnicos)) abertas += 1;
    rs.forEach((r, i) => {
      if (r.em < p.inicio.getTime() || r.em > p.fim.getTime() || !r.concluidaEm) {
        if (r.em >= p.inicio.getTime() && r.em <= p.fim.getTime()) noPeriodo += 1;
        return;
      }
      noPeriodo += 1;
      const depois = rs[i + 1]?.oferta ?? tiersDe(d.precificacao);
      cedido += valorCedido(depois, r);
    });
  }
  return { abertas, noPeriodo, cedido };
}

// Tempo que os cards levam em cada etapa do orçamento (pelo histórico de etapas): média, maior e quantas
// passagens, das que terminaram dentro do período. Só conta passagem com as duas horas registradas.
export async function tempoPorEtapa(p: Periodo) {
  const docs = await prisma.orcamento.findMany({
    where: { origem: "NOVO" },
    select: { criadoEm: true, etapa: true, reqTecnicos: true, vistoEngenhariaEm: true, finalizadoEm: true },
    take: 5000,
  });
  const acum = new Map<string, { soma: number; maior: number; n: number }>();
  for (const d of docs) {
    const passos = linhaDoTempo(d);
    passos.forEach((x, i) => {
      const prox = passos[i + 1];
      if (!prox || x.aproximado || prox.aproximado) return;
      if (prox.em < p.inicio.getTime() || prox.em > p.fim.getTime()) return;
      const a = acum.get(x.etapa) ?? { soma: 0, maior: 0, n: 0 };
      a.soma += x.duracaoMs;
      a.maior = Math.max(a.maior, x.duracaoMs);
      a.n += 1;
      acum.set(x.etapa, a);
    });
  }
  return ["ABERTO", "ENGENHARIA", "ORCAMENTO", "DIRETORIA", "ENVIO_OFERTA", "FINALIZADO"].map((etapa) => {
    const a = acum.get(etapa);
    return { etapa, media: a ? a.soma / a.n : null, maior: a?.maior ?? null, n: a?.n ?? 0 };
  });
}
