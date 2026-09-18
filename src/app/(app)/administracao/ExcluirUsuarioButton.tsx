"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { excluirUsuario } from "./actions";
import { Button } from "@/components/ui/button";
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

export function ExcluirUsuarioButton({ id, nome }: { id: string; nome: string }) {
  const [pending, startTransition] = useTransition();

  // Chama a server action direto no clique em vez de <form action={...}> — o AlertDialogAction
  // fecha o diálogo (desmontando o form) na mesma interação de clique, e o navegador cancela o
  // envio nativo do form quando ele já não está mais no DOM. Ver ExcluirCardButton.tsx.
  function onConfirmar() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      await excluirUsuario(fd);
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" /> Excluir
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir o usuário &quot;{nome}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>Essa ação é definitiva — a pessoa deixa de conseguir entrar.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={pending} onClick={onConfirmar}>
            {pending ? "Excluindo…" : "Sim, excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
