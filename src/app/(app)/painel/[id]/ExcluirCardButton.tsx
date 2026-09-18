"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { excluirCard } from "../actions";
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

export function ExcluirCardButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  // Chama a server action direto no clique em vez de <form action={...}> — o AlertDialogAction
  // do Radix fecha o diálogo (desmontando o form) na mesma interação de clique, e o navegador
  // cancela o envio nativo do form quando ele já não está mais conectado ao DOM ("Form
  // submission canceled because the form is not connected"). Achado em teste real (o card
  // nunca era excluído, mesmo confirmando). Chamar a action diretamente não depende do form
  // sobreviver ao fechamento do diálogo.
  function onConfirmar() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      await excluirCard(fd);
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" /> Excluir card
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir este orçamento?</AlertDialogTitle>
          <AlertDialogDescription>Essa ação é definitiva e não pode ser desfeita.</AlertDialogDescription>
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
