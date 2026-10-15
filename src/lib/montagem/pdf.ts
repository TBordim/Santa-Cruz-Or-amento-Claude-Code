// Lê a faca (contorno de corte e vincos) de um PDF de arte do cliente com a faca em vetor.
// Funciona no navegador com a biblioteca pdfjs-dist, passada como argumento (assim o cálculo não
// depende dela e dá para testar fora do navegador). Medidas em milímetros.
import { areaPoligono, perimetro, type Faca, type Pt } from "./geometria";

// Parte mínima da pdfjs-dist de que precisamos.
export type PdfJsLike = {
  OPS: Record<string, number>;
  getDocument: (src: { data: Uint8Array }) => { promise: Promise<PdfDocLike> };
};
type PdfDocLike = { getPage: (n: number) => Promise<PdfPageLike> };
export type PdfPageLike = {
  view: number[];
  getOperatorList: () => Promise<{ fnArray: number[]; argsArray: unknown[] }>;
  getViewport: (o: { scale: number }) => { width: number; height: number };
  render: (o: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number }; canvas: HTMLCanvasElement }) => { promise: Promise<void> };
};

export type Traco = { pts: Pt[]; cor: string; largura: number };
export type TracosDaPagina = { tracos: Traco[]; larguraMm: number; alturaMm: number };

const PT = 25.4 / 72;
type Matriz = [number, number, number, number, number, number];

// Multiplica m (nova) por ctm (atual): CTM' = m × CTM, como no PDF.
function concatenar(m: Matriz, ctm: Matriz): Matriz {
  return [
    m[0] * ctm[0] + m[1] * ctm[2],
    m[0] * ctm[1] + m[1] * ctm[3],
    m[2] * ctm[0] + m[3] * ctm[2],
    m[2] * ctm[1] + m[3] * ctm[3],
    m[4] * ctm[0] + m[5] * ctm[2] + ctm[4],
    m[4] * ctm[1] + m[5] * ctm[3] + ctm[5],
  ];
}

function corHex(args: unknown): string {
  if (Array.isArray(args) && typeof args[0] === "string") return String(args[0]).toLowerCase();
  if (Array.isArray(args) && args.length >= 3) return "#" + args.slice(0, 3).map((v) => Math.round(Number(v)).toString(16).padStart(2, "0")).join("");
  return "";
}

// Todos os traços (contornos pintados com linha) da página, em mm, com a origem no canto
// superior esquerdo.
export async function tracosDaPagina(pdfjs: PdfJsLike, page: PdfPageLike): Promise<TracosDaPagina> {
  const { OPS } = pdfjs;
  const ol = await page.getOperatorList();
  const alturaPt = page.view[3] - page.view[1];
  const larguraPt = page.view[2] - page.view[0];
  const comTraco = new Set([OPS.stroke, OPS.closeStroke, OPS.fillStroke, OPS.eoFillStroke, OPS.closeFillStroke, OPS.closeEOFillStroke]);
  let ctm: Matriz = [1, 0, 0, 1, 0, 0];
  let cor = "#000000";
  let largura = 1;
  const pilha: { ctm: Matriz; cor: string; largura: number }[] = [];
  const tracos: Traco[] = [];

  for (let i = 0; i < ol.fnArray.length; i++) {
    const op = ol.fnArray[i];
    const args = ol.argsArray[i];
    if (op === OPS.save) pilha.push({ ctm, cor, largura });
    else if (op === OPS.restore) {
      const s = pilha.pop();
      if (s) ({ ctm, cor, largura } = s);
    } else if (op === OPS.transform) ctm = concatenar(args as Matriz, ctm);
    else if (op === OPS.setStrokeRGBColor) cor = corHex(args);
    else if (op === OPS.setLineWidth) largura = Number((args as number[])[0]);
    else if (op === OPS.constructPath) {
      const [paint, dados] = args as [number, ArrayLike<number>[]];
      if (!comTraco.has(paint)) continue;
      const d = dados[0];
      const para = (x: number, y: number): Pt => {
        const px = ctm[0] * x + ctm[2] * y + ctm[4];
        const py = ctm[1] * x + ctm[3] * y + ctm[5];
        return [px * PT, (alturaPt - py) * PT];
      };
      const pts: Pt[] = [];
      let atual: [number, number] = [0, 0];
      for (let k = 0; k < d.length; ) {
        const cmd = d[k++];
        if (cmd === 0 || cmd === 1) {
          atual = [d[k], d[k + 1]];
          pts.push(para(d[k], d[k + 1]));
          k += 2;
        } else if (cmd === 2) {
          const [x0, y0] = atual;
          const [x1, y1, x2, y2, x3, y3] = [d[k], d[k + 1], d[k + 2], d[k + 3], d[k + 4], d[k + 5]];
          for (let s = 1; s <= 8; s++) {
            const t = s / 8;
            const u = 1 - t;
            pts.push(para(u ** 3 * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t ** 3 * x3, u ** 3 * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t ** 3 * y3));
          }
          atual = [x3, y3];
          k += 6;
        } else if (cmd === 3) {
          const [x0, y0] = atual;
          const [x1, y1, x2, y2] = [d[k], d[k + 1], d[k + 2], d[k + 3]];
          for (let s = 1; s <= 8; s++) {
            const t = s / 8;
            const u = 1 - t;
            pts.push(para(u * u * x0 + 2 * u * t * x1 + t * t * x2, u * u * y0 + 2 * u * t * y1 + t * t * y2));
          }
          atual = [x2, y2];
          k += 4;
        } else if (cmd === 4) {
          // fecha o caminho: o primeiro ponto já está na lista
        } else break;
      }
      if (pts.length >= 2) tracos.push({ pts, cor, largura });
    }
  }
  return { tracos, larguraMm: larguraPt * PT, alturaMm: alturaPt * PT };
}

