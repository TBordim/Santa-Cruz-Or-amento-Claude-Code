"use client";

import { useState } from "react";
import { ExternalLink, Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Janela grande pra ver uma imagem ou um PDF anexado: a visualização que fica dentro do card é
// pequena (320 a 420 px) e não dá pra conferir detalhe de arte ou de folha digitalizada. Pedido do
// Thiago em 09/10/2026. Imagem: abre ajustada à tela e dá pra aumentar (botões + e −, ou um clique
// na própria imagem); em zoom maior a janela rola. PDF: ocupa a janela inteira.
const NIVEIS = [1, 1.5, 2, 3, 4]; // 1 = ajustada à janela; os demais são múltiplos da largura dela

function Conteudo({ src, tipo, nome }: { src: string; tipo: "imagem" | "pdf"; nome: string }) {
  const [nivel, setNivel] = useState(0);
  const zoom = NIVEIS[nivel];

  return (
    <>
      <DialogTitle className="sr-only">{nome}</DialogTitle>
      <DialogDescription className="sr-only">Visualização ampliada do arquivo.</DialogDescription>

      <div className="flex shrink-0 flex-wrap items-center gap-1.5 pr-9">
        <span className="min-w-0 flex-1 basis-40 truncate text-sm font-medium text-foreground">{nome}</span>
        {tipo === "imagem" && (
          <>
            <Button type="button" variant="outline" size="icon-sm" aria-label="Diminuir" disabled={nivel === 0} onClick={() => setNivel(nivel - 1)}>
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <span className="w-11 text-center font-mono text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
            <Button type="button" variant="outline" size="icon-sm" aria-label="Aumentar" disabled={nivel === NIVEIS.length - 1} onClick={() => setNivel(nivel + 1)}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={nivel === 0} onClick={() => setNivel(0)}>
              <RotateCcw className="h-3.5 w-3.5" /> Ajustar
            </Button>
          </>
        )}
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <a href={src} target="_blank" rel="noreferrer">
            <ExternalLink className="h-3.5 w-3.5" /> Nova aba
          </a>
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border bg-muted/30">
        {tipo === "pdf" ? (
          <iframe src={src} title={nome} className="h-full w-full" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- URL do Blob ou do navegador (blob:), não é asset local otimizável
          <img
            src={src}
            alt={nome}
            onClick={() => setNivel(nivel === 0 ? 2 : 0)}
            className={nivel === 0 ? "mx-auto h-full w-full cursor-zoom-in object-contain" : "mx-auto max-w-none cursor-zoom-out"}
            style={nivel === 0 ? undefined : { width: `${zoom * 100}%` }}
          />
        )}
      </div>
    </>
  );
}

export function VisualizadorAmpliado({
  aberto,
  aoMudar,
  src,
  tipo,
  nome,
}: {
  aberto: boolean;
  aoMudar: (aberto: boolean) => void;
  src: string;
  tipo: "imagem" | "pdf";
  nome: string;
}) {
  return (
    <Dialog open={aberto} onOpenChange={aoMudar}>
      {/* O conteúdo só existe com a janela aberta, então o zoom recomeça ajustado a cada abertura. */}
      <DialogContent className="flex h-[92dvh] w-[96vw] max-w-[96vw] flex-col gap-2 p-3 sm:max-w-[96vw]">
        <Conteudo src={src} tipo={tipo} nome={nome} />
      </DialogContent>
    </Dialog>
  );
}

// Imagem que abre ampliada ao clicar (cursor de lupa e selo "Ampliar"). Usada onde a imagem ia
// inline e pequena: anexos do card, prévia do Novo Orçamento, foto da folha do Arquivo legado.
export function ImagemAmpliavel({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="relative block w-fit max-w-full cursor-zoom-in rounded-md text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        title="Clique para ampliar"
        aria-label={`Ampliar: ${alt}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- URL do Blob ou do navegador (blob:), não é asset local otimizável */}
        <img src={src} alt={alt} className={className} />
        <span className="pointer-events-none absolute right-2 top-2 flex items-center gap-1 rounded-md bg-background/90 px-1.5 py-1 text-[11px] font-medium text-foreground shadow-sm">
          <Maximize2 className="h-3 w-3" /> Ampliar
        </span>
      </button>
      <VisualizadorAmpliado aberto={aberto} aoMudar={setAberto} src={src} tipo="imagem" nome={alt} />
    </>
  );
}
