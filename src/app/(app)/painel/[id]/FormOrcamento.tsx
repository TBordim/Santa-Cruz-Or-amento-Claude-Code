"use client";

import { useActionState } from "react";
import { useFormActionSemReset, porBotao } from "@/hooks/use-form-action";
import { salvarOrcamento, enviarParaDiretoria, solicitarCompras, registrarRetornoCompras } from "../actions";
import type { OrcamentoComAnexos } from "@/lib/orcamentos/doc-type";
import type { ReqCliente, ReqTecnicos, PrecificacaoTier } from "@/lib/orcamentos/types";
import { AjustesOrcamento } from "./AjustesOrcamento";
import { fmtDateTime, resumoAcabamento } from "@/lib/orcamentos/constantes";
import { paraCampoBR } from "@/lib/orcamentos/motor";
import { combinacoesSO, chaveSO, opcoesDePapel, modelosDoDoc } from "@/lib/orcamentos/modelos";
import { FormSection, Field, Row2, ResumoBox, AcoesBar } from "@/components/form-section";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useSalvoToast } from "@/hooks/use-salvo-toast";

function ComprasBox({ doc }: { doc: OrcamentoComAnexos }) {
  if (doc.aguardandoCompras) {
    return (
      <div className="rounded-lg border border-warn/30 bg-warn-soft p-3">
        <div className="text-sm text-foreground">
          <strong>Aguardando preço de Compras</strong> desde {fmtDateTime(doc.comprasPedidoEm)}
        </div>
        {doc.comprasItem && <div className="mt-1 text-sm text-muted-foreground">Solicitado: {doc.comprasItem}</div>}
        <form action={registrarRetornoCompras} className="mt-3">
          <input type="hidden" name="id" value={doc.id} />
          <Button type="submit" variant="outline" size="sm">Registrar retorno de Compras</Button>
        </form>
      </div>
    );
  }
  return <ComprasFormBox doc={doc} />;
}

function ComprasFormBox({ doc }: { doc: OrcamentoComAnexos }) {
  const [, action, pending] = useActionState(solicitarCompras, undefined);
  useSalvoToast(pending, undefined, "Solicitação enviada a Compras.");
  return (
    <form action={action} className="rounded-lg border border-border bg-muted/30 p-3">
      <input type="hidden" name="id" value={doc.id} />
      <div className="text-sm text-muted-foreground">
        {doc.comprasRetornoEm
          ? `Compras respondeu em ${fmtDateTime(doc.comprasRetornoEm)} (solicitado em ${fmtDateTime(doc.comprasPedidoEm)}).`
          : "Se faltar preço de matéria-prima ou insumo, registre aqui — o orçamento fica em espera até você lançar o retorno."}
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">O que falta cotar</label>
        <Input name="item" placeholder="Ex.: papel cartão 270g, cola bico" />
      </div>
      <div className="mt-3">
        <Button type="submit" variant="ghost" size="sm" disabled={pending}>Solicitar preço a Compras</Button>
      </div>
    </form>
  );
}

