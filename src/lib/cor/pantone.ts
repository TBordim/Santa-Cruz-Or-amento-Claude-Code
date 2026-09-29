import type { Lab } from "./deltae";
import { deltaE2000 } from "./deltae";

// Tabela de equivalência IRO ↔ Pantone, CONFIRMADA PELO FORNECEDOR (Sun Chemical, 2026-09-30, via
// WhatsApp) — ver memória do projeto. Única exceção: qual de IRO12/IRO18 é o Yellow mais
// claro/escuro ainda não foi confirmado — usamos a hipótese registrada (IRO12 = Yellow 012, IRO18 =
// Yellow "normal") até o fornecedor mandar o PDF que resolve isso. Se vier invertido, é só trocar
// as duas linhas abaixo.
export const EQUIVALENCIA_PANTONE_IRO: Record<string, string> = {
  TransWhite: "IRO48",
  Yellow: "IRO18", // hipótese — ver comentário acima
  Yellow012: "IRO12", // hipótese — ver comentário acima
  WarmRed: "IRO33",
  Rubine: "IRO35",
  Black: "IRO50",
  Orange021: "IRO21",
  Violet: "IRO53",
  ProcessBlue: "IRO17",
  Green: "IRO71",
  Red032: "IRO32",
  Rhodamine: "IRO54",
};

// Reflex Blue e Blue 072 são o mesmo pigmento Pantone sob dois nomes; o fornecedor confirmou que o
// combo IRO17+IRO53 faz esse papel, mas a PROPORÇÃO entre os dois ainda não foi calibrada (204 das
// 866 fórmulas Pantone com LAB dependem disso — ver estudo 2026-09-29/30). Não convertemos essas
// fórmulas ainda; calibrar comparando com as cores do histórico IRO que já usam IRO17+IRO53 juntos
// é o próximo passo natural quando isso for retomado.
const COMPONENTES_COMBO_REFLEX_BLUE = new Set(["ReflexBlue", "Blue072"]);

// Sem equivalente IRO confirmado — aparecem em ~48/866 fórmulas Pantone com LAB (principalmente as
// que usam Purple). O fornecedor disse que não há base mais ampla que a casa não tenha, então é
// provável que sejam combos de bases existentes também, mas isso não foi mapeado ainda.
const COMPONENTES_SEM_EQUIVALENCIA = new Set(["Purple", "MedPurple", "Pink", "BrightRed", "DarkBlue", "Silver877"]);

export type ComposicaoIro = { baseCodigo: string; percentual: number };

export type ResultadoConversao =
  | { ok: true; composicao: ComposicaoIro[] }
  | { ok: false; motivo: string };

// Converte uma composição Pantone (nomes de componente do Formula Guide) pra bases IRO, usando a
// equivalência confirmada. Recusa converter (ok:false) em vez de arriscar uma fórmula errada quando
// algum componente não tem equivalência confirmada — mais seguro que inventar um mapeamento.
export function converterComposicaoParaIro(composicaoPantone: Record<string, number>): ResultadoConversao {
  const porBase = new Map<string, number>();

  for (const [componente, percentual] of Object.entries(composicaoPantone)) {
    if (COMPONENTES_SEM_EQUIVALENCIA.has(componente)) {
      return { ok: false, motivo: `"${componente}" ainda não tem equivalente IRO confirmado.` };
    }
    if (COMPONENTES_COMBO_REFLEX_BLUE.has(componente)) {
      return { ok: false, motivo: `"${componente}" usa o combo IRO17+IRO53, cuja proporção ainda não foi calibrada.` };
    }
    const baseCodigo = EQUIVALENCIA_PANTONE_IRO[componente];
    if (!baseCodigo) {
      return { ok: false, motivo: `Componente Pantone desconhecido: "${componente}".` };
    }
    porBase.set(baseCodigo, (porBase.get(baseCodigo) ?? 0) + percentual);
  }

  const composicao = [...porBase.entries()]
    .map(([baseCodigo, percentual]) => ({ baseCodigo, percentual: Math.round(percentual * 100) / 100 }))
    .sort((a, b) => b.percentual - a.percentual);

  return { ok: true, composicao };
}

export type PantoneRef = { codigo: string; lab: Lab };

// Vizinho mais próximo por ΔE2000 num catálogo Pantone já carregado (a query fica na página, essa
// função é pura — mesmo padrão da busca de Sugestão 2 no histórico de Cores).
export function pantoneMaisProximo(alvo: Lab, catalogo: PantoneRef[]): { pantone: PantoneRef; de: number } | null {
  let melhor: { pantone: PantoneRef; de: number } | null = null;
  for (const p of catalogo) {
    const de = deltaE2000(alvo, p.lab);
    if (!melhor || de < melhor.de) melhor = { pantone: p, de };
  }
  return melhor;
}
