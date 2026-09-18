"use client";

import { decidirDiretoriaFaixa, salvarRascunhoDiretoria } from "../actions";
import type { OrcamentoComAnexos } from "@/lib/orcamentos/doc-type";
import type { PrecificacaoTier } from "@/lib/orcamentos/types";
import type { OrcamentoAnteriorRef, LegadoRef } from "@/lib/orcamentos/tiers";
import { fmtPct as fmtPctHelper, paraCampoBR, avaliarDiscrepanciaLegado, parseQuantidade } from "@/lib/orcamentos/motor";
import { LIMITE_CUSTO, LIMITE_MARGEM, LIMITE_DISCREPANCIA_LEGADO } from "@/lib/orcamentos/motor";
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

function primeiro<T>(...vals: (T | null | undefined)[]): T | null {
  for (const v of vals) if (v !== null && v !== undefined && v !== ("" as unknown as T)) return v;
  return null;
}

// Resumo comparativo pra Diretoria decidir rápido — sempre aparece, mesmo sem nada pra
// comparar (o HTML original também mostra o quadro com "sem dado anterior" em cada campo, em
// vez de esconder o quadro inteiro; pedido do Thiago em 18/09/2026 depois de comparar com o
// sistema antigo). O "anterior" de cada campo, independentemente: busca AO VIVO por
// clienteChave+produtoChave OU código interno (anteriorAoVivo), senão o Arquivo legado
// (legadoAoVivo), senão o valor congelado de quando este card chegou na Diretoria — nessa
// ordem, o primeiro que existir.
function ComparacaoAnteriorAtual({
  tier,
  anterior,
}: {
  tier: PrecificacaoTier;
  anterior: { precoFinal: number | null; custoPrimarioPct: number | null; margemP2Pct: number | null; quantidade: string | null };
}) {
  const discrepancia = avaliarDiscrepanciaLegado([
    { label: "Custo primário (%)", anterior: anterior.custoPrimarioPct, atual: tier.custoPrimarioPct },
    { label: "Quantidade", anterior: parseQuantidade(anterior.quantidade), atual: parseQuantidade(tier.quantidade) },
    { label: "Margem P2 (%)", anterior: anterior.margemP2Pct, atual: tier.margemP2Pct },
    { label: "Preço", anterior: anterior.precoFinal, atual: tier.precoProjetado },
  ]);

  const linhas = [
    { label: "Preço", anterior: fmtMoneyOrDash(anterior.precoFinal), atual: fmtMoney(tier.precoProjetado) },
    { label: "Custo primário (%)", anterior: fmtPctHelper(anterior.custoPrimarioPct), atual: fmtPctHelper(tier.custoPrimarioPct) },
    { label: "Margem P2 (%)", anterior: fmtPctHelper(anterior.margemP2Pct), atual: fmtPctHelper(tier.margemP2Pct) },
    { label: "Quantidade", anterior: fmtQtdOrDash(anterior.quantidade), atual: fmtQtdOrDash(tier.quantidade) },
  ];
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
        Os 4 campos que pesam na decisão de preço. Em cinza, o orçamento anterior; em destaque, <strong className="text-foreground">o valor atual</strong>.
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[38%] whitespace-normal">Comparação</TableHead>
            <TableHead className="w-[31%] whitespace-normal text-right">Anterior</TableHead>
            <TableHead className="w-[31%] whitespace-normal text-right">Atual</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.map((l) => {
            const estourou = discrepancia.campos.includes(l.label);
            return (
              <TableRow key={l.label} className={estourou ? "bg-warn-soft hover:bg-warn-soft" : undefined}>
                <TableCell className="whitespace-normal text-muted-foreground">{l.label}</TableCell>
                <TableCell className="whitespace-normal text-right font-mono text-muted-foreground">
                  {l.anterior === "—" ? <span className="italic">sem dado</span> : l.anterior}
                </TableCell>
                <TableCell className="whitespace-normal text-right font-mono font-semibold text-foreground">{l.atual}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {discrepancia.bloqueia && (
        <div className="border-t border-border bg-warn-soft px-2 py-1.5 text-xs text-warn">
          Discrepância acima de {String(LIMITE_DISCREPANCIA_LEGADO).replace(".", ",")}% destacada acima.
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

function TierCard({
  doc,
  tier,
  idx,
  total,
  anteriorAoVivo,
  legadoAoVivo,
}: {
  doc: OrcamentoComAnexos;
  tier: PrecificacaoTier;
  idx: number;
  total: number;
  anteriorAoVivo: OrcamentoAnteriorRef | null;
  legadoAoVivo: LegadoRef | null;
}) {
  const titulo = total > 1 ? `Quantidade: ${tier.quantidade}` : "Precificação";
  const pendente = tier.statusDiretoria === "pendente";

  // Cada campo resolve seu próprio "anterior", independente dos outros — na ordem: busca ao
  // vivo por cliente+produto/código interno, senão Arquivo legado, senão o valor congelado de
  // quando este card chegou na Diretoria. O quadro sempre aparece (mesmo com tudo "sem dado
  // anterior"), igual ao sistema antigo.
  const anterior = {
    precoFinal: primeiro(anteriorAoVivo?.precoFinal, legadoAoVivo?.precoAtual, tier.precoAnterior),
    custoPrimarioPct: primeiro(anteriorAoVivo?.custoPrimarioPct, legadoAoVivo?.custoPrimarioPct, tier.custoPrimarioPctAnterior),
    margemP2Pct: primeiro(anteriorAoVivo?.margemP2Pct, legadoAoVivo?.margemP2Pct, tier.margemP2PctAnterior),
    quantidade: primeiro(anteriorAoVivo?.quantidade, legadoAoVivo?.quantidade, tier.quantidadeAnterior),
  };

  return (
    <FormSection title={titulo}>
      <ComparacaoAnteriorAtual tier={tier} anterior={anterior} />

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

export function PainelDiretoria({
  doc,
  anteriorAoVivo,
  legadoAoVivo,
}: {
  doc: OrcamentoComAnexos;
  anteriorAoVivo: OrcamentoAnteriorRef | null;
  legadoAoVivo: LegadoRef | null;
}) {
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
        <TierCard key={i} doc={doc} tier={t} idx={i} total={tiers.length} anteriorAoVivo={anteriorAoVivo} legadoAoVivo={legadoAoVivo} />
      ))}

      <div className="mt-2 flex flex-col gap-4">
        <AnexoUpload orcamentoId={doc.id} tipo="ARTE" anexos={doc.anexos.filter((a) => a.tipo === "ARTE")} somenteLeitura />
        <AnexoUpload orcamentoId={doc.id} tipo="ENGENHARIA" anexos={doc.anexos.filter((a) => a.tipo === "ENGENHARIA")} somenteLeitura />
      </div>
    </>
  );
}
