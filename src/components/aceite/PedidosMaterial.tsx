"use client";

import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { useFormActionSemReset } from "@/hooks/use-form-action";
import { criarPedidoMaterial, cancelarPedidoMaterial, atualizarPedidoMaterial, registrarRecebimento, registrarRecebimentoSobra } from "@/app/(app)/compras/actions";
import {
  TIPOS_MATERIAL,
  STATUS_PM,
  PILL_STYLE,
  statusPMInfo,
  tipoMaterialLabel,
  fmtDia,
  fmtQuantidade,
  paraInputData,
  lerQuantidade,
} from "@/lib/aceite/constantes";
import { fmtDateTime } from "@/lib/orcamentos/constantes";
import type { PMTela } from "@/lib/aceite/dados";
import { FormSection, Field, Row2 } from "@/components/form-section";
import { Input } from "@/components/ui/input";
import { Escolha } from "./Escolha";
import { pesoKg, sobraDoMinimo, quantidadeComprada } from "@/lib/aceite/papel-calculo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Pedidos de Material (PM) de um Aceite. Vendas emite o PM do papel que falta; Compras lança o que
// o fornecedor respondeu (prazo, quantidade, pedido mínimo e sobra). Toda mudança fica no histórico
// do PM e, depois que a data de chegada foi definida, acende o alerta pro PCP e Vendas.
export function PedidosMaterial({
  aceiteId,
  pms,
  podeEmitir,
  podeCompras,
  podeCancelar,
  nota,
  papeis = [],
}: {
  aceiteId: string;
  pms: PMTela[];
  podeEmitir: boolean;
  podeCompras: boolean;
  podeCancelar: boolean;
  nota?: string;
  // Papéis do Aceite: o PM escolhe a qual se refere e já nasce preenchido com ele.
  papeis?: Papel[];
}) {
  return (
    <FormSection title="Pedidos de Material (PM)">
      {nota && <p className="text-xs text-muted-foreground">{nota}</p>}
      {pms.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum PM emitido para este Aceite.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {pms.map((p) => (
            <CartaoPM key={p.id} pm={p} podeCompras={podeCompras} podeCancelar={podeCancelar} />
          ))}
        </div>
      )}
      {podeEmitir && <NovoPM aceiteId={aceiteId} papeis={papeis} />}
    </FormSection>
  );
}

