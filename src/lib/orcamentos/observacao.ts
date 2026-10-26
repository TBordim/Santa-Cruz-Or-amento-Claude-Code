import type { ObservacaoDiretoria, ReqTecnicos } from "./types";

export const MAX_OBSERVACAO = 1000;

// Aplica o texto do formulário ao reqTecnicos: vazio apaga; igual ao que já estava mantém quem e quando
// escreveu; texto novo registra o autor e a hora. Sem acesso ao banco.
export function comObservacaoDiretoria(r: ReqTecnicos | null, bruto: string, por: string, agora: number = Date.now()): ReqTecnicos {
  const base = { ...(r ?? ({ suportes: [], anexos: [] } as unknown as ReqTecnicos)) };
  const texto = bruto.trim().slice(0, MAX_OBSERVACAO);
  if (!texto) {
    delete base.observacaoDiretoria;
    return base;
  }
  if (base.observacaoDiretoria?.texto === texto) return base;
  base.observacaoDiretoria = { texto, por, em: agora };
  return base;
}

export function observacaoDoOrcamento(r: unknown): ObservacaoDiretoria | null {
  const o = (r as ReqTecnicos | null)?.observacaoDiretoria;
  return o?.texto?.trim() ? o : null;
}
