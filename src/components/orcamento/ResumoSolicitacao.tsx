"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { ReqCliente } from "@/lib/orcamentos/types";
import { FormSection, ResumoBox } from "@/components/form-section";

type DadosSolicitacao = {
  origemPedido?: string | null;
  classificacaoDetalhe?: string | null;
  analiseCredito?: string | null;
  fsc?: string | null;
  usaSelo?: boolean;
  cnpj?: string | null;
  endereco?: string | null;
  representante?: string | null;
  comissaoCev?: string | null;
  telefone?: string | null;
  email?: string | null;
  contatoCompras?: string | null;
  condPagamento?: string | null;
  modalidade?: string | null;
  entregaLocalidade?: string | null;
  qtdEntregas?: string | null;
  entregaDatas?: string | null;
  codigoCliente?: string | null;
  obs?: string | null;
  reqCliente?: ReqCliente | null;
};

function lista(v: string[] | undefined, outro?: string | null): string {
  const partes = [...(v ?? [])];
  if (outro) partes.push(outro);
  return partes.length ? partes.join(", ") : "—";
}

// Tudo que foi lançado em Em Aberto, só leitura, pra Engenharia ver de uma vez (sem precisar
// voltar etapa) e lançar no sistema integrado da empresa — pedido do Thiago em 23/09/2026:
// "dados lançados anteriormente ao processo de engenharia precisam ser visíveis no campo
// engenharia". Mesmos agrupamentos/rótulos de CamposComerciaisFields, só sem os inputs.
// Aberto por padrão (é justamente o que a Engenharia precisa olhar primeiro).
export function ResumoSolicitacao({ doc }: { doc: DadosSolicitacao }) {
  const [aberto, setAberto] = useState(true);
  const r = doc.reqCliente;

  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-foreground hover:bg-muted/40"
      >
        Dados lançados na Solicitação
        {aberto ? <ChevronUp className="h-3.5 w-3.5 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0" />}
      </button>

      {aberto && (
        <div className="flex flex-col gap-4 border-t border-border p-3">
          <FormSection title="Classificação">
            <ResumoBox
              rows={[
                { label: "Origem do pedido", value: doc.origemPedido || "—" },
                { label: "Detalhe da classificação", value: doc.classificacaoDetalhe || "—" },
                { label: "Análise de crédito", value: doc.analiseCredito || "—" },
                { label: "FSC", value: doc.fsc || "—" },
                { label: "Usa selo", value: doc.usaSelo ? "Sim" : "Não" },
              ]}
            />
          </FormSection>

          <FormSection title="Cliente">
            <ResumoBox
              rows={[
                { label: "CNPJ", value: doc.cnpj || "—" },
                { label: "Endereço", value: doc.endereco || "—" },
                { label: "Representante", value: doc.representante || "—" },
                { label: "Comissão CEV", value: doc.comissaoCev || "—" },
                { label: "Telefone", value: doc.telefone || "—" },
                { label: "E-mail", value: doc.email || "—" },
                { label: "Contato compras", value: doc.contatoCompras || "—" },
              ]}
            />
          </FormSection>

          <FormSection title="Condições comerciais e entrega">
            <ResumoBox
              rows={[
                { label: "Condição de pagamento", value: doc.condPagamento || "—" },
                { label: "Modalidade", value: doc.modalidade || "—" },
                { label: "Localidade de entrega", value: doc.entregaLocalidade || "—" },
                { label: "Qtd. de entregas", value: doc.qtdEntregas || "—" },
                { label: "Datas de entrega", value: doc.entregaDatas || "—" },
              ]}
            />
          </FormSection>

          <FormSection title="Produto">
            <ResumoBox
              rows={[
                { label: "Código do cliente", value: doc.codigoCliente || "—" },
                { label: "Observações", value: doc.obs || "—" },
              ]}
            />
          </FormSection>

          <FormSection title="Medidas e suporte">
            <ResumoBox
              rows={[
                { label: "Formato — Comprimento (mm)", value: r?.medidaF || "—" },
                { label: "Formato — Largura (mm)", value: r?.medidaL || "—" },
                { label: "Altura (mm)", value: r?.medidaA || "—" },
                {
                  label: "Suporte",
                  value: r?.suportes?.length
                    ? r.suportes.map((s) => `${s.descricao || "—"} (${s.gramatura || "—"} g/m²)`).join("; ")
                    : "—",
                },
              ]}
            />
          </FormSection>

          <FormSection title="Acabamento e revestimento">
            <ResumoBox
              rows={[
                { label: "Acabamento", value: lista(r?.acabamentos, r?.acabamentoOutro) },
                { label: "Verniz", value: lista(r?.verniz) },
                { label: "Plástico", value: lista(r?.plastico) },
              ]}
            />
          </FormSection>

          <FormSection title="Embalagem e impressão">
            <ResumoBox
              rows={[
                { label: "Embalagem", value: lista(r?.embalagem) },
                { label: "Detalhe da embalagem", value: r?.embalagemDetalhe || "—" },
                { label: "Impressão", value: lista(r?.impressao) },
                { label: "Fechamento tampa", value: r?.fechamentoTampa || "—" },
                { label: "Fechamento fundo", value: r?.fechamentoFundo || "—" },
              ]}
            />
          </FormSection>
        </div>
      )}
    </div>
  );
}
