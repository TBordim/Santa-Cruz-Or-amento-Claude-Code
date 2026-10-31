"use client";

import { useState } from "react";
import { useFormActionSemReset } from "@/hooks/use-form-action";
import { confirmarEngenharia } from "@/app/(app)/aceite/actions";
import { CodigoClienteInline } from "./CodigoClienteInline";
import { formatarCodigoInterno } from "@/lib/orcamentos/codigo-interno";
import { calcularMontagens, completarPosicoes, aProduzir, type ItemAceite } from "@/lib/aceite/montagem";
import { fmtQuantidade } from "@/lib/aceite/constantes";
import type { Modelo } from "@/lib/orcamentos/types";
import { FormSection, Field, DiretrizBlock, AcoesBar } from "@/components/form-section";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CodigoInternoInput } from "@/components/orcamento/CodigoInternoInput";

// Engenharia do Aceite (TP de Engenharia 3.2.1). Produto sem código = produto novo: a Engenharia
// cria o cadastro e lança o código aqui, o que também resolve a etapa 7 do Orçamento. Define a
// montagem: modelos com o mesmo número saem juntos na mesma folha, cada um com suas posições.
export function FormEngenharia({
  aceiteId,
  modelos,
  itens,
  capacidade,
}: {
  aceiteId: string;
  modelos: Modelo[];
  itens: ItemAceite[];
  capacidade: number | null;
}) {
  const [state, onSubmit, pending] = useFormActionSemReset(confirmarEngenharia, undefined);
  const novos = modelos.filter((m) => !m.codInterno);
  // Montagem e posições vêm do orçamento; aqui só se mostram (e se completam as posições, como no servidor).
  const atual: ItemAceite[] = completarPosicoes(itens, capacidade);
  const montagens = calcularMontagens(atual);
  const totalFolhas = montagens.reduce((s, m) => s + m.folhas, 0);
  return (
    <form id="form-aceite-engenharia" onSubmit={onSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={aceiteId} />
      <FormSection title="Engenharia: cadastro de produto">
        <DiretrizBlock>
          {novos.length
            ? `Produto novo: crie o cadastro e informe o Nº de Cadastro de Produto${novos.length > 1 ? ` de cada um dos ${novos.length} modelos` : ""}. O número também libera a etapa 7 do Orçamento.`
            : "Os modelos já têm cadastro. Confira o Cadastro Técnico, salve a cópia na pasta CTP e confirme o Aceite."}
        </DiretrizBlock>
        {modelos.map((m, i) => {
          const rotulo = modelos.length > 1 ? `Nº de Cadastro — ${m.descricao || `Modelo ${i + 1}`}` : "Nº de Cadastro de Produto";
          return m.codInterno ? (
            <Field key={m.id} label={rotulo} hint="Já cadastrado.">
              <div className="font-mono text-sm text-foreground">{formatarCodigoInterno(m.codInterno)}</div>
            </Field>
          ) : (
            <Field key={m.id} label={rotulo} hint="Formato 0.000.000.">
              <CodigoInternoInput name={`codInterno_${m.id}`} required />
            </Field>
          );
        })}
      </FormSection>

      <FormSection title="Montagem">
        <p className="text-sm text-muted-foreground">
          Definida pela Engenharia no orçamento (conjugação): modelos com o mesmo número de montagem saem juntos na mesma folha, e o número é a ordem de produção.
          {capacidade ? ` Cabem ${capacidade} por folha.` : ""}
        </p>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left font-medium">Modelo</th>
                <th className="px-3 py-2 text-right font-medium">Pedido</th>
                <th className="px-3 py-2 text-right font-medium">Produzir</th>
                <th className="w-24 px-3 py-2 text-center font-medium">Montagem</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((i) => (
                <tr key={i.modeloId} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">
                    <span className="block text-foreground">{i.descricao || "Modelo sem descrição"}</span>
                    {i.codInterno && <span className="font-mono text-xs text-muted-foreground">{formatarCodigoInterno(i.codInterno)}</span>}
                    <CodigoClienteInline modeloId={i.modeloId} codigo={modelos.find((m) => m.id === i.modeloId)?.codigoCliente ?? ""} />
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{fmtQuantidade(i.quantidade)}</td>
                  <td className="px-3 py-2 text-right font-mono" title={i.emEstoque ? `${fmtQuantidade(i.emEstoque)} saem do estoque de produto acabado` : undefined}>
                    {fmtQuantidade(aProduzir(i))}
                  </td>
                  <td className="px-3 py-2 text-center font-mono">{atual.find((x) => x.modeloId === i.modeloId)?.montagem ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {montagens.length > 0 && (
          <ul className="flex flex-col gap-1.5 text-sm">
            {montagens.map((m) => {
              const passou = !!capacidade && m.posicoesUsadas > capacidade;
              const sobraPosicao = !!capacidade && m.posicoesUsadas < capacidade;
              return (
                <li key={m.grupo} className={`rounded-md border px-3 py-2 ${passou ? "border-bad/40 bg-bad-soft text-bad" : "border-border"}`}>
                  <b>Montagem {m.grupo}</b>: {m.posicoesUsadas}
                  {capacidade ? ` de ${capacidade}` : ""} posições · <b>{fmtQuantidade(m.folhas)} folhas</b>
                  {passou && " · passa do que cabe na folha"}
                  {sobraPosicao && <span className="text-muted-foreground"> · {capacidade! - m.posicoesUsadas} posição(ões) vazia(s)</span>}
                  {m.itens.some((x) => x.excedente > 0) && (
                    <span className="block text-xs text-muted-foreground">
                      Sai a mais: {m.itens.filter((x) => x.excedente > 0).map((x) => `${x.descricao} +${fmtQuantidade(x.excedente)}`).join(" · ")}
                    </span>
                  )}
                </li>
              );
            })}
            <li className="text-xs text-muted-foreground">Total: {fmtQuantidade(totalFolhas)} folhas de papel.</li>
          </ul>
        )}
      </FormSection>

      <FormSection title="Ferramental e cadastro técnico">
        <Field label="Código da faca" hint="Ex.: 6.001.516. Deixe vazio se o pedido não usa faca.">
          <Input name="codigoFaca" className="max-w-48" />
        </Field>
        <Marcar name="facaNova" texto="Precisa de faca nova" />
        <ClichesNovos />
        {novos.length > 0 && <Marcar name="arquivoDigital" texto="Recebi o arquivo digital do produto novo (obrigatório, Nota 1)" />}
        <Marcar name="ctpSalvo" texto="Salvei a cópia do Cadastro Técnico na pasta CTP da rede" />
        <Field label="Observação (opcional)">
          <Input name="engenhariaObs" />
        </Field>
      </FormSection>
      {state?.erro && <div className="anexo-erro">{state.erro}</div>}
      {!state?.erro && state?.ok && <div className="text-sm text-good">{state.ok}</div>}
      <AcoesBar>
        <Button type="submit" disabled={pending}>{pending ? "Confirmando…" : "Confirmar o Aceite"}</Button>
      </AcoesBar>
    </form>
  );
}

function Marcar({ name, texto }: { name: string; texto: string }) {
  return (
    <label className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-muted/50">
      <input type="checkbox" name={name} className="h-4 w-4 accent-primary" />
      {texto}
    </label>
  );
}

// "Precisa de clichê novo" e os códigos dos clichês (um ou mais): a Karen forma a OF com eles para a pré-impressão.
function ClichesNovos() {
  const [novo, setNovo] = useState(false);
  const [codigos, setCodigos] = useState<string[]>([""]);
  return (
    <div className="flex flex-col gap-2">
      <label className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-muted/50">
        <input type="checkbox" name="clicheNovo" className="h-4 w-4 accent-primary" checked={novo} onChange={(e) => setNovo(e.target.checked)} />
        Precisa de clichê novo
      </label>
      {novo && (
        <div className="flex flex-col gap-1.5 pl-1">
          <span className="text-xs text-muted-foreground">Código de cada clichê novo (pode ser mais de um). Vai para a OF da pré-impressão.</span>
          {codigos.map((c, n) => (
            <div key={n} className="flex items-center gap-2">
              <Input
                name="codigoCliche"
                value={c}
                placeholder={`Código do clichê ${n + 1}`}
                aria-label={`Código do clichê ${n + 1}`}
                className="max-w-56"
                onChange={(e) => setCodigos((l) => l.map((x, k) => (k === n ? e.target.value : x)))}
              />
              {codigos.length > 1 && (
                <button type="button" className="text-xs text-bad underline" onClick={() => setCodigos((l) => l.filter((_, k) => k !== n))}>
                  remover
                </button>
              )}
            </div>
          ))}
          {codigos.length < 12 && (
            <button type="button" className="self-start text-xs underline" onClick={() => setCodigos((l) => [...l, ""])}>
              + Adicionar outro clichê
            </button>
          )}
        </div>
      )}
    </div>
  );
}