// ---------- da pilha de traços à faca ----------

const RES = 0.2; // mm por pixel da máscara
const MARGEM_PX = 6;

function preencherPoligono(m: Uint8Array, nx: number, ny: number, pts: Pt[], x0: number, y0: number) {
  const n = pts.length;
  const px = pts.map(([x]) => (x - x0) / RES + MARGEM_PX);
  const py = pts.map(([, y]) => (y - y0) / RES + MARGEM_PX);
  const minY = Math.max(0, Math.floor(Math.min(...py)));
  const maxY = Math.min(ny - 1, Math.ceil(Math.max(...py)));
  for (let y = minY; y <= maxY; y++) {
    const yc = y + 0.5;
    const xs: number[] = [];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      if ((py[i] <= yc && yc < py[j]) || (py[j] <= yc && yc < py[i])) xs.push(px[i] + ((yc - py[i]) * (px[j] - px[i])) / (py[j] - py[i]));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const a = Math.max(0, Math.round(xs[k]));
      const b = Math.min(nx - 1, Math.round(xs[k + 1]));
      for (let x = a; x <= b; x++) m[y * nx + x] = 1;
    }
  }
}

// Dilatação (ou erosão) por quadrado de raio r, em duas passadas.
function morfologia(m: Uint8Array, nx: number, ny: number, r: number, dilatar: boolean): Uint8Array {
  const alvo = dilatar ? 1 : 0;
  const tmp = new Uint8Array(m.length);
  const out = new Uint8Array(m.length);
  for (let y = 0; y < ny; y++)
    for (let x = 0; x < nx; x++) {
      let achou = false;
      for (let k = -r; k <= r && !achou; k++) {
        const xx = x + k;
        const v = xx < 0 || xx >= nx ? (dilatar ? 0 : 1) : m[y * nx + xx];
        if (v === alvo) achou = true;
      }
      tmp[y * nx + x] = achou ? alvo : 1 - alvo;
    }
  for (let y = 0; y < ny; y++)
    for (let x = 0; x < nx; x++) {
      let achou = false;
      for (let k = -r; k <= r && !achou; k++) {
        const yy = y + k;
        const v = yy < 0 || yy >= ny ? (dilatar ? 0 : 1) : tmp[yy * nx + x];
        if (v === alvo) achou = true;
      }
      out[y * nx + x] = achou ? alvo : 1 - alvo;
    }
  return out;
}

