"use client";

import { useState } from "react";
import { Ban } from "lucide-react";
import { useFormActionSemReset } from "@/hooks/use-form-action";
import { cancelarPedido } from "@/app/(app)/aceite/actions";
import { SETOR_AVISO, type SetorAviso } from "@/lib/aceite/cancelamento";
import { Field } from "@/components/form-section";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Cancelar o pedido (só Vendas, motivo livre). Mostra antes quem será avisado e o que Vendas faz no ERP.
// Estado final: não reabre; se o cliente voltar, abre-se outro Aceite.
export function FormCancelarPedido({
  aceiteId,
  avisos,
  avisarPreImpressao,
  temOF,
}: {
  aceiteId: string;
  avisos: { setor: SetorAviso; texto: string }[];
  avisarPreImpressao: boolean;
  temOF: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [state, onSubmit, pending] = useFormActionSemReset(cancelarPedido, undefined);

  if (!aberto) {
    return (
      <div>
        <Button type="button" size="sm" variant="outline" className="gap-1.5 text-bad hover:text-bad" onClick={() => setAberto(true)}>
          <Ban className="h-3.5 w-3.5" /> Cancelar pedido
        </Button>
      </div>
    );
  }

  const marcar = (name: string, texto: string) => (
    <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-foreground">
      <input type="checkbox" name={name} className="h-4 w-4 accent-[var(--good)]" />
      {texto}
    </label>
  );

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-lg border border-bad/40 bg-bad-soft/30 p-3">
      <input type="hidden" name="id" value={aceiteId} />
      <div className="text-sm font-semibold text-bad">Cancelar este pedido</div>
      <p className="text-xs text-muted-foreground">
        O cancelamento é definitivo: o pedido não reabre. Se o cliente voltar, abre-se outro Aceite. O papel e as Ordens de Compra não são
        canceladas pelo sistema: Compras decide caso a caso.
      </p>
      {(avisos.length > 0 || avisarPreImpressao) && (
        <div className="rounded-md border border-border bg-card p-2.5 text-xs">
          <div className="mb-1 font-semibold text-foreground">Serão avisados:</div>
          <ul className="flex list-disc flex-col gap-0.5 pl-4 text-muted-foreground">
            {avisos.map((a) => (
              <li key={a.setor}>
                <b className="text-foreground">{SETOR_AVISO[a.setor].rotulo}</b>: {a.texto}
              </li>
            ))}
            {avisarPreImpressao && (
              <li>
                <b className="text-foreground">Pré-impressão</b>: a OF já estava aberta. Avise por fora (o sistema ainda não tem o setor).
              </li>
            )}
          </ul>
        </div>
      )}
      <Field label="Motivo do cancelamento (obrigatório)">
        <Input name="motivo" required placeholder="Ex.: cliente desistiu do pedido" />
      </Field>
      <div className="flex flex-col gap-1.5">
        <div className="text-sm font-medium text-foreground">No ERP (marque o que você já fez agora):</div>
        {marcar("feitoPedido", "Cancelei o pedido (Aceite) no ERP")}
        {temOF && marcar("feitoOF", "Cancelei a OF no ERP")}
        {temOF && marcar("feitoEnvelope", "Recolhi o envelope da OF e passei à Qualidade")}
        <p className="text-xs text-muted-foreground">O que ficar sem marcar vira pendência de Vendas até você marcar como feito.</p>
      </div>
      {state?.erro && <div className="anexo-erro">{state.erro}</div>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="destructive" disabled={pending}>
          {pending ? "Cancelando…" : "Confirmar o cancelamento"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setAberto(false)}>
          Voltar
        </Button>
      </div>
    </form>
  );
}
