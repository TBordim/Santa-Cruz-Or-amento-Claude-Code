"use client";

import { useState } from "react";
import { useFormActionSemReset } from "@/hooks/use-form-action";
import { abrirNegociacao, encerrarNegociacao } from "@/app/(app)/atendimento/actions";
import { responderNegociacao } from "@/app/(app)/pcp/actions";
import { RESULTADOS_NEGOCIACAO, STATUS_NEGOCIACAO_LABEL, resultadoLabel } from "@/lib/aceite/negociacao";
import { fmtDia } from "@/lib/aceite/constantes";
import { fmtDateTime } from "@/lib/orcamentos/constantes";
import { FormSection, Field, Row2 } from "@/components/form-section";
import { Input } from "@/components/ui/input";
import { Escolha } from "./Escolha";
import { Button } from "@/components/ui/button";

type Negociacao = {
  id: string;
  status: string;
  dataAtual: Date | null;
  dataPedida: Date | null;
  motivo: string | null;
  abertaPor: string;
  abertaEm: Date;
  resultado: string | null;
  dataProposta: Date | null;
  respostaObs: string | null;
  respondidaPor: string | null;
  respondidaEm: Date | null;
  encerradaPor: string | null;
  encerradaEm: Date | null;
  encerradaObs: string | null;
};