function componenteMaior(m: Uint8Array, nx: number, ny: number): Uint8Array {
  const rot = new Int32Array(m.length);
  let melhor = 0;
  let melhorTam = 0;
  let id = 0;
  const fila: number[] = [];
  for (let s = 0; s < m.length; s++) {
    if (!m[s] || rot[s]) continue;
    id++;
    let tam = 0;
    fila.length = 0;
    fila.push(s);
    rot[s] = id;
    while (fila.length) {
      const p = fila.pop() as number;
      tam++;
      const x = p % nx;
      const y = (p - x) / nx;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= nx || yy >= ny) continue;
        const q = yy * nx + xx;
        if (m[q] && !rot[q]) {
          rot[q] = id;
          fila.push(q);
        }
      }
    }
    if (tam > melhorTam) {
      melhorTam = tam;
      melhor = id;
    }
  }
  const out = new Uint8Array(m.length);
  for (let i = 0; i < m.length; i++) out[i] = rot[i] === melhor ? 1 : 0;
  return out;
}

// Preenche os buracos: o que não é alcançável a partir da borda, saindo do fundo, vira peça.
function preencherBuracos(m: Uint8Array, nx: number, ny: number): Uint8Array {
  const fundo = new Uint8Array(m.length);
  const fila: number[] = [];
  const entra = (x: number, y: number) => {
    const p = y * nx + x;
    if (!m[p] && !fundo[p]) {
      fundo[p] = 1;
      fila.push(p);
    }
  };
  for (let x = 0; x < nx; x++) {
    entra(x, 0);
    entra(x, ny - 1);
  }
  for (let y = 0; y < ny; y++) {
    entra(0, y);
    entra(nx - 1, y);
  }
  while (fila.length) {
    const p = fila.pop() as number;
    const x = p % nx;
    const y = (p - x) / nx;
    if (x > 0) entra(x - 1, y);
    if (x < nx - 1) entra(x + 1, y);
    if (y > 0) entra(x, y - 1);
    if (y < ny - 1) entra(x, y + 1);
  }
  const out = new Uint8Array(m.length);
  for (let i = 0; i < m.length; i++) out[i] = fundo[i] ? 0 : 1;
  return out;
}

// Contorno externo da máscara (seguimento de borda de Moore).
function tracarContorno(m: Uint8Array, nx: number, ny: number): [number, number][] {
  let start = -1;
  for (let i = 0; i < m.length; i++)
    if (m[i]) {
      start = i;
      break;
    }
  if (start < 0) return [];
  const sx = start % nx;
  const sy = (start - sx) / nx;
  const viz = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const val = (x: number, y: number) => x >= 0 && y >= 0 && x < nx && y < ny && m[y * nx + x] === 1;
  const cont: [number, number][] = [[sx, sy]];
  let ax = sx;
  let ay = sy;
  let d = 6;
  for (let guarda = 0; guarda < 4_000_000; guarda++) {
    let achou = false;
    for (let k = 0; k < 8; k++) {
      const dd = (d + k) % 8;
      const x = ax + viz[dd][0];
      const y = ay + viz[dd][1];
      if (val(x, y)) {
        ax = x;
        ay = y;
        d = (dd + 6) % 8;
        achou = true;
        break;
      }
    }
    if (!achou || (ax === sx && ay === sy && cont.length > 2)) break;
    cont.push([ax, ay]);
  }
  return cont;
}

// Douglas-Peucker sem recursão.
function simplificar(pts: Pt[], eps: number): Pt[] {
  const n = pts.length;
  if (n < 3) return pts;
  const manter = new Uint8Array(n);
  manter[0] = 1;
  manter[n - 1] = 1;
  const pilha: [number, number][] = [[0, n - 1]];
  while (pilha.length) {
    const [a, b] = pilha.pop() as [number, number];
    const [ax, ay] = pts[a];
    const [bx, by] = pts[b];
    const dx = bx - ax;
    const dy = by - ay;
    const L = Math.hypot(dx, dy);
    let maior = -1;
    let k = -1;
    for (let i = a + 1; i < b; i++) {
      const dist = L === 0 ? Math.hypot(pts[i][0] - ax, pts[i][1] - ay) : Math.abs(dx * (pts[i][1] - ay) - dy * (pts[i][0] - ax)) / L;
      if (dist > maior) {
        maior = dist;
        k = i;
      }
    }
    if (maior > eps && k > 0) {
      manter[k] = 1;
      pilha.push([a, k], [k, b]);
    }
  }
  return pts.filter((_, i) => manter[i]);
}

export type FacaDoPdf = {
  faca: Faca;
  // Canto superior esquerdo da faca na página (mm): serve para recortar a arte.
  origemMm: Pt;
  resumo: string;
};

