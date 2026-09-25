"use client";

import { decidirDiretoriaFaixa, salvarRascunhoDiretoria, liberarDiretoriaResolvida, ajustarPrecoFinalDiretoria } from "../actions";
import type { OrcamentoComAnexos } from "@/lib/orcamentos/doc-type";
import type { PrecificacaoTier } from "@/lib/orcamentos/types";
import type { OrcamentoAnteriorRef } from "@/lib/orcamentos/tiers";
import { fmtPct as fmtPctHelper, paraCampoBR, avaliarDiscrepanciaLegado, parseQuantidade } from "@/lib/orcamentos/motor";
import { LIMITE_CUSTO, LIMITE_MARGEM, LIMITE_DISCREPANCIA_LEGADO } from "@/lib/orcamentos/motor";
import { fmtMoney, fmtDateTime } from "@/lib/orcamentos/constantes";
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
// clienteChave+código interno (anteriorAoVivo, já cobre Histórico e Arquivo legado juntos —
// ver buscarOrcamentoAnterior em legado.ts), senão o valor congelado de quando este card
// chegou na Diretoria.
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
}: {
  doc: OrcamentoComAnexos;
  tier: PrecificacaoTier;
  idx: number;
  total: number;
  anteriorAoVivo: OrcamentoAnteriorRef | null;
}) {
  const titulo = total > 1 ? `Quantidade: ${tier.quantidade}` : "Precificação";
  const pendente = tier.statusDiretoria === "pendente";

  // Cada campo resolve seu próprio "anterior", independente dos outros — na ordem: busca ao
  // vivo por cliente+código interno, senão o valor congelado de quando este card chegou na
  // Diretoria. O quadro sempre aparece (mesmo com tudo "sem dado anterior"), igual ao sistema
  // antigo.
  const anterior = {
    precoFinal: primeiro(anteriorAoVivo?.precoFinal, tier.precoAnterior),
    custoPrimarioPct: primeiro(anteriorAoVivo?.custoPrimarioPct, tier.custoPrimarioPctAnterior),
    margemP2Pct: primeiro(anteriorAoVivo?.margemP2Pct, tier.margemP2PctAnterior),
    quantidade: primeiro(anteriorAoVivo?.quantidade, tier.quantidadeAnterior),
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
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button type="submit" name="aprovado" value="true">Aprovar</Button>
            <Button type="submit" name="aprovado" value="false" variant="destructive">Solicitar revisão</Button>
            <Button type="submit" formAction={salvarRascunhoDiretoria} formNoValidate variant="ghost" className="col-span-2 sm:col-auto">
              Salvar rascunho
            </Button>
          </div>
        </form>
      ) : (
        <>
          <ResumoBox
            rows={[
              { label: "Status", value: tier.statusDiretoria === "auto_aprovado" ? "Auto-aprovado" : tier.statusDiretoria },
              ...(tier.decididoPor ? [{ label: "Decidido por", value: tier.decididoPor }] : []),
              ...(tier.precoAjustadoPor
                ? [{ label: "Preço ajustado por", value: `${tier.precoAjustadoPor}${tier.precoAjustadoEm ? ` · ${fmtDateTime(new Date(tier.precoAjustadoEm))}` : ""}` }]
                : []),
            ]}
          />
          {/* Preço continua editável mesmo depois de decidido — pode ter motivo pra mudar
              (renegociação com o cliente, por exemplo) mesmo com a faixa já aprovada. Não reabre
              a decisão em si (aprovar/pedir revisão), só o número. */}
          <form action={ajustarPrecoFinalDiretoria} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="id" value={doc.id} />
            <input type="hidden" name="idx" value={idx} />
            <div className="min-w-[160px] flex-1">
              <Field label="Preço final">
                <Input name="precoFinal" defaultValue={paraCampoBR(tier.precoFinal)} />
              </Field>
            </div>
            <Button type="submit" variant="outline">Salvar novo preço</Button>
          </form>
        </>
      )}
    </FormSection>
  );
}

export function PainelDiretoria({
  doc,
  anteriorAoVivo,
}: {
  doc: OrcamentoComAnexos;
  anteriorAoVivo: OrcamentoAnteriorRef | null;
}) {
  const tiers = (doc.precificacao as unknown as PrecificacaoTier[] | null) ?? [];
  // Card que voltou pra Diretoria (via "Voltar etapa" a partir do Envio de Oferta) já com tudo
  // decidido — nenhuma faixa pendente sobra pra abrir o formulário de decisão, então sem este
  // botão não haveria nenhum jeito de avançar de novo. Ver liberarDiretoriaResolvida em actions.ts.
  const tudoResolvido = tiers.length > 0 && tiers.every((t) => t.statusDiretoria !== "pendente");

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
        <TierCard key={i} doc={doc} tier={t} idx={i} total={tiers.length} anteriorAoVivo={anteriorAoVivo} />
      ))}

      {tudoResolvido && (
        <form action={liberarDiretoriaResolvida} className="mt-2 rounded-lg border border-good/30 bg-good-soft p-3">
          <input type="hidden" name="id" value={doc.id} />
          <div className="mb-2 text-sm text-foreground">Todas as faixas já foram decididas — falta só liberar para o Envio de Oferta.</div>
          <Button type="submit">Liberar para Envio de Oferta</Button>
        </form>
      )}
    </>
  );
}
