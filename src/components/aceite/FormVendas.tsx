"use client";

import { useState } from "react";
import { useFormActionSemReset, porBotao } from "@/hooks/use-form-action";
import { salvarVendas } from "@/app/(app)/aceite/actions";
import { lerQuantidade, fmtQuantidade } from "@/lib/aceite/constantes";
import { lerDatasCliente } from "@/lib/aceite/datas-cliente";
import { aProduzir, type ItemAceite } from "@/lib/aceite/montagem";
import type { SuporteAceite } from "@/lib/aceite/suportes";
import { LOTES_ATIVOS } from "@/lib/aceite/lotes";
import { formatarCodigoInterno } from "@/lib/orcamentos/codigo-interno";
import { FormSection, Field, AcoesBar } from "@/components/form-section";
import { Input } from "@/components/ui/input";
import { Escolha } from "./Escolha";
import { EditorDatasCliente, datasParaEnvio, type DataForm } from "./EditorDatasCliente";
import { EditorPapeis } from "./EditorPapeis";
import { EditorLotes, lotesIguais, type LoteForm, type ModeloDoPedido } from "./EditorLotes";
import { Button } from "@/components/ui/button";

export type AceiteVendas = {
  id: string;
  numero: string | null;
  itens: ItemAceite[];
  pedidoInterno: string | null;
  dataCliente: Date | null;
  datasCliente?: unknown;
  suportes: SuporteAceite[];
  // Lotes já gravados (Aceite dividido), no formato do formulário.
  lotes?: LoteForm[];
  temProdutoAcabado: boolean | null;
  versaoVerificadaEm: Date | null;
};