type Retangulo = { x0: number; x1: number; y0: number; y1: number };

// Procura os quatro painéis do corpo (retângulos altos lado a lado) para casar a arte e a caixa 3D.
function acharPaineis(secoes: Pt[][], ox: number, oy: number): { xs: number[]; yT: number; yB: number; F: number; Ls: number; A: number } | null {
  const rets: Retangulo[] = [];
  for (const s of secoes) {
    if (s.length < 4 || s.length > 6) continue;
    const xs = s.map((p) => p[0]);
    const ys = s.map((p) => p[1]);
    const r = { x0: Math.min(...xs) - ox, x1: Math.max(...xs) - ox, y0: Math.min(...ys) - oy, y1: Math.max(...ys) - oy };
    const ehRetangulo = s.every((p) => (Math.abs(p[0] - (r.x0 + ox)) < 0.3 || Math.abs(p[0] - (r.x1 + ox)) < 0.3) && (Math.abs(p[1] - (r.y0 + oy)) < 0.3 || Math.abs(p[1] - (r.y1 + oy)) < 0.3));
    if (ehRetangulo && r.x1 - r.x0 > 5 && r.y1 - r.y0 > 5) rets.push(r);
  }
  const grupos = new Map<string, Retangulo[]>();
  for (const r of rets) {
    const k = `${Math.round(r.y0 * 2)}:${Math.round(r.y1 * 2)}`;
    grupos.set(k, [...(grupos.get(k) ?? []), r]);
  }
  let melhor: Retangulo[] = [];
  let melhorArea = 0;
  for (const g of grupos.values()) {
    const unicos = g.filter((r, i) => g.findIndex((q) => Math.abs(q.x0 - r.x0) < 0.5) === i).sort((a, b) => a.x0 - b.x0);
    const area = unicos.reduce((s, r) => s + (r.x1 - r.x0) * (r.y1 - r.y0), 0);
    if (unicos.length >= 3 && area > melhorArea) {
      melhor = unicos;
      melhorArea = area;
    }
  }
  if (melhor.length < 4) return null;
  const quatro = melhor.slice(0, 4);
  for (let i = 0; i + 1 < quatro.length; i++) if (Math.abs(quatro[i].x1 - quatro[i + 1].x0) > 1) return null;
  const [p1, p2, p3, p4] = quatro;
  return {
    xs: [0, p1.x0, p1.x1, p2.x1, p3.x1, p4.x1],
    yT: p1.y0,
    yB: p1.y1,
    F: p1.x1 - p1.x0,
    Ls: p2.x1 - p2.x0,
    A: p1.y1 - p1.y0,
  };
}

