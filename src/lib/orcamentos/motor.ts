// Motor de aprovação automática — porta 1:1 de avaliarCriterios/avaliarDiscrepanciaLegado
// (santa-cruz-orcamentos.html, linhas 1096-1177). Ver seção 3 da especificação.

export const LIMITE_CUSTO = 51; // aprova sozinho quando custo primário <= LIMITE_CUSTO
export const LIMITE_MARGEM = 4.9; // aprova sozinho quando margem P2 >= LIMITE_MARGEM
export const LIMITE_DISCREPANCIA_LEGADO = 2.5; // ±% — critério adicional e independente

export function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%";
}

// Formata um número pro valor inicial de um <input> que vai ser relido com parseValorBR (que
// espera "1.234,56", não o "1234.56" que Number.toString()/JSX produziriam direto).
export function paraCampoBR(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "";
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

type EntradaCriterios = {
  custoPrimarioPct: number | null;
  margemP2Pct: number | null;
  comissaoEspecial: boolean;
  produtoNovo: boolean;
  premissasIguais: boolean | null;
  variacaoPct: number | null;
};

export type ResultadoCriterios = {
  aprovavel: boolean;
  completos: boolean;
  motivo: string;
};

// Critério 1 (regra de negócio): custo primário, margem P2, condição comercial especial e,
// quando há casamento interno exato (produto não é novo), premissas+preço equivalentes ao
// orçamento anterior (±2%).
export function avaliarCriterios(d: EntradaCriterios): ResultadoCriterios {
  const custo = d.custoPrimarioPct;
  const margem = d.margemP2Pct;

  const custoOk = custo !== null && custo !== undefined && custo <= LIMITE_CUSTO;
  const margemOk = margem !== null && margem !== undefined && margem >= LIMITE_MARGEM;
  const comissaoOk = !d.comissaoEspecial;

  let condicoesOk = true;
  if (!d.produtoNovo) {
    const variacaoOk = d.variacaoPct !== null && d.variacaoPct !== undefined && d.variacaoPct <= 2;
    condicoesOk = !!d.premissasIguais && variacaoOk;
  }

  const completos = custo !== null && custo !== undefined && margem !== null && margem !== undefined;
  const aprovavel = completos && custoOk && margemOk && comissaoOk && (d.produtoNovo || condicoesOk);

  let motivo = "";
  if (!completos) motivo = "Faltam dados de custo primário e/ou margem P2.";
  else if (!custoOk) motivo = `Custo primário em ${fmtPct(custo)} (limite: até ${LIMITE_CUSTO}%).`;
  else if (!margemOk) motivo = `Margem P2 em ${fmtPct(margem)} (mínimo: ${LIMITE_MARGEM}%).`;
  else if (!comissaoOk) motivo = "Condição comercial especial pendente.";
  else if (!d.produtoNovo && !condicoesOk) {
    motivo = d.premissasIguais
      ? `Mesmas condições do orçamento anterior, mas o preço projetado varia ${fmtPct(d.variacaoPct)} em relação ao preço anterior (fora da margem de ±2%).`
      : "As premissas do orçamento mudaram em relação ao anterior — a comparação de preço não é direta, precisa de análise.";
  }

  return { aprovavel, completos, motivo };
}

// Só para o campo "Quantidade" da comparação de discrepância: remove formatação (pontos de
// milhar, "und", espaços) e fica só com dígitos.
export function parseQuantidade(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/[^\d]/g, "");
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : n;
}

type CampoAnterior = { label: string; anterior: number | null; atual: number | null };

export type ResultadoDiscrepancia = {
  bloqueia: boolean;
  temDados: boolean;
  campos: string[];
  motivo?: string;
};

// Critério 2 (adicional e independente do Critério 1): compara custo primário, quantidade,
// margem P2 e último preço contra QUALQUER dado anterior legível — casamento interno exato
// quando existir, senão a leitura do Arquivo legado (leituraAnterior, ainda não preenchida
// nesta fase). Campo sem dado anterior não conta nem a favor nem contra.
export function avaliarDiscrepanciaLegado(campos: CampoAnterior[]): ResultadoDiscrepancia {
  let temDados = false;
  const estourou: { label: string; variacao: number }[] = [];

  for (const c of campos) {
    if (c.anterior === null || c.anterior === undefined || Number.isNaN(c.anterior) || c.anterior === 0) continue;
    if (c.atual === null || c.atual === undefined || Number.isNaN(c.atual)) continue;
    temDados = true;
    const variacao = (Math.abs(c.atual - c.anterior) / Math.abs(c.anterior)) * 100;
    if (variacao > LIMITE_DISCREPANCIA_LEGADO) estourou.push({ label: c.label, variacao });
  }

  if (!temDados) return { bloqueia: false, temDados: false, campos: [] };
  if (!estourou.length) return { bloqueia: false, temDados: true, campos: [] };

  const motivo = estourou
    .map((e) => `Discrepância de ${fmtPct(e.variacao)} em ${e.label} frente ao orçamento anterior (limite: ${String(LIMITE_DISCREPANCIA_LEGADO).replace(".", ",")}%).`)
    .join(" ");

  return { bloqueia: true, temDados: true, campos: estourou.map((e) => e.label), motivo };
}
