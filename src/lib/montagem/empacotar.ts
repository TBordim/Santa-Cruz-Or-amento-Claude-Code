// Empacotamento de peças pelo contorno real da faca, em linhas. Cada linha pode ficar na posição
// normal ou virada 180°, e a linha de baixo é deslocada para as abas se encaixarem nas da de
// cima. A distância entre linhas é medida pelos perfis (topo e base de cada coluna de 0,5 mm).
// O espaço entre facas é medido na vertical, então na diagonal pode ficar um pouco menor.
//
// Lado a lado (no sentido da aba de cola) os cartuchos sempre se encostam, uma aba contra o outro, e
// a lâmina desse encontro vale uma só vez, nos dois tipos de corte.
// No sentido da tampa e do fundo:
// - Corte duplo (lâminas separadas): espaço mínimo de `espaco` mm entre os cartuchos; tampa pode
//   encontrar fundo ou tampa (qualquer encaixe).
// - Corte seco (lâmina compartilhada): sem espaço, só onde o mesmo lado encontra o mesmo lado (tampa com
//   tampa, fundo com fundo): as linhas alternam viradas 180°. Tampa com fundo exige corte duplo.
import type { Faca, Pt } from "./geometria";

const RES = 0.5;
const TOLERANCIA_COINCIDE = 0.3; // mm: contornos a até essa distância contam como a mesma lâmina

type Perfil = {
  top: Float64Array;
  bot: Float64Array;
  lef: Float64Array;
  rig: Float64Array;
  nx: number;
  ny: number;
};
type Transicao = { dx: number; dy: number } | null;
type PorEspaco = { pitchX: number; G: Transicao; D1: Transicao; D2: Transicao; AB: Transicao; BA: Transicao };
type CacheFaca = {
  A: Perfil;
  B: Perfil;
  ptsA: Pt[];
  ptsB: Pt[];
  amostrasA: Pt[];
  amostrasB: Pt[];
  porEspaco: Map<number, PorEspaco>;
  coincide: Map<string, number>;
};

export type Posicao = { u: number; v: number; gira: boolean };
export type Estrategia = "grade" | "deslocada" | "virada";
export type Arranjo = {
  cols: number;
  rows: number;
  n: number;
  itens: Posicao[];
  larguraUsada: number;
  alturaUsada: number;
  // Região disponível (referencial da peça).
  wp: number;
  hp: number;
  estrategia: Estrategia;
  seco: boolean;
  // Milímetros de lâmina que duas peças vizinhas dividem (só no corte seco).
  compartilhado: number;
};

function perfis(pts: Pt[], W: number, H: number): Perfil {
  const nx = Math.floor(W / RES) + 1;
  const ny = Math.floor(H / RES) + 1;
  const n = pts.length;
  const top = new Float64Array(nx).fill(NaN);
  const bot = new Float64Array(nx).fill(NaN);
  const lef = new Float64Array(ny).fill(NaN);
  const rig = new Float64Array(ny).fill(NaN);
  for (let i = 0; i < nx; i++) {
    const x = i * RES + 1e-6;
    let lo = Infinity;
    let hi = -Infinity;
    for (let e = 0; e < n; e++) {
      const [ax, ay] = pts[e];
      const [bx, by] = pts[(e + 1) % n];
      if ((ax <= x && x < bx) || (bx <= x && x < ax)) {
        const y = ay + ((by - ay) * (x - ax)) / (bx - ax);
        if (y < lo) lo = y;
        if (y > hi) hi = y;
      }
    }
    if (lo <= hi) {
      top[i] = lo;
      bot[i] = hi;
    }
  }
  for (let j = 0; j < ny; j++) {
    const y = j * RES + 1e-6;
    let lo = Infinity;
    let hi = -Infinity;
    for (let e = 0; e < n; e++) {
      const [ax, ay] = pts[e];
      const [bx, by] = pts[(e + 1) % n];
      if ((ay <= y && y < by) || (by <= y && y < ay)) {
        const x = ax + ((bx - ax) * (y - ay)) / (by - ay);
        if (x < lo) lo = x;
        if (x > hi) hi = x;
      }
    }
    if (lo <= hi) {
      lef[j] = lo;
      rig[j] = hi;
    }
  }
  return { top, bot, lef, rig, nx, ny };
}

// Pontos ao longo do contorno, a cada `passo` mm.
function amostrar(pts: Pt[], passo: number): Pt[] {
  const out: Pt[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % n];
    const comp = Math.hypot(bx - ax, by - ay);
    const k = Math.max(1, Math.round(comp / passo));
    for (let s = 0; s < k; s++) out.push([ax + ((bx - ax) * s) / k, ay + ((by - ay) * s) / k]);
  }
  return out;
}