// Etapa de Vendas do Aceite (TP de Vendas 3.2.1). O app não lê o ERP: Vendas confere lá e deixa aqui
// só o visto (decisão do Thiago em 08/10/2026). Um pedido pode usar vários papéis, cada um com a sua
// situação no estoque; o PM do que falta sai pelo bloco "Pedidos de Material". `papeisSemPM` vem da
// página. Layout compacto (11/10/2026): campos curtos lado a lado, pra rolar menos a tela.
export function FormVendas({
  aceite,
  papeisSemPM,
  papeisSemPMPorLote = {},
  qtdSO,
}: {
  aceite: AceiteVendas;
  papeisSemPM: string[];
  papeisSemPMPorLote?: Record<string, string[]>;
  qtdSO: number | null;
}) {
  const [stateSalvar, onSalvar, pendSalvar] = useFormActionSemReset(salvarVendas, undefined);
  const [stateLiberar, onLiberar, pendLiberar] = useFormActionSemReset(salvarVendas, undefined);
  const [suportes, setSuportes] = useState<SuporteAceite[]>(aceite.suportes);
  const [acabado, setAcabado] = useState<string>(aceite.temProdutoAcabado === true ? "sim" : aceite.temProdutoAcabado === false ? "nao" : "");
  const [qtds, setQtds] = useState<Record<string, string>>(
    Object.fromEntries(aceite.itens.map((i) => [i.modeloId, i.quantidade ? i.quantidade.toLocaleString("pt-BR") : ""])),
  );
  // Datas pedidas pelo cliente (uma ou mais, cada uma com a quantidade até lá, opcional).
  const [lotes, setLotes] = useState<LoteForm[]>(aceite.lotes ?? []);
  const [nLotes, setNLotes] = useState("2");
  const dividido = lotes.length > 0;
  const [datas, setDatas] = useState<DataForm[]>(() =>
    (lerDatasCliente(aceite).length ? lerDatasCliente(aceite) : [{ data: "", quantidade: null, obs: "" }]).map((d) => ({ data: d.data, quantidade: d.quantidade ? d.quantidade.toLocaleString("pt-BR") : "", obs: d.obs })),
  );
  const state = stateLiberar?.erro ? stateLiberar : (stateSalvar ?? stateLiberar);
  const pending = pendSalvar || pendLiberar;
  const [estoques, setEstoques] = useState<Record<string, string>>(
    Object.fromEntries(aceite.itens.map((i) => [i.modeloId, i.emEstoque ? i.emEstoque.toLocaleString("pt-BR") : ""])),
  );
  const total = aceite.itens.reduce((s, i) => s + (lerQuantidade(qtds[i.modeloId] ?? "") ?? 0), 0);
  // A produzir = pedido menos o que sai do estoque de produto acabado (só conta se há sobra).
  const produzir = aceite.itens.reduce(
    (s, i) => s + aProduzir({ quantidade: lerQuantidade(qtds[i.modeloId] ?? ""), emEstoque: acabado === "sim" ? lerQuantidade(estoques[i.modeloId] ?? "") : null }),
    0,
  );
  // Modelos do pedido com o que está digitado agora (a divisão em lotes confere com isto).
  const modelosDoPedido: ModeloDoPedido[] = aceite.itens.map((i) => ({
    modeloId: i.modeloId,
    descricao: i.descricao,
    pedido: lerQuantidade(qtds[i.modeloId] ?? "") ?? 0,
    estoque: acabado === "sim" ? (lerQuantidade(estoques[i.modeloId] ?? "") ?? 0) : 0,
  }));
  const lotesParaEnvio = lotes.map((l, n) => ({
    id: l.id,
    numero: n + 1,
    itens: l.itens.map((i) => ({ modeloId: i.modeloId, quantidade: lerQuantidade(i.quantidade), emEstoque: acabado === "sim" ? lerQuantidade(i.emEstoque) : null })),
    datasCliente: datasParaEnvio(l.datas),
    suportes: l.suportes,
  }));

  return (
    <form id="form-aceite-vendas" onSubmit={porBotao({ salvar: onSalvar, liberar: onLiberar }, "salvar")} className="flex flex-col gap-1">
      <input type="hidden" name="id" value={aceite.id} />
      <input type="hidden" name="suportes" value={JSON.stringify(suportes)} />
      <input type="hidden" name="produtoAcabado" value={acabado} />
      <input type="hidden" name="datasCliente" value={JSON.stringify(datasParaEnvio(datas))} />
      {/* Só manda os lotes quando a divisão está ligada ou já existe: sem o campo, o servidor não mexe neles. */}
      {(LOTES_ATIVOS || (aceite.lotes?.length ?? 0) > 0) && <input type="hidden" name="lotes" value={JSON.stringify(lotesParaEnvio)} />}
      <p className="mb-2 text-sm text-muted-foreground">
        Confira no ERP e registre aqui. Com o papel resolvido (reservado ou com PM emitido), libere: o Aceite segue para a Engenharia
        enquanto Compras busca o prazo do papel.
      </p>

      <FormSection title="Pedido do cliente" denso>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nº do Aceite (ERP)">
            <Input name="numero" defaultValue={aceite.numero ?? ""} />
          </Field>
          <Field label="Pedido interno" hint="Pode ficar em branco agora; fica como pendência de Vendas depois da Engenharia.">
            <Input name="pedidoInterno" defaultValue={aceite.pedidoInterno ?? ""} />
          </Field>
        </div>
        {!dividido && <EditorDatasCliente datas={datas} onChange={setDatas} />}
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
          <>
            <Marcar name="versaoVerificada" defaultChecked={!!aceite.versaoVerificadaEm} texto="Conferi que a versão do produto em estoque está atualizada" />
            <span className="text-sm text-foreground">Quanto de cada modelo sai do estoque (o resto é produzido):</span>
            <div className={`grid grid-cols-1 gap-1.5 ${aceite.itens.length > 1 ? "md:grid-cols-2" : ""}`}>
              {aceite.itens.map((i) => (
                <label key={i.modeloId} className="grid grid-cols-[1fr_7.5rem] items-center gap-3 rounded-md border border-border px-3 py-1.5">
                  <span className="min-w-0 text-sm leading-tight">
                    <span className="block truncate text-foreground">{i.descricao || "Modelo sem descrição"}</span>
                    <span className="text-[11px] text-muted-foreground">
                      pedido {fmtQuantidade(lerQuantidade(qtds[i.modeloId] ?? ""))} · produzir{" "}
                      <b className="text-foreground">{fmtQuantidade(aProduzir({ quantidade: lerQuantidade(qtds[i.modeloId] ?? ""), emEstoque: lerQuantidade(estoques[i.modeloId] ?? "") }))}</b>
                    </span>
                  </span>
                  <Input
                    name={`estoque_${i.modeloId}`}
                    inputMode="numeric"
                    aria-label={`Do estoque: ${i.descricao}`}
                    value={estoques[i.modeloId] ?? ""}
                    onChange={(e) => setEstoques((q) => ({ ...q, [i.modeloId]: e.target.value }))}
                  />
                </label>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              Total a produzir: <b className="text-foreground">{fmtQuantidade(produzir)}</b> de {fmtQuantidade(total)} pedidos.
            </span>
          </>
        )}
      </FormSection>

      {LOTES_ATIVOS && !dividido && (
        <FormSection title="Dividir em lotes" denso>
          <p className="text-xs text-muted-foreground">
            Se o cliente quer o pedido em lotes (cada um é uma produção separada, com papel, OF e datas próprios), divida aqui antes de liberar.
            A soma de cada modelo nos lotes tem que bater com o pedido. Sem dividir, o pedido segue como um lote só.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Input value={nLotes} inputMode="numeric" className="w-20" aria-label="Quantos lotes" onChange={(e) => setNLotes(e.target.value)} />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const n = Math.min(12, Math.max(2, lerQuantidade(nLotes) ?? 2));
                setLotes(lotesIguais(modelosDoPedido, n, suportes));
              }}
            >
              Dividir em lotes
            </Button>
          </div>
        </FormSection>
      )}

      {dividido ? (
        <FormSection title={`Divisão em ${lotes.length} lotes`} denso>
          <p className="text-xs text-muted-foreground">
            Cada lote é uma produção separada: papel, Pedido de Material, OF, datas, negociação e entrega próprios. Faca, clichê e cadastro
            continuam uma análise só da Engenharia. Para mudar a divisão depois de liberar, o Aceite precisa voltar a Vendas.
          </p>
          <EditorLotes modelos={modelosDoPedido} lotes={lotes} onChange={setLotes} comEstoque={acabado === "sim"} semPM={papeisSemPMPorLote} suportesBase={suportes} />
          <div>
            <Button type="button" size="sm" variant="ghost" className="text-bad" onClick={() => setLotes([])}>
              Desfazer a divisão (voltar a um lote só)
            </Button>
            {lotes.some((l) => l.comPM) && (
              <span className="ml-2 text-xs text-muted-foreground">Os Pedidos de Material dos lotes passam a ser do Aceite todo; nenhum é apagado.</span>
            )}
          </div>
        </FormSection>
      ) : (
        <FormSection title="Papel a ser utilizado" denso>
          <p className="text-xs text-muted-foreground">
            Uma linha por papel e formato que serão usados. Se o estoque tem mais de um formato, acrescente uma linha para cada. O que for
            comprado vai no Pedido de Material, que pode ser de outro papel ou formato.
          </p>
          <EditorPapeis suportes={suportes} onChange={setSuportes} produzir={produzir} semPM={papeisSemPM} />
        </FormSection>
      )}

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
