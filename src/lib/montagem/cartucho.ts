// Cartucho genérico (sem PDF): monta a faca aberta a partir de Frente × Lateral × Altura e do tipo de
// tampa e de fundo, que se escolhem separado (a tampa de um desenho com o fundo de outro).
// AS PROPORÇÕES SÃO APROXIMADAS: foram tiradas de 16 desenhos de exemplo do ArtiosCAD (out/2026) e
// servem para ver o cartucho antes de montar. As fórmulas reais vêm da Engenharia.
import { areaPoligono, perimetro, type Faca, type Pt } from "./geometria";

export type TipoTampa = "americana" | "asa";
export type TipoFundo = "americano" | "asa" | "semi" | "automatico";
// Painel onde fica a cabeça (lingueta): "canto" = o primeiro, ao lado da aba de cola; "meio" = o
// terceiro, depois da lateral. Cabeças de tampa e fundo em painéis opostos = encaixe reverso.
export type Cabeca = "canto" | "meio";

export type Fechamento = {
  tampa: { tipo: TipoTampa; cabeca: Cabeca };
  fundo: { tipo: TipoFundo; cabeca: Cabeca };
  // Quanto a lingueta passa da lateral (mm): profundidade da cabeça = lateral + folga.
  folgaLinguetaMm?: number;
  // Nomes do ERP escolhidos (só para mostrar e reabrir; o desenho usa os tipos acima).
  nomes?: { tampa: string; fundo: string };
};

export const FECHAMENTO_PADRAO: Fechamento = { tampa: { tipo: "americana", cabeca: "canto" }, fundo: { tipo: "americano", cabeca: "meio" } };

// Nomes cadastrados no ERP e o desenho que já existe para cada um. `aproximado` diz o que ainda falta:
// o desenho sai como o estilo base, sem o detalhe.
export type OpcaoFecho<T> = { nome: string; tipo: T; aproximado?: string };
const FALTA_TRAVA = "o detalhe da trava (fenda) ainda não é desenhado";
const FALTA_CABIDE = "a aba de cabide ainda não é desenhada";
const FALTA_HOT = "o hot melt ainda não tem desenho próprio";
const FALTA_MONTAVEL = "o montável (sem cola) ainda não tem desenho próprio";
export const OPCOES_TAMPA: OpcaoFecho<TipoTampa>[] = [
  { nome: "Americana", tipo: "americana" },
  { nome: "Americana com trava", tipo: "americana", aproximado: FALTA_TRAVA },
  { nome: "Americana com cabide", tipo: "americana", aproximado: FALTA_CABIDE },
  { nome: "Hot melt", tipo: "americana", aproximado: FALTA_HOT },
  { nome: "Americano asa de avião", tipo: "asa" },
  { nome: "Americano asa de avião com cabide", tipo: "asa", aproximado: FALTA_CABIDE },
  { nome: "Americano asa de avião com trava", tipo: "asa", aproximado: FALTA_TRAVA },
  { nome: "Montável", tipo: "americana", aproximado: FALTA_MONTAVEL },
];
export const OPCOES_FUNDO: OpcaoFecho<TipoFundo>[] = [
  { nome: "Americano", tipo: "americano" },
  { nome: "Americano com trava", tipo: "americano", aproximado: FALTA_TRAVA },
  { nome: "Hot melt", tipo: "americano", aproximado: FALTA_HOT },
  { nome: "Americano asa de avião", tipo: "asa" },
  { nome: "Americano asa de avião com trava", tipo: "asa", aproximado: FALTA_TRAVA },
  { nome: "Semi-automático", tipo: "semi" },
  { nome: "Montável", tipo: "americano", aproximado: FALTA_MONTAVEL },
  { nome: "Automático", tipo: "automatico" },
  { nome: "Automático com trava", tipo: "automatico", aproximado: FALTA_TRAVA },
];

// Pontos locais (u ao longo do painel, v para fora da dobra) de uma borda de painel, de (0,0) a (largura,0).
type Local = [number, number][];

