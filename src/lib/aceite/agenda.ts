// Agenda dos Aceites: cada pedido numa linha, dos próximos dias até a entrega prometida (proposta
// "A + C" escolhida pelo Thiago em 08/10/2026 para testar em Vendas). Sem acesso ao banco: recebe o
// Aceite e devolve o que desenhar, em dias contados a partir de hoje (0 = hoje).
//
// Só usa datas que o app conhece: chegada do papel (PMs), etapa em que o Aceite espera e a data de
// entrega do PCP. A produção em si ainda não tem data no app; o trecho entre o papel e a entrega
// aparece como "até a entrega".

import { chegadaDoPapel, temAlertaPendente } from "./constantes";
import { papelGarantido } from "./suportes";

// Dia e mês (sem o ano), que é o que cabe dentro da agenda.
function dm(d: Date | string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
}

// Período que a agenda mostra (pedido do Thiago em 11/10/2026: escolher, em vez de 21 dias fixos).
// `inicio` é o primeiro dia da grade; os índices dos segmentos contam a partir dele.
export type Periodo = { key: string; inicio: Date; dias: number };

export const PERIODOS = [
  { key: "14", label: "2 semanas" },
  { key: "21", label: "3 semanas" },
  { key: "30", label: "30 dias" },
  { key: "60", label: "60 dias" },
  { key: "mes", label: "Este mês" },
  { key: "proximo", label: "Próximo mês" },
] as const;
export const PERIODO_PADRAO = "21";
const MAX_DIAS = 92;

function lerDia(v: string | undefined): Date | null {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(v + "T00:00:00.000Z");
  return Number.isNaN(d.getTime()) ? null : d;
}

// Lê o período da URL: datas "de"/"até" escolhidas, ou um dos atalhos; sem nada, 3 semanas.
export function lerPeriodo(q: { periodo?: string; de?: string; ate?: string }, hoje: Date): Periodo {
  const de = lerDia(q.de);
  const ate = lerDia(q.ate);
  if (de && ate && ate >= de) return { key: "datas", inicio: de, dias: Math.min(MAX_DIAS, indice(ate, de) + 1) };
  const key = PERIODOS.some((x) => x.key === q.periodo) ? q.periodo! : PERIODO_PADRAO;
  if (key === "mes" || key === "proximo") {
    const m = hoje.getUTCMonth() + (key === "proximo" ? 1 : 0);
    const inicio = new Date(Date.UTC(hoje.getUTCFullYear(), m, 1));
    const fim = new Date(Date.UTC(hoje.getUTCFullYear(), m + 1, 0));
    return { key, inicio, dias: indice(fim, inicio) + 1 };
  }
  return { key, inicio: hoje, dias: Number(key) };
}

// Último dia do período (inclusive).
export function fimDoPeriodo(p: Periodo): Date {
  return new Date(p.inicio.getTime() + (p.dias - 1) * 86400000);
}

export type Segmento = { tipo: "papel" | "espera" | "rumo" | "risco"; ini: number; fim: number; texto: string };
export type Marco = { tipo: "papel" | "entrega" | "entrega-risco" | "entregue"; dia: number; texto: string };
export type LinhaAgenda = { segmentos: Segmento[]; marcos: Marco[]; depois: string | null; risco: boolean };

type AceiteAgenda = {
  etapa: string;
  suportes?: unknown;
  engenhariaEm: Date | null;
  situacaoPapel: string;
  dataEntrega: Date | null;
  entregueEm?: Date | null;
  pedidosMaterial: { status: string; prazoPrevisto: Date | null; alertaEm: Date | null; alertaVistoEm: Date | null; suporteRef?: string | null }[];
};

// Hoje à meia-noite UTC, pelo calendário de Brasília (as datas sem horário do banco são UTC).
export function hojeBrasil(agora: Date): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(agora);
  return new Date(ymd + "T00:00:00.000Z");
}

export function diasDaAgenda(p: Periodo): Date[] {
  return Array.from({ length: p.dias }, (_, i) => new Date(p.inicio.getTime() + i * 86400000));
}

