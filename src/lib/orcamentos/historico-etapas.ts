import type { ReqTecnicos } from "./types";

// Histórico de etapas do card: a hora em que cada etapa recebeu o card e quanto tempo ele ficou nela
// (pedido do Thiago em 28/10/2026, para medir o tempo entre uma etapa e a outra). O registro novo mora em
// reqTecnicos.historicoEtapas (gravado por db.ts a cada mudança de etapa); os cards de antes só têm
// algumas horas soltas, que entram aqui como alternativa. Sem acesso ao banco.

export type EntradaEtapa = { etapa: string; de?: string; em: number; por: string };

export type PassoDoCard = {
  etapa: string;
  em: number; // quando recebeu o card (epoch ms)
  por: string | null;
  saiuEm: number | null; // quando passou para a etapa seguinte; null = é a etapa atual
  duracaoMs: number; // tempo nela (até agora, se for a atual)
  aproximado: boolean; // hora vinda de outro registro do card, não do histórico de etapas
};

type DocParaHistorico = {
  criadoEm: Date;
  etapa: string | null;
  reqTecnicos: unknown;
  vistoEngenhariaEm?: Date | null;
  finalizadoEm?: Date | null;
};

export function entradasDoCard(doc: Pick<DocParaHistorico, "reqTecnicos">): EntradaEtapa[] {
  const lista = (doc.reqTecnicos as ReqTecnicos | null)?.historicoEtapas;
  return Array.isArray(lista) ? lista.filter((e) => e && typeof e.etapa === "string" && typeof e.em === "number") : [];
}

export function linhaDoTempo(doc: DocParaHistorico, agora: number = Date.now()): PassoDoCard[] {
  const reais = entradasDoCard(doc);
  const mapa = new Map<string, { em: number; por: string | null; aproximado: boolean }>();
  // Toda solicitação nasce na primeira etapa: a hora de criação é conhecida.
  mapa.set("ABERTO", { em: doc.criadoEm.getTime(), por: null, aproximado: false });
  // Horas soltas de cards anteriores ao histórico: só preenchem etapa que o histórico não tem.
  if (doc.vistoEngenhariaEm) mapa.set("ORCAMENTO", { em: doc.vistoEngenhariaEm.getTime(), por: null, aproximado: true });
  if (doc.finalizadoEm) mapa.set("FINALIZADO", { em: doc.finalizadoEm.getTime(), por: null, aproximado: true });
  const jaTemReal = new Set<string>();
  for (const e of reais) {
    // A passagem mais recente por cada etapa vale (o card pode voltar e passar de novo).
    mapa.set(e.etapa, { em: e.em, por: e.por ?? null, aproximado: false });
    jaTemReal.add(e.etapa);
  }
  const passos = [...mapa].map(([etapa, v]) => ({ etapa, ...v })).sort((a, b) => a.em - b.em);
  // Só segue pela etapa atual: o que veio depois dela (card que voltou) não é mais verdade.
  const idxAtual = doc.etapa ? passos.map((p) => p.etapa).lastIndexOf(doc.etapa) : -1;
  const validos = idxAtual >= 0 ? passos.slice(0, idxAtual + 1) : passos;
  return validos.map((p, i) => {
    const prox = validos[i + 1];
    const saiuEm = prox ? prox.em : null;
    return { etapa: p.etapa, em: p.em, por: p.por, saiuEm, duracaoMs: Math.max(0, (saiuEm ?? agora) - p.em), aproximado: p.aproximado };
  });
}

// "35 min", "3 h 20 min", "2 d 4 h".
export function duracaoCurta(ms: number): string {
  const min = Math.floor(ms / 60000);
  if (min < 1) return "menos de 1 min";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h${min % 60 ? ` ${min % 60} min` : ""}`;
  const d = Math.floor(h / 24);
  return `${d} d${h % 24 ? ` ${h % 24} h` : ""}`;
}
