// A "faca" aqui é o contorno da faca aberta (cartucho planificado), em milímetros, com a origem
// no canto superior esquerdo do menor retângulo que a contém.

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

// Fundo cartucho genérico, com tampa e fundo iguais (lingueta e abas de poeira). AS PROPORÇÕES
// DAS ABAS SÃO UM EXEMPLO: as fórmulas reais de cada modelo vêm da Engenharia. Serve para ver o
// desenho do cartucho aberto quando não há o contorno do cliente.
export function facaFundoCartucho(F: number, Ls: number, A: number, cola: number): Faca {
  const T = Ls; // profundidade da lingueta
  const d = Ls * 0.5; // altura das abas de poeira
  const r = Math.min(9, F / 4);
  const x1 = cola;
  const x2 = x1 + F;
  const x3 = x2 + Ls;
  const x4 = x3 + F;
  const x5 = x4 + Ls;
  const yT = T;
  const yB = T + A;
  const pts: Pt[] = [];
  const P = (x: number, y: number) => pts.push([x, y]);
  const Q = (ax: number, ay: number, cx: number, cy: number, bx: number, by: number) => {
    for (let i = 1; i <= 4; i++) {
      const t = i / 4;
      const u = 1 - t;
      P(u * u * ax + 2 * u * t * cx + t * t * bx, u * u * ay + 2 * u * t * cy + t * t * by);
    }
  };
  P(x1, yT);
  P(x2, yT);
  P(x2 + 0.5, yT); P(x2 + 4, yT - d); P(x3 - 4, yT - d); P(x3 - 0.5, yT); // aba de poeira
  P(x3, yT); P(x3 + 1, yT - T + r); Q(x3 + 1, yT - T + r, x3 + 1, yT - T, x3 + 1 + r, yT - T); // lingueta
  P(x4 - 1 - r, yT - T); Q(x4 - 1 - r, yT - T, x4 - 1, yT - T, x4 - 1, yT - T + r); P(x4, yT);
  P(x4 + 0.5, yT); P(x4 + 4, yT - d); P(x5 - 4, yT - d); P(x5 - 0.5, yT); P(x5, yT);
  P(x5, yB);
  P(x5 - 0.5, yB); P(x5 - 4, yB + d); P(x4 + 4, yB + d); P(x4 + 0.5, yB); P(x4, yB);
  P(x4 - 1, yB + T - r); Q(x4 - 1, yB + T - r, x4 - 1, yB + T, x4 - 1 - r, yB + T);
  P(x3 + 1 + r, yB + T); Q(x3 + 1 + r, yB + T, x3 + 1, yB + T, x3 + 1, yB + T - r); P(x3, yB);
  P(x3 - 0.5, yB); P(x3 - 4, yB + d); P(x2 + 4, yB + d); P(x2 + 0.5, yB); P(x2, yB); P(x1, yB);
  const g = Math.min(3, cola / 2);
  P(g, yB - 6); P(g, yT + 6); // aba de cola
  const linhas: Pt[][] = [
    [[x1, yT], [x1, yB]],
    [[x2, yT], [x2, yB]],
    [[x3, yT], [x3, yB]],
    [[x4, yT], [x4, yB]],
    [[x2, yT], [x5, yT]],
    [[x2, yB], [x5, yB]],
  ];
  return {
    W: x5,
    H: A + 2 * T,
    contorno: pts,
    area: areaPoligono(pts),
    corte: perimetro(pts),
    vinco: 4 * A + 2 * (x5 - x2),
    linhas,
    cola: [[x1, yT], [g, yT + 6], [g, yB - 6], [x1, yB]],
    medidas: { F, Ls, A, xs: [0, x1, x2, x3, x4, x5], yT, yB },
    origem: "generica",
  };
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