// Negociação de data de entrega (08/10/2026): o cliente não aceita a data, o Atendimento registra a
// data que ele quer, o PCP reanalisa e responde, o Atendimento informa o cliente. Cada rodada fica
// no histórico. Cada setor só vê o formulário da sua vez.
export function BlocoNegociacao({
  aceiteId,
  loteId,
  etapa,
  negociacoes,
  podeAtendimento,
  podePcp,
}: {
  aceiteId: string;
  loteId?: string | null;
  etapa: string;
  negociacoes: Negociacao[];
  podeAtendimento: boolean;
  podePcp: boolean;
}) {
  const aberta = negociacoes.find((n) => n.status !== "ENCERRADA");
  const podeAbrir = podeAtendimento && !aberta && (etapa === "ATENDIMENTO" || etapa === "ENTREGA");

  return (
    <FormSection title="Negociação de data">
      {negociacoes.length === 0 && !podeAbrir && <p className="text-sm text-muted-foreground">Nenhuma negociação de data.</p>}
      {negociacoes.map((n, i) => (
        <div key={n.id} className={`flex flex-col gap-2 rounded-lg border p-3 text-sm ${n.status === "ENCERRADA" ? "border-border" : "border-warn/40 bg-warn-soft/40"}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <b className="text-foreground">Rodada {negociacoes.length - i}</b>
            <span className="text-xs text-muted-foreground">{STATUS_NEGOCIACAO_LABEL[n.status]}</span>
          </div>
          <p className="text-muted-foreground">
            <b className="text-foreground">Cliente pediu</b> {n.dataPedida ? fmtDia(n.dataPedida) : "outra data"} (era {fmtDia(n.dataAtual)})
            {n.motivo ? ` · ${n.motivo}` : ""} <span className="text-xs">— {n.abertaPor}, {fmtDateTime(n.abertaEm)}</span>
          </p>
          {n.respondidaEm && (
            <p className="text-muted-foreground">
              <b className="text-foreground">PCP:</b> {resultadoLabel(n.resultado)}
              {n.dataProposta ? `: ${fmtDia(n.dataProposta)}` : ""}
              {n.respostaObs ? ` · ${n.respostaObs}` : ""} <span className="text-xs">— {n.respondidaPor}, {fmtDateTime(n.respondidaEm)}</span>
            </p>
          )}
          {n.encerradaEm && (
            <p className="text-muted-foreground">
              <b className="text-foreground">Atendimento:</b> {n.encerradaObs} <span className="text-xs">— {n.encerradaPor}, {fmtDateTime(n.encerradaEm)}</span>
            </p>
          )}
          {n.status === "AGUARDANDO_PCP" && podePcp && <ResponderPcp negociacaoId={n.id} temDataPedida={!!n.dataPedida} />}
          {n.status === "AGUARDANDO_ATENDIMENTO" && podeAtendimento && etapa === "ATENDIMENTO" && (
            <p className="text-xs text-foreground">Envie a data acima ao cliente em &quot;Informar o cliente&quot;; isso encerra esta negociação.</p>
          )}
          {n.status === "AGUARDANDO_ATENDIMENTO" && podeAtendimento && etapa === "ENTREGA" && <EncerrarAtendimento negociacaoId={n.id} />}
        </div>
      ))}
      {podeAbrir && <AbrirNegociacao aceiteId={aceiteId} loteId={loteId} />}
    </FormSection>
  );
}

function AbrirNegociacao({ aceiteId, loteId }: { aceiteId: string; loteId?: string | null }) {
  const [aberto, setAberto] = useState(false);
  const [state, onSubmit, pending] = useFormActionSemReset(abrirNegociacao, undefined);
  if (!aberto) {
    return (
      <div className="flex flex-col gap-1.5">
        {state?.ok && <span className="text-sm text-good">{state.ok}</span>}
        <div>
          <Button type="button" size="sm" variant="outline" onClick={() => setAberto(true)}>
            Cliente não aceitou a data
          </Button>
        </div>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <input type="hidden" name="id" value={aceiteId} />
      <input type="hidden" name="loteId" value={loteId ?? ""} />
      <Row2 compacto>
        <Field label="Data que o cliente quer">
          <Input type="date" name="dataPedida" />
        </Field>
        <Field label="O que o cliente disse">
          <Input name="motivo" placeholder="Ex.: precisa para a campanha do dia 15" />
        </Field>
      </Row2>
      {state?.erro && <div className="anexo-erro">{state.erro}</div>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Enviando…" : "Pedir ao PCP para reanalisar"}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setAberto(false)}>Cancelar</Button>
      </div>
    </form>
  );
}

function ResponderPcp({ negociacaoId, temDataPedida }: { negociacaoId: string; temDataPedida: boolean }) {
  const [state, onSubmit, pending] = useFormActionSemReset(responderNegociacao, undefined);
  const [resultado, setResultado] = useState<string>("");
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 border-t border-dashed border-line-strong pt-3">
      <input type="hidden" name="negociacaoId" value={negociacaoId} />
      <input type="hidden" name="resultado" value={resultado} />
      <Escolha
        rotulo="Resposta do PCP"
        valor={resultado}
        onChange={setResultado}
        opcoes={RESULTADOS_NEGOCIACAO.filter((r) => temDataPedida || r.key !== "ATENDE").map((r) => ({
          key: r.key,
          label: r.label,
          tom: r.key === "MANTIDA" ? "bad" : r.key === "ATENDE" ? "good" : "warn",
        }))}
      />
      {resultado === "OUTRA_DATA" && (
        <Field label="Data possível">
          <Input type="date" name="dataProposta" className="max-w-48" />
        </Field>
      )}
      <Field label={resultado === "MANTIDA" ? "Por que não dá para mudar (vai para o cliente)" : "Observação (opcional)"}>
        <Input name="respostaObs" />
      </Field>
      {state?.erro && <div className="anexo-erro">{state.erro}</div>}
      {!state?.erro && state?.ok && <div className="text-sm text-good">{state.ok}</div>}
      <div>
        <Button type="submit" size="sm" disabled={pending || !resultado}>{pending ? "Enviando…" : "Responder ao Atendimento"}</Button>
      </div>
    </form>
  );
}

function EncerrarAtendimento({ negociacaoId }: { negociacaoId: string }) {
  const [state, onSubmit, pending] = useFormActionSemReset(encerrarNegociacao, undefined);
  const [aceitou, setAceitou] = useState<string>("");
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 border-t border-dashed border-line-strong pt-3">
      <input type="hidden" name="negociacaoId" value={negociacaoId} />
      <input type="hidden" name="aceitou" value={aceitou} />
      <span className="text-sm text-foreground">Informei o cliente. Ele aceitou?</span>
      <Escolha
        rotulo="O cliente aceitou?"
        valor={aceitou}
        onChange={setAceitou}
        opcoes={[
          { key: "sim", label: "Aceitou", tom: "good" },
          { key: "nao", label: "Não aceitou (abrir outra rodada)", tom: "bad" },
        ]}
      />
      <Field label="Observação (opcional)">
        <Input name="obs" />
      </Field>
      {state?.erro && <div className="anexo-erro">{state.erro}</div>}
      {!state?.erro && state?.ok && <div className="text-sm text-good">{state.ok}</div>}
      <div>
        <Button type="submit" size="sm" disabled={pending || !aceitou}>{pending ? "Salvando…" : "Encerrar negociação"}</Button>
      </div>
    </form>
  );
}
