"use client";

import { useState } from "react";
import { useFormActionSemReset } from "@/hooks/use-form-action";
import { confirmarEngenharia } from "@/app/(app)/aceite/actions";
import { formatarCodigoInterno } from "@/lib/orcamentos/codigo-interno";
import { calcularMontagens, type ItemAceite } from "@/lib/aceite/montagem";
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
  const [montagem, setMontagem] = useState<Record<string, { grupo: string; posicoes: string }>>(
    Object.fromEntries(itens.map((i) => [i.modeloId, { grupo: i.montagem ? String(i.montagem) : "", posicoes: i.posicoes ? String(i.posicoes) : "" }])),
  );
  const atual: ItemAceite[] = itens.map((i) => ({
    ...i,
    montagem: parseInt(montagem[i.modeloId]?.grupo || "", 10) || null,
    posicoes: parseInt(montagem[i.modeloId]?.posicoes || "", 10) || null,
  }));
  const montagens = calcularMontagens(atual);
  const totalFolhas = montagens.reduce((s, m) => s + m.folhas, 0);
  const muda = (id: string, campo: "grupo" | "posicoes", v: string) =>
    setMontagem((m) => ({ ...m, [id]: { ...m[id], [campo]: v.replace(/\D/g, "") } }));

  return (
    <form id="form-aceite-engenharia" onSubmit={onSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={aceiteId} />
      <FormSection title="Engenharia: cadastro de produto">
        <DiretrizBlock>
          {novos.length
            ? `Produto novo: crie o cadastro e informe o Nº de Cadastro de Produto${novos.length > 1 ? ` de cada um dos ${novos.length} modelos` : ""}. O número também libera a etapa 7 do Orçamento.`
            : "Os modelos já têm cadastro. Confira o Cadastro Técnico, defina a montagem, salve a cópia na pasta CTP e confirme o Aceite."}
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
          Modelos com o mesmo número de montagem saem juntos na mesma folha.
          {capacidade ? ` Cabem ${capacidade} por folha (orçamento).` : " A quantidade por folha não veio do orçamento."}
        </p>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left font-medium">Modelo</th>
                <th className="px-3 py-2 text-right font-medium">Pedido</th>
                <th className="w-24 px-3 py-2 text-left font-medium">Montagem</th>
                <th className="w-24 px-3 py-2 text-left font-medium">Posições</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((i) => (
                <tr key={i.modeloId} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">
                    <span className="block text-foreground">{i.descricao || "Modelo sem descrição"}</span>
                    {i.codInterno && <span className="font-mono text-xs text-muted-foreground">{formatarCodigoInterno(i.codInterno)}</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{fmtQuantidade(i.quantidade)}</td>
                  <td className="px-3 py-2">
                    <Input
                      name={`montagem_${i.modeloId}`}
                      inputMode="numeric"
                      aria-label={`Montagem de ${i.descricao}`}
                      value={montagem[i.modeloId]?.grupo ?? ""}
                      onChange={(e) => muda(i.modeloId, "grupo", e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      name={`posicoes_${i.modeloId}`}
                      inputMode="numeric"
                      aria-label={`Posições de ${i.descricao} na folha`}
                      value={montagem[i.modeloId]?.posicoes ?? ""}
                      onChange={(e) => muda(i.modeloId, "posicoes", e.target.value)}
                    />
                  </td>
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
        <Marcar name="clicheNovo" texto="Precisa de clichê novo" />
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
