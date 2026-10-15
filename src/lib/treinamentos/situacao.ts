// Situação de uma pessoa em um treinamento — função pura, usada no cartão de "Meus treinamentos", no selo
// de pendência do menu e no painel de acompanhamento.
//
// - CONCLUIDO: aprovada na versão atual do treinamento.
// - REFAZER: já respondeu o quiz da versão atual, mas ainda não chegou à nota mínima (tentativas ilimitadas).
// - ATUALIZADO: foi aprovada numa versão antiga; o vídeo ou o quiz mudou, então precisa refazer.
// - PENDENTE: nunca respondeu.

export type TentativaResumo = {
  versaoTreinamento: number;
  nota: number;
  aprovado: boolean;
  criadaEm: Date;
};

export type TipoSituacao = "PENDENTE" | "REFAZER" | "CONCLUIDO" | "ATUALIZADO";

export type Situacao = {
  tipo: TipoSituacao;
  // Melhor nota entre as tentativas que contam (a versão atual; na ATUALIZADO, a da versão antiga).
  melhorNota: number | null;
  // Data da tentativa da melhor nota.
  data: Date | null;
  tentativasNaVersao: number;
};

function melhor(ts: TentativaResumo[]): TentativaResumo | null {
  return ts.reduce<TentativaResumo | null>((m, t) => (!m || t.nota > m.nota || (t.nota === m.nota && t.criadaEm < m.criadaEm) ? t : m), null);
}

export function situacaoDe(versaoAtual: number, tentativas: TentativaResumo[]): Situacao {
  const naVersao = tentativas.filter((t) => t.versaoTreinamento === versaoAtual);
  const aprovadas = naVersao.filter((t) => t.aprovado);
  if (aprovadas.length > 0) {
    const m = melhor(aprovadas)!;
    return { tipo: "CONCLUIDO", melhorNota: m.nota, data: m.criadaEm, tentativasNaVersao: naVersao.length };
  }
  if (naVersao.length > 0) {
    const m = melhor(naVersao)!;
    return { tipo: "REFAZER", melhorNota: m.nota, data: m.criadaEm, tentativasNaVersao: naVersao.length };
  }
  const antigas = tentativas.filter((t) => t.aprovado && t.versaoTreinamento < versaoAtual);
  if (antigas.length > 0) {
    const m = melhor(antigas)!;
    return { tipo: "ATUALIZADO", melhorNota: m.nota, data: m.criadaEm, tentativasNaVersao: 0 };
  }
  return { tipo: "PENDENTE", melhorNota: null, data: null, tentativasNaVersao: 0 };
}

export function contaComoPendente(s: Situacao): boolean {
  return s.tipo !== "CONCLUIDO";
}

export const ROTULO_SITUACAO: Record<TipoSituacao, string> = {
  PENDENTE: "Pendente",
  REFAZER: "Refazer",
  CONCLUIDO: "Concluído",
  ATUALIZADO: "Atualizado, refazer",
};
