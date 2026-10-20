// A "faca" aqui é o contorno da faca aberta (cartucho planificado), em milímetros, com a origem
// no canto superior esquerdo do menor retângulo que a contém.

import type { Fechamento } from "./cartucho";

export type Pt = [number, number];

// Painéis do cartucho aberto (cola, frente, lateral, frente, lateral): usados nas cotas, na caixa 3D
// e para casar a arte com cada face.
export type MedidasCartucho = {
  F: number;
  Ls: number;
  A: number;
  xs: number[]; // 6 posições: início da cola e fim de cada painel
  yT: number; // topo do corpo
  yB: number; // base do corpo
};

export type Faca = {
  W: number;
  H: number;
  // Contorno externo (polígono fechado).
  contorno: Pt[];
  // Área real da peça, em mm².
  area: number;
  // Metros de lâmina por peça, em mm: contorno de corte e vincos internos.
  corte: number;
  vinco: number;
  // Traços internos (só para o desenho): seções fechadas e linhas (vincos) abertas.
  secoes?: Pt[][];
  linhas?: Pt[][];
  // Aba de cola (preenchimento amarelo no desenho).
  cola?: Pt[];
  medidas?: MedidasCartucho;
  // Peça composta (caixa + berço): contornos reais de cada peça, para o desenho. O `contorno` é o
  // retângulo que as contém e serve só ao empacotador.
  partes?: Pt[][];
  // Só no cartucho genérico: tampa e fundo escolhidos, para mostrar e gravar.
  estilo?: string;
  fechamento?: Fechamento;
  // Qual ponta do desenho é a tampa. Padrão: o topo (y pequeno), como no cartucho genérico. Num PDF de
  // cliente pode ser a base; serve para saber se duas linhas viradas encostam tampa com tampa.
  tampaNoTopo?: boolean;
  // De onde veio o contorno: mostrado na tela para ninguém confundir exemplo com faca real.
  origem?: "retangulo" | "generica" | "pdf";
};

export function perimetro(pts: Pt[], fechado = true): number {
  const n = pts.length;
  let total = 0;
  for (let i = 0; i < (fechado ? n : n - 1); i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % n];
    total += Math.hypot(bx - ax, by - ay);
  }
  return total;
}

export function areaPoligono(pts: Pt[]): number {
  let soma = 0;
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % pts.length];
    soma += ax * by - bx * ay;
  }
  return Math.abs(soma) / 2;
}

// Faca tratada como retângulo L × A (Fase 1): só o contorno de corte, sem vincos conhecidos.
export function facaRetangular(W: number, H: number): Faca {
  const contorno: Pt[] = [
    [0, 0],
    [W, 0],
    [W, H],
    [0, H],
  ];
  return { W, H, contorno, area: W * H, corte: perimetro(contorno), vinco: 0, origem: "retangulo" };
}

// d de um <path> SVG.
export function caminhoSvg(pts: Pt[], fechar = true): string {
  const d = "M" + pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join("L");
  return fechar ? d + "Z" : d;
}

export type ModoArte = "toda" | "frente";
export type Arte = { url: string; modo: ModoArte };

// Retângulo (no referencial da faca) onde a imagem da arte é esticada: a faca aberta inteira ou só
// o painel da frente.
export function retanguloDaArte(faca: Faca, modo: ModoArte): { x: number; y: number; w: number; h: number } {
  const m = faca.medidas;
  if (modo === "frente" && m) return { x: m.xs[1], y: m.yT, w: m.F, h: m.A };
  return { x: 0, y: 0, w: faca.W, h: faca.H };
}
