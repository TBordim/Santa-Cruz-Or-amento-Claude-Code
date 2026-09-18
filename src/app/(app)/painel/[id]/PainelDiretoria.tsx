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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function fmtMoneyOrDash(n: number | null | undefined) {
  return n === null || n === undefined ? "—" : fmtMoney(n);
}

function fmtQtdOrDash(q: string | null | undefined) {
  return q && q.trim() ? q : "—";
}

// Resumo comparativo pra Diretoria decidir rápido: todo campo de valor que o Arquivo legado
// guarda (preço, custo primário, margem, quantidade) lado a lado com o que está sendo pedido
// agora. "Anterior" já vem resolvido (buscarOrcamentoAnterior, em legado.ts) como o registro
// mais recente entre Histórico (orçamento aprovado) e Arquivo legado — nunca os dois.
function ComparacaoAnteriorAtual({ tier }: { tier: PrecificacaoTier }) {
  const linhas = [
    { label: "Preço", anterior: fmtMoneyOrDash(tier.precoAnterior), atual: fmtMoney(tier.precoProjetado) },
    { label: "Custo primário (%)", anterior: fmtPctHelper(tier.custoPrimarioPctAnterior), atual: fmtPctHelper(tier.custoPrimarioPct) },
    { label: "Margem P2 (%)", anterior: fmtPctHelper(tier.margemP2PctAnterior), atual: fmtPctHelper(tier.margemP2Pct) },
    { label: "Quantidade", anterior: fmtQtdOrDash(tier.quantidadeAnterior), atual: fmtQtdOrDash(tier.quantidade) },
  ];
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="whitespace-normal">Comparação</TableHead>
            <TableHead className="whitespace-normal text-right">Anterior</TableHead>
            <TableHead className="whitespace-normal text-right">Atual</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.map((l) => (
            <TableRow key={l.label}>
              <TableCell className="whitespace-normal text-muted-foreground">{l.label}</TableCell>
              <TableCell className="text-right font-mono">{l.anterior}</TableCell>
              <TableCell className="text-right font-mono font-semibold text-foreground">{l.atual}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {tier.variacaoPct !== null && (
        <div className="border-t border-border bg-muted/30 px-2 py-1.5 text-xs text-muted-foreground">
          Variação de preço: <span className="font-semibold text-foreground">{fmtPctHelper(tier.variacaoPct)}</span>
        </div>
      )}
      {tier.premissasDivergentes.length > 0 && (
        <div className="border-t border-border bg-warn-soft px-2 py-1.5 text-xs text-warn">
          Também mudou: {tier.premissasDivergentes.join(", ")}
        </div>
      )}
    </div>
  );
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
      {!tier.produtoNovo && <ComparacaoAnteriorAtual tier={tier} />}

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
