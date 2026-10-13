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
  // Linhas deslocadas alternam entre `cols` e `cols - 1` peças (padrão de tijolo), em vez de todas terem o
  // mesmo número de peças com a largura aumentada pelo deslocamento.
  tijolo: boolean;
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
type Linha = { gira: boolean; v: number; us: number[] };
type Montagem = { linhas: Linha[]; n: number; larguraUsada: number; alturaUsada: number; tijolo: boolean };

// Transforma as linhas (deslocamento acumulado `o` de cada uma) em posições de peças.
// - Em "reta" todas as linhas têm o mesmo número de peças e a largura cresce com o deslocamento.
// - Em "tijolo" cada linha começa em seu deslocamento (dentro de um passo) e leva quantas peças couberem
//   na largura: linhas deslocadas ficam com uma peça a menos, mas a largura não cresce.
// `limite` é a largura disponível; sem ele, `colsFixas` define a largura de `colsFixas` peças lado a lado.
function gerarLinhas(rows: LinhaPos[], P: number, W: number, limite: number | null, colsFixas: number | null, modo: "reta" | "tijolo", altura: number): Montagem | null {
  const alturaUsada = rows[rows.length - 1].v + altura;
  if (modo === "reta") {
    const os = rows.map((r) => r.o);
    const mn = Math.min(...os);
    const ex = Math.max(...os) - mn;
    const cols = colsFixas ?? Math.floor(((limite as number) - ex - W) / P) + 1;
    if (cols < 1) return null;
    const linhas = rows.map((r) => ({ gira: r.gira, v: r.v, us: Array.from({ length: cols }, (_, k) => r.o - mn + k * P) }));
    return { linhas, n: cols * rows.length, larguraUsada: (cols - 1) * P + W + ex, alturaUsada, tijolo: false };
  }
  const Wb = limite ?? ((colsFixas as number) - 1) * P + W;
  const mod = (x: number) => ((x % P) + P) % P;
  // Todas as linhas deslocam juntas: tenta alinhar cada deslocamento diferente à borda esquerda.
  const base = [...new Set(rows.map((r) => Math.round(mod(r.o) * 2) / 2))];
  let melhor: Montagem | null = null;
  for (const b of base) {
    const linhas: Linha[] = [];
    let ok = true;
    for (const r of rows) {
      const off = mod(r.o - b);
      const cnt = Math.floor((Wb - off - W) / P + 1e-9) + 1;
      if (cnt < 1) {
        ok = false;
        break;
      }
      linhas.push({ gira: r.gira, v: r.v, us: Array.from({ length: cnt }, (_, k) => off + k * P) });
    }
    if (!ok) continue;
    const n = linhas.reduce((s, l) => s + l.us.length, 0);
    const larguraUsada = Math.max(...linhas.map((l) => l.us[l.us.length - 1] + W));
    if (!melhor || n > melhor.n || (n === melhor.n && larguraUsada < melhor.larguraUsada)) melhor = { linhas, n, larguraUsada, alturaUsada, tijolo: true };
  }
  return melhor;
}

// Distribui a faca numa região wp × hp (referencial da peça, sem girar a região).
// tentarEncaixe = false: grade simples; true: também testa linhas deslocadas e viradas 180°, em linhas
// retas e em tijolo.
export function empacotar(faca: Faca, wp: number, hp: number, espaco: number, tentarEncaixe: boolean, seco = false): Arranjo | null {
  const { W, H } = faca;
  if (hp < H || wp < W) return null;
  const c = cacheDe(faca);
  const esp = seco ? 0 : espaco;
  const T = porEspaco(c, esp);
  const pitchX = T.pitchX;

  const linhasAte = (giras: boolean[], trs: Transicao[]): LinhaPos[] | null => {
    const rows: LinhaPos[] = [{ gira: giras[0], o: 0, v: 0 }];
    for (let r = 0; ; r++) {
      const t = trs[r % trs.length];
      if (!t) return null;
      const ult = rows[rows.length - 1];
      const v = ult.v + t.dy;
      if (v + H > hp) break;
      rows.push({ gira: giras[(r + 1) % giras.length], o: ult.o + (t.dx > pitchX / 2 ? t.dx - pitchX : t.dx), v });
    }
    return rows;
  };

  const candidatos: { estrategia: Estrategia; m: Montagem }[] = [];
  const tentar = (estrategia: Estrategia, giras: boolean[], trs: Transicao[], modos: ("reta" | "tijolo")[]) => {
    const rows = linhasAte(giras, trs);
    if (!rows) return;
    for (const modo of modos) {
      const m = gerarLinhas(rows, pitchX, W, wp, null, modo, H);
      if (m) candidatos.push({ estrategia, m });
    }
  };
  tentar("grade", [false], [T.G], ["reta"]);
  if (tentarEncaixe) {
    tentar("deslocada", [false, false], [T.D1, T.D2], ["reta", "tijolo"]);
    tentar("virada", [false, true], [T.AB, T.BA], ["reta", "tijolo"]);
  }
  // Corte seco: com mais de uma linha, só tampa com tampa (linhas alternadas viradas 180°).
  const bons = seco ? candidatos.filter((x) => x.m.linhas.length === 1 || x.estrategia === "virada") : candidatos;
  if (!bons.length) return null;
  bons.sort((a, b) => b.m.n - a.m.n || a.m.alturaUsada - b.m.alturaUsada || a.m.larguraUsada - b.m.larguraUsada);
  return montarArranjo(faca, c, pitchX, bons[0].m, bons[0].estrategia, seco, wp, hp);
}

