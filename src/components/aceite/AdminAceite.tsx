"use client";

import { useTransition } from "react";
import { Ban, Trash2 } from "lucide-react";
import { cancelarAceite, excluirPedidoCompleto } from "@/app/(app)/aceite/actions";
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

// Só o administrador vê (e a ação confere de novo no servidor). Serve para limpar cards de teste em
// qualquer etapa do Aceite. Chama a ação direto no clique: o diálogo fecha na mesma interação e
// desmontaria um <form> (ver ExcluirCardButton).
export function AdminAceite({ aceiteId }: { aceiteId: string }) {
  const [pending, startTransition] = useTransition();
  const executar = (acao: (fd: FormData) => Promise<void>) =>
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", aceiteId);
      await acao(fd);
    });

  return (
    <div className="flex flex-wrap gap-2">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="gap-1.5">
            <Ban className="h-3.5 w-3.5" /> Cancelar Aceite
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar este Aceite?</AlertDialogTitle>
            <AlertDialogDescription>
              O Aceite e os Pedidos de Material dele são apagados, e o orçamento volta ao Retorno do Cliente como &quot;aguardando&quot;, sem
              desfecho nem Nº de pedido do cliente. Não dá para desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={pending} onClick={() => executar(cancelarAceite)}>
              {pending ? "Cancelando…" : "Sim, cancelar o Aceite"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" /> Excluir pedido
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir o pedido por inteiro?</AlertDialogTitle>
            <AlertDialogDescription>
              Apaga o orçamento, o Aceite, os Pedidos de Material e os anexos registrados. Use para cards de teste. Não dá para desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={pending} onClick={() => executar(excluirPedidoCompleto)}>
              {pending ? "Excluindo…" : "Sim, excluir tudo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