function quad(a: [number, number], c: [number, number], b: [number, number], n = 4): Local {
  const out: Local = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
  }
  return out;
}

// Cabeça (lingueta) de um painel de largura F e profundidade T, com os cantos arredondados.
function cabeca(F: number, T: number): Local {
  const r = Math.max(1, Math.min(0.2 * F, 18, T / 2));
  return [[0, 0], [1, T - r], ...quad([1, T - r], [1, T], [1 + r, T]), [F - 1 - r, T], ...quad([F - 1 - r, T], [F - 1, T], [F - 1, T - r]), [F, 0]];
}

const espelha = (pts: Local, largura: number): Local => pts.map(([u, v]): [number, number] => [largura - u, v]).reverse();

// Orelha (aba de poeira) de um painel lateral de largura L. `retaEsq`: o lado reto fica à esquerda (o
// vizinho desse lado é o painel da cabeça); o outro lado é chanfrado.
function orelha(tipo: "americana" | "asa", L: number, retaEsq: boolean): Local {
  const base: Local =
    tipo === "americana"
      ? (() => {
          const d = 0.9 * L;
          return [[0, 0], [0, d], [0.7 * L, d], [0.9 * L, 0.62 * d], [0.9 * L, 0.25 * d], [L, 0.04 * d], [L, 0]];
        })()
      : (() => {
          const d = 0.77 * L;
          return [[0, 0], [0.07 * L, 0.1 * d], [0.07 * L, d], [0.72 * L, d], [L, 0]];
        })();
  return retaEsq ? base : espelha(base, L);
}

// Borda de um fecho com cabeça (americano ou asa de avião): cabeça no painel 1 ou 3, orelhas nas laterais.
function bordaComCabeca(tipo: "americana" | "asa", cab: Cabeca, F: number, L: number, T: number): Local[] {
  const h = cab === "canto" ? 0 : 2; // índice do painel da cabeça (0..3)
  return [0, 1, 2, 3].map((p) => {
    if (p % 2 === 0) return p === h ? cabeca(F, T) : ([[0, 0], [F, 0]] as Local);
    // lateral: o lado reto é o vizinho da cabeça (o painel 3 tem como vizinho à direita o 0, pela cola)
    const esq = (p + 3) % 4;
    return orelha(tipo, L, esq === h);
  });
}

// Fundo automático (pré-colado): abas de frente e de lateral com o vinco diagonal.
function bordaAutomatica(F: number, L: number): Local[] {
  const dF = 0.75 * L;
  const dL = 0.5 * L;
  const aF: Local = [[0, 0], [0.04 * F, dF], [0.31 * F, dF], [0.5 * F, 0.69 * dF], [0.55 * F, 0.69 * dF], [0.76 * F, dF], [0.98 * F, dF], [0.98 * F, 0.37 * dF], [F, 0]];
  const aL: Local = [[0, 0], [0.08 * L, dL], [0.42 * L, dL], [L, 0]];
  return [aF, aL, aF, aL];
}

// Fundo semi-automático (1-2-3): quatro abas que se entrelaçam, sem cola.
function bordaSemi(F: number, L: number): Local[] {
  const d = 0.75 * L;
  const d2 = 0.55 * L;
  const p1: Local = [[0, 0], [0.26 * F, 0.67 * d], [0.26 * F, d], [0.74 * F, d], [0.74 * F, 0.67 * d], [F, 0]];
  const p2: Local = [[0, 0], [0, d2], [0.4 * L, d2], [0.52 * L, 0.8 * d2], [L, 0]];
  const p3: Local = [[0, 0], [0, d], [0.23 * F, d], [0.23 * F, 0.67 * d], [0.77 * F, 0.67 * d], [0.77 * F, d], [F, d], [F, 0]];
  return [p1, p2, p3, espelha(p2, L)];
}

