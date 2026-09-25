"use client";

import { useActionState } from "react";
import { salvarOrcamento, enviarParaDiretoria, solicitarCompras, registrarRetornoCompras } from "../actions";
import type { OrcamentoComAnexos } from "@/lib/orcamentos/doc-type";
import type { ReqCliente, PrecificacaoTier } from "@/lib/orcamentos/types";
import { fmtDateTime, resumoAcabamento } from "@/lib/orcamentos/constantes";
import { paraCampoBR } from "@/lib/orcamentos/motor";
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

export function FormOrcamento({ doc }: { doc: OrcamentoComAnexos }) {
  const [state, salvarAction, salvando] = useActionState(salvarOrcamento, undefined);
  const [state2, enviarAction, enviando] = useActionState(enviarParaDiretoria, undefined);
  const erro = state?.erro ?? state2?.erro;
  useSalvoToast(salvando, state?.erro, "Precificação salva.");

  const c = doc.reqCliente as ReqCliente | null;
  const quantidades = c?.quantidadesLista ?? [];
  const tiers = (doc.precificacao as unknown as PrecificacaoTier[] | null) ?? [];
  // Cards de antes desta mudança (25/09/2026) tinham um SOPP só, digitado como lista separada
  // por vírgula (ex.: "28730, 28731, 28732, 28733") — aproveita essa lista, posicionalmente,
  // como sugestão inicial de cada faixa que ainda não tem o próprio número gravado. Só um
  // valor pra começar; salvar grava certo, por faixa, dali em diante.
  const soppLegado = (doc.numeroSequencial ?? "").split(",").map((s) => s.trim());

  return (
    <>
      <ResumoBox
        rows={[
          { label: "Cliente", value: doc.cliente },
          { label: "Produto", value: doc.produtoDescricao },
          { label: "Nº de Pré Cadastro", value: doc.preCadastro || "—" },
        ]}
      />

      <div className="mt-4">
        <ComprasBox doc={doc} />
      </div>

      <form id="form-orcamento" className="mt-4">
        <input type="hidden" name="id" value={doc.id} form="form-orcamento" />

        {quantidades.length === 0 ? (
          <div className="empty-state">Nenhuma quantidade lançada na Solicitação — volte a etapa e adicione ao menos uma.</div>
        ) : (
          quantidades.map((qtd, i) => {
            const t = tiers[i];
            return (
              <FormSection key={i} title={quantidades.length > 1 ? `Quantidade: ${qtd}` : "Precificação"}>
                <Field label="Nº de SOPP" hint="Um número por faixa — cada quantidade é uma ordem de produção separada.">
                  <Input name={`numeroSequencial_${i}`} required defaultValue={t?.numeroSequencial || soppLegado[i] || ""} form="form-orcamento" />
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

        <FormSection title="Comum a todas as faixas">
          {/* Prazo saiu daqui — já é lançado na Solicitação (campo "Datas de entrega"), não
              precisa de um segundo lugar pra essa informação. Pedido do Thiago em 23/09/2026.
              Nº de SOPP também saiu — agora é um por faixa, ali em cima, não um só pro card
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
        <Button type="submit" form="form-orcamento" formAction={salvarAction} variant="outline" disabled={salvando}>
          Salvar sem liberar
        </Button>
        <Button type="submit" form="form-orcamento" formAction={enviarAction} disabled={enviando || doc.aguardandoCompras}>
          {enviando ? "Enviando…" : "Enviar para Diretoria"}
        </Button>
      </AcoesBar>
    </>
  );
}