// Quantos mm do contorno de `de` (parado) ficam a até TOLERANCIA_COINCIDE do contorno de `para`
// deslocado em (sx, sy).
function trechoCoincidente(de: Pt[], para: Pt[], sx: number, sy: number): number {
  const n = para.length;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of para) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  minX += sx - TOLERANCIA_COINCIDE;
  maxX += sx + TOLERANCIA_COINCIDE;
  minY += sy - TOLERANCIA_COINCIDE;
  maxY += sy + TOLERANCIA_COINCIDE;
  const tol2 = TOLERANCIA_COINCIDE * TOLERANCIA_COINCIDE;
  let contados = 0;
  for (const [px, py] of de) {
    if (px < minX || px > maxX || py < minY || py > maxY) continue;
    let achou = false;
    for (let e = 0; e < n && !achou; e++) {
      const ax = para[e][0] + sx;
      const ay = para[e][1] + sy;
      const bx = para[(e + 1) % n][0] + sx;
      const by = para[(e + 1) % n][1] + sy;
      const dx = bx - ax;
      const dy = by - ay;
      const l2 = dx * dx + dy * dy || 1;
      let t = ((px - ax) * dx + (py - ay) * dy) / l2;
      t = Math.max(0, Math.min(1, t));
      const ex = px - ax - t * dx;
      const ey = py - ay - t * dy;
      if (ex * ex + ey * ey <= tol2) achou = true;
    }
    if (achou) contados++;
  }
  return contados * RES;
}

// Menor distância vertical exigida entre a linha de cima (U) e a de baixo (Lo) quando a de baixo
// está deslocada em dx. As duas linhas são periódicas, com passo pitchX.
function requisito(U: Perfil, Lo: Perfil, pitchX: number, espaco: number, dx: number): number | null {
  const nper = Math.ceil(pitchX / RES);
  let req = -Infinity;
  for (let s = 0; s < nper; s++) {
    const x = s * RES;
    let bu = NaN;
    let tl = NaN;
    for (let k = -2; k <= 2; k++) {
      const iu = Math.round((x - k * pitchX) / RES);
      if (iu >= 0 && iu < U.nx && !Number.isNaN(U.bot[iu])) bu = Number.isNaN(bu) ? U.bot[iu] : Math.max(bu, U.bot[iu]);
      const il = Math.round((x - dx - k * pitchX) / RES);
      if (il >= 0 && il < Lo.nx && !Number.isNaN(Lo.top[il])) tl = Number.isNaN(tl) ? Lo.top[il] : Math.min(tl, Lo.top[il]);
    }
    if (!Number.isNaN(bu) && !Number.isNaN(tl)) req = Math.max(req, bu - tl + espaco);
  }
  return req === -Infinity ? null : Math.max(req, 0);
}

function emDx(U: Perfil, Lo: Perfil, pitchX: number, espaco: number, dx: number): Transicao {
  const dy = requisito(U, Lo, pitchX, espaco, dx);
  return dy === null ? null : { dx, dy };
}

// Procura o deslocamento da linha de baixo que dá a menor distância. Entre os que empatam (dentro
// de 0,3 mm), prefere o de menor deslocamento, para a grade não se alargar.
function melhorLinha(U: Perfil, Lo: Perfil, pitchX: number, espaco: number): Transicao {
  const todos: { dx: number; dy: number }[] = [];
  for (let k = 0; k < Math.ceil(pitchX); k++) {
    const dy = requisito(U, Lo, pitchX, espaco, k);
    if (dy !== null) todos.push({ dx: k, dy });
  }
  if (!todos.length) return null;
  const menor = Math.min(...todos.map((t) => t.dy));
  const circ = (dx: number) => Math.min(dx, pitchX - dx);
  const bons = todos.filter((t) => t.dy <= menor + 0.3).sort((a, b) => circ(a.dx) - circ(b.dx));
  return bons[0];
}

const caches = new WeakMap<Faca, CacheFaca>();

function cacheDe(faca: Faca): CacheFaca {
  let c = caches.get(faca);
  if (!c) {
    const { W, H } = faca;
    const ptsB = faca.contorno.map(([x, y]): Pt => [W - x, H - y]);
    c = {
      A: perfis(faca.contorno, W, H),
      B: perfis(ptsB, W, H),
      ptsA: faca.contorno,
      ptsB,
      amostrasA: amostrar(faca.contorno, RES),
      amostrasB: amostrar(ptsB, RES),
      porEspaco: new Map(),
      coincide: new Map(),
    };
    caches.set(faca, c);
  }
  return c;
}

function porEspaco(c: CacheFaca, espaco: number): PorEspaco {
  let t = c.porEspaco.get(espaco);
  if (!t) {
    let pitchX = 0;
    for (let j = 0; j < c.A.ny; j++) if (!Number.isNaN(c.A.lef[j])) pitchX = Math.max(pitchX, c.A.rig[j] - c.A.lef[j]);
    // No sentido da aba de cola os cartuchos se encostam: o passo é a largura da faca, sem espaço.
    const volta = (dx: number) => (pitchX - dx) % pitchX; // desloca de volta, para a próxima linha voltar ao alinhamento
    const D1 = melhorLinha(c.A, c.A, pitchX, espaco);
    const AB = melhorLinha(c.A, c.B, pitchX, espaco);
    t = {
      pitchX,
      G: emDx(c.A, c.A, pitchX, espaco, 0),
      D1,
      D2: D1 ? emDx(c.A, c.A, pitchX, espaco, volta(D1.dx)) : null,
      AB,
      BA: AB ? emDx(c.B, c.A, pitchX, espaco, volta(AB.dx)) : null,
    };
    c.porEspaco.set(espaco, t);
  }
  return t;
}