function borda(tipo: TipoTampa | TipoFundo, cab: Cabeca, F: number, L: number, T: number): Local[] {
  if (tipo === "automatico") return bordaAutomatica(F, L);
  if (tipo === "semi") return bordaSemi(F, L);
  return bordaComCabeca(tipo === "asa" ? "asa" : "americana", cab, F, L, T);
}

export function descricaoFechamento(f: Fechamento): string {
  const t = f.nomes?.tampa ?? OPCOES_TAMPA.find((o) => o.tipo === f.tampa.tipo && !o.aproximado)?.nome ?? f.tampa.tipo;
  const u = f.nomes?.fundo ?? OPCOES_FUNDO.find((o) => o.tipo === f.fundo.tipo && !o.aproximado)?.nome ?? f.fundo.tipo;
  const cab = (tipo: string, c: Cabeca) => (tipo === "automatico" || tipo === "semi" ? "" : `, cabeça no ${c}`);
  return `Tampa ${t}${cab(f.tampa.tipo, f.tampa.cabeca)} · Fundo ${u}${cab(f.fundo.tipo, f.fundo.cabeca)}`;
}

// Cartucho aberto: aba de cola, frente, lateral, frente, lateral. F = frente, Ls = lateral, A = altura.
export function facaFundoCartucho(F: number, Ls: number, A: number, cola: number, fecho: Fechamento = FECHAMENTO_PADRAO): Faca {
  const T = Ls + (fecho.folgaLinguetaMm ?? 15);
  const x1 = cola;
  const xs = [x1, x1 + F, x1 + F + Ls, x1 + 2 * F + Ls, x1 + 2 * F + 2 * Ls];
  const topo = borda(fecho.tampa.tipo, fecho.tampa.cabeca, F, Ls, T);
  const fundo = borda(fecho.fundo.tipo, fecho.fundo.cabeca, F, Ls, T);

  // Percorre a borda de cima da esquerda para a direita (para cima = y negativo) e a de baixo da direita
  // para a esquerda, e fecha pela aba de cola. A dobra de cima fica em y = 0 e a de baixo em y = A.
  const pts: Pt[] = [];
  const add = (x: number, y: number) => {
    const u = pts[pts.length - 1];
    if (!u || Math.abs(u[0] - x) > 1e-6 || Math.abs(u[1] - y) > 1e-6) pts.push([x, y]);
  };
  topo.forEach((loc, p) => loc.forEach(([u, v]) => add(xs[p] + u, -v)));
  for (let p = 3; p >= 0; p--) [...fundo[p]].reverse().forEach(([u, v]) => add(xs[p] + u, A + v));
  const g = Math.min(3, cola / 2);
  add(g, A - 6);
  add(g, 6);

  const minX = Math.min(...pts.map((p) => p[0]));
  const minY = Math.min(...pts.map((p) => p[1]));
  const contorno: Pt[] = pts.map(([x, y]) => [x - minX, y - minY]);
  const sx = (x: number): number => x - minX;
  const yT = -minY;
  const yB = A - minY;
  const todosX = [sx(xs[0]), ...xs.slice(1).map(sx)];
  const linhas: Pt[][] = [
    ...todosX.slice(0, 4).map((x): Pt[] => [[x, yT], [x, yB]]),
    [[sx(xs[0]), yT], [sx(xs[4]), yT]],
    [[sx(xs[0]), yB], [sx(xs[4]), yB]],
  ];
  const W = Math.max(...contorno.map((p) => p[0]));
  const H = Math.max(...contorno.map((p) => p[1]));
  return {
    W,
    H,
    contorno,
    area: areaPoligono(contorno),
    corte: perimetro(contorno),
    vinco: 4 * A + 2 * (xs[4] - xs[0]),
    linhas,
    cola: [[sx(x1), yT], [sx(g), yT + 6], [sx(g), yB - 6], [sx(x1), yB]],
    medidas: { F, Ls, A, xs: [0, ...todosX], yT, yB },
    origem: "generica",
    estilo: descricaoFechamento(fecho),
    fechamento: fecho,
  };
}
