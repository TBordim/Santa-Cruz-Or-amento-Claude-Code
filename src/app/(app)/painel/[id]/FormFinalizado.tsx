"use client";

import { useState } from "react";
import { useFormActionSemReset } from "@/hooks/use-form-action";
import { registrarDesfecho, cotarNovaQuantidade, pedirAjusteDePreco } from "../actions";
import { ListaDinamica } from "@/components/orcamento/ListaDinamica";
import type { OrcamentoComAnexos } from "@/lib/orcamentos/doc-type";
import type { PrecificacaoTier } from "@/lib/orcamentos/types";
import { fmtMoney, fmtDateTime, DESFECHOS } from "@/lib/orcamentos/constantes";
import { modelosDoDoc, soEscolhida, valorSO } from "@/lib/orcamentos/modelos";
import { FormSection, Field, ResumoBox, DiretrizBlock } from "@/components/form-section";
import { LinhasSO } from "@/components/orcamento/LinhasSO";
import { AnexoUpload } from "@/components/anexos/AnexoUpload";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

// Envio pelo onSubmit (useFormActionSemReset), não por <form action>/formAction: com action o
// React limpa o formulário quando ela termina — inclusive quando volta com erro de validação —
// e tudo que a pessoa digitou e ainda não estava salvo sumia da tela (achado no teste de
// 30/09/2026: modelo novo e Observações apagados depois de um "Liberar" com erro).
// `voltarPara`: quadro pra onde a gaveta volta depois do desfecho (o Atendimento ao Cliente abre
// esta mesma gaveta; sem ele, volta pro Painel).
export function FormFinalizado({ doc, voltarPara }: { doc: OrcamentoComAnexos; voltarPara?: string }) {
  const [state, onSubmit, pending] = useFormActionSemReset(registrarDesfecho, undefined);
  const [estadoCotar, onCotar, cotando] = useFormActionSemReset(cotarNovaQuantidade, undefined);
  const [estadoAjuste, onAjuste, ajustando] = useFormActionSemReset(pedirAjusteDePreco, undefined);
  const tiers = (doc.precificacao as unknown as PrecificacaoTier[] | null) ?? [];
  const modelos = modelosDoDoc(doc);
  const semCadastro = modelos.filter((m) => !m.codInterno).length;
  const [desfecho, setDesfecho] = useState<string>(doc.desfecho ?? "AGUARDANDO");
  const escolhidaAtual = soEscolhida(tiers);

  return (
    <>
      <ResumoBox
        rows={[
          { label: "Cliente", value: doc.cliente },
          { label: modelos.length > 1 ? `Modelos (${modelos.length})` : "Produto", value: doc.produtoDescricao },
          { label: "Nº de Orçamento", value: doc.numeroOrcamento || "—" },
        ]}
      />

      <div className="mt-4">
        <DiretrizBlock>
          {semCadastro
            ? `Registre o retorno do cliente. Se for positivo, o card vai para a etapa 7 (Cadastro de Produto), porque ${semCadastro > 1 ? `${semCadastro} modelos ainda não têm` : "o produto ainda não tem"} Nº de Cadastro; os demais desfechos vão direto para o Histórico.`
            : "Registre o retorno do cliente. Com o desfecho registrado, o card vai para o Histórico."}
        </DiretrizBlock>
      </div>

      <div className="mt-4">
        <FormSection title={tiers.length > 1 ? "SOs ofertadas" : "Preço"}>
          <LinhasSO tiers={tiers} destacar={tiers.length > 1 ? escolhidaAtual : null} />
        </FormSection>
      </div>

      <div className="mt-4">
        <ResumoBox
          rows={[
            { label: "Oferta enviada em", value: fmtDateTime(doc.finalizadoEm) },
            ...(doc.desfechoEm ? [{ label: "Desfecho registrado em", value: fmtDateTime(doc.desfechoEm) }] : []),
          ]}
        />
      </div>

      {/* O cliente pediu outra quantidade depois da oferta: a nova entra e o card volta pro Orçamento
          com as linhas já ofertadas preservadas (ver cotarNovaQuantidade em painel/actions.ts). */}
      {(!doc.desfecho || doc.desfecho === "AGUARDANDO") && (
        <form onSubmit={onCotar} className="mt-4">
          <input type="hidden" name="id" value={doc.id} />
          <FormSection title="O cliente pediu outra quantidade?">
            <p className="-mt-1 text-xs text-muted-foreground">
              A oferta que você já enviou fica como está (preço, SO e decisão da Diretoria). O card volta para o Orçamento só para
              precificar a quantidade nova, e depois segue com todas as linhas para o cliente escolher.
            </p>
            <Field label="Nova quantidade">
              <ListaDinamica name="novaQuantidade" placeholder="Ex.: 100.000" botaoLabel="Adicionar outra quantidade" obrigatorio />
            </Field>
            {estadoCotar?.erro && <div className="anexo-erro">{estadoCotar.erro}</div>}
            <div>
              <Button type="submit" variant="outline" disabled={cotando}>{cotando ? "Enviando…" : "Cotar nova quantidade"}</Button>
            </div>
          </FormSection>
        </form>
      )}

      {/* O cliente pediu desconto/ajuste de preço depois da oferta: guarda a oferta anterior e devolve o card
          ao Orçamento para refazer as condições e a Diretoria reaprovar (ver pedirAjusteDePreco). */}
      {(!doc.desfecho || doc.desfecho === "AGUARDANDO") && (
        <form onSubmit={onAjuste} className="mt-4">
          <input type="hidden" name="id" value={doc.id} />
          {voltarPara && <input type="hidden" name="voltarPara" value={voltarPara} />}
          <FormSection title="O cliente pediu ajuste de preço?">
            <p className="-mt-1 text-xs text-muted-foreground">
              A oferta que você enviou fica guardada, como está. O card volta para o Orçamento para refazer o valor da faca, a comissão e o preço;
              a Diretoria reaprova (sempre à mão) e a oferta nova segue ao cliente. Pode ter mais de uma rodada.
            </p>
            <Field label="O que o cliente pediu">
              <Textarea name="pedido" rows={2} maxLength={1000} required placeholder="Ex.: desconto de 5%, ou R$ 480 o milheiro" />
            </Field>
            {estadoAjuste?.erro && <div className="anexo-erro">{estadoAjuste.erro}</div>}
            <div>
              <Button type="submit" variant="outline" disabled={ajustando}>{ajustando ? "Enviando…" : "Pedir ajuste de preço (voltar ao Orçamento)"}</Button>
            </div>
          </FormSection>
        </form>
      )}

      <form onSubmit={onSubmit} className="mt-4">
        <input type="hidden" name="id" value={doc.id} />
        {voltarPara && <input type="hidden" name="voltarPara" value={voltarPara} />}
        <FormSection title="Retorno do cliente">
          <Field label="Desfecho">
            {/* Valor por campo escondido, não pelo `name` do Select: o React limpa o formulário
                depois de cada envio (inclusive um que voltou com erro), e o <select> interno do
                Radix voltava pra "Aguardando", escondendo a escolha da SO. */}
            <input type="hidden" name="desfecho" value={desfecho} />
            <Select value={desfecho} onValueChange={setDesfecho}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DESFECHOS.map((d) => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          {/* As SOs são alternativas: o cliente fecha uma só, e é o valor dela que conta no
              Histórico e na comparação do próximo orçamento. Resposta do Thiago em 30/09/2026. */}
          {desfecho === "POSITIVO" && tiers.length > 1 && (
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-sm font-medium text-foreground">Qual linha (SO) o cliente aprovou?</legend>
              {tiers.map((t, i) => (
                <label key={i} className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-muted/50">
                  <input type="radio" name="soEscolhida" value={i} defaultChecked={t === escolhidaAtual} className="accent-primary" />
                  <span className="font-mono text-xs text-muted-foreground">{t.numeroSequencial ? `SO ${t.numeroSequencial}` : "SO"}</span>
                  <span className="text-foreground">
                    {t.quantidade}
                    {t.papel && <span className="text-muted-foreground"> · {t.papel}</span>}
                  </span>
                  <span className="ml-auto font-mono text-xs text-muted-foreground">{fmtMoney(valorSO(t))}</span>
                </label>
              ))}
            </fieldset>
          )}
          {desfecho === "POSITIVO" && (
            <Field label="Nº do pedido do cliente (obrigatório)" hint="A ordem de compra que o cliente enviou para a SO aprovada. Vendas vê este número no Aceite.">
              <Input name="pedidoCliente" required defaultValue={escolhidaAtual?.pedidoCliente ?? ""} />
            </Field>
          )}
          {/* E-mails e documentos do cliente para corroborar a ordem de compra. Sobem na hora (não
              dependem de "Registrar desfecho") e Vendas os consulta no Aceite. */}
          {desfecho === "POSITIVO" && (
            <AnexoUpload orcamentoId={doc.id} tipo="ORDEM_COMPRA" anexos={doc.anexos.filter((a) => a.tipo === "ORDEM_COMPRA")} />
          )}
          <Field label="Motivo (opcional)">
            <Input name="motivo" defaultValue={doc.desfechoMotivo ?? ""} />
          </Field>
        </FormSection>
        {state?.erro && <div className="anexo-erro mt-4">{state.erro}</div>}
        <div className="mt-4">
          <Button type="submit" disabled={pending}>{pending ? "Registrando…" : "Registrar desfecho"}</Button>
        </div>
      </form>

    </>
  );
}
