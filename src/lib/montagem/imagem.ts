// Imagem da pré-montagem aprovada, para anexar ao card e os outros setores enxergarem: o desenho
// da folha com os cortes e as peças, os dados da montagem e a faca aberta. O desenho é montado como
// texto SVG com cores fixas (sem depender do CSS da página) e depois vira PNG no navegador.
import { CONFIG } from "./config";
import type { Opcao } from "./calcular";
import { caminhoSvg, retanguloDaArte, type Arte, type Faca } from "./geometria";

export type DadosDaImagem = {
  titulo: string;
  subtitulo: string;
  aprovadaEm: string;
  op: Opcao;
  faca: Faca;
  arte?: Arte | null;
  barraControle: boolean;
  // Linhas "rótulo / valor" do painel de dados.
  linhas: [string, string][];
};

export const LARGURA_IMAGEM = 1800;
export const ALTURA_IMAGEM = 1180;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const num = (n: number) => Math.round(n * 100) / 100;
const fmt = (n: number, d = 1) => n.toLocaleString("pt-BR", { maximumFractionDigits: d });

const COR = { tinta: "#16282a", suave: "#5d7173", linha: "#d9e2e2", faca: "#0f766e", vinco: "#2563eb", corte: "#c0261b", cola: "#fde68a", pinca: "#b7c2c3", barra: "#cfdcf8" };

// Uma peça (cola, arte recortada pelo contorno, vincos e contorno de corte), para reusar com <use>.
function peca(faca: Faca, id: string, arte: Arte | null | undefined, sw: number, comVincos: boolean): string {
  const contorno = faca.partes ? faca.partes.map((p) => caminhoSvg(p)).join("") : caminhoSvg(faca.contorno);
  const r = arte ? retanguloDaArte(faca, arte.modo) : null;
  let s = `<g id="${id}">`;
  if (faca.cola) s += `<path d="${caminhoSvg(faca.cola)}" fill="${COR.cola}" fill-opacity="0.7"/>`;
  if (arte && r) {
    s += `<clipPath id="${id}c"><path d="${contorno}"/></clipPath>`;
    s += `<image href="${arte.url}" xlink:href="${arte.url}" x="${num(r.x)}" y="${num(r.y)}" width="${num(r.w)}" height="${num(r.h)}" preserveAspectRatio="none" clip-path="url(#${id}c)"/>`;
  } else {
    s += `<path d="${contorno}" fill="${COR.faca}" fill-opacity="0.18"/>`;
  }
  if (comVincos) {
    const d = [...(faca.secoes ?? []).map((p) => caminhoSvg(p)), ...(faca.linhas ?? []).map((p) => caminhoSvg(p, false))].join("");
    if (d) s += `<path d="${d}" fill="none" stroke="${COR.vinco}" stroke-width="${num(sw * 0.8)}" stroke-dasharray="${num(sw * 4)} ${num(sw * 2.5)}"/>`;
  }
  s += `<path d="${contorno}" fill="none" stroke="${COR.tinta}" stroke-width="${num(sw)}" stroke-linejoin="round"/></g>`;
  return s;
}