// Envio pelo onSubmit (useFormActionSemReset), não por <form action>/formAction: com action o
// React limpa o formulário quando ela termina — inclusive quando volta com erro de validação —
// e tudo que a pessoa digitou e ainda não estava salvo sumia da tela (achado no teste de
// 30/09/2026: modelo novo e Observações apagados depois de um "Liberar" com erro).
export function FormOrcamento({ doc }: { doc: OrcamentoComAnexos }) {
  const [state, salvarSubmit, salvando] = useFormActionSemReset(salvarOrcamento, undefined);
  const [state2, enviarSubmit, enviando] = useFormActionSemReset(enviarParaDiretoria, undefined);
  const erro = state?.erro ?? state2?.erro;
  useSalvoToast(salvando, state?.erro, "Precificação salva.");

  const c = doc.reqCliente as ReqCliente | null;
  const r = doc.reqTecnicos as ReqTecnicos | null;
  // Uma SO por combinação quantidade × opção de papel (ver combinacoesSO em modelos.ts).
  const combinacoes = combinacoesSO(c);
  const nPapeis = opcoesDePapel(c).length;
  const modelos = modelosDoDoc(doc);
  const tiers = (doc.precificacao as unknown as PrecificacaoTier[] | null) ?? [];
  const tierPorChave = new Map(tiers.map((t) => [chaveSO(t), t]));
  // Cards de antes desta mudança (25/09/2026) tinham uma SO só, digitado como lista separada
  // por vírgula (ex.: "28730, 28731, 28732, 28733") — aproveita essa lista, posicionalmente,
  // como sugestão inicial de cada faixa que ainda não tem o próprio número gravado. Só um
  // valor pra começar; salvar grava certo, por faixa, dali em diante.
  const soppLegado = (doc.numeroSequencial ?? "").split(",").map((s) => s.trim());

  return (
    <>
      <ResumoBox
        rows={[
          { label: "Cliente", value: doc.cliente },
          { label: modelos.length > 1 ? `Modelos (${modelos.length})` : "Produto", value: doc.produtoDescricao },
          { label: "Nº de Pré Cadastro", value: doc.preCadastro || "—" },
          ...(nPapeis > 1 ? [{ label: "Opções de papel", value: `${nPapeis} — uma SO por quantidade em cada papel` }] : []),
        ]}
      />

      <div className="mt-4">
        <ComprasBox doc={doc} />
      </div>

      {/* Fora do <form id="form-orcamento"> de propósito: tem o próprio envio. A key recomeça o
          painel limpo depois de cada gravação. */}
      <AjustesOrcamento
        key={JSON.stringify([c?.quantidadesLista, c?.suportes, (r?.ajustesOrcamento ?? []).length])}
        id={doc.id}
        quantidades={c?.quantidadesLista ?? []}
        suportes={c?.suportes ?? []}
        ajustes={r?.ajustesOrcamento ?? []}
      />

      <form id="form-orcamento" className="mt-4" onSubmit={porBotao({ salvar: salvarSubmit, enviar: enviarSubmit }, "salvar")}>
        <input type="hidden" name="id" value={doc.id} form="form-orcamento" />

        {combinacoes.length === 0 ? (
          <div className="empty-state">Nenhuma quantidade lançada na Solicitação — use &quot;Ajustar quantidades e papéis&quot;, acima, para adicionar ao menos uma.</div>
        ) : (
          combinacoes.map((cb, i) => {
            const t = tierPorChave.get(chaveSO(cb));
            const titulo =
              combinacoes.length === 1 ? "Precificação" : `Quantidade: ${cb.quantidade}${cb.papel ? ` · Papel: ${cb.papel}` : ""}`;
            return (
              <FormSection key={chaveSO(cb)} title={titulo}>
                <Field label="Nº da SO" hint="Um número por SO (o &quot;Orçamento S.O. nº&quot;): cada quantidade, em cada papel.">
                  <Input
                    name={`numeroSequencial_${i}`}
                    required
                    defaultValue={t?.numeroSequencial || (cb.papel ? "" : soppLegado[i]) || ""}
                    form="form-orcamento"
                  />
                </Field>
                <Row2 compacto>
                  <Field label="Preço projetado">
                    <Input name={`precoProjetado_${i}`} defaultValue={paraCampoBR(t?.precoProjetado)} placeholder="Ex.: 1.234,56" form="form-orcamento" />
                  </Field>
                  <Field label="Custo primário (%)">
                    <Input name={`custoPrimarioPct_${i}`} defaultValue={paraCampoBR(t?.custoPrimarioPct)} form="form-orcamento" />
                  </Field>
                </Row2>
                <Row2 compacto>
                  <Field label="Margem P2 (%)">
                    <Input name={`margemP2Pct_${i}`} defaultValue={paraCampoBR(t?.margemP2Pct)} form="form-orcamento" />
                  </Field>
                  <div />
                </Row2>
                <Row2 compacto>
                  <Field label="Número de lotes"><Input name={`numeroLotes_${i}`} defaultValue={t?.numeroLotes ?? ""} form="form-orcamento" /></Field>
                  <Field label="Número de setups"><Input name={`numeroSetups_${i}`} defaultValue={t?.numeroSetups ?? ""} form="form-orcamento" /></Field>
                </Row2>
              </FormSection>
            );
          })
        )}

        <FormSection title="Comum a todas as SOs">
          {/* Prazo saiu daqui — já é lançado na Solicitação (campo "Datas de entrega"), não
              precisa de um segundo lugar pra essa informação. Pedido do Thiago em 23/09/2026.
              Nº da SO também saiu — agora é uma por faixa, ali em cima, não um só pro card
              inteiro. Pedido do Thiago em 25/09/2026. */}
          <Field label="Acabamento" hint="Sugerido a partir da Solicitação — ajuste se precisar.">
            <Input name="acabamento" defaultValue={doc.acabamento || resumoAcabamento(c)} form="form-orcamento" />
          </Field>
          <label className="flex min-h-9 items-center gap-2 text-sm md:min-h-0">
            <Checkbox name="comissaoEspecial" defaultChecked={doc.comissaoEspecial} form="form-orcamento" />
            <span>Condição comercial especial (comissão/desconto)</span>
          </label>
          <Field label="Observação da condição especial">
            <Input name="comissaoObs" defaultValue={doc.comissaoObs ?? ""} form="form-orcamento" />
          </Field>
        </FormSection>
      </form>


      {erro && <div className="anexo-erro">{erro}</div>}
      <AcoesBar>
        <Button type="submit" form="form-orcamento" value="salvar" variant="outline" disabled={salvando}>
          Salvar sem liberar
        </Button>
        <Button type="submit" form="form-orcamento" value="enviar" disabled={enviando || doc.aguardandoCompras}>
          {enviando ? "Enviando…" : "Enviar para Diretoria"}
        </Button>
      </AcoesBar>
    </>
  );
}
