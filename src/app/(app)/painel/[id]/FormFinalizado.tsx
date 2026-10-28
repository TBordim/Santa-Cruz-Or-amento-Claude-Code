"use client";

import { useState } from "react";
import { COM_QUEM_CONTATO, ESTILO_PRAZO, prazoDoOrcamento, rotuloContato, textoPrazo, PRAZO_VALIDADE_DIAS } from "@/lib/orcamentos/prazo";
import { useFormActionSemReset } from "@/hooks/use-form-action";
import { registrarDesfecho, cotarNovaQuantidade, pedirAjusteDePreco, registrarContatoRetorno, cancelarPorVencimento } from "../actions";
import { ListaDinamica } from "@/components/orcamento/ListaDinamica";
import type { OrcamentoComAnexos } from "@/lib/orcamentos/doc-type";
import type { PrecificacaoTier, ReqTecnicos } from "@/lib/orcamentos/types";
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
  const [estadoContato, onContato, registrandoContato] = useFormActionSemReset(registrarContatoRetorno, undefined);
  const [estadoCancelar, onCancelar, cancelando] = useFormActionSemReset(cancelarPorVencimento, undefined);
  const aguardando = !doc.desfecho || doc.desfecho === "AGUARDANDO";
  const prazo = aguardando ? prazoDoOrcamento(doc.finalizadoEm) : null;
  const contatos = ((doc.reqTecnicos as ReqTecnicos | null)?.contatosRetorno ?? []).slice().reverse();
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

      {/* Validade do orçamento: 15 dias a partir do envio da oferta. Vencido e sem definição, cancela por
          vencimento do prazo de retorno; antes disso o responsável do setor registra o contato. */}
      {prazo && (
        <div className={`mt-4 overflow-hidden rounded-lg border-2 ${prazo.vencido ? "border-bad bg-bad/10" : prazo.situacao === "ok" ? "border-border bg-muted/30" : "border-warn bg-warn-soft"}`}>
          <div className={`flex flex-wrap items-center gap-2 px-3 py-2 text-sm font-bold ${prazo.vencido ? "bg-bad text-white" : "text-foreground"}`}>
            <span className={`rounded-full px-2 py-0.5 text-xs ${prazo.vencido ? "bg-white/20" : ESTILO_PRAZO[prazo.situacao]}`}>{textoPrazo(prazo)}</span>
            <span className="font-normal">
              Validade do orçamento: {PRAZO_VALIDADE_DIAS} dias · oferta enviada em {fmtDateTime(doc.finalizadoEm)} · vence em {prazo.venceEm}
            </span>
          </div>
          <div className="flex flex-col gap-3 px-3 py-3 text-sm">
            {prazo.vencido ? (
              <p className="font-medium text-foreground">
                O prazo venceu. Entre em contato com o representante, o cliente ou o responsável para obter uma definição. Sem definição, cancele o orçamento por vencimento do prazo de retorno.
              </p>
            ) : prazo.situacao !== "ok" ? (
              <p className="font-medium text-foreground">O prazo está acabando: entre em contato com o representante, o cliente ou o responsável e registre abaixo.</p>
            ) : null}

            {contatos.length > 0 && (
              <div className="flex flex-col gap-1">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Contatos registrados</div>
                {contatos.map((c, i) => (
                  <div key={i} className="rounded-md bg-card px-3 py-1.5">
                    <span className="font-mono text-xs text-muted-foreground">{fmtDateTime(new Date(c.em))}</span>{" "}
                    <strong>{c.por}</strong> falou com <strong>{rotuloContato(c.com)}</strong>: {c.resultado}
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={onContato} className="flex flex-col gap-2 rounded-md bg-card p-3">
              <input type="hidden" name="id" value={doc.id} />
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Registrar contato</div>
              <div className="flex flex-wrap gap-2">
                <select name="com" required defaultValue="" className="h-11 rounded-lg border border-input bg-transparent px-2.5 text-base md:h-8 md:text-sm">
                  <option value="" disabled>Com quem falou…</option>
                  {COM_QUEM_CONTATO.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
                <Input name="resultado" required maxLength={500} placeholder="O que foi respondido ou combinado" className="min-w-[220px] flex-1" />
                <Button type="submit" variant="outline" disabled={registrandoContato}>{registrandoContato ? "Salvando…" : "Registrar contato"}</Button>
              </div>
              {estadoContato?.erro && <div className="anexo-erro">{estadoContato.erro}</div>}
            </form>

            {prazo.vencido && (
              <form onSubmit={onCancelar} className="flex flex-col gap-2 rounded-md bg-card p-3">
                <input type="hidden" name="id" value={doc.id} />
                {voltarPara && <input type="hidden" name="voltarPara" value={voltarPara} />}
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sem definição</div>
                <div className="flex flex-wrap gap-2">
                  <Input name="motivo" maxLength={500} placeholder="Observação (opcional)" className="min-w-[220px] flex-1" />
                  <Button type="submit" variant="destructive" disabled={cancelando}>{cancelando ? "Cancelando…" : "Cancelar por vencimento do prazo de retorno"}</Button>
                </div>
                {estadoCancelar?.erro && <div className="anexo-erro">{estadoCancelar.erro}</div>}
              </form>
            )}
          </div>
        </div>
      )}

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
