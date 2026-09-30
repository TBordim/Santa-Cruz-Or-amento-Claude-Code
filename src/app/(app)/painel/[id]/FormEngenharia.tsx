"use client";

import { useFormActionSemReset, porBotao } from "@/hooks/use-form-action";
import { AnexoUpload } from "@/components/anexos/AnexoUpload";
import { salvarRequisitos, avancarOrcamento } from "../actions";
import type { OrcamentoComAnexos } from "@/lib/orcamentos/doc-type";
import type { ReqCliente, ReqTecnicos, SuporteTecnico } from "@/lib/orcamentos/types";
import { OPCOES_ANEXOS_ENGENHARIA, classificacaoLabel } from "@/lib/orcamentos/constantes";
import { modelosDoDoc, ehRepeticao, usoDoMaterial, textoMaterial } from "@/lib/orcamentos/modelos";
import { FormSection, Field, Row2, ResumoBox, DiretrizBlock, AcoesBar } from "@/components/form-section";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useSalvoToast } from "@/hooks/use-salvo-toast";
import { CodigoInternoInput } from "@/components/orcamento/CodigoInternoInput";

// Formato suporte e aproveitamento, POR MATERIAL — cada papel (principalmente as opções de
// fornecimento alternativas) tem o próprio formato, código, quantidade por folha e
// aproveitamento. Resposta do Thiago em 30/09/2026. Um bloco por material da Solicitação, na
// mesma ordem, sem adicionar/remover aqui: o material é decidido na Solicitação. Card de antes
// dessa mudança tinha esses campos uma vez só pro card: aparecem no primeiro material.
function BlocoMaterial({ titulo, uso, v }: { titulo: string; uso: string | null; v: SuporteTecnico }) {
  const campo = (name: string, valor: string | undefined) => <Input name={name} defaultValue={valor ?? ""} form="form-engenharia" />;
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-3">
      <div className="text-sm font-semibold text-foreground">
        {titulo}
        {uso && <span className="ml-1.5 font-normal text-muted-foreground">· {uso}</span>}
      </div>
      <Row2 compacto>
        <Field label="Formato">{campo("suporteTecFormato", v.formato)}</Field>
        <Field label="Código">{campo("suporteTecCodigo", v.codigo)}</Field>
      </Row2>
      <Row2 compacto>
        <Field label="Qtd. por Folha Inteira">{campo("suporteTecQtdFolha", v.qtdFolha)}</Field>
        <Field label="Fls. Acerto">{campo("suporteTecFlsAcerto", v.flsAcerto)}</Field>
      </Row2>
      <Row2 compacto>
        <Field label="Fator — Comprimento (cm)">{campo("suporteTecFatorC", v.fatorC)}</Field>
        <Field label="Fator — Largura (cm)">{campo("suporteTecFatorL", v.fatorL)}</Field>
      </Row2>
      <Row2 compacto>
        <Field label="Corte">{campo("suporteTecCorte", v.corte)}</Field>
        <Field label="Qtd./ch.">{campo("suporteTecQtdCh", v.qtdCh)}</Field>
      </Row2>
      <Row2 compacto>
        <Field label="Formato Ideal — Comprimento (cm)">{campo("suporteTecIdealC", v.idealC)}</Field>
        <Field label="Formato Ideal — Largura (cm)">{campo("suporteTecIdealL", v.idealL)}</Field>
      </Row2>
    </div>
  );
}

