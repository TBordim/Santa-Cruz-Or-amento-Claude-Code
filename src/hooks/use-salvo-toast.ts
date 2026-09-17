"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

// Vários forms da gaveta (salvar sem liberar, solicitar compras etc.) atualizam o banco sem
// navegar nem trocar de etapa — sem isto, salvar parecia não fazer nada. Dispara um toast de
// sucesso só na transição pending→settled sem erro (nunca no primeiro render).
export function useSalvoToast(pending: boolean, erro: string | undefined, mensagem = "Salvo.") {
  const estavaPendente = useRef(false);
  useEffect(() => {
    if (estavaPendente.current && !pending && !erro) {
      toast.success(mensagem);
    }
    estavaPendente.current = pending;
  }, [pending, erro, mensagem]);
}
