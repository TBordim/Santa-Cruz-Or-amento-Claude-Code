"use client";

import { decidirDiretoriaFaixa, salvarRascunhoDiretoria } from "../actions";
import type { OrcamentoComAnexos } from "@/lib/orcamentos/doc-type";
import type { PrecificacaoTier } from "@/lib/orcamentos/types";
import { fmtPct as fmtPctHelper, paraCampoBR } from "@/lib/orcamentos/motor";
import { LIMITE_CUSTO, LIMITE_MARGEM } from "@/lib/orcamentos/motor";
import { fmtMoney } from "@/lib/orcamentos/constantes";
import { AnexoUpload } from "@/components/anexos/AnexoUpload";
import { FormSection, Field, Row2, ResumoBox } from "@/components/form-section";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function fmtMoneyOrDash(n: number | null | undefined) {
  return n === null || n === undefined ? "—" : fmtMoney(n);
}

function CritRow({ ok, label }: { ok: boolean | null; label: string }) {
  const cor = ok === null ? "bg-muted-foreground/40" : ok ? "bg-good" : "bg-bad";
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`h-2 w-2 shrink-0 rounded-full ${cor}`} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

function TierCard({ doc, tier, idx, total }: { doc: OrcamentoComAnexos; tier: PrecificacaoTier; idx: number; total: number }) {
  const titulo = total > 1 ? `Quantidade: ${tier.quantidade}` : "Precificação";
  const pendente = tier.statusDiretoria === "pendente";

  return (
    <FormSection title={titulo}>
      {!tier.produtoNovo && (
        <ResumoBox
          rows={[
            {
              label: tier.premissasDivergentes.length === 0 ? "Premissas" : "Premissas divergentes",
              value: tier.premissasDivergentes.length === 0 ? "Iguais ao orçamento anterior" : tier.premissasDivergentes.join(", "),
            },
            { label: "Preço anterior", value: fmtMoneyOrDash(tier.precoAnterior) },
            { label: "Preço projetado", value: fmtMoney(tier.precoProjetado) },
            { label: "Variação", value: fmtPctHelper(tier.variacaoPct) },
          ]}
        />
      )}

      <div className="flex flex-col gap-1.5 rounded-lg border border-border p-3">
        <CritRow ok={tier.custoPrimarioPct !== null && tier.custoPrimarioPct <= LIMITE_CUSTO} label={`Custo primário até ${LIMITE_CUSTO}% (atual: ${fmtPctHelper(tier.custoPrimarioPct)})`} />
        <CritRow ok={tier.margemP2Pct !== null && tier.margemP2Pct >= LIMITE_MARGEM} label={`Margem P2 ≥ ${LIMITE_MARGEM}% (atual: ${fmtPctHelper(tier.margemP2Pct)})`} />
        {tier.motivoPendencia && <div className="mt-1 text-xs text-muted-foreground">{tier.motivoPendencia}</div>}
      </div>

      {pendente ? (
        <form action={decidirDiretoriaFaixa} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={doc.id} />
          <input type="hidden" name="idx" value={idx} />
          <Row2>
            <Field label="Preço final" hint={`Sugerido: ${fmtMoney(tier.precoFinalSugerido)}`}>
              <Input name="precoFinal" defaultValue={paraCampoBR(tier.rascunhoPrecoFinal ?? tier.precoFinal ?? tier.precoFinalSugerido)} />
            </Field>
            <Field label="Comentário">
              <Input name="comentario" defaultValue={tier.rascunhoComentario ?? ""} />
            </Field>
          </Row2>
          <div className="flex gap-2">
            <Button type="submit" name="aprovado" value="true">Aprovar</Button>
            <Button type="submit" name="aprovado" value="false" variant="destructive">Solicitar revisão</Button>
            <Button type="submit" formAction={salvarRascunhoDiretoria} formNoValidate variant="ghost">
              Salvar rascunho
            </Button>
          </div>
        </form>
      ) : (
        <ResumoBox
          rows={[
            { label: "Status", value: tier.statusDiretoria === "auto_aprovado" ? "Auto-aprovado" : tier.statusDiretoria },
            { label: "Preço final", value: fmtMoneyOrDash(tier.precoFinal) },
            ...(tier.decididoPor ? [{ label: "Decidido por", value: tier.decididoPor }] : []),
          ]}
        />
      )}
    </FormSection>
  );
}

export function PainelDiretoria({ doc }: { doc: OrcamentoComAnexos }) {
  const tiers = (doc.precificacao as unknown as PrecificacaoTier[] | null) ?? [];

  return (
    <>
      {doc.conflitoClassificacao && (
        <div className="mb-4 rounded-lg border border-bad/30 bg-bad-soft p-3 text-sm text-bad">
          Classificado como &quot;repetição sem alteração&quot;, mas as premissas mudaram — confira com atenção.
        </div>
      )}
      <ResumoBox
        rows={[
          { label: "Cliente", value: doc.cliente },
          { label: "Produto", value: doc.produtoDescricao },
          { label: "Nº de SOPP", value: doc.numeroSequencial || "—" },
        ]}
      />

      {tiers.map((t, i) => (
        <TierCard key={i} doc={doc} tier={t} idx={i} total={tiers.length} />
      ))}

      <div className="mt-2 flex flex-col gap-4">
        <AnexoUpload orcamentoId={doc.id} tipo="ARTE" anexos={doc.anexos.filter((a) => a.tipo === "ARTE")} somenteLeitura />
        <AnexoUpload orcamentoId={doc.id} tipo="ENGENHARIA" anexos={doc.anexos.filter((a) => a.tipo === "ENGENHARIA")} somenteLeitura />
      </div>
    </>
  );
}
