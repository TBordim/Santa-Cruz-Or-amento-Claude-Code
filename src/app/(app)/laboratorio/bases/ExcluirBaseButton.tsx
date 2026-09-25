"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { excluirBase } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export function ExcluirBaseButton({ id, codigo }: { id: string; codigo: string }) {
  const [open, setOpen] = useState(false);
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function onConfirmar() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("senha", senha);
      const resultado = await excluirBase(fd);
      if (resultado?.erro) setErro(resultado.erro);
      else {
        setOpen(false);
        setSenha("");
      }
    });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setErro(undefined);
          setSenha("");
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" /> Excluir
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir a tinta &quot;{codigo}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            Essa ação é definitiva e some do catálogo pra sempre. Recusa se alguma fórmula ainda usa essa tinta.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`senha-${id}`}>Seu PIN de administrador</Label>
          <Input
            id={`senha-${id}`}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </div>
        {erro && <div className="anexo-erro">{erro}</div>}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button variant="destructive" disabled={pending || !senha} onClick={onConfirmar}>
            {pending ? "Excluindo…" : "Sim, excluir"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
