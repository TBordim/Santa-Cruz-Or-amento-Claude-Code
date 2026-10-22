"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Arte, Faca } from "@/lib/montagem/geometria";

// Prévia 3D do cartucho fechado, em CSS puro: gira sozinha e dá para arrastar. Só mostra o
// volume com as medidas do pedido e, se houver, a arte nas quatro faces (tampa e fundo lisos).
export function Cubo3D({ faca, arte }: { faca: Faca; arte?: Arte | null }) {
  const m = faca.medidas;
  const [rotY, setRotY] = useState(-30);
  const [rotX, setRotX] = useState(-20);
  const arrastando = useRef(false);
  const ultimo = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const t = setInterval(() => {
      if (!arrastando.current) setRotY((r) => r + 0.6);
    }, 40);
    return () => clearInterval(t);
  }, []);

  if (!m) return null;
  const k = 150 / Math.max(m.F, m.Ls, m.A);
  const w = m.F * k;
  const d = m.Ls * k;
  const h = m.A * k;
  const total = faca.W;
  const alto = faca.H;

  // Pedaço da imagem que cai em cada painel (mesma conta da maquete).
  const fundo = (xInicio: number, larguraPainel: number): CSSProperties => {
    if (!arte) return {};
    if (arte.modo === "frente") {
      return xInicio === m.xs[1] ? { background: `#fff url('${arte.url}') center/100% 100% no-repeat` } : {};
    }
    const px = total - larguraPainel ? (xInicio / (total - larguraPainel)) * 100 : 0;
    const py = alto - m.A ? (m.yT / (alto - m.A)) * 100 : 0;
    return { background: `#fff url('${arte.url}') ${px}% ${py}% / ${(total / larguraPainel) * 100}% ${(alto / m.A) * 100}% no-repeat` };
  };

  const face = (chave: string, fw: number, fh: number, transform: string, estilo: CSSProperties = {}, texto = "", claro = false) => (
    <div
      key={chave}
      className={`absolute flex items-center justify-center border border-foreground text-[11px] text-foreground ${claro ? "bg-primary/55" : "bg-primary/35"}`}
      style={{ width: fw, height: fh, left: `calc(50% - ${fw / 2}px)`, top: `calc(50% - ${fh / 2}px)`, transform, ...estilo }}
    >
      {texto}
    </div>
  );

  return (
    <div
      className="flex h-60 cursor-grab touch-none select-none items-center justify-center active:cursor-grabbing"
      style={{ perspective: 900 }}
      onPointerDown={(e) => {
        arrastando.current = true;
        ultimo.current = { x: e.clientX, y: e.clientY };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!arrastando.current) return;
        setRotY((r) => r + (e.clientX - ultimo.current.x) * 0.6);
        setRotX((r) => Math.max(-80, Math.min(80, r - (e.clientY - ultimo.current.y) * 0.6)));
        ultimo.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={() => (arrastando.current = false)}
      onPointerCancel={() => (arrastando.current = false)}
    >
      <div className="relative" style={{ width: w, height: h, transformStyle: "preserve-3d", transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)` }}>
        {face("f", w, h, `translateZ(${d / 2}px)`, fundo(m.xs[1], m.F), arte ? "" : "Frente")}
        {face("t", w, h, `rotateY(180deg) translateZ(${d / 2}px)`, fundo(m.xs[3], m.F))}
        {face("d", d, h, `rotateY(90deg) translateZ(${w / 2}px)`, fundo(m.xs[2], m.Ls), arte ? "" : "Lateral")}
        {face("e", d, h, `rotateY(-90deg) translateZ(${w / 2}px)`, fundo(m.xs[4], m.Ls))}
        {face("c", w, d, `rotateX(90deg) translateZ(${h / 2}px)`, {}, "", true)}
        {face("b", w, d, `rotateX(-90deg) translateZ(${h / 2}px)`, {}, "", true)}
      </div>
    </div>
  );
}
