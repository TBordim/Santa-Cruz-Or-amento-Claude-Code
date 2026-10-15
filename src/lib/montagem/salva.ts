// A pré-montagem aprovada pela Engenharia, como fica gravada no card (reqTecnicos.preMontagem,
// por material). Guarda o pedido, o contorno da faca e a opção escolhida: dá para reabrir e
// refazer o cálculo depois. Sem mudança no banco: reqTecnicos é um campo Json.
import type { Entrada, Opcao } from "./calcular";
import type { Faca, Pt } from "./geometria";

export type PreMontagemSalva = {
  versao: 1;
  aprovadaEm: string;
  materialIdx: number;
  // Qual folha a Engenharia decidiu usar: a padrão em estoque ou a sob medida (formato ideal).
  formatoEscolhido: "padrao" | "ideal";
  entrada: Omit<Entrada, "faca">;
  faca: Pick<Faca, "W" | "H" | "contorno" | "area" | "corte" | "vinco" | "origem" | "medidas" | "cola" | "secoes" | "linhas">;
  escolha: {
    folhaW: number;
    folhaH: number;
    corte: number;
    wf: number;
    hf: number;
    girada90: boolean;
    estrategia: string;
    posesPorFator: number;
    pecasPorFolha: number;
    aproveitamento: number;
    folhas: number;
    pecasProduzidas: number;
    laminaMm: number;
    custoFaca: number;
    // Folha sob medida (formato ideal de compra) em vez de um formato padrão em estoque.
    sobMedida?: boolean;
    // Só em pré-montagens gravadas antes de a folha sob medida virar uma opção própria.
    ideal?: { w: number; h: number; wf: number; hf: number; aproveitamento: number };
  };
  maquinas: string[];
};

export function montarPreMontagemSalva(p: {
  materialIdx: number;
  entrada: Entrada;
  op: Opcao;
  maquinas: string[];
}): PreMontagemSalva {
  const { faca, ...entrada } = p.entrada;
  const { op } = p;
  return {
    versao: 1,
    aprovadaEm: new Date().toISOString(),
    materialIdx: p.materialIdx,
    formatoEscolhido: p.op.sobMedida ? "ideal" : "padrao",
    entrada,
    faca: {
      W: faca.W,
      H: faca.H,
      contorno: faca.contorno,
      area: faca.area,
      corte: faca.corte,
      vinco: faca.vinco,
      origem: faca.origem,
      medidas: faca.medidas,
      cola: faca.cola,
      secoes: faca.secoes,
      linhas: faca.linhas,
    },
    escolha: {
      folhaW: op.formato.w,
      folhaH: op.formato.h,
      corte: op.corte,
      wf: op.wf,
      hf: op.hf,
      girada90: op.girada90,
      estrategia: op.arranjo.estrategia,
      posesPorFator: op.posesPorFator,
      pecasPorFolha: op.pecasPorFolha,
      aproveitamento: op.aproveitamento,
      folhas: op.folhas,
      pecasProduzidas: op.pecasProduzidas,
      laminaMm: op.laminaMm,
      custoFaca: op.custoFaca,
      sobMedida: op.sobMedida,
    },
    maquinas: p.maquinas,
  };
}

const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);
const ehPt = (v: unknown): v is Pt => Array.isArray(v) && v.length === 2 && num(v[0]) && num(v[1]);

// Confere a forma do que chega do formulário antes de gravar (o campo é Json e o Prisma não valida).
export function ehPreMontagemSalva(x: unknown): x is PreMontagemSalva {
  if (!x || typeof x !== "object") return false;
  const s = x as Record<string, unknown>;
  if (s.versao !== 1 || typeof s.aprovadaEm !== "string" || !Number.isInteger(s.materialIdx)) return false;
  if (s.formatoEscolhido !== "padrao" && s.formatoEscolhido !== "ideal") return false;
  const f = s.faca as Record<string, unknown> | undefined;
  const e = s.escolha as Record<string, unknown> | undefined;
  const en = s.entrada as Record<string, unknown> | undefined;
  if (!f || !e || !en) return false;
  if (!num(f.W) || !num(f.H) || !num(f.area) || !num(f.corte) || !num(f.vinco)) return false;
  if (!Array.isArray(f.contorno) || f.contorno.length < 3 || f.contorno.length > 3000 || !f.contorno.every(ehPt)) return false;
  for (const k of ["folhaW", "folhaH", "corte", "wf", "hf", "posesPorFator", "pecasPorFolha", "aproveitamento", "folhas", "pecasProduzidas", "laminaMm", "custoFaca"]) {
    if (!num(e[k])) return false;
  }
  return num(en.quantidade) && num(en.cores) && num(en.espessuraMm);
}

// Reconstrói a faca para reabrir a pré-montagem.
export function facaDaSalva(s: PreMontagemSalva): Faca {
  return { ...s.faca };
}
