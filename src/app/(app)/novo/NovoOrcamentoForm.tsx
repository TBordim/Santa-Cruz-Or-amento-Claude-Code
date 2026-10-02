"use client";

import { useFormActionSemReset } from "@/hooks/use-form-action";
import { CamposComerciaisFields } from "@/components/orcamento/CamposComerciaisFields";
import { criarOrcamento } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Envio pelo onSubmit (useFormActionSemReset), não por <form action>/formAction: com action o
// React limpa o formulário quando ela termina — inclusive quando volta com erro de validação —
// e tudo que a pessoa digitou e ainda não estava salvo sumia da tela (achado no teste de
// 30/09/2026: modelo novo e Observações apagados depois de um "Liberar" com erro).
export function NovoOrcamentoForm({ representante }: { representante: string }) {
  const [state, onSubmit, pending] = useFormActionSemReset(criarOrcamento, undefined);

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
        <form onSubmit={onSubmit} className="flex flex-col gap-0">
          <CamposComerciaisFields comBuscaCliente defaults={{ representante }} />
          {state?.erro && <div className="anexo-erro mt-4">{state.erro}</div>}
          <div className="mt-6">
            <Button type="submit" disabled={pending}>{pending ? "Enviando…" : "Enviar solicitação"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
