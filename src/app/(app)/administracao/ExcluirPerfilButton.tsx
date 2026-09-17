"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { excluirPerfil } from "./actions";
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

export function ExcluirPerfilButton({ id, nome }: { id: string; nome: string }) {
  const [erro, setErro] = useState<string | undefined>();

  return (
    <AlertDialog>
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
          <form
            action={async (formData) => {
              const resultado = await excluirPerfil(formData);
              if (resultado?.erro) setErro(resultado.erro);
            }}
          >
            <input type="hidden" name="id" value={id} />
            <AlertDialogAction asChild>
              <Button type="submit" variant="destructive">Sim, excluir</Button>
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
