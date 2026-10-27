"use client";

import { useState } from "react";
import { Field } from "@/components/form-section";
import { Input } from "@/components/ui/input";
import { LIMITE_P1, margemBruta, numeroDoCampo, p2ZeradaOuVazia } from "@/lib/orcamentos/margem";

// Margem P2 e, quando ela é zero (ou está vazia), a margem P1. P1 vai no máximo até 15%; acima disso é P2.
// Com P2 acima de zero o P1 é sempre 15 e o campo some, no lugar dele aparece a soma (15 + P2 = margem
// bruta). Devolve duas colunas (fragmento) para ficar numa grade de duas ou três colunas. Pedido do
// Thiago em 28/10/2026.
export function CamposMargem({
  nameP2,
  nameP1,
  defaultP2,
  defaultP1,
  form,
  idP2,
  idP1,
  obrigatorioP1 = true,
}: {
  nameP2: string;
  nameP1: string;
  defaultP2?: string;
  defaultP1?: string;
  form?: string;
  idP2?: string;
  idP1?: string;
  // Em "Salvar sem liberar" o P1 pode ficar em branco; quem exige é o envio (validação no servidor).
  obrigatorioP1?: boolean;
}) {
  const [p2Texto, setP2Texto] = useState(defaultP2 ?? "");
  const p2 = numeroDoCampo(p2Texto);
  const zerada = p2ZeradaOuVazia(p2);
  const bruta = margemBruta(p2, null);
  return (
    <>
      <Field label="Margem P2 (%)" hint="Acima dos 15% do P1.">
        <Input id={idP2} name={nameP2} value={p2Texto} onChange={(e) => setP2Texto(e.target.value)} form={form} inputMode="decimal" />
      </Field>
      {zerada ? (
        <Field label="Margem P1 (%)" hint={`P2 zerada: informe o P1, de 0 a ${LIMITE_P1}%.`}>
          <Input id={idP1} name={nameP1} defaultValue={defaultP1 ?? ""} form={form} inputMode="decimal" required={obrigatorioP1} />
        </Field>
      ) : (
        <div className="flex flex-col gap-1 self-end pb-2 text-sm">
          <input type="hidden" name={nameP1} value={String(LIMITE_P1)} form={form} />
          <span className="text-muted-foreground">Margem bruta</span>
          <span className="font-mono font-semibold text-foreground">{bruta.texto}</span>
        </div>
      )}
    </>
  );
}