// Trecho coincidente entre uma peça de cima (girada ou não) e outra deslocada em (sx, sy).
function coincide(c: CacheFaca, cimaGira: boolean, baixoGira: boolean, sx: number, sy: number): number {
  const chave = `${cimaGira ? 1 : 0}${baixoGira ? 1 : 0}:${Math.round(sx * 2)}:${Math.round(sy * 2)}`;
  let v = c.coincide.get(chave);
  if (v === undefined) {
    v = trechoCoincidente(cimaGira ? c.amostrasB : c.amostrasA, baixoGira ? c.ptsB : c.ptsA, sx, sy);
    c.coincide.set(chave, v);
  }
  return v;
}

type LinhaPos = { gira: boolean; o: number; v: number };
type Candidato = { rows: LinhaPos[]; mn: number; ex: number; cols: number; n: number; alturaUsada: number };

// Distribui a faca numa região wp × hp (referencial da peça, sem girar a região).
// tentarEncaixe = false: grade simples; true: também testa linhas deslocadas e viradas 180°.
export function empacotar(faca: Faca, wp: number, hp: number, espaco: number, tentarEncaixe: boolean, seco = false): Arranjo | null {
  const { W, H } = faca;
  if (hp < H || wp < W) return null;
  const c = cacheDe(faca);
  const esp = seco ? 0 : espaco;
  const T = porEspaco(c, esp);
  const pitchX = T.pitchX;

  const montar = (giras: boolean[], trs: Transicao[]): Candidato | null => {
    const rows: LinhaPos[] = [{ gira: giras[0], o: 0, v: 0 }];
    for (let r = 0; ; r++) {
      const t = trs[r % trs.length];
      if (!t) return null;
      const ult = rows[rows.length - 1];
      const v = ult.v + t.dy;
      if (v + H > hp) break;
      rows.push({ gira: giras[(r + 1) % giras.length], o: ult.o + (t.dx > pitchX / 2 ? t.dx - pitchX : t.dx), v });
    }
    const os = rows.map((r) => r.o);
    const mn = Math.min(...os);
    const ex = Math.max(...os) - mn;
    const cols = Math.floor((wp - ex - W) / pitchX) + 1;
    if (cols < 1) return null;
    return { rows, mn, ex, cols, n: cols * rows.length, alturaUsada: rows[rows.length - 1].v + H };
  };

  const candidatos: { estrategia: Estrategia; m: Candidato | null }[] = [{ estrategia: "grade", m: montar([false], [T.G]) }];
  if (tentarEncaixe) {
    candidatos.push({ estrategia: "deslocada", m: montar([false, false], [T.D1, T.D2]) });
    candidatos.push({ estrategia: "virada", m: montar([false, true], [T.AB, T.BA]) });
  }
  let bons = candidatos.filter((x): x is { estrategia: Estrategia; m: Candidato } => x.m !== null);
  // Corte seco: com mais de uma linha, só tampa com tampa (linhas alternadas viradas 180°).
  if (seco) bons = bons.filter((x) => x.m.rows.length === 1 || x.estrategia === "virada");
  if (!bons.length) return null;
  bons.sort((a, b) => b.m.n - a.m.n || a.m.alturaUsada - b.m.alturaUsada);
  const { estrategia, m } = bons[0];
  const itens: Posicao[] = [];
  for (const r of m.rows) for (let k = 0; k < m.cols; k++) itens.push({ u: r.o - m.mn + k * pitchX, v: r.v, gira: r.gira });

  // Vizinhas lado a lado na mesma linha (aba de cola contra aba): lâmina dividida nos dois cortes.
  let compartilhado = m.rows.length * (m.cols - 1) * coincide(c, false, false, pitchX, 0);
  if (seco) {
    // Cada peça de uma linha contra as da linha de baixo: o par (i, j) com j - i = k fica
    // deslocado em (o2 - o1) + k * pitchX.
    for (let r = 0; r + 1 < m.rows.length; r++) {
      const cima = m.rows[r];
      const baixo = m.rows[r + 1];
      const s0 = baixo.o - cima.o;
      const dy = baixo.v - cima.v;
      for (let k = -2; k <= 2; k++) {
        const pares = m.cols - Math.abs(k);
        if (pares > 0) compartilhado += pares * coincide(c, cima.gira, baixo.gira, s0 + k * pitchX, dy);
      }
    }
  }

  return {
    cols: m.cols,
    rows: m.rows.length,
    n: m.n,
    itens,
    larguraUsada: (m.cols - 1) * pitchX + W + m.ex,
    alturaUsada: m.alturaUsada,
    wp,
    hp,
    estrategia,
    seco,
    compartilhado,
  };
}
