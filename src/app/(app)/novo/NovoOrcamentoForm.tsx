"use client";

import { useActionState } from "react";
import { CamposComerciaisFields } from "@/components/orcamento/CamposComerciaisFields";
import { criarOrcamento } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function NovoOrcamentoForm() {
  const [state, formAction, pending] = useActionState(criarOrcamento, undefined);

  if (state?.sucesso) {
    return (
      <Card className="max-w-2xl">
        <CardContent>
          <h3 className="mb-1.5 text-base font-semibold text-foreground">Solicitação enviada</h3>
          <p className="text-sm text-muted-foreground">Sua solicitação de orçamento foi registrada. A equipe da Santa Cruz vai dar seguimento.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-[760px]">
      <CardContent>
        <form action={formAction} className="flex flex-col gap-0">
          <CamposComerciaisFields />
          {state?.erro && <div className="anexo-erro mt-4">{state.erro}</div>}
          <div className="mt-6">
            <Button type="submit" disabled={pending}>{pending ? "Enviando…" : "Enviar solicitação"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