export function CartaoPM({ pm, podeCompras, podeCancelar, cabecalho }: { pm: PMTela; podeCompras: boolean; podeCancelar: boolean; cabecalho?: React.ReactNode }) {
  const [painel, setPainel] = useState<"receber" | "sobra" | "atualizar" | null>(null);
  const [historico, setHistorico] = useState(false);
  const info = statusPMInfo(pm.status);
  const alertaAberto = !!pm.alertaEm && (!pm.alertaVistoEm || new Date(pm.alertaVistoEm) < new Date(pm.alertaEm));
  const ativo = pm.status !== "CANCELADO";
  const recebido = pm.quantidadeRecebida ?? 0;
  const saldo = Math.max(0, (pm.quantidade ?? 0) - recebido);
  const parcial = recebido > 0 && pm.status !== "RECEBIDO";
  const aReceber = ativo && pm.status !== "RECEBIDO";
  const sobraRecebida = pm.sobraRecebida ?? 0;
  const saldoSobra = Math.max(0, (pm.sobraPrevista ?? 0) - sobraRecebida);
  const alternar = (x: "receber" | "sobra" | "atualizar") => setPainel((v) => (v === x ? null : x));

  return (
    <div className={`rounded-lg border bg-card p-3 text-sm ${alertaAberto ? "border-bad/40" : "border-border"} ${ativo ? "" : "opacity-60"}`}>
      {cabecalho}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs font-semibold text-muted-foreground">PM {pm.numero}</span>
        <span className="font-medium text-foreground">
          {tipoMaterialLabel(pm.material)}: {pm.descricao}
        </span>
        <Badge className={`rounded-full border-0 font-mono text-[10.5px] font-bold ${PILL_STYLE[info.pill]}`}>{info.label}</Badge>
        {parcial && <Badge className={`rounded-full border-0 font-mono text-[10.5px] font-bold ${PILL_STYLE.warn}`}>Recebido parcial</Badge>}
        {alertaAberto && (
          <Badge className={`gap-1 rounded-full border-0 font-mono text-[10.5px] font-bold ${PILL_STYLE.bad}`}>
            <TriangleAlert className="h-3 w-3" /> Mudança do fornecedor
          </Badge>
        )}
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
        <span>
          Quantidade: <b className="text-foreground">{fmtQuantidade(pm.quantidade, pm.unidade)}</b>
          {pm.pesoKg !== null && ` (${fmtQuantidade(pm.pesoKg, "kg")})`}
        </span>
        {pm.status === "RECEBIDO" ? (
          <span>Recebido em: <b className="text-foreground">{fmtDia(pm.recebidoEm)}</b></span>
        ) : (
          <span>{parcial ? "Previsão do saldo" : "Prazo"}: <b className="text-foreground">{fmtDia(pm.prazoPrevisto)}</b></span>
        )}
        <span>Fornecedor: <b className="text-foreground">{pm.fornecedor || "—"}</b></span>
        <span>Pedido por: {pm.solicitadoPor}</span>
        <span>Código: {pm.codigoMaterial || "—"}</span>
        {(pm.formato || pm.gramatura) && (
          <span>
            {pm.formato || "—"}
            {pm.gramatura ? ` · ${pm.gramatura} g/m²` : ""}
          </span>
        )}
        <span>Formato mínimo: {pm.formatoMinimo || "—"}</span>
        <span>Entrega desejada: {pm.entregaDesejada || "—"}</span>
        <span>SC {pm.numeroSC || "—"} · OC {pm.numeroOC || "—"}</span>
        {(pm.minimoFornecedor !== null || pm.sobraPrevista !== null) && (
          <span className="col-span-2 sm:col-span-4">
            Pedido mínimo {fmtQuantidade(pm.minimoFornecedor, pm.unidade)} · sobra {fmtQuantidade(pm.sobraPrevista, pm.unidade)}
            {sobraRecebida > 0 && <> · já recebido da sobra {fmtQuantidade(sobraRecebida, pm.unidade)}</>}
            {(pm.sobraPrevista ?? 0) > 0 && (
              <>
                {" "}· ainda no fornecedor{" "}
                <b className={saldoSobra > 0 ? "text-warn" : "text-foreground"}>{fmtQuantidade(saldoSobra, pm.unidade)}</b>
              </>
            )}
          </span>
        )}
        {parcial && (
          <span className="col-span-2 sm:col-span-4">
            Recebido <b className="text-foreground">{fmtQuantidade(recebido, pm.unidade)}</b> (último em {fmtDia(pm.recebidoEm)}) · saldo a receber{" "}
            <b className="text-warn">{fmtQuantidade(saldo, pm.unidade)}</b>
          </span>
        )}
        {pm.obs && <span className="col-span-2 sm:col-span-4">Obs.: {pm.obs}</span>}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {podeCompras && aReceber && (
          <Button type="button" size="sm" variant={painel === "receber" ? "secondary" : "default"} onClick={() => alternar("receber")}>
            {painel === "receber" ? "Fechar" : parcial ? "Receber saldo" : "Confirmar recebimento"}
          </Button>
        )}
        {/* A sobra vem depois da entrega principal, quando é retirada do fornecedor. */}
        {podeCompras && pm.status === "RECEBIDO" && saldoSobra > 0 && (
          <Button type="button" size="sm" variant={painel === "sobra" ? "secondary" : "default"} onClick={() => alternar("sobra")}>
            {painel === "sobra" ? "Fechar" : sobraRecebida > 0 ? "Receber saldo da sobra" : "Receber sobra"}
          </Button>
        )}
        {podeCompras && ativo && (
          <Button type="button" size="sm" variant={painel === "atualizar" ? "secondary" : "outline"} onClick={() => alternar("atualizar")}>
            {painel === "atualizar" ? "Fechar" : "Atualizar (Compras)"}
          </Button>
        )}
        <Button type="button" size="sm" variant="ghost" onClick={() => setHistorico((v) => !v)}>
          {historico ? "Esconder histórico" : `Histórico (${pm.eventos.length})`}
        </Button>
        {podeCancelar && aReceber && recebido === 0 && (
          <form action={cancelarPedidoMaterial}>
            <input type="hidden" name="pedidoId" value={pm.id} />
            <Button type="submit" size="sm" variant="ghost" className="text-bad">Cancelar PM</Button>
          </form>
        )}
      </div>

      {painel === "receber" && <ReceberPM pm={pm} saldo={saldo} onFeito={() => setPainel(null)} />}
      {painel === "sobra" && <ReceberPM pm={pm} saldo={saldoSobra} sobra onFeito={() => setPainel(null)} />}
      {painel === "atualizar" && <AtualizarPM pm={pm} onFeito={() => setPainel(null)} />}
      {historico && (
        <ol className="mt-2 flex flex-col gap-1 border-t border-dashed border-line-strong pt-2 text-xs">
          {pm.eventos.map((e) => (
            <li key={e.id} className="flex gap-2">
              <span className="shrink-0 font-mono text-muted-foreground">{fmtDateTime(e.criadoEm)}</span>
              <span className="text-foreground">{e.texto}</span>
              <span className="ml-auto shrink-0 text-muted-foreground">{e.porNome}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// Chegada do material: tudo o que falta ou só uma parte. Parcial pede a previsão do saldo, que vira
// o prazo do PM até o resto chegar. Com `sobra`, é a retirada da sobra do pedido mínimo (sem prazo).
function ReceberPM({ pm, saldo, sobra = false, onFeito }: { pm: PMTela; saldo: number; sobra?: boolean; onFeito: () => void }) {
  const [state, onSubmit, pending] = useFormActionSemReset(async (prev: Awaited<ReturnType<typeof registrarRecebimento>>, fd: FormData) => {
    const r = await (sobra ? registrarRecebimentoSobra : registrarRecebimento)(prev, fd);
    if (r?.ok && !r.erro) onFeito();
    return r;
  }, undefined);
  const [modo, setModo] = useState("tudo");
  const [chegou, setChegou] = useState("");
  const c = lerQuantidade(chegou);
  const resta = c === null ? null : Math.max(0, saldo - c);
  const hoje = new Date().toLocaleDateString("en-CA");

  return (
    <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-3 rounded-lg border border-good/30 bg-good-soft/40 p-3">
      <input type="hidden" name="pedidoId" value={pm.id} />
      <input type="hidden" name="modo" value={modo} />
      <Escolha
        rotulo={sobra ? "Quanto da sobra chegou" : "O que chegou"}
        valor={modo}
        onChange={setModo}
        opcoes={[
          { key: "tudo", label: `${sobra ? "Recebi a sobra toda" : "Recebi tudo"} (${fmtQuantidade(saldo, pm.unidade)})`, tom: "good" },
          { key: "parcial", label: "Recebi só uma parte", tom: "warn" },
        ]}
      />
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <Field label="Data do recebimento">
          <Input type="date" name="dataRecebimento" defaultValue={hoje} />
        </Field>
        {modo === "parcial" && (
          <>
            <Field label={`Quantidade que chegou (${pm.unidade})`}>
              <Input name="quantidadeRecebida" inputMode="decimal" required value={chegou} onChange={(e) => setChegou(e.target.value)} />
            </Field>
            {!sobra && (
              <Field label="Previsão de chegada do saldo">
                <Input type="date" name="prazoSaldo" required defaultValue={paraInputData(pm.prazoPrevisto)} />
              </Field>
            )}
            <div className="self-end rounded-lg border border-border bg-card px-3 py-2 text-sm">
              <Calculado rotulo={sobra ? "Fica no fornecedor" : "Saldo a receber"} valor={resta === null ? "—" : fmtQuantidade(resta, pm.unidade)} destaque={!!resta} />
            </div>
          </>
        )}
      </div>
      <Field label="Observação (opcional)">
        <Input name="obs" placeholder="Ex.: NF 12345; chegou com 2 dias de atraso" />
      </Field>
      {state?.erro && <div className="anexo-erro">{state.erro}</div>}
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Registrando…" : modo === "parcial" ? "Registrar recebimento parcial" : sobra ? "Confirmar recebimento da sobra" : "Confirmar recebimento"}
        </Button>
      </div>
    </form>
  );
}

function AtualizarPM({ pm, onFeito }: { pm: PMTela; onFeito: () => void }) {
  const [state, onSubmit, pending] = useFormActionSemReset(async (prev: Awaited<ReturnType<typeof atualizarPedidoMaterial>>, fd: FormData) => {
    const r = await atualizarPedidoMaterial(prev, fd);
    if (r?.ok && !r.erro) onFeito();
    return r;
  }, undefined);
  const [status, setStatus] = useState(pm.status);
  const [qtd, setQtd] = useState(pm.quantidade?.toLocaleString("pt-BR") ?? "");
  const [minimo, setMinimo] = useState(pm.minimoFornecedor?.toLocaleString("pt-BR") ?? "");
  const [formato, setFormato] = useState(pm.formato ?? "");
  const [gramatura, setGramatura] = useState(pm.gramatura ? String(pm.gramatura) : "");
  // Mesmas contas que o servidor faz ao salvar (lib/aceite/papel-calculo): sobra = mínimo - o que
  // falta; peso = folhas compradas × formato × gramatura.
  const q = lerQuantidade(qtd);
  const m = lerQuantidade(minimo);
  const comprada = quantidadeComprada(q, m);
  const sobra = sobraDoMinimo(q, m);
  const peso = pesoKg(comprada, pm.unidade, formato, lerQuantidade(gramatura));

  return (
    <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-3 border-t border-dashed border-line-strong pt-3">
      <input type="hidden" name="pedidoId" value={pm.id} />
      <input type="hidden" name="status" value={status} />
      <Escolha
        rotulo="Situação do Pedido de Material"
        valor={status}
        onChange={(k) => setStatus(k as typeof status)}
        opcoes={STATUS_PM.filter((x) => x.key !== "CANCELADO" && (x.key !== "RECEBIDO" || pm.status === "RECEBIDO")).map((x) => ({ key: x.key, label: x.label, tom: x.pill === "good" ? "good" : "primaria" }))}
      />
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <Field label="Prazo do fornecedor">
          <Input type="date" name="prazoPrevisto" defaultValue={paraInputData(pm.prazoPrevisto)} />
        </Field>
        <Field label="Fornecedor">
          <Input name="fornecedor" defaultValue={pm.fornecedor ?? ""} />
        </Field>
        <Field label="Nº da SC no ERP">
          <Input name="numeroSC" defaultValue={pm.numeroSC ?? ""} />
        </Field>
        <Field label="Nº da OC no ERP">
          <Input name="numeroOC" defaultValue={pm.numeroOC ?? ""} />
        </Field>
        <Field label={`Quantidade que falta (${pm.unidade})`}>
          <Input name="quantidade" inputMode="decimal" value={qtd} onChange={(e) => setQtd(e.target.value)} />
        </Field>
        <Field label={`Pedido mínimo (${pm.unidade})`}>
          <Input name="minimoFornecedor" inputMode="decimal" value={minimo} onChange={(e) => setMinimo(e.target.value)} placeholder="se houver" />
        </Field>
        <Field label="Formato (cm)">
          <Input name="formato" value={formato} onChange={(e) => setFormato(e.target.value)} placeholder="96x66" />
        </Field>
        <Field label="Gramatura (g/m²)">
          <Input name="gramatura" inputMode="numeric" value={gramatura} onChange={(e) => setGramatura(e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-2.5 rounded-lg border border-border bg-muted/40 p-3 text-sm">
        <Calculado rotulo="Sobra no fornecedor" valor={sobra === null ? "sem pedido mínimo" : fmtQuantidade(sobra, pm.unidade)} destaque={!!sobra} />
        <Calculado rotulo="Compra" valor={fmtQuantidade(comprada, pm.unidade)} />
        <Calculado rotulo="Peso do pedido" valor={peso === null ? "informe formato e gramatura" : fmtQuantidade(peso, "kg")} />
      </div>
      <Field label="O que o fornecedor disse (vai para o histórico)">
        <Input name="motivo" placeholder="Ex.: fornecedor adiou a entrega por falta de bobina" />
      </Field>
      {state?.erro && <div className="anexo-erro">{state.erro}</div>}
      <div>
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Salvando…" : "Salvar atualização"}</Button>
      </div>
    </form>
  );
}

// "300g", "300 g/m²" → "300".
function soNumero(g: string | null | undefined) {
  return String(g ?? "").match(/\d+(?:[.,]\d+)?/)?.[0] ?? "";
}

// Valor calculado sozinho: só leitura, com o rótulo "calculado" pra não parecer campo esquecido.
function Calculado({ rotulo, valor, destaque = false }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{rotulo} · calculado</div>
      <div className={`font-mono font-semibold ${destaque ? "text-warn" : "text-foreground"}`}>{valor}</div>
    </div>
  );
}

type Papel = { id: string; codigo: string; descricao: string; folhas: number | null; formato: string; gramatura: string };

function NovoPM({ aceiteId, papeis }: { aceiteId: string; papeis: Papel[] }) {
  const [papelId, setPapelId] = useState<string>(papeis[0]?.id ?? "");
  const sugestao = papeis.find((x) => x.id === papelId);
  const [aberto, setAberto] = useState(false);
  const [state, onSubmit, pending] = useFormActionSemReset(criarPedidoMaterial, undefined);
  const [material, setMaterial] = useState<string>("PAPEL");
  const [qtd, setQtd] = useState("");
  const [unidade, setUnidade] = useState("fls");
  // Formato e gramatura vêm do papel escolhido; editáveis, porque o PM pode pedir outro formato.
  const [formato, setFormato] = useState(sugestao?.formato ?? "");
  const [gramatura, setGramatura] = useState(soNumero(sugestao?.gramatura));
  const peso = pesoKg(lerQuantidade(qtd), unidade, formato, lerQuantidade(gramatura));

  function escolherPapel(id: string) {
    setPapelId(id);
    const x = papeis.find((y) => y.id === id);
    setFormato(x?.formato ?? "");
    setGramatura(soNumero(x?.gramatura));
  }
  function escolherMaterial(m: string) {
    setMaterial(m);
    setUnidade(m === "PAPEL" ? "fls" : "kg");
    if (m !== "PAPEL") {
      setFormato("");
      setGramatura("");
    } else escolherPapel(papelId);
  }

  if (!aberto) {
    return (
      <div className="flex flex-col gap-1.5">
        {state?.ok && <div className="text-sm text-good">{state.ok}</div>}
        <div>
          <Button type="button" variant="outline" size="sm" onClick={() => setAberto(true)}>
            Emitir Pedido de Material
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        onSubmit(e);
      }}
      className="flex flex-col gap-3 rounded-lg border border-border p-3"
    >
      <input type="hidden" name="aceiteId" value={aceiteId} />
      <input type="hidden" name="material" value={material} />
      <input type="hidden" name="suporteRef" value={material === "PAPEL" ? papelId : ""} />
      {material === "PAPEL" && papeis.length > 1 && (
        <Field label="De qual papel do pedido?">
          <Escolha rotulo="Papel do pedido" valor={papelId} onChange={escolherPapel} opcoes={papeis.map((x, n) => ({ key: x.id, label: `Papel ${n + 1}: ${x.descricao}` }))} />
        </Field>
      )}
      <Field label="Material">
        <Escolha rotulo="Material" valor={material} onChange={escolherMaterial} opcoes={TIPOS_MATERIAL} />
      </Field>
      <Row2 compacto>
        <Field label="Código no ERP">
          <Input name="codigoMaterial" defaultValue={material === "PAPEL" ? (sugestao?.codigo ?? "") : ""} key={`cod-${material}-${papelId}`} />
        </Field>
        <Field label="Formato mínimo que serve" hint="Ex.: 48x56.">
          <Input name="formatoMinimo" />
        </Field>
      </Row2>
      <Field label="Descrição" hint="Ex.: Vitamax 300g 96x66.">
        <Input name="descricao" required defaultValue={material === "PAPEL" ? (sugestao?.descricao ?? "") : ""} key={`desc-${material}-${papelId}`} />
      </Field>
      <Row2 compacto>
        <Field label="Quantidade que falta" hint={material === "PAPEL" && sugestao?.folhas ? `O Aceite precisa de ${fmtQuantidade(sugestao.folhas)} folhas no total.` : undefined}>
          <Input name="quantidade" inputMode="decimal" required value={qtd} onChange={(e) => setQtd(e.target.value)} />
        </Field>
        <Field label="Unidade">
          <Input name="unidade" value={unidade} onChange={(e) => setUnidade(e.target.value)} />
        </Field>
      </Row2>
      <div className="grid grid-cols-3 gap-2.5">
        <Field label="Formato (cm)">
          <Input name="formato" value={formato} onChange={(e) => setFormato(e.target.value)} placeholder="96x66" />
        </Field>
        <Field label="Gramatura (g/m²)">
          <Input name="gramatura" inputMode="numeric" value={gramatura} onChange={(e) => setGramatura(e.target.value)} />
        </Field>
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
          <Calculado rotulo="Peso" valor={peso === null ? "—" : fmtQuantidade(peso, "kg")} />
        </div>
      </div>
      <Field label="Entrega desejada" hint="Ex.: imediata, ou uma data.">
        <Input name="entregaDesejada" defaultValue="Imediata" />
      </Field>
      <Field label="Observação para Compras (opcional)">
        <Input name="obs" />
      </Field>
      {state?.erro && <div className="anexo-erro">{state.erro}</div>}
      {state?.ok && <div className="text-sm text-good">{state.ok}</div>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Emitindo…" : "Emitir PM"}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setAberto(false)}>Fechar</Button>
      </div>
    </form>
  );
}