// A folha inteira: cortes, fatores, pinça, barra de controle e as peças. Escala 1:1 em mm.
function folha(d: DadosDaImagem, k: number): { svg: string; w: number; h: number } {
  const { op, faca } = d;
  const W = op.formato.w;
  const H = op.formato.h;
  const arr = op.arranjo;
  const m74 = op.fibraMaquina === "74";
  const pinca = op.pincaMm;
  const barra = d.barraControle ? op.barraMm : 0;
  const sw = 1.4 / k;
  const ou = (arr.wp - arr.larguraUsada) / 2;
  const ov = (arr.hp - arr.alturaUsada) / 2;
  let s = `<defs>${peca(faca, "pc", d.arte, sw, false)}</defs>`;
  s += `<rect x="0" y="0" width="${W}" height="${H}" fill="#fff" stroke="${COR.tinta}" stroke-width="${num(sw * 2)}"/>`;
  for (let i = 0; i < op.cortesLargura; i++) {
    for (let j = 0; j < op.cortesAltura; j++) {
      const x0 = i * op.wf;
      const y0 = j * op.hf;
      if (m74) {
        s += `<rect x="${num(x0 + op.wf - pinca)}" y="${num(y0)}" width="${pinca}" height="${num(op.hf)}" fill="${COR.pinca}"/>`;
        if (barra) s += `<rect x="${num(x0)}" y="${num(y0)}" width="${barra}" height="${num(op.hf)}" fill="${COR.barra}"/>`;
      } else {
        s += `<rect x="${num(x0)}" y="${num(y0 + op.hf - pinca)}" width="${num(op.wf)}" height="${pinca}" fill="${COR.pinca}"/>`;
        if (barra) s += `<rect x="${num(x0)}" y="${num(y0)}" width="${num(op.wf)}" height="${barra}" fill="${COR.barra}"/>`;
      }
      const base = op.girada90 ? `translate(${num(x0 + op.ox0 + arr.hp)} ${num(y0 + op.oy0)}) rotate(90)` : `translate(${num(x0 + op.ox0)} ${num(y0 + op.oy0)})`;
      s += `<g transform="${base} translate(${num(ou)} ${num(ov)})">`;
      for (const it of arr.itens) {
        const t = it.gira ? `translate(${num(it.u + faca.W)} ${num(it.v + faca.H)}) rotate(180)` : `translate(${num(it.u)} ${num(it.v)})`;
        s += `<use href="#pc" xlink:href="#pc" transform="${t}"/>`;
      }
      s += `</g>`;
    }
  }
  for (let i = 1; i < op.cortesLargura; i++) s += `<line x1="${num(i * op.wf)}" y1="0" x2="${num(i * op.wf)}" y2="${H}" stroke="${COR.corte}" stroke-width="${num(sw * 2)}" stroke-dasharray="${num(sw * 12)} ${num(sw * 7)}"/>`;
  for (let j = 1; j < op.cortesAltura; j++) s += `<line x1="0" y1="${num(j * op.hf)}" x2="${W}" y2="${num(j * op.hf)}" stroke="${COR.corte}" stroke-width="${num(sw * 2)}" stroke-dasharray="${num(sw * 12)} ${num(sw * 7)}"/>`;
  return { svg: s, w: W, h: H };
}

