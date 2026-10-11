"use client";

import { useState } from "react";
import { useFormActionSemReset, porBotao } from "@/hooks/use-form-action";
import { salvarVendas } from "@/app/(app)/aceite/actions";
import { lerQuantidade, fmtQuantidade, paraInputData } from "@/lib/aceite/constantes";
import { folhasEstimadas, type ItemAceite } from "@/lib/aceite/montagem";
import { SITUACOES_SUPORTE, textoSuporte, type SuporteAceite } from "@/lib/aceite/suportes";
import { formatarCodigoInterno } from "@/lib/orcamentos/codigo-interno";
import { FormSection, Field, AcoesBar } from "@/components/form-section";
import { Input } from "@/components/ui/input";
import { Escolha } from "./Escolha";
import { Button } from "@/components/ui/button";

export type AceiteVendas = {
  id: string;
  numero: string | null;
  itens: ItemAceite[];
  pedidoInterno: string | null;
  dataCliente: Date | null;
  suportes: SuporteAceite[];
  temProdutoAcabado: boolean | null;
  versaoVerificadaEm: Date | null;
};

const SITUACOES_COM_COR = SITUACOES_SUPORTE.map((o) => ({
  ...o,
  tom: (o.key === "RESERVADO_TOTAL" ? "good" : o.key === "RESERVADO_PARCIAL" ? "warn" : "bad") as "good" | "warn" | "bad",
}));

