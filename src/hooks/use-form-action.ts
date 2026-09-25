"use client";

import { useState, useTransition, type FormEvent } from "react";

export type ServerFormAction<S> = (prev: S, formData: FormData) => Promise<S>;

// Substitui useActionState()+<form action={fn}> nos forms com <Select> do Radix (ou outro campo
// não controlado) — achado registrando uma rodada: <form action={fn}> deixa o PRÓPRIO NAVEGADOR
// resetar o form assim que a action termina, mesmo quando ela retorna erro. Campo controlado (com
// value+onChange) sobrevive porque o próximo render força o valor de volta; um Select com
// defaultValue (não controlado, ex. "Origem da fórmula") volta pro vazio sem avisar — e como é
// obrigatório, o PRÓXIMO clique em Salvar falha em silêncio (sem essa correção o form nem reenvia,
// só o navegador recusa por validação nativa). Chamando a action direto, sem <form action=>, o
// navegador nunca reseta nada — mesmo padrão já usado nos AlertDialog de exclusão deste app.
export function useFormActionSemReset<S>(action: ServerFormAction<S>, estadoInicial: S) {
  const [erro, setErro] = useState<S>(estadoInicial);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const resultado = await action(estadoInicial, formData);
      setErro(resultado);
    });
  }

  return [erro, onSubmit, pending] as const;
}