export function svgDaPreMontagem(d: DadosDaImagem): string {
  const { op } = d;
  const W = LARGURA_IMAGEM;
  const H = ALTURA_IMAGEM;
  // Área do desenho da folha.
  const ax = 40;
  const ay = 150;
  const aw = 1160;
  const ah = 900;
  const k = Math.min(aw / op.formato.w, ah / op.formato.h) * 0.92;
  const f = folha(d, k);
  const fw = f.w * k;
  const fh = f.h * k;
  const fx = ax + (aw - fw) / 2;
  const fy = ay + 30 + (ah - 30 - fh) / 2;

  let s = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Arial, Helvetica, sans-serif">`;
  s += `<rect width="${W}" height="${H}" fill="#fff"/>`;
  s += `<text x="40" y="48" font-size="20" font-weight="700" fill="${COR.faca}" letter-spacing="2">PRÉ-MONTAGEM</text>`;
  s += `<text x="40" y="92" font-size="38" font-weight="700" fill="${COR.tinta}">${esc(d.titulo)}</text>`;
  s += `<text x="40" y="126" font-size="22" fill="${COR.suave}">${esc(d.subtitulo)}</text>`;
  s += `<text x="${W - 40}" y="48" font-size="20" fill="${COR.suave}" text-anchor="end">Aprovada em ${esc(d.aprovadaEm)}</text>`;
  s += `<line x1="40" y1="140" x2="${W - 40}" y2="140" stroke="${COR.linha}" stroke-width="2"/>`;

  // Folha inteira
  s += `<text x="${num(fx + fw / 2)}" y="${num(fy - 14)}" font-size="26" font-weight="700" text-anchor="middle" fill="${COR.tinta}">Folha ${fmt(op.formato.w / 10)} × ${fmt(op.formato.h / 10)} cm${op.sobMedida ? " (sob medida)" : ""}</text>`;
  s += `<svg x="${num(fx)}" y="${num(fy)}" width="${num(fw)}" height="${num(fh)}" viewBox="0 0 ${f.w} ${f.h}" overflow="visible">${f.svg}</svg>`;
  s += `<text x="${num(fx + fw / 2)}" y="${num(fy + fh + 32)}" font-size="19" text-anchor="middle" fill="${COR.suave}">Fator ${fmt(op.wf / 10)} × ${fmt(op.hf / 10)} cm · passagem na ${op.fibraMaquina === "74" ? "horizontal" : "vertical"} · fibra no segundo número da folha</text>`;
  s += `<text x="${num(fx + fw / 2)}" y="${num(fy + fh + 58)}" font-size="19" text-anchor="middle" fill="${COR.suave}">cinza = pinça · azul = barra de controle · tracejado vermelho = corte da folha</text>`;

  // Dados
  let y = 190;
  s += `<text x="1240" y="${y}" font-size="24" font-weight="700" fill="${COR.tinta}">Dados da montagem</text>`;
  y += 14;
  for (const [rot, val] of d.linhas) {
    y += 34;
    s += `<text x="1240" y="${y}" font-size="19" fill="${COR.suave}">${esc(rot)}</text>`;
    s += `<text x="1760" y="${y}" font-size="20" font-weight="700" fill="${COR.tinta}" text-anchor="end">${esc(val)}</text>`;
    s += `<line x1="1240" y1="${y + 9}" x2="1760" y2="${y + 9}" stroke="${COR.linha}" stroke-width="1"/>`;
  }

  // Faca aberta
  const bx = 1240;
  const by = Math.max(y + 40, 690);
  const bw = 520;
  const bh = H - by - 60;
  const kf = Math.min(bw / d.faca.W, (bh - 30) / d.faca.H) * 0.92;
  const faca = d.faca;
  s += `<text x="${bx}" y="${by}" font-size="22" font-weight="700" fill="${COR.tinta}">Faca aberta · ${fmt(faca.W)} × ${fmt(faca.H)} mm</text>`;
  s += `<svg x="${bx}" y="${by + 14}" width="${bw}" height="${num(bh - 30)}" viewBox="0 0 ${num(faca.W)} ${num(faca.H)}" preserveAspectRatio="xMinYMin meet"><defs>${peca(faca, "pf", d.arte, 1.3 / kf, true)}</defs><use href="#pf" xlink:href="#pf"/></svg>`;

  s += `<text x="40" y="${H - 22}" font-size="16" fill="${COR.suave}">Pré-montagem para o orçamento. O desenho final da montagem é feito no ArtiosCAD. Margem lateral ${CONFIG.margemLateralMm} mm; corte duplo com ${CONFIG.espacoFacasMm} mm entre facas.</text>`;
  s += `</svg>`;
  return s;
}

// Transforma o SVG em arquivo de imagem. PNG; se ficar grande demais para o envio, JPEG.
export async function svgParaImagem(svg: string, limiteBytes = 3_000_000): Promise<{ blob: Blob; extensao: "png" | "jpg" }> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = await new Promise<HTMLImageElement>((ok, erro) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => erro(new Error("Não consegui desenhar a imagem da pré-montagem."));
      i.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = LARGURA_IMAGEM;
    canvas.height = ALTURA_IMAGEM;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Sem canvas para gerar a imagem.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const paraBlob = (tipo: string, q?: number) =>
      new Promise<Blob>((ok, erro) => canvas.toBlob((b) => (b ? ok(b) : erro(new Error("Falha ao gerar a imagem."))), tipo, q));
    const png = await paraBlob("image/png");
    if (png.size <= limiteBytes) return { blob: png, extensao: "png" };
    return { blob: await paraBlob("image/jpeg", 0.88), extensao: "jpg" };
  } finally {
    URL.revokeObjectURL(url);
  }
}