// Etapa de Vendas do Aceite (TP de Vendas 3.2.1). O app não lê o ERP: Vendas confere lá e deixa aqui
// só o visto (decisão do Thiago em 08/10/2026). Um pedido pode usar vários papéis, cada um com a sua
// situação no estoque; o PM do que falta sai pelo bloco "Pedidos de Material". `papeisSemPM` vem da
// página. Layout compacto (11/10/2026): campos curtos lado a lado, pra rolar menos a tela.
export function FormVendas({ aceite, papeisSemPM, qtdSO }: { aceite: AceiteVendas; papeisSemPM: string[]; qtdSO: number | null }) {
  const [stateSalvar, onSalvar, pendSalvar] = useFormActionSemReset(salvarVendas, undefined);
  const [stateLiberar, onLiberar, pendLiberar] = useFormActionSemReset(salvarVendas, undefined);
  const [suportes, setSuportes] = useState<SuporteAceite[]>(aceite.suportes);
  const [acabado, setAcabado] = useState<string>(aceite.temProdutoAcabado === true ? "sim" : aceite.temProdutoAcabado === false ? "nao" : "");
  const [qtds, setQtds] = useState<Record<string, string>>(
    Object.fromEntries(aceite.itens.map((i) => [i.modeloId, i.quantidade ? i.quantidade.toLocaleString("pt-BR") : ""])),
  );
  const state = stateLiberar?.erro ? stateLiberar : (stateSalvar ?? stateLiberar);
  const pending = pendSalvar || pendLiberar;
  const total = aceite.itens.reduce((s, i) => s + (lerQuantidade(qtds[i.modeloId] ?? "") ?? 0), 0);
  const muda = (id: string, campo: keyof SuporteAceite, valor: string | number | null) =>
    setSuportes((lista) => lista.map((x) => (x.id === id ? { ...x, [campo]: valor } : x)));
  const numero = (v: string) => (v ? Number(v.replace(/[^0-9]/g, "")) || null : null);
  const adicionar = () =>
    setSuportes((lista) => [
      ...lista,
      {
        id: `s${lista.length + 1}-${Math.random().toString(36).slice(2, 6)}`,
        descricao: "",
        gramatura: "",
        codigo: "",
        formato: "",
        qtdFolha: null,
        folhas: null,
        situacao: "NAO_VERIFICADO",
        obs: "",
        doOrcamento: null,
      },
    ]);
  const remover = (id: string) => setSuportes((lista) => lista.filter((x) => x.id !== id));

  return (
    <form id="form-aceite-vendas" onSubmit={porBotao({ salvar: onSalvar, liberar: onLiberar }, "salvar")} className="flex flex-col gap-1">
      <input type="hidden" name="id" value={aceite.id} />
      <input type="hidden" name="suportes" value={JSON.stringify(suportes)} />
      <input type="hidden" name="produtoAcabado" value={acabado} />
      <p className="mb-2 text-sm text-muted-foreground">
        Confira no ERP e registre aqui. Com o papel resolvido (reservado ou com PM emitido), libere: o Aceite segue para a Engenharia
        enquanto Compras busca o prazo do papel.
      </p>

      <FormSection title="Pedido do cliente" denso>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Nº do Aceite (ERP)">
            <Input name="numero" defaultValue={aceite.numero ?? ""} />
          </Field>
          <Field label="Pedido interno (opcional)">
            <Input name="pedidoInterno" defaultValue={aceite.pedidoInterno ?? ""} />
          </Field>
          <Field label="1ª data do cliente">
            <Input type="date" name="dataCliente" defaultValue={paraInputData(aceite.dataCliente)} />
          </Field>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-foreground">Quantidade pedida por modelo</span>
            <span className="text-xs text-muted-foreground">
              Total {fmtQuantidade(total)}
              {qtdSO ? ` · SO ${fmtQuantidade(qtdSO)}` : ""}
              {qtdSO && total && total !== qtdSO ? <b className="text-warn"> · diferente da SO, confira com o cliente</b> : ""}
            </span>
          </div>
          <div className={`grid grid-cols-1 gap-1.5 ${aceite.itens.length > 1 ? "md:grid-cols-2" : ""}`}>
            {aceite.itens.map((i) => (
              <label key={i.modeloId} className="grid grid-cols-[1fr_7.5rem] items-center gap-3 rounded-md border border-border px-3 py-1.5">
                <span className="min-w-0 text-sm leading-tight">
                  <span className="block truncate text-foreground">{i.descricao || "Modelo sem descrição"}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{i.codInterno ? formatarCodigoInterno(i.codInterno) : "produto novo"}</span>
                </span>
                <Input
                  name={`qtd_${i.modeloId}`}
                  inputMode="numeric"
                  aria-label={`Quantidade de ${i.descricao}`}
                  value={qtds[i.modeloId] ?? ""}
                  onChange={(e) => setQtds((q) => ({ ...q, [i.modeloId]: e.target.value }))}
                />
              </label>
            ))}
          </div>
        </div>
      </FormSection>

      <FormSection title="Produto acabado em estoque" denso>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-sm text-foreground">Há sobra de produção anterior na expedição (conferido no ERP)?</span>
          <Escolha
            rotulo="Produto acabado em estoque"
            valor={acabado}
            onChange={setAcabado}
            opcoes={[
              { key: "nao", label: "Não há" },
              { key: "sim", label: "Há sobra", tom: "warn" },
            ]}
          />
        </div>
        {/* A versão só importa quando há produto pronto que pode ser usado no pedido. */}
        {acabado === "sim" && (
          <Marcar name="versaoVerificada" defaultChecked={!!aceite.versaoVerificadaEm} texto="Conferi que a versão do produto em estoque está atualizada" />
        )}
      </FormSection>

      <FormSection title="Papéis do pedido" denso>
        {suportes.map((x, n) => {
          const sugestao = n === 0 ? folhasEstimadas(total || null, x.qtdFolha) : null;
          const d = x.doOrcamento;
          const trocou = !!d && (d.codigo !== x.codigo || d.descricao !== x.descricao || d.formato !== x.formato || d.gramatura !== x.gramatura);
          return (
            <div key={x.id} className="flex flex-col gap-2.5 rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">
                  Papel {n + 1}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">{d ? "do orçamento" : "acrescentado por Vendas"}</span>
                  {!d && (
                    <Button type="button" size="sm" variant="ghost" className="ml-1 h-auto px-1.5 py-0.5 text-xs text-bad" onClick={() => remover(x.id)}>
                      Remover
                    </Button>
                  )}
                </span>
                <Escolha rotulo={`Estoque do papel ${n + 1}`} valor={x.situacao} onChange={(k) => muda(x.id, "situacao", k)} opcoes={SITUACOES_COM_COR} />
              </div>
              {trocou && d && (
                <p className="rounded-md bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
                  Especificado no orçamento: {textoSuporte(d)} · código {d.codigo || "—"}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
                <Field label="Tipo de papel">
                  <Input value={x.descricao} onChange={(e) => muda(x.id, "descricao", e.target.value)} placeholder="Vitamax" />
                </Field>
                <Field label="Gramatura (g)">
                  <Input value={x.gramatura} inputMode="numeric" onChange={(e) => muda(x.id, "gramatura", e.target.value)} />
                </Field>
                <Field label="Código no ERP">
                  <Input value={x.codigo} onChange={(e) => muda(x.id, "codigo", e.target.value)} />
                </Field>
                <Field label="Formato">
                  <Input value={x.formato} onChange={(e) => muda(x.id, "formato", e.target.value)} placeholder="96x66" />
                </Field>
                <Field label="Qtd por folha">
                  <Input value={x.qtdFolha ?? ""} inputMode="numeric" onChange={(e) => muda(x.id, "qtdFolha", numero(e.target.value))} />
                </Field>
                <Field label={sugestao ? `Folhas (conta: ${fmtQuantidade(sugestao)})` : "Folhas"}>
                  <Input value={x.folhas ?? ""} inputMode="numeric" placeholder={sugestao ? String(sugestao) : ""} onChange={(e) => muda(x.id, "folhas", numero(e.target.value))} />
                </Field>
              </div>
              <Input value={x.obs} onChange={(e) => muda(x.id, "obs", e.target.value)} placeholder="Observação sobre este papel (opcional). Ex.: reservei 800 folhas do saldo" aria-label={`Observação do papel ${n + 1}`} />
              {papeisSemPM.includes(x.id) && (x.situacao === "RESERVADO_PARCIAL" || x.situacao === "SEM_ESTOQUE") && (
                <p className="text-xs font-medium text-warn">Emita o Pedido de Material deste papel (bloco abaixo) antes de liberar.</p>
              )}
            </div>
          );
        })}
        <div>
          <Button type="button" size="sm" variant="outline" onClick={adicionar}>
            Adicionar papel
          </Button>
        </div>
      </FormSection>

      {state?.erro && <div className="anexo-erro mt-3">{state.erro}</div>}
      {!state?.erro && state?.ok && <div className="mt-3 text-sm text-good">{state.ok}</div>}
      <AcoesBar>
        <Button type="submit" value="salvar" variant="outline" disabled={pending}>
          {pendSalvar ? "Salvando…" : "Salvar"}
        </Button>
        {/* "liberar" vai como campo escondido só no envio por este botão (ver marcarLiberar). */}
        <Button type="submit" value="liberar" disabled={pending} onClick={(e) => marcarLiberar(e.currentTarget.form)}>
          {pendLiberar ? "Liberando…" : "Liberar para a Engenharia"}
        </Button>
      </AcoesBar>
    </form>
  );
}

// O mesmo form serve aos dois botões; só o "Liberar" manda liberar=1. O campo é criado na hora do
// clique e removido logo depois, pra um "Salvar" seguinte não liberar sem querer.
function marcarLiberar(form: HTMLFormElement | null) {
  if (!form) return;
  const campo = document.createElement("input");
  campo.type = "hidden";
  campo.name = "liberar";
  campo.value = "1";
  form.appendChild(campo);
  setTimeout(() => campo.remove(), 0);
}

function Marcar({ name, defaultChecked, texto }: { name: string; defaultChecked: boolean; texto: string }) {
  return (
    <label className="flex min-h-9 w-fit cursor-pointer items-center gap-2.5 rounded-lg border-[1.5px] border-line-strong bg-card px-3 py-1.5 text-sm font-medium text-foreground has-[:checked]:border-good has-[:checked]:bg-good-soft has-[:checked]:text-good">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 accent-[var(--good)]" />
      {texto}
    </label>
  );
}
