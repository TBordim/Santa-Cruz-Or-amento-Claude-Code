"use client";

import { useId } from "react";
import { caminhoSvg, retanguloDaArte, type Arte, type Faca } from "@/lib/montagem/geometria";
import type { Opcao } from "@/lib/montagem/calcular";

const fmt = (n: number, d = 1) => n.toLocaleString("pt-BR", { maximumFractionDigits: d });

// Uma peça: cola, arte do cliente recortada pelo contorno, vincos e contorno de corte.
// Compartilhada entre a folha, a miniatura e a faca aberta.
export function PecaDef({ id, faca, arte, mini = false }: { id: string; faca: Faca; arte?: Arte | null; mini?: boolean }) {
  const contorno = faca.partes ? faca.partes.map((p) => caminhoSvg(p)).join("") : caminhoSvg(faca.contorno);
  const r = arte ? retanguloDaArte(faca, arte.modo) : null;
  return (
    <g id={id}>
      {faca.cola && <path d={caminhoSvg(faca.cola)} className="fill-yellow-400/50" />}
      {arte && r && (
        <>
          <clipPath id={`${id}c`}>
            <path d={contorno} />
          </clipPath>
          <image href={arte.url} x={r.x} y={r.y} width={r.w} height={r.h} preserveAspectRatio="none" clipPath={`url(#${id}c)`} />
        </>
      )}
      {!arte && <path d={contorno} className="fill-primary/20" />}
      {!mini && faca.secoes && faca.secoes.length > 0 && (
        <path d={faca.secoes.map((s) => caminhoSvg(s)).join("")} fill="none" className="stroke-primary" strokeWidth={1} strokeDasharray="5 3" vectorEffect="non-scaling-stroke" />
      )}
      {!mini && faca.linhas && faca.linhas.length > 0 && (
        <path d={faca.linhas.map((l) => caminhoSvg(l, false)).join("")} fill="none" className="stroke-primary" strokeWidth={1} strokeDasharray="5 3" vectorEffect="non-scaling-stroke" />
      )}
      <path d={contorno} fill="none" className="stroke-foreground" strokeWidth={mini ? 0.9 : 1.2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </g>
  );
}

// Desenho da folha inteira com os cortes, os fatores e as peças de uma opção (escala 1:1 em mm).
// `detalhe` mostra os rótulos; sem ele serve de miniatura na lista de opções.
export function MontagemSvg({
  op,
  faca,
  barraControle,
  arte,
  detalhe = false,
}: {
  op: Opcao;
  faca: Faca;
  barraControle: boolean;
  arte?: Arte | null;
  detalhe?: boolean;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const { w: W, h: H } = op.formato;
  const pad = detalhe ? Math.max(W, H) * 0.07 : 0;
  const fs = Math.max(W, H) / 38;
  const arr = op.arranjo;
  const m74 = op.fibraMaquina === "74";
  const pinca = op.pincaMm;
  const barra = barraControle ? op.barraMm : 0;
  const vb = `${-pad} ${-pad} ${W + 2 * pad + (detalhe ? pad * 1.2 : 0)} ${H + 2 * pad}`;
  const ou = (arr.wp - arr.larguraUsada) / 2;
  const ov = (arr.hp - arr.alturaUsada) / 2;

  const fatores: { x0: number; y0: number }[] = [];
  for (let i = 0; i < op.cortesLargura; i++) for (let j = 0; j < op.cortesAltura; j++) fatores.push({ x0: i * op.wf, y0: j * op.hf });

  return (
    <svg viewBox={vb} className="h-auto w-full" role="img" aria-label="Montagem na folha inteira">
      <defs>
        <PecaDef id={id} faca={faca} arte={arte} mini={!detalhe} />
      </defs>
      <rect x={0} y={0} width={W} height={H} className="fill-background stroke-foreground" strokeWidth={detalhe ? 3 : 5} />
      {fatores.map(({ x0, y0 }) => {
        const base = op.girada90 ? `translate(${x0 + op.ox0 + arr.hp} ${y0 + op.oy0}) rotate(90)` : `translate(${x0 + op.ox0} ${y0 + op.oy0})`;
        return (
          <g key={`${x0}-${y0}`}>
            {m74 ? (
              <>
                <rect x={x0 + op.wf - pinca} y={y0} width={pinca} height={op.hf} className="fill-muted-foreground/30" />
                {barra > 0 && <rect x={x0} y={y0} width={barra} height={op.hf} className="fill-primary/15" />}
              </>
            ) : (
              <>
                <rect x={x0} y={y0 + op.hf - pinca} width={op.wf} height={pinca} className="fill-muted-foreground/30" />
                {barra > 0 && <rect x={x0} y={y0} width={op.wf} height={barra} className="fill-primary/15" />}
              </>
            )}
            <g transform={`${base} translate(${ou} ${ov})`}>
              {arr.itens.map((it, k) => (
                <use key={k} href={`#${id}`} transform={it.gira ? `translate(${it.u + faca.W} ${it.v + faca.H}) rotate(180)` : `translate(${it.u} ${it.v})`} />
              ))}
            </g>
          </g>
        );
      })}
      {Array.from({ length: op.cortesLargura - 1 }, (_, i) => (
        <line key={`cl${i}`} x1={(i + 1) * op.wf} y1={0} x2={(i + 1) * op.wf} y2={H} className="stroke-destructive" strokeWidth={detalhe ? 3 : 5} strokeDasharray={detalhe ? "14 8" : "30 18"} />
      ))}
      {Array.from({ length: op.cortesAltura - 1 }, (_, j) => (
        <line key={`ca${j}`} x1={0} y1={(j + 1) * op.hf} x2={W} y2={(j + 1) * op.hf} className="stroke-destructive" strokeWidth={detalhe ? 3 : 5} strokeDasharray={detalhe ? "14 8" : "30 18"} />
      ))}
      {detalhe && (
        <>
          <text x={W / 2} y={-pad * 0.4} fontSize={fs} textAnchor="middle" fontWeight={600} className="fill-foreground">
            Folha {fmt(W / 10)} × {fmt(H / 10)} cm
          </text>
          <text x={W + pad * 0.25} y={H / 2} fontSize={fs * 0.85} transform={`rotate(90 ${W + pad * 0.25} ${H / 2})`} textAnchor="middle" className="fill-foreground">
            fibra ↕ (segundo número)
          </text>
          <text x={W / 2} y={H + pad * 0.7} fontSize={fs * 0.85} textAnchor="middle" className="fill-muted-foreground">
            Fator {fmt(op.wf / 10)} × {fmt(op.hf / 10)} cm · cinza = pinça · azul = barra de controle · passagem na {m74 ? "horizontal" : "vertical"}
          </text>
        </>
      )}
    </svg>
  );
}
