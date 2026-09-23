"use client";

import { useActionState } from "react";
import { registrarDesfecho, salvarCodigoProduto } from "../actions";
import type { OrcamentoComAnexos } from "@/lib/orcamentos/doc-type";
import type { PrecificacaoTier } from "@/lib/orcamentos/types";
import { fmtMoney, fmtDateTime, DESFECHOS } from "@/lib/orcamentos/constantes";
import { AnexoUpload } from "@/components/anexos/AnexoUpload";
import { FormSection, Field, ResumoBox } from "@/components/form-section";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CodigoInternoInput } from "@/components/orcamento/CodigoInternoInput";
import { useSalvoToast } from "@/hooks/use-salvo-toast";

// Pendência de Código de Produto Interno — só aparece quando o cliente aprovou (desfecho
// POSITIVO) e o produto ainda não tem código (produto novo não gera mais na Engenharia, ver
// FormEngenharia). Enquanto pendente, o card fica retido no Painel (não entra no Histórico) —
// ver PainelBoard/historico/page.tsx. `podeGerar` vem do Drawer (checa área ENGENHARIA de
// quem está logado, independente de quem pode editar esta etapa).
function PendenciaCodigoProduto({ id, podeGerar }: { id: string; podeGerar: boolean }) {
  const [state, action, pending] = useActionState(salvarCodigoProduto, undefined);
  useSalvoToast(pending, state?.erro, "Código de produto salvo — orçamento vai para o Histórico.");

  return (
    <div className="rounded-lg border border-warn/30 bg-warn-soft p-3">
      <div className="text-sm text-foreground">
        <strong>Pendência: gerar Código de Produto Interno.</strong> O cliente aprovou — este orçamento só entra no Histórico depois que o código for lançado.
      </div>
      {podeGerar ? (
        <form action={action} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <input type="hidden" name="id" value={id} />
          <Field label="Código de Produto Interno">
            <CodigoInternoInput name="codInterno" />
          </Field>
          <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar código"}</Button>
        </form>
      ) : (
        <div className="mt-2 text-sm text-warn">Aguardando a Engenharia gerar o código.</div>
      )}
      {state?.erro && <div className="anexo-erro mt-2">{state.erro}</div>}
    </div>
  );
}

export function FormFinalizado({ doc, podeGerarCodigo }: { doc: OrcamentoComAnexos; podeGerarCodigo: boolean }) {
  const tiers = (doc.precificacao as unknown as PrecificacaoTier[] | null) ?? [];
  const pendenteCodigo = doc.desfecho === "POSITIVO" && !doc.codInterno;

  return (
    <>
      <ResumoBox
        rows={[
          { label: "Cliente", value: doc.cliente },
          { label: "Produto", value: doc.produtoDescricao },
          { label: "Nº de Orçamento", value: doc.numeroOrcamento || "—" },
        ]}
      />

      {pendenteCodigo && (
        <div className="mt-4">
          <PendenciaCodigoProduto id={doc.id} podeGerar={podeGerarCodigo} />
        </div>
      )}

      <div className="mt-4">
        <FormSection title="Faixas de preço">
          <div className="flex flex-col gap-1.5">
            {tiers.map((t, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t.quantidade}</span>
                <span className="font-mono font-semibold">{fmtMoney(t.precoFinal ?? t.precoFinalSugerido)}</span>
              </div>
            ))}
          </div>
        </FormSection>
      </div>

      <div className="mt-4">
        <ResumoBox
          rows={[
            { label: "Oferta enviada em", value: fmtDateTime(doc.finalizadoEm) },
            ...(doc.desfechoEm ? [{ label: "Desfecho registrado em", value: fmtDateTime(doc.desfechoEm) }] : []),
          ]}
        />
      </div>

      <form action={registrarDesfecho} className="mt-4">
        <input type="hidden" name="id" value={doc.id} />
        <FormSection title="Retorno do cliente">
          <Field label="Desfecho">
            <Select name="desfecho" defaultValue={doc.desfecho ?? "AGUARDANDO"}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DESFECHOS.map((d) => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Motivo (opcional)">
            <Input name="motivo" defaultValue={doc.desfechoMotivo ?? ""} />
          </Field>
        </FormSection>
        <div className="mt-4">
          <Button type="submit">Registrar desfecho</Button>
        </div>
      </form>

      <div className="mt-4 flex flex-col gap-4">
        <AnexoUpload orcamentoId={doc.id} tipo="ARTE" anexos={doc.anexos.filter((a) => a.tipo === "ARTE")} somenteLeitura />
        <AnexoUpload orcamentoId={doc.id} tipo="ENGENHARIA" anexos={doc.anexos.filter((a) => a.tipo === "ENGENHARIA")} somenteLeitura />
      </div>
    </>
  );
}
