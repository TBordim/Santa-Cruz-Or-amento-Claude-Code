"use client";

import { registrarDesfecho } from "../actions";
import type { OrcamentoComAnexos } from "@/lib/orcamentos/doc-type";
import type { PrecificacaoTier } from "@/lib/orcamentos/types";
import { fmtMoney, fmtDateTime, DESFECHOS } from "@/lib/orcamentos/constantes";
import { FormSection, Field, ResumoBox, DiretrizBlock } from "@/components/form-section";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function FormFinalizado({ doc }: { doc: OrcamentoComAnexos }) {
  const tiers = (doc.precificacao as unknown as PrecificacaoTier[] | null) ?? [];
  const produtoSemCadastro = !doc.codInterno;

  return (
    <>
      <ResumoBox
        rows={[
          { label: "Cliente", value: doc.cliente },
          { label: "Produto", value: doc.produtoDescricao },
          { label: "Nº de Orçamento", value: doc.numeroOrcamento || "—" },
        ]}
      />

      <div className="mt-4">
        <DiretrizBlock>
          {produtoSemCadastro
            ? "Registre o retorno do cliente. Se for positivo, o card vai para a etapa 7 (Cadastro de Produto), porque este produto ainda não tem Nº de Cadastro; os demais desfechos vão direto para o Histórico."
            : "Registre o retorno do cliente. Com o desfecho registrado, o card vai para o Histórico."}
        </DiretrizBlock>
      </div>

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

    </>
  );
}
