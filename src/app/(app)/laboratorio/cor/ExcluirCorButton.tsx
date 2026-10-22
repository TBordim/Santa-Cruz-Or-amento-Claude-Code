"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { excluirCor } from "./actions";
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

// Só admin (checado de novo na action) — excluir uma cor apaga rodadas, composições e leituras
// dela junto, bem mais destrutivo que excluir uma rodada isolada.
export function ExcluirCorButton({ id, codigo }: { id: string; codigo: string }) {
  const [open, setOpen] = useState(false);
  const [erro, setErro] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function onConfirmar() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      const resultado = await excluirCor(fd);
      if (resultado?.erro) setErro(resultado.erro);
      else setOpen(false);
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => { setOpen(next); if (next) setErro(undefined); }}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-5 w-5 shrink-0 text-muted-foreground hover:text-destructive"
          aria-label={`Excluir a cor ${codigo}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir a cor &quot;{codigo}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            Apaga a cor e junto com ela todas as rodadas, composições e leituras registradas. Ação definitiva.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {erro && <div className="anexo-erro">{erro}</div>}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button variant="destructive" disabled={pending} onClick={onConfirmar}>
            {pending ? "Excluindo…" : "Sim, excluir"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