function indice(d: Date, base: Date): number {
  return Math.round((new Date(d).getTime() - base.getTime()) / 86400000);
}

function textoEspera(a: AceiteAgenda): string | null {
  if (a.etapa === "VENDAS") return "falta preencher o Aceite";
  if (a.etapa === "ENGENHARIA_MATERIAL") {
    if (!a.engenhariaEm) return "esperando a Engenharia";
    if (!papelGarantido(a)) return "esperando a data do papel";
  }
  if (a.etapa === "PCP") return "aguardando a data do PCP";
  return null;
}

export function linhaDaAgenda(a: AceiteAgenda, hoje: Date, p: Periodo): LinhaAgenda {
  const N = p.dias;
  // Já entregue (o PCP confirmou): só o marco do dia em que foi entregue.
  if (a.entregueEm) {
    const i = indice(a.entregueEm, p.inicio);
    return { segmentos: [], marcos: i >= 0 && i < N ? [{ tipo: "entregue", dia: i, texto: `entregue ${dm(a.entregueEm)}` }] : [], depois: null, risco: false };
  }
  const segmentos: Segmento[] = [];
  const marcos: Marco[] = [];
  const alerta = temAlertaPendente(a.pedidosMaterial);
  // Passou da data acordada e o PCP ainda não confirmou a entrega.
  const atrasada = !!a.dataEntrega && new Date(a.dataEntrega) < hoje;
  const chegada = chegadaDoPapel(a.pedidosMaterial);
  const iChegada = chegada ? indice(chegada, p.inicio) : null;
  const iEntrega = a.dataEntrega ? indice(a.dataEntrega, p.inicio) : null;
  const risco = alerta || atrasada || (chegada !== null && a.dataEntrega !== null && new Date(chegada) >= new Date(a.dataEntrega));
  // O que ainda vai acontecer começa hoje (ou no início do período, se ele começa depois de hoje).
  const iHoje = Math.min(Math.max(indice(hoje, p.inicio), 0), N);

  // Papel a caminho: de hoje até a chegada (cortado nas bordas do período).
  let inicioDepoisDoPapel = iHoje;
  if (iChegada !== null && iChegada > iHoje) {
    const fim = Math.min(iChegada, N);
    if (fim > iHoje) segmentos.push({ tipo: alerta ? "risco" : "papel", ini: iHoje, fim, texto: alerta ? `papel adiado, chega ${dm(chegada)}` : "papel a caminho" });
    if (iChegada < N) marcos.push({ tipo: "papel", dia: iChegada, texto: `papel chega ${dm(chegada)}` });
    inicioDepoisDoPapel = Math.min(iChegada + 1, N);
  }

  if (iEntrega !== null) {
    // Até a entrega prometida.
    const fim = Math.min(Math.max(iEntrega, 0), N);
    if (fim > inicioDepoisDoPapel) {
      segmentos.push({ tipo: risco ? "risco" : "rumo", ini: inicioDepoisDoPapel, fim, texto: risco ? "entrega em risco" : "até a entrega" });
    }
    if (iEntrega >= 0 && iEntrega < N) {
      marcos.push({ tipo: risco ? "entrega-risco" : "entrega", dia: iEntrega, texto: `entrega ${dm(a.dataEntrega)}` });
    }
    // Atrasada: faixa vermelha da data acordada até hoje.
    if (atrasada) {
      const ini = Math.max(iEntrega + 1, 0);
      const fim = Math.min(iHoje + 1, N);
      if (fim > ini) segmentos.push({ tipo: "risco", ini, fim, texto: `atrasada desde ${dm(a.dataEntrega)}` });
    }
  } else {
    // Sem data de entrega ainda: o tempo corre esperando alguém.
    const espera = textoEspera(a);
    if (espera && inicioDepoisDoPapel < N) segmentos.push({ tipo: "espera", ini: inicioDepoisDoPapel, fim: N, texto: espera });
  }

  const depois = iEntrega !== null && iEntrega >= N ? `entrega ${dm(a.dataEntrega)} →` : null;
  return { segmentos, marcos, depois, risco };
}
