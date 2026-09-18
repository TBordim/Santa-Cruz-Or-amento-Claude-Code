"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { excluirPerfil } from "./actions";
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

export function ExcluirPerfilButton({ id, nome }: { id: string; nome: string }) {
  const [open, setOpen] = useState(false);
  const [erro, setErro] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  // Chama a server action direto no clique em vez de <form action={...}> — o AlertDialogAction
  // padrão fecharia o diálogo (desmontando o conteúdo, inclusive a mensagem de erro) na mesma
  // interação de clique, antes da resposta da action chegar. Por isso o diálogo aqui é
  // controlado (open/onOpenChange manual): só fecha sozinho quando a exclusão realmente dá
  // certo — se der erro (perfil com usuário vinculado, por exemplo), continua aberto mostrando
  // a mensagem. Ver ExcluirCardButton.tsx para o bug original (form nunca era enviado).
  function onConfirmar() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      const resultado = await excluirPerfil(fd);
      if (resultado?.erro) setErro(resultado.erro);
      else setOpen(false);
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => { setOpen(next); if (next) setErro(undefined); }}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" /> Excluir
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir o perfil &quot;{nome}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>Essa ação é definitiva.</AlertDialogDescription>
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
