"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { NovaPuxadaForm } from "./NovaPuxadaForm";
import { EditarRodadaForm } from "./EditarRodadaForm";
import { aprovarRodada, excluirRodada } from "./actions";
import { num } from "@/lib/cor/formato";
import { somaFecha100 } from "@/lib/cor/composicao";

const ORIGEM_LABEL: Record<string, string> = {
  FORNECEDOR: "Fornecedor",
  SUGESTAO_SISTEMA: "Sugestão do sistema",
  AJUSTE_MANUAL: "Ajuste manual",
  IMPORTADO: "Importada da planilha (só a final)",
};

const CONTEXTO_LABEL: Record<string, string> = {
  PUXADA: "Puxada (Quick Peek) · melhor LAB",
  FINAL: "Final da planilha antiga",
  PRODUCAO: "Produção",
};

const LOTE_QUICKPEEK_G = 10;
const TOLERANCIA_DE = 1;

type Base = { id: string; codigo: string; nome: string };
type Composicao = { id: string; baseId: string; baseCodigo: string; baseNome: string; percentual: number };
type Leitura = { id: string; contexto: string; l: number; a: number; b: number; deltaE: number | null };

export function RodadaCard({
  corId,
  rodadaId,
  numero,
  origem,
  aprovada,
  composicoes,
  leituras,
  puxadaLab,
  deAprovacao,
  bases,
  podeRegistrar,
}: {
  corId: string;
  rodadaId: string;
  numero: number;
  origem: string;
  aprovada: boolean;
  composicoes: Composicao[];
  leituras: Leitura[];
  puxadaLab: { l: number; a: number; b: number } | null;
  deAprovacao: number | null;
  bases: Base[];
  podeRegistrar: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [erroExcluir, setErroExcluir] = useState<string | undefined>();
  const [pendingExcluir, startExcluir] = useTransition();

  const totalPct = composicoes.reduce((s, c) => s + c.percentual, 0);

  function onExcluir() {
    startExcluir(async () => {
      const fd = new FormData();
      fd.set("rodadaId", rodadaId);
      const resultado = await excluirRodada(fd);
      if (resultado?.erro) setErroExcluir(resultado.erro);
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="font-semibold text-foreground">Rodada {numero}</span>
        <Badge variant="secondary">{ORIGEM_LABEL[origem] ?? origem}</Badge>
        {aprovada && <Badge className="bg-good-soft text-good border-0">Aprovada</Badge>}
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          total: {num(totalPct, 2)}%{somaFecha100(totalPct) ? "" : " ⚠"}
        </span>
        {podeRegistrar && !editando && (
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="icon" aria-label="Corrigir esta rodada" onClick={() => setEditando(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <AlertDialog onOpenChange={(open) => open && setErroExcluir(undefined)}>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="ghost" size="icon" aria-label="Excluir esta rodada" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir a rodada {numero}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    A fórmula e a leitura dela somem do histórico.
                    {aprovada && " Como é a rodada aprovada, a cor volta pra \"Em desenvolvimento\"."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {erroExcluir && <div className="anexo-erro">{erroExcluir}</div>}
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <Button variant="destructive" disabled={pendingExcluir} onClick={onExcluir}>
                    {pendingExcluir ? "Excluindo…" : "Sim, excluir"}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {editando ? (
        <EditarRodadaForm
          corId={corId}
          rodadaId={rodadaId}
          origemAtual={origem}
          bases={bases}
          composicaoAtual={composicoes.map((c) => ({ baseId: c.baseId, percentual: c.percentual }))}
          onFechar={() => setEditando(false)}
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Base</TableHead>
                <TableHead className="text-right">%</TableHead>
                <TableHead className="text-right">g (lote {LOTE_QUICKPEEK_G}g)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {composicoes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    {c.baseCodigo} <span className="text-muted-foreground">— {c.baseNome}</span>
                  </TableCell>
                  <TableCell className="text-right font-mono">{num(c.percentual, 2)}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {num((c.percentual / 100) * LOTE_QUICKPEEK_G, 2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {leituras.length > 0 && (
            <div className="mt-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Leitura</TableHead>
                    <TableHead>LAB</TableHead>
                    <TableHead className="text-right">ΔE2000</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leituras.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{CONTEXTO_LABEL[l.contexto] ?? l.contexto}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {num(l.l)} / {num(l.a)} / {num(l.b)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono ${l.deltaE != null && l.deltaE >= TOLERANCIA_DE ? "font-semibold text-destructive" : ""}`}
                      >
                        {l.deltaE != null ? num(l.deltaE, 2) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {podeRegistrar && origem !== "IMPORTADO" && <NovaPuxadaForm rodadaId={rodadaId} corId={corId} atual={puxadaLab} />}

          {podeRegistrar && !aprovada && leituras.length > 0 && (
            <form action={aprovarRodada} className="mt-3 flex items-center gap-3">
              <input type="hidden" name="rodadaId" value={rodadaId} />
              <Button type="submit" variant="outline" size="sm">
                Aprovar esta rodada
              </Button>
              {deAprovacao != null && (
                // Acima da tolerância continua podendo aprovar — só chama atenção em vermelho,
                // a decisão de aceitar assim é do colorista/engenharia.
                <span className={`text-xs ${deAprovacao >= TOLERANCIA_DE ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
                  ΔE {num(deAprovacao, 2)}
                  {deAprovacao < TOLERANCIA_DE ? " — dentro da tolerância" : " — acima da tolerância"}
                </span>
              )}
            </form>
          )}
        </>
      )}
    </div>
  );
}
