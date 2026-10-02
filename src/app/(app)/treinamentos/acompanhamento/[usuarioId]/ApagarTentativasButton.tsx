"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { apagarTentativas } from "./actions";
import { Button } from "@/components/ui/button";
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

// Só aparece para administrador (e a action confere de novo). Útil para refazer um teste ou corrigir um engano.
export function ApagarTentativasButton({
  usuarioId,
  treinamentoId,
  pessoa,
  treinamento,
  quantidade,
}: {
  usuarioId: string;
  treinamentoId: string;
  pessoa: string;
  treinamento: string;
  quantidade: number;
}) {
  const [open, setOpen] = useState(false);
  const [erro, setErro] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function confirmar() {
    startTransition(async () => {
      const r = await apagarTentativas(usuarioId, treinamentoId);
      if ("erro" in r) setErro(r.erro);
      else setOpen(false);
    });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(proximo) => {
        setOpen(proximo);
        if (proximo) setErro(undefined);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" /> Apagar tentativas
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apagar as tentativas de {pessoa}?</AlertDialogTitle>
          <AlertDialogDescription>
            Apaga {quantidade} {quantidade === 1 ? "tentativa" : "tentativas"} em &quot;{treinamento}&quot;. Ela volta a &quot;Pendente&quot; e poderá
            refazer o quiz. Ação definitiva: o histórico dessas tentativas não volta.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {erro && <div className="anexo-erro">{erro}</div>}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button variant="destructive" disabled={pending} onClick={confirmar}>
            {pending ? "Apagando…" : "Sim, apagar"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
