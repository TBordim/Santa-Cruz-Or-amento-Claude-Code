"use client";

import { useId } from "react";
import type { Arte, Faca } from "@/lib/montagem/geometria";
import { PecaDef } from "@/components/orcamento/MontagemSvg";

const fmt = (n: number, d = 1) => n.toLocaleString("pt-BR", { maximumFractionDigits: d });

// A faca aberta (cartucho planificado) sozinha, com cotas, como na prévia de uma faca gráfica.
export function FacaAbertaSvg({ faca, arte }: { faca: Faca; arte?: Arte | null }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const m = faca.medidas;
  const margem = faca.W * 0.16;
  const fs = faca.W / 26;
  const vb = `${-margem} ${-margem * 0.9} ${faca.W + 2 * margem} ${faca.H + margem * 2.1}`;
  const traco = (x1: number, y1: number, x2: number, y2: number, k: string) => (
    <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-muted-foreground" strokeWidth={1} vectorEffect="non-scaling-stroke" />
  );
  const yc = -margem * 0.55;
  const xc = -margem * 0.55;
  const nomes = ["cola", "frente", "lateral", "frente", "lateral"];

  return (
    <svg viewBox={vb} className="h-auto w-full" role="img" aria-label="Faca aberta com cotas">
      <defs>
        <PecaDef id={id} faca={faca} arte={arte} />
      </defs>
      <use href={`#${id}`} />
      {traco(0, yc, faca.W, yc, "t")}
      {traco(0, yc - 3, 0, yc + 3, "t0")}
      {traco(faca.W, yc - 3, faca.W, yc + 3, "t1")}
      <text x={faca.W / 2} y={yc - fs * 0.35} fontSize={fs} textAnchor="middle" fontWeight={600} className="fill-foreground">
        {fmt(faca.W)} mm
      </text>
      {traco(xc, 0, xc, faca.H, "l")}
      {traco(xc - 3, 0, xc + 3, 0, "l0")}
      {traco(xc - 3, faca.H, xc + 3, faca.H, "l1")}
      <text transform={`translate(${xc - fs * 0.4} ${faca.H / 2}) rotate(-90)`} fontSize={fs} textAnchor="middle" fontWeight={600} className="fill-foreground">
        {fmt(faca.H)} mm
      </text>
      {m && (
        <>
          {nomes.map((nome, i) => {
            const xa = m.xs[i];
            const xb = m.xs[i + 1];
            const yb = faca.H + margem * 0.5;
            return (
              <g key={i}>
                {traco(xa, yb, xb, yb, `p${i}`)}
                {traco(xa, yb - 3, xa, yb + 3, `pa${i}`)}
                {traco(xb, yb - 3, xb, yb + 3, `pb${i}`)}
                <text x={(xa + xb) / 2} y={yb + fs * 1.05} fontSize={fs * 0.78} textAnchor="middle" className="fill-foreground">
                  {fmt(xb - xa)}
                </text>
                {!arte && (
                  <text x={(xa + xb) / 2} y={m.yT + m.A / 2} fontSize={fs * 0.72} textAnchor="middle" className="fill-muted-foreground">
                    {nome}
                  </text>
                )}
              </g>
            );
          })}
          <text transform={`translate(${faca.W + margem * 0.4 + fs} ${faca.H / 2}) rotate(90)`} fontSize={fs * 0.78} textAnchor="middle" className="fill-foreground">
            corpo {fmt(m.A)}
          </text>
        </>
      )}
    </svg>
  );
}
