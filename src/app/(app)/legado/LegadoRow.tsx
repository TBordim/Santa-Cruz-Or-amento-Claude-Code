"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { salvarDadosLegado, excluirLegado } from "./actions";
import { fmtMoney, fmtDate } from "@/lib/orcamentos/constantes";
import { paraCampoBR } from "@/lib/orcamentos/motor";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Legado = {
  id: string;
  cliente: string | null;
  produtoDescricao: string | null;
  produtoCodigo: string | null;
  precoAtual: number | null;
  custoPrimarioPct: number | null;
  margemP2Pct: number | null;
  quantidade: number | null;
  dataLegadoTexto: string | null;
  obs: string | null;
  fotoUrl: string | null;
  fotoMime: string | null;
  criadoEm: Date;
};

export function LegadoRow({ legado }: { legado: Legado }) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">{legado.cliente}</TableCell>
        <TableCell className="text-muted-foreground">{legado.produtoDescricao}{legado.produtoCodigo ? ` (${legado.produtoCodigo})` : ""}</TableCell>
        <TableCell className="font-mono">{fmtMoney(legado.precoAtual)}</TableCell>
        <TableCell className="text-muted-foreground">{legado.dataLegadoTexto || fmtDate(legado.criadoEm)}</TableCell>
        <TableCell>
          <div className="flex justify-end gap-1">
            <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={() => setAberto(!aberto)}>
              {aberto ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {aberto ? "Fechar" : "Abrir"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir o registro de &quot;{legado.cliente}&quot;?</AlertDialogTitle>
                  <AlertDialogDescription>Essa ação é definitiva e não pode ser desfeita.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <form action={excluirLegado}>
                    <input type="hidden" name="id" value={legado.id} />
                    <AlertDialogAction asChild>
                      <Button type="submit" variant="destructive">Sim, excluir</Button>
                    </AlertDialogAction>
                  </form>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </TableCell>
      </TableRow>
      {aberto && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={5} className="whitespace-normal bg-muted/30">
            <div className="flex flex-col gap-3 py-2">
              {legado.obs && <p className="text-sm text-foreground">{legado.obs}</p>}
              <form action={salvarDadosLegado} className="flex flex-col gap-3">
                <input type="hidden" name="id" value={legado.id} />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`precoAtual-${legado.id}`}>Preço atual</Label>
                    <Input id={`precoAtual-${legado.id}`} name="precoAtual" defaultValue={paraCampoBR(legado.precoAtual)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`quantidade-${legado.id}`}>Quantidade</Label>
                    <Input id={`quantidade-${legado.id}`} name="quantidade" defaultValue={paraCampoBR(legado.quantidade)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`custoPrimarioPct-${legado.id}`}>Custo primário (%)</Label>
                    <Input id={`custoPrimarioPct-${legado.id}`} name="custoPrimarioPct" defaultValue={paraCampoBR(legado.custoPrimarioPct)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`margemP2Pct-${legado.id}`}>Margem P2 (%)</Label>
                    <Input id={`margemP2Pct-${legado.id}`} name="margemP2Pct" defaultValue={paraCampoBR(legado.margemP2Pct)} />
                  </div>
                </div>
                <div>
                  <Button type="submit" variant="outline">Salvar dados de comparação</Button>
                </div>
              </form>
              {legado.fotoUrl && (
                legado.fotoMime === "application/pdf" ? (
                  <Button asChild variant="outline" className="w-fit">
                    <a href={legado.fotoUrl} target="_blank" rel="noreferrer">Abrir PDF em nova aba</a>
                  </Button>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- URL do Blob
                  <img src={legado.fotoUrl} alt="Foto da folha" className="max-w-[320px] rounded-lg border border-border" />
                )
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
