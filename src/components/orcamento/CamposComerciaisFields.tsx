import { ListaDinamica } from "./ListaDinamica";
import { SuportesLista } from "./SuportesLista";
import { ModelosLista } from "./ModelosLista";
import {
  ORIGENS_PEDIDO,
  ANALISE_CREDITO,
  OPCOES_FSC,
  OPCOES_IMPRESSAO,
  OPCOES_ACABAMENTO,
  OPCOES_VERNIZ,
  OPCOES_PLASTICO,
  OPCOES_EMBALAGEM,
  OPCOES_MODALIDADE,
} from "@/lib/orcamentos/constantes";
import type { Modelo, ReqCliente } from "@/lib/orcamentos/types";
import { FormSection, Field, Row2 } from "@/components/form-section";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function CheckGroup({ nome, opcoes, marcados }: { nome: string; opcoes: readonly string[]; marcados?: string[] }) {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
      {opcoes.map((op) => (
        <label key={op} className="flex min-h-9 items-center gap-2 text-sm md:min-h-0">
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
//
// Descrição, códigos e classificação do produto ficam por modelo (ModelosLista) desde
// 30/09/2026 — um orçamento pode ter vários modelos na mesma faca.
export function CamposComerciaisFields({
  defaults,
}: {
  defaults?: {
    origemPedido?: string | null;
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
    modelos?: Modelo[];
    obs?: string | null;
    reqCliente?: ReqCliente | null;
  };
}) {
  const r = defaults?.reqCliente;

  return (
    <>
      <FormSection title="Classificação">
        {/* A classificação (novo/repetição) em si fica em cada modelo, na seção Produto. */}
        <Row2>
          <Field label="Origem do pedido">
            <Select name="origemPedido" defaultValue={defaults?.origemPedido ?? ORIGENS_PEDIDO[0]}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ORIGENS_PEDIDO.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Detalhe da classificação">
            <Input name="classificacaoDetalhe" defaultValue={defaults?.classificacaoDetalhe ?? ""} />
          </Field>
        </Row2>
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
        <label className="flex min-h-9 items-center gap-2 text-sm md:min-h-0">
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
        {/* `key` pelo conteúdo gravado: depois de salvar, a lista recomeça com o que voltou do
            servidor — é lá que um modelo novo ganha o id que liga ele à própria arte. Sem isso,
            a linha continuava sem id e ganhava OUTRO id no salvamento seguinte. */}
        <ModelosLista key={JSON.stringify(defaults?.modelos ?? [])} valoresIniciais={defaults?.modelos} />
        <Field
          label="Quantidades a orçar"
          hint="Quantidade total do conjunto (todos os modelos juntos). Cada quantidade gera uma SO — por papel, se houver mais de uma opção de papel."
        >
          <ListaDinamica name="quantidades" placeholder="Ex.: 5000" botaoLabel="Adicionar quantidade" valoresIniciais={r?.quantidadesLista} />
        </Field>
        <Field label="Observações">
          <Textarea name="obs" rows={2} defaultValue={defaults?.obs ?? ""} />
        </Field>
      </FormSection>

      <FormSection title="Medidas e suporte">
        <Row2 compacto>
          <Field label="Formato — Comprimento (mm)"><Input name="medidaF" defaultValue={r?.medidaF ?? ""} /></Field>
          <Field label="Formato — Largura (mm)"><Input name="medidaL" defaultValue={r?.medidaL ?? ""} /></Field>
        </Row2>
        <Field label="Altura (mm)"><Input name="medidaA" defaultValue={r?.medidaA ?? ""} /></Field>
        <SuportesLista
          campoA="suporteDescricao"
          campoB="suporteGramatura"
          labelA="Descrição do material"
          labelB="Gramatura (g/m²)"
          valoresIniciais={r?.suportes?.map((s, i) => ({ a: s.descricao, b: s.gramatura, uso: i === 0 ? "opcao" : (s.uso ?? "") }))}
          comUso
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