// Escolhe os traços da faca (o grupo de cor e espessura que cobre a maior área, ignorando
// legendas e cotas) e monta o contorno externo e os vincos.
export function facaDosTracos(tracos: Traco[]): FacaDoPdf | null {
  const grupos = new Map<string, Traco[]>();
  for (const t of tracos) {
    if (t.largura < 0.5 || t.largura > 3) continue;
    const k = `${t.cor}|${t.largura.toFixed(1)}`;
    grupos.set(k, [...(grupos.get(k) ?? []), t]);
  }
  let melhor: Traco[] = [];
  let melhorArea = 0;
  let melhorChave = "";
  for (const [k, g] of grupos) {
    if (g.length < 4) continue;
    const xs = g.flatMap((t) => t.pts.map((p) => p[0]));
    const ys = g.flatMap((t) => t.pts.map((p) => p[1]));
    const area = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
    if (area > melhorArea) {
      melhor = g;
      melhorArea = area;
      melhorChave = k;
    }
  }
  if (!melhor.length) return null;
  const secoes = melhor.filter((t) => t.pts.length >= 4).map((t) => t.pts);
  const linhas = melhor.filter((t) => t.pts.length === 2).map((t) => t.pts);
  if (!secoes.length) return null;

  const xsAll = secoes.flatMap((s) => s.map((p) => p[0]));
  const ysAll = secoes.flatMap((s) => s.map((p) => p[1]));
  const x0 = Math.min(...xsAll);
  const y0 = Math.min(...ysAll);
  const nx = Math.ceil((Math.max(...xsAll) - x0) / RES) + 2 * MARGEM_PX;
  const ny = Math.ceil((Math.max(...ysAll) - y0) / RES) + 2 * MARGEM_PX;
  if (nx * ny > 12_000_000) return null;
  let m: Uint8Array = new Uint8Array(nx * ny);
  for (const s of secoes) preencherPoligono(m, nx, ny, s, x0, y0);
  m = morfologia(morfologia(m, nx, ny, 2, true), nx, ny, 2, false);
  m = componenteMaior(preencherBuracos(m, nx, ny), nx, ny);
  const bruto = tracarContorno(m, nx, ny);
  if (bruto.length < 8) return null;
  const mm: Pt[] = bruto.map(([x, y]) => [(x - MARGEM_PX) * RES + x0, (y - MARGEM_PX) * RES + y0]);
  const simples = simplificar([...mm, mm[0]], 0.12).slice(0, -1);
  if (simples.length < 4) return null;

  const ox = Math.min(...simples.map((p) => p[0]));
  const oy = Math.min(...simples.map((p) => p[1]));
  const deslocar = (p: Pt[]): Pt[] => p.map(([x, y]) => [Math.round((x - ox) * 100) / 100, Math.round((y - oy) * 100) / 100]);
  const contorno = deslocar(simples);
  const W = Math.max(...contorno.map((p) => p[0]));
  const H = Math.max(...contorno.map((p) => p[1]));
  const corte = perimetro(contorno);
  const somaSecoes = secoes.reduce((s, p) => s + perimetro(p), 0);
  const vinco = Math.max(0, (somaSecoes - corte) / 2 + linhas.reduce((s, l) => s + perimetro(l, false), 0));
  const paineis = acharPaineis(secoes, ox, oy);

  const faca: Faca = {
    W,
    H,
    contorno,
    area: areaPoligono(contorno),
    corte,
    vinco,
    secoes: secoes.map(deslocar),
    linhas: linhas.map(deslocar),
    origem: "pdf",
  };
  if (paineis) {
    faca.medidas = { F: paineis.F, Ls: paineis.Ls, A: paineis.A, xs: paineis.xs, yT: paineis.yT, yB: paineis.yB };
    // A aba de cola é a seção que fica à esquerda do primeiro painel.
    const cola = secoes.map(deslocar).find((s) => Math.max(...s.map((p) => p[0])) <= paineis.xs[1] + 0.6);
    if (cola) faca.cola = cola;
  }
  return {
    faca,
    origemMm: [ox, oy],
    resumo: `${secoes.length} seções e ${linhas.length} linhas de faca (traço ${melhorChave.split("|")[0]}, ${melhorChave.split("|")[1]} pt)${paineis ? "" : " · painéis do corpo não identificados"}`,
  };
}

// Recorta da página a região da faca (já alinhada ao contorno) e reduz para a prévia. Só no navegador.
export async function arteDaPagina(page: PdfPageLike, origemMm: Pt, W: number, H: number): Promise<string> {
  const pxPorMm = 4;
  const viewport = page.getViewport({ scale: (pxPorMm * 25.4) / 72 });
  const cheio = document.createElement("canvas");
  cheio.width = Math.ceil(viewport.width);
  cheio.height = Math.ceil(viewport.height);
  const ctx = cheio.getContext("2d");
  if (!ctx) throw new Error("sem canvas");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, cheio.width, cheio.height);
  await page.render({ canvasContext: ctx, viewport, canvas: cheio }).promise;
  const cw = Math.round(W * pxPorMm);
  const ch = Math.round(H * pxPorMm);
  const k = Math.min(1, 700 / Math.max(cw, ch));
  const corte = document.createElement("canvas");
  corte.width = Math.round(cw * k);
  corte.height = Math.round(ch * k);
  corte.getContext("2d")?.drawImage(cheio, Math.round(origemMm[0] * pxPorMm), Math.round(origemMm[1] * pxPorMm), cw, ch, 0, 0, corte.width, corte.height);
  return corte.toDataURL("image/jpeg", 0.82);
}

// Lê o PDF inteiro: contorno da faca da primeira página.
export async function lerFacaDoPdf(pdfjs: PdfJsLike, dados: Uint8Array): Promise<{ resultado: FacaDoPdf | null; page: PdfPageLike }> {
  const doc = await pdfjs.getDocument({ data: dados }).promise;
  const page = await doc.getPage(1);
  const { tracos } = await tracosDaPagina(pdfjs, page);
  return { resultado: facaDosTracos(tracos), page };
}
