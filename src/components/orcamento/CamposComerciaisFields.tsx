import { ListaDinamica } from "./ListaDinamica";
import { SuportesLista } from "./SuportesLista";
import {
  ORIGENS_PEDIDO,
  CLASSIFICACOES,
  ANALISE_CREDITO,
  OPCOES_FSC,
  OPCOES_IMPRESSAO,
  OPCOES_ACABAMENTO,
  OPCOES_VERNIZ,
  OPCOES_PLASTICO,
  OPCOES_EMBALAGEM,
  OPCOES_MODALIDADE,
} from "@/lib/orcamentos/constantes";
import type { ReqCliente } from "@/lib/orcamentos/types";
import { FormSection, Field, Row2 } from "@/components/form-section";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CodigoInternoInput } from "./CodigoInternoInput";

function CheckGroup({ nome, opcoes, marcados }: { nome: string; opcoes: readonly string[]; marcados?: string[] }) {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
      {opcoes.map((op) => (
        <label key={op} className="flex items-center gap-2 text-sm">
          <Checkbox name={nome} value={op} defaultChecked={marcados?.includes(op)} />
          <span>{op}</span>
        </label>
      ))}
    </div>
  );
}

// Equivalente a camposComerciaisFieldsHtml() (santa-cruz-orcamentos.html, linhas 3163-3282) —
// compartilhado entre "Novo Orçamento" (sem login) e a etapa "Em Aberto" (editando um card
// existente). `defaults` é opcional: vazio para um card novo.
export function CamposComerciaisFields({
  defaults,
}: {
  defaults?: {
    origemPedido?: string | null;
    classificacao?: string | null;
    classificacaoDetalhe?: string | null;
    analiseCredito?: string | null;
    fsc?: string | null;
    usaSelo?: boolean;
    cliente?: string | null;
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
    produtoDescricao?: string | null;
    codigoCliente?: string | null;
    codInterno?: string | null;
    obs?: string | null;
    reqCliente?: ReqCliente | null;
  };
}) {
  const r = defaults?.reqCliente;
  const ehRepeticao = defaults?.classificacao?.startsWith("REPETICAO");

  return (
    <>
      <FormSection title="Classificação">
        <Row2>
          <Field label="Origem do pedido">
            <Select name="origemPedido" defaultValue={defaults?.origemPedido ?? ORIGENS_PEDIDO[0]}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ORIGENS_PEDIDO.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Classificação">
            <Select name="classificacao" defaultValue={defaults?.classificacao ?? "NOVO"}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CLASSIFICACOES.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </Row2>
        <Field label="Detalhe da classificação">
          <Input name="classificacaoDetalhe" defaultValue={defaults?.classificacaoDetalhe ?? ""} />
        </Field>
        <Row2>
          <Field label="Análise de crédito">
            <Select name="analiseCredito" defaultValue={defaults?.analiseCredito ?? ANALISE_CREDITO[0]}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ANALISE_CREDITO.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="FSC">
            <Select name="fsc" defaultValue={defaults?.fsc ?? OPCOES_FSC[0]}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {OPCOES_FSC.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </Row2>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox name="usaSelo" defaultChecked={defaults?.usaSelo ?? false} />
          <span>Usa selo</span>
        </label>
      </FormSection>

      <FormSection title="Cliente">
        <Field label="Cliente">
          <Input name="cliente" required defaultValue={defaults?.cliente ?? ""} />
        </Field>
        <Row2>
          <Field label="CNPJ"><Input name="cnpj" defaultValue={defaults?.cnpj ?? ""} /></Field>
          <Field label="Endereço"><Input name="endereco" defaultValue={defaults?.endereco ?? ""} /></Field>
        </Row2>
        <Row2>
          <Field label="Representante"><Input name="representante" defaultValue={defaults?.representante ?? ""} /></Field>
          <Field label="Comissão CEV"><Input name="comissaoCev" defaultValue={defaults?.comissaoCev ?? ""} /></Field>
        </Row2>
        <Row2>
          <Field label="Telefone"><Input name="telefone" defaultValue={defaults?.telefone ?? ""} /></Field>
          <Field label="E-mail"><Input name="email" type="email" defaultValue={defaults?.email ?? ""} /></Field>
        </Row2>
        <Field label="Contato compras"><Input name="contatoCompras" defaultValue={defaults?.contatoCompras ?? ""} /></Field>
      </FormSection>

      <FormSection title="Condições comerciais e entrega">
        <Field label="Condição de pagamento"><Input name="condPagamento" defaultValue={defaults?.condPagamento ?? ""} /></Field>
        <Row2>
          <Field label="Modalidade">
            <Select name="modalidade" defaultValue={defaults?.modalidade ?? OPCOES_MODALIDADE[0]}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {OPCOES_MODALIDADE.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Localidade de entrega"><Input name="entregaLocalidade" defaultValue={defaults?.entregaLocalidade ?? ""} /></Field>
        </Row2>
        <Row2>
          <Field label="Qtd. de entregas"><Input name="qtdEntregas" defaultValue={defaults?.qtdEntregas ?? ""} /></Field>
          <Field label="Datas de entrega"><Input name="entregaDatas" defaultValue={defaults?.entregaDatas ?? ""} /></Field>
        </Row2>
      </FormSection>

      <FormSection title="Produto">
        <Field label="Descrição do produto">
          <Input name="produtoDescricao" required defaultValue={defaults?.produtoDescricao ?? ""} />
        </Field>
        <Field label="Código do cliente" hint="O código que o próprio cliente usa pro produto — só pra registro, formato livre.">
          <Input name="codigoCliente" defaultValue={defaults?.codigoCliente ?? ""} />
        </Field>
        <Field label="Quantidades a orçar">
          <ListaDinamica name="quantidades" placeholder="Ex.: 5000" botaoLabel="+ Adicionar quantidade" valoresIniciais={r?.quantidadesLista} />
        </Field>
        <Field
          label="Código interno (Santa Cruz)"
          hint={ehRepeticao ? "Obrigatório — o produto já existe no sistema. Formato 0.000.000." : "Em produto novo é gerado na Engenharia. Formato 0.000.000."}
        >
          <CodigoInternoInput name="codInterno" required={ehRepeticao} defaultValue={defaults?.codInterno ?? ""} />
        </Field>
        <Field label="Observações">
          <Textarea name="obs" rows={2} defaultValue={defaults?.obs ?? ""} />
        </Field>
      </FormSection>

      <FormSection title="Medidas e suporte">
        <Row2>
          <Field label="Formato — Comprimento (cm)"><Input name="medidaF" defaultValue={r?.medidaF ?? ""} /></Field>
          <Field label="Formato — Largura (cm)"><Input name="medidaL" defaultValue={r?.medidaL ?? ""} /></Field>
        </Row2>
        <Field label="Altura (cm)"><Input name="medidaA" defaultValue={r?.medidaA ?? ""} /></Field>
        <SuportesLista
          campoA="suporteDescricao"
          campoB="suporteGramatura"
          labelA="Descrição do material"
          labelB="Gramatura (g/m²)"
          valoresIniciais={r?.suportes?.map((s) => ({ a: s.descricao, b: s.gramatura }))}
        />
      </FormSection>

      <FormSection title="Acabamento">
        <CheckGroup nome="acabamentos" opcoes={OPCOES_ACABAMENTO} marcados={r?.acabamentos} />
        <Field label="Outro acabamento"><Input name="acabamentoOutro" defaultValue={r?.acabamentoOutro ?? ""} /></Field>
      </FormSection>

      <FormSection title="Revestimento — verniz">
        <CheckGroup nome="verniz" opcoes={OPCOES_VERNIZ} marcados={r?.verniz} />
      </FormSection>

      <FormSection title="Revestimento — plástico">
        <CheckGroup nome="plastico" opcoes={OPCOES_PLASTICO} marcados={r?.plastico} />
      </FormSection>

      <FormSection title="Embalagem">
        <CheckGroup nome="embalagem" opcoes={OPCOES_EMBALAGEM} marcados={r?.embalagem} />
        <Field
          label="Detalhe da embalagem"
          hint="Código e medidas da caixa são definidos pela Engenharia na próxima etapa."
        >
          <Input name="embalagemDetalhe" defaultValue={r?.embalagemDetalhe ?? ""} />
        </Field>
      </FormSection>

      <FormSection title="Impressão e fechamento">
        <CheckGroup nome="impressao" opcoes={OPCOES_IMPRESSAO} marcados={r?.impressao} />
        <Row2>
          <Field label="Fechamento tampa"><Input name="fechamentoTampa" defaultValue={r?.fechamentoTampa ?? ""} /></Field>
          <Field label="Fechamento fundo"><Input name="fechamentoFundo" defaultValue={r?.fechamentoFundo ?? ""} /></Field>
        </Row2>
      </FormSection>
    </>
  );
}