// Envio pelo onSubmit (useFormActionSemReset), não por <form action>/formAction: com action o
// React limpa o formulário quando ela termina — inclusive quando volta com erro de validação —
// e tudo que a pessoa digitou e ainda não estava salvo sumia da tela (achado no teste de
// 30/09/2026: modelo novo e Observações apagados depois de um "Liberar" com erro).
export function FormEngenharia({ doc }: { doc: OrcamentoComAnexos }) {
  const [state, salvarSubmit, salvando] = useFormActionSemReset(salvarRequisitos, undefined);
  const [state2, avancarSubmit, avancando] = useFormActionSemReset(avancarOrcamento, undefined);
  const erro = state?.erro ?? state2?.erro;
  useSalvoToast(salvando, state?.erro, "Requisitos salvos.");

  const c = doc.reqCliente as ReqCliente | null;
  const r = doc.reqTecnicos as ReqTecnicos | null;
  const modelos = modelosDoDoc(doc);
  const materiaisCliente = c?.suportes ?? [];
  const opcoes = materiaisCliente.filter((s, i) => usoDoMaterial(s, i) === "opcao").length;
  const totalBlocos = Math.max(materiaisCliente.length, r?.suportes?.length ?? 0, 1);
  const valoresMaterial = (i: number): SuporteTecnico => {
    const v = r?.suportes?.[i] ?? { formato: "", codigo: "" };
    if (i > 0) return v;
    return {
      ...v,
      qtdFolha: v.qtdFolha ?? r?.qtdFolha,
      flsAcerto: v.flsAcerto ?? r?.flsAcerto,
      fatorC: v.fatorC ?? r?.fatorC,
      fatorL: v.fatorL ?? r?.fatorL,
      corte: v.corte ?? r?.corte,
      qtdCh: v.qtdCh ?? r?.qtdCh,
      idealC: v.idealC ?? r?.idealC,
      idealL: v.idealL ?? r?.idealL,
    };
  };

  return (
    <>
      <ResumoBox
        rows={[
          { label: "Cliente", value: doc.cliente },
          ...(modelos.length > 1
            ? [{ label: "Modelos", value: `${modelos.length} modelos na mesma faca` }]
            : [{ label: "Produto", value: doc.produtoDescricao }]),
          { label: "Classificação", value: classificacaoLabel(doc.classificacao) },
        ]}
      />

      <div className="mt-4">
        <DiretrizBlock>
          Preencha os requisitos técnicos (formato e aproveitamento de cada material, anexos previstos) antes de enviar para o Orçamento.
          {opcoes > 1 && ` Este orçamento tem ${opcoes} opções de papel: cada uma tem o próprio formato e aproveitamento.`}
        </DiretrizBlock>
      </div>

      <form id="form-engenharia" className="mt-4" onSubmit={porBotao({ salvar: salvarSubmit, avancar: avancarSubmit }, "salvar")}>
        <input type="hidden" name="id" value={doc.id} form="form-engenharia" />

        <FormSection title="Pré cadastro">
          <Field label="Nº de Pré Cadastro" hint="Obrigatório para liberar para a etapa seguinte.">
            <Input name="preCadastro" defaultValue={doc.preCadastro ?? ""} form="form-engenharia" />
          </Field>
          {/* Um código por modelo. Produto novo não gera código aqui — só se o cliente aprovar o
              orçamento (etapa 7, Cadastro de Produto). */}
          {modelos.map((m, i) => (
            <Field
              key={m.id}
              label={modelos.length > 1 ? `Código interno — ${m.descricao || `Modelo ${i + 1}`}` : "Código interno (Santa Cruz)"}
              hint={
                ehRepeticao(m.classificacao)
                  ? "Veio da Solicitação — ajuste se necessário."
                  : "Produto novo: o código só é gerado se o cliente aprovar (etapa 7). Preencha só se já souber."
              }
            >
              <CodigoInternoInput name={`codInterno_${m.id}`} defaultValue={m.codInterno} form="form-engenharia" />
            </Field>
          ))}
        </FormSection>

        <FormSection title="Suporte — formato e aproveitamento">
          <p className="-mt-2 text-xs text-muted-foreground">Descrição e gramatura já vieram da Solicitação. Preencha um bloco por material.</p>
          {Array.from({ length: totalBlocos }, (_, i) => {
            const mc = materiaisCliente[i];
            return (
              <BlocoMaterial
                key={i}
                titulo={`Material ${i + 1}${mc ? ` — ${textoMaterial(mc)}` : ""}`}
                uso={mc && materiaisCliente.length > 1 ? (usoDoMaterial(mc, i) === "opcao" ? "Opção de fornecimento" : "Uso conjunto") : null}
                v={valoresMaterial(i)}
              />
            );
          })}
        </FormSection>

        <FormSection title="Anexos previstos">
          <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
            {OPCOES_ANEXOS_ENGENHARIA.map((op) => (
              <label key={op} className="flex min-h-9 items-center gap-2 text-sm md:min-h-0">
                <Checkbox name="anexosPrevistos" value={op} defaultChecked={r?.anexos?.includes(op)} form="form-engenharia" />
                <span>{op}</span>
              </label>
            ))}
          </div>
        </FormSection>

        <FormSection title="Observações">
          <Field label="Informações complementares">
            <Textarea name="infoComplementares" rows={2} defaultValue={r?.infoComplementares ?? ""} form="form-engenharia" />
          </Field>
          <Field label="Observações de engenharia">
            <Textarea name="obsEngenharia" rows={2} defaultValue={doc.obsEngenharia ?? ""} form="form-engenharia" />
          </Field>
        </FormSection>
      </form>

      <div className="mt-2 flex flex-col gap-4">
        <AnexoUpload orcamentoId={doc.id} tipo="ENGENHARIA" anexos={doc.anexos.filter((a) => a.tipo === "ENGENHARIA")} />
      </div>

      {erro && <div className="anexo-erro">{erro}</div>}
      <AcoesBar>
        <Button type="submit" form="form-engenharia" value="salvar" variant="outline" disabled={salvando}>
          Salvar sem liberar
        </Button>
        <Button type="submit" form="form-engenharia" value="avancar" disabled={avancando}>
          {avancando ? "Enviando…" : "Liberar para Orçamento"}
        </Button>
      </AcoesBar>
    </>
  );
}