// Monta o arranjo a partir das linhas: peças, tamanho usado e lâmina compartilhada.
function montarArranjo(faca: Faca, c: CacheFaca, pitchX: number, m: Montagem, estrategia: Estrategia, seco: boolean, wp?: number, hp?: number): Arranjo {
  const itens: Posicao[] = [];
  for (const l of m.linhas) for (const u of l.us) itens.push({ u, v: l.v, gira: l.gira });

  // Vizinhas lado a lado na mesma linha (aba de cola contra aba): lâmina dividida nos dois cortes.
  let compartilhado = m.linhas.reduce((s, l) => s + (l.us.length - 1), 0) * coincide(c, false, false, pitchX, 0);
  if (seco) {
    // Cada peça de uma linha contra as da linha de baixo que a tocam.
    for (let r = 0; r + 1 < m.linhas.length; r++) {
      const cima = m.linhas[r];
      const baixo = m.linhas[r + 1];
      const dy = baixo.v - cima.v;
      for (const u1 of cima.us) for (const u2 of baixo.us) if (Math.abs(u2 - u1) < faca.W) compartilhado += coincide(c, cima.gira, baixo.gira, u2 - u1, dy);
    }
  }
  const cols = Math.max(...m.linhas.map((l) => l.us.length));
  return {
    cols,
    rows: m.linhas.length,
    n: m.n,
    itens,
    larguraUsada: m.larguraUsada,
    alturaUsada: m.alturaUsada,
    wp: wp ?? m.larguraUsada,
    hp: hp ?? m.alturaUsada,
    estrategia,
    tijolo: m.tijolo,
    seco,
    compartilhado,
  };
}

// Bloco exato de `cols` × `rows` peças com o encaixe pedido, do tamanho mínimo que o contém (sem uma
// região de partida). Serve para a folha sob medida, que não depende dos tamanhos das folhas padrão.
// Em "tijolo" as linhas deslocadas ficam com uma peça a menos. Corte seco: com mais de uma linha, só
// tampa com tampa ("virada").
export function blocoExato(faca: Faca, cols: number, rows: number, espaco: number, estrategia: Estrategia, seco: boolean, modo: "reta" | "tijolo" = "reta"): Arranjo | null {
  if (cols < 1 || rows < 1) return null;
  if (rows === 1 && (estrategia !== "grade" || modo !== "reta")) return null; // com uma linha todos os encaixes são iguais
  if (estrategia === "grade" && modo !== "reta") return null;
  if (seco && rows > 1 && estrategia !== "virada") return null;
  const c = cacheDe(faca);
  const T = porEspaco(c, seco ? 0 : espaco);
  const giras = estrategia === "virada" ? [false, true] : [false, false];
  const trs: Transicao[] = estrategia === "grade" ? [T.G] : estrategia === "deslocada" ? [T.D1, T.D2] : [T.AB, T.BA];
  const linhasPos: LinhaPos[] = [{ gira: giras[0], o: 0, v: 0 }];
  for (let r = 0; r < rows - 1; r++) {
    const t = trs[r % trs.length];
    if (!t) return null;
    const ult = linhasPos[linhasPos.length - 1];
    linhasPos.push({ gira: giras[(r + 1) % giras.length], o: ult.o + (t.dx > T.pitchX / 2 ? t.dx - T.pitchX : t.dx), v: ult.v + t.dy });
  }
  const m = gerarLinhas(linhasPos, T.pitchX, faca.W, null, cols, modo, faca.H);
  return m ? montarArranjo(faca, c, T.pitchX, m, estrategia, seco) : null;
}
