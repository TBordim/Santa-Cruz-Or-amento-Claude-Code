"use client";

import { useFormActionSemReset } from "@/hooks/use-form-action";
import { CamposComerciaisFields } from "@/components/orcamento/CamposComerciaisFields";
import { criarOrcamento } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

// Envio pelo onSubmit (useFormActionSemReset), não por <form action>/formAction: com action o
// React limpa o formulário quando ela termina — inclusive quando volta com erro de validação —
// e tudo que a pessoa digitou e ainda não estava salvo sumia da tela (achado no teste de
// 30/09/2026: modelo novo e Observações apagados depois de um "Liberar" com erro).
export function NovoOrcamentoForm({ representante, soRepresentante }: { representante: string; soRepresentante: boolean }) {
  const [state, onSubmit, pending] = useFormActionSemReset(criarOrcamento, undefined);

  if (state?.sucesso) {
    return (
      <Card className="max-w-2xl">
        <CardContent>
          <h3 className="mb-1.5 text-base font-semibold text-foreground">Solicitação enviada</h3>
          <p className="text-sm text-muted-foreground">Sua solicitação de orçamento foi registrada. A equipe da Santa Cruz vai dar seguimento.</p>
          {state.anexos && state.anexos.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 text-sm font-medium text-foreground">
                {state.anexos.length === 1 ? "Arquivo anexado" : "Arquivos anexados"}
              </div>
              <div className="flex flex-col gap-2">
                {state.anexos.map((a) => (
                  <div key={a.url} className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 p-2.5">
                    {a.mime.startsWith("image/") ? (
                      // eslint-disable-next-line @next/next/no-img-element -- URL do Blob, não é asset local otimizável
                      <img src={a.url} alt="" className="h-12 w-12 shrink-0 rounded-md border border-border object-cover" />
                    ) : (
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-border bg-background">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">{a.nome}</span>
                    <Button asChild variant="outline" size="sm">
                      <a href={a.url} target="_blank" rel="noreferrer">Abrir</a>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {state.aviso && <div className="anexo-erro mt-3">{state.aviso}</div>}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-[1000px]">
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-0">
          <CamposComerciaisFields comBuscaCliente codigoOpcional={soRepresentante} defaults={{ representante }} />
          {state?.erro && <div className="anexo-erro mt-4">{state.erro}</div>}
          <div className="mt-6">
            <Button type="submit" disabled={pending}>{pending ? "Enviando…" : "Enviar solicitação"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
