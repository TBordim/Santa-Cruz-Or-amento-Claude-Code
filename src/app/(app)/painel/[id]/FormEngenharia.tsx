"use client";

import { useActionState } from "react";
import { AnexoUpload } from "@/components/anexos/AnexoUpload";
import { SuportesLista } from "@/components/orcamento/SuportesLista";
import { salvarRequisitos, avancarOrcamento } from "../actions";
import type { OrcamentoComAnexos } from "@/lib/orcamentos/doc-type";
import type { ReqCliente, ReqTecnicos } from "@/lib/orcamentos/types";
import { OPCOES_ANEXOS_ENGENHARIA } from "@/lib/orcamentos/constantes";
import { FormSection, Field, Row2, ResumoBox, DiretrizBlock, AcoesBar } from "@/components/form-section";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useSalvoToast } from "@/hooks/use-salvo-toast";
import { CodigoInternoInput } from "@/components/orcamento/CodigoInternoInput";
import { ResumoSolicitacao } from "@/components/orcamento/ResumoSolicitacao";

export function FormEngenharia({ doc }: { doc: OrcamentoComAnexos }) {
  const [state, salvarAction, salvando] = useActionState(salvarRequisitos, undefined);
  const [state2, avancarAction, avancando] = useActionState(avancarOrcamento, undefined);
  const erro = state?.erro ?? state2?.erro;
  useSalvoToast(salvando, state?.erro, "Requisitos salvos.");

  const c = doc.reqCliente as ReqCliente | null;
  const r = doc.reqTecnicos as ReqTecnicos | null;
  const ehRepeticao = !!doc.classificacao?.startsWith("REPETICAO");

  return (
    <>
      <ResumoBox
        rows={[
          { label: "Cliente", value: doc.cliente },
          { label: "Produto", value: doc.produtoDescricao },
          { label: "Classificação", value: doc.classificacao },
        ]}
      />

      <div className="mt-4">
        <DiretrizBlock>Preencha os requisitos técnicos (formato suporte, anexos previstos) antes de enviar para o Orçamento.</DiretrizBlock>
      </div>

      <div className="mt-4">
        <ResumoSolicitacao doc={{ ...doc, reqCliente: c }} />
      </div>

      <form id="form-engenharia" className="mt-4">
        <input type="hidden" name="id" value={doc.id} form="form-engenharia" />

        <FormSection title="Pré cadastro">
          <Row2>
            <Field label="Nº de Pré Cadastro" hint="Obrigatório para liberar para a etapa seguinte.">
              <Input name="preCadastro" defaultValue={doc.preCadastro ?? ""} form="form-engenharia" />
            </Field>
            <Field label="Código interno (Santa Cruz)" hint={ehRepeticao ? "Veio da Solicitação — ajuste se necessário." : "Produto novo não gera código aqui — só se o cliente aprovar o orçamento (fica pendente na etapa Retorno do Cliente). Preencha só se já souber."}>
              <CodigoInternoInput name="codInterno" defaultValue={doc.codInterno ?? ""} form="form-engenharia" />
            </Field>
          </Row2>
        </FormSection>

        <FormSection title="Suporte — formato e código">
          <p className="-mt-2 text-xs text-muted-foreground">Descrição e gramatura já vieram da Solicitação — preencha aqui o formato e o código.</p>
          <SuportesLista
            campoA="suporteTecFormato"
            campoB="suporteTecCodigo"
            labelA="Formato"
            labelB="Código"
            valoresIniciais={
              (r?.suportes?.length ? r.suportes.map((s) => ({ a: s.formato, b: s.codigo })) : c?.suportes?.map(() => ({ a: "", b: "" }))) ?? undefined
            }
          />
        </FormSection>

        <FormSection title="Formato suporte">
          <Row2 compacto>
            <Field label="Qtd. por Folha Inteira"><Input name="qtdFolha" defaultValue={r?.qtdFolha ?? ""} form="form-engenharia" /></Field>
            <Field label="Fls. Acerto"><Input name="flsAcerto" defaultValue={r?.flsAcerto ?? ""} form="form-engenharia" /></Field>
          </Row2>
          <Row2 compacto>
            <Field label="Fator — Comprimento (cm)"><Input name="fatorC" defaultValue={r?.fatorC ?? ""} form="form-engenharia" /></Field>
            <Field label="Fator — Largura (cm)"><Input name="fatorL" defaultValue={r?.fatorL ?? ""} form="form-engenharia" /></Field>
          </Row2>
          <Row2 compacto>
            <Field label="Corte"><Input name="corte" defaultValue={r?.corte ?? ""} form="form-engenharia" /></Field>
            <Field label="Qtd./ch."><Input name="qtdCh" defaultValue={r?.qtdCh ?? ""} form="form-engenharia" /></Field>
          </Row2>
          <Row2 compacto>
            <Field label="Formato Ideal — Comprimento (cm)"><Input name="idealC" defaultValue={r?.idealC ?? ""} form="form-engenharia" /></Field>
            <Field label="Formato Ideal — Largura (cm)"><Input name="idealL" defaultValue={r?.idealL ?? ""} form="form-engenharia" /></Field>
          </Row2>
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
        <AnexoUpload orcamentoId={doc.id} tipo="ARTE" anexos={doc.anexos.filter((a) => a.tipo === "ARTE")} somenteLeitura />
        <AnexoUpload orcamentoId={doc.id} tipo="ENGENHARIA" anexos={doc.anexos.filter((a) => a.tipo === "ENGENHARIA")} />
      </div>

      {erro && <div className="anexo-erro">{erro}</div>}
      <AcoesBar>
        <Button type="submit" form="form-engenharia" formAction={salvarAction} variant="outline" disabled={salvando}>
          Salvar sem liberar
        </Button>
        <Button type="submit" form="form-engenharia" formAction={avancarAction} disabled={avancando}>
          {avancando ? "Enviando…" : "Liberar para Orçamento"}
        </Button>
      </AcoesBar>
    </>
  );
}
