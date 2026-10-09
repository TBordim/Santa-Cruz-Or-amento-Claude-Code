"use client";

import { useState } from "react";
import { Maximize2 } from "lucide-react";
import { fmtMoney } from "@/lib/orcamentos/constantes";
import { formatarCodigoInterno } from "@/lib/orcamentos/codigo-interno";
import { fmtPct } from "@/lib/orcamentos/motor";
import { ResumoBox } from "@/components/form-section";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ImagemAmpliavel, VisualizadorAmpliado } from "@/components/anexos/VisualizadorAmpliado";

export type LegadoParaVer = {
  cliente: string | null;
  produtoDescricao: string | null;
  codInterno: string | null;
  precoAtual: number | null;
  quantidade: number | null;
  custoPrimarioPct: number | null;
  margemP2Pct: number | null;
  data: string;
  medidas: string; // "40 × 25 × 195 mm", ou vazio sem medidas
  obs: string | null;
  fotoUrl: string | null;
  fotoMime: string | null;
};

// "Ver" do Arquivo legado no Histórico. Um registro do legado não tem card no Painel (o "Ver" dos
// orçamentos do fluxo leva pra lá), então o que existe pra conferir é a folha digitalizada e os
// dados que foram lançados dela. Aqui os dois aparecem juntos, a foto com opção de ampliar.
// Pedido do Thiago em 09/10/2026.
export function VerLegado({ legado: l, variante = "ghost" }: { legado: LegadoParaVer; variante?: "ghost" | "outline" }) {
  const [pdfAmpliado, setPdfAmpliado] = useState(false);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant={variante} size="sm">Ver</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92dvh] w-[96vw] max-w-[96vw] gap-3 overflow-y-auto sm:max-w-2xl">
        <DialogTitle className="pr-8 text-base">Arquivo legado — {l.cliente || "sem cliente"}</DialogTitle>
        <DialogDescription className="sr-only">Dados do registro e foto da folha digitalizada.</DialogDescription>

        <ResumoBox
          quebrar
          rows={[
            { label: "Produto", value: l.produtoDescricao || "—" },
            { label: "Código interno", value: l.codInterno ? formatarCodigoInterno(l.codInterno) : "Sem código" },
            { label: "Medidas", value: l.medidas || "—" },
            { label: "Preço (por milheiro)", value: fmtMoney(l.precoAtual) },
            { label: "Quantidade", value: l.quantidade != null ? String(l.quantidade) : "—" },
            { label: "Custo primário", value: l.custoPrimarioPct != null ? fmtPct(l.custoPrimarioPct) : "—" },
            { label: "Margem P2", value: l.margemP2Pct != null ? fmtPct(l.margemP2Pct) : "—" },
            { label: "Data", value: l.data || "—" },
            ...(l.obs ? [{ label: "Observação", value: l.obs }] : []),
          ]}
        />

        <div className="flex flex-col gap-2">
          <div className="text-sm font-medium text-foreground">Folha digitalizada</div>
          {!l.fotoUrl ? (
            <p className="text-sm text-muted-foreground">Este registro não tem foto nem PDF da folha anexado.</p>
          ) : l.fotoMime === "application/pdf" ? (
            <>
              <iframe src={l.fotoUrl} title="Folha digitalizada" className="h-[55dvh] w-full rounded-md border border-border" />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setPdfAmpliado(true)}>
                  <Maximize2 className="h-3.5 w-3.5" /> Ampliar
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={l.fotoUrl} target="_blank" rel="noreferrer">Abrir em nova aba</a>
                </Button>
              </div>
              <VisualizadorAmpliado aberto={pdfAmpliado} aoMudar={setPdfAmpliado} src={l.fotoUrl} tipo="pdf" nome="Folha digitalizada" />
            </>
          ) : (
            <ImagemAmpliavel src={l.fotoUrl} alt="Folha digitalizada" className="max-h-[55dvh] max-w-full rounded-lg border border-border" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
