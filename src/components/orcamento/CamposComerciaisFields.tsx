import { ListaDinamica } from "./ListaDinamica";
import { SuportesLista } from "./SuportesLista";
import { ModelosLista } from "./ModelosLista";
import { ClienteProvider, ClienteSecao, CampoCliente } from "./ClienteSecao";
import { AnexosNovo } from "./AnexosNovo";
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
import { FormSection, Field, Grade } from "@/components/form-section";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function CheckGroup({ nome, opcoes, marcados }: { nome: string; opcoes: readonly string[]; marcados?: string[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 @md:grid-cols-3 @2xl:grid-cols-4">
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
  comBuscaCliente = false,
  codigoOpcional = false,
}: {
  // Representante em viagem pode não ter o código interno à mão: repetição não exige o código
  // na tela. O escritório completa em Em Aberto, que exige antes de liberar pra Engenharia.
  codigoOpcional?: boolean;
  // Busca no cadastro de clientes (Novo Orçamento). Em Aberto, onde o card já tem cliente, fica
  // desligada.
  comBuscaCliente?: boolean;
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
    <ClienteProvider>
     {/* @container: as Grades abaixo se adaptam à largura DISPONÍVEL (página larga, gaveta ou celular). */}
     <div className="@container">
      <FormSection title="Classificação" denso>
        {/* A classificação (novo/repetição) em si fica em cada modelo, na seção Produto. Os quatro
            campos curtos ficam numa linha só (antes eram 3 linhas, uma delas com um campo só). */}
        <Grade cols={4}>
          <Field label="Origem do pedido">
            <Select name="origemPedido" defaultValue={defaults?.origemPedido ?? ORIGENS_PEDIDO[0]}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ORIGENS_PEDIDO.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
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
          <label className="flex min-h-9 items-center gap-2 text-sm md:min-h-8">
            <Checkbox name="usaSelo" defaultChecked={defaults?.usaSelo ?? false} />
            <span>Usa selo</span>
          </label>
          {/* Dispensado no Novo Orçamento (02/10/2026); segue disponível em Em Aberto. */}
          {!comBuscaCliente && (
            <Field label="Detalhe da classificação" className="@2xl:col-span-2">
              <Input name="classificacaoDetalhe" defaultValue={defaults?.classificacaoDetalhe ?? ""} />
            </Field>
          )}
        </Grade>
      </FormSection>

      <ClienteSecao defaults={defaults} comBusca={comBuscaCliente} />

      <FormSection title="Condições comerciais e entrega" denso>
        <Grade cols={3}>
          <Field label="Condição de pagamento"><CampoCliente nome="condPagamento" campo="condPagamento" defaultValue={defaults?.condPagamento} /></Field>
          <Field label="Modalidade">
            <Select name="modalidade" defaultValue={defaults?.modalidade ?? OPCOES_MODALIDADE[0]}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {OPCOES_MODALIDADE.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label={comBuscaCliente ? "Qtd. de entregas (obrigatório)" : "Qtd. de entregas"}>
            <Input name="qtdEntregas" required={comBuscaCliente} defaultValue={defaults?.qtdEntregas ?? ""} />
          </Field>
          <Field label={comBuscaCliente ? "Data de entrega solicitada pelo Cliente (obrigatório)" : "Data de entrega solicitada pelo Cliente"}>
            <Input name="entregaDatas" required={comBuscaCliente} defaultValue={defaults?.entregaDatas ?? ""} />
          </Field>
          <Field label="Localidade de entrega" className="@md:col-span-1 @2xl:col-span-2">
            <CampoCliente nome="entregaLocalidade" campo="entregaLocalidade" defaultValue={defaults?.entregaLocalidade} />
          </Field>
        </Grade>
      </FormSection>

      <FormSection title="Produto" denso>
        {/* `key` pelo conteúdo gravado: depois de salvar, a lista recomeça com o que voltou do
            servidor — é lá que um modelo novo ganha o id que liga ele à própria arte. Sem isso,
            a linha continuava sem id e ganhava OUTRO id no salvamento seguinte. */}
        <ModelosLista key={JSON.stringify(defaults?.modelos ?? [])} valoresIniciais={defaults?.modelos} codigoOpcional={codigoOpcional} />
        <Field
          label={comBuscaCliente ? "Quantidades a orçar (obrigatório)" : "Quantidades a orçar"}
          hint="Total do conjunto (todos os modelos). Cada quantidade gera uma SO."
        >
          <ListaDinamica name="quantidades" placeholder="Ex.: 5000" botaoLabel="Adicionar quantidade" obrigatorio={comBuscaCliente} valoresIniciais={r?.quantidadesLista} />
        </Field>
        <Field label="Observações">
          <Textarea name="obs" rows={2} defaultValue={defaults?.obs ?? ""} />
        </Field>
        {/* Link e anexos lado a lado (cada um com uma linha só de campo). */}
        <Grade cols={2}>
          <Field label="Link da arte (Drive, WeTransfer...)" hint="Opcional. Cole o link se o cliente mandou a arte assim.">
            <Input name="linkArte" inputMode="url" placeholder="https://drive.google.com/..." defaultValue={r?.linkArte ?? ""} />
          </Field>
          {/* Só no Novo Orçamento: o orçamento ainda não existe, então os arquivos vão junto do envio.
              Em Em Aberto os anexos têm a própria seção, na gaveta. */}
          {comBuscaCliente && (
            <Field label="Anexos" hint="Imagens ou PDF. Opcional.">
              <AnexosNovo />
            </Field>
          )}
        </Grade>
      </FormSection>

      {/* Dados técnicos: o representante preenche o que tiver; o que ficar em branco a Engenharia
          analisa na etapa seguinte. No Novo Orçamento começa recolhido pra encurtar o formulário
          (os campos recolhidos continuam indo no envio); em Em Aberto, onde o card já existe,
          começa aberto. */}
      <details open={!comBuscaCliente} className="group mt-6 border-t border-border pt-6">
        {/* O <summary> é o botão de abrir/fechar: caixa com borda e fundo, seta que gira. */}
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg border border-border bg-secondary px-4 py-3 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground">Detalhes técnicos</span>
            <span className="text-xs font-normal text-muted-foreground">
              Se você tiver essas informações, preencha (medidas, material e impressão são exigidos antes de seguir para a Engenharia). Se não tiver, deixe em branco: o escritório completa.
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <span className="group-open:hidden">Abrir</span>
            <span className="hidden group-open:inline">Fechar</span>
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          </span>
        </summary>
        <div className="mt-4">
      <FormSection title="Medidas e suporte" denso>
        {/* As três medidas numa linha (a Altura ficava sozinha). */}
        <div className="grid grid-cols-3 items-end gap-3">
          <Field label="Comprimento (mm)"><Input name="medidaF" defaultValue={r?.medidaF ?? ""} /></Field>
          <Field label="Largura (mm)"><Input name="medidaL" defaultValue={r?.medidaL ?? ""} /></Field>
          <Field label="Altura (mm)"><Input name="medidaA" defaultValue={r?.medidaA ?? ""} /></Field>
        </div>
        <SuportesLista
          campoA="suporteDescricao"
          campoB="suporteGramatura"
          labelA="Descrição do material"
          labelB="Gramatura (g/m²)"
          valoresIniciais={r?.suportes?.map((s, i) => ({ a: s.descricao, b: s.gramatura, uso: i === 0 ? "opcao" : (s.uso ?? "") }))}
          comUso
        />
      </FormSection>

      <FormSection title="Acabamento" denso>
        <CheckGroup nome="acabamentos" opcoes={OPCOES_ACABAMENTO} marcados={r?.acabamentos} />
        <Field label="Outro acabamento"><Input name="acabamentoOutro" defaultValue={r?.acabamentoOutro ?? ""} /></Field>
      </FormSection>

      <FormSection title="Revestimento — verniz" denso>
        <CheckGroup nome="verniz" opcoes={OPCOES_VERNIZ} marcados={r?.verniz} />
      </FormSection>

      <FormSection title="Revestimento — plástico" denso>
        <CheckGroup nome="plastico" opcoes={OPCOES_PLASTICO} marcados={r?.plastico} />
      </FormSection>

      <FormSection title="Embalagem" denso>
        <CheckGroup nome="embalagem" opcoes={OPCOES_EMBALAGEM} marcados={r?.embalagem} />
        <Field
          label="Detalhe da embalagem"
          hint="Código e medidas da caixa são definidos pela Engenharia na próxima etapa."
        >
          <Input name="embalagemDetalhe" defaultValue={r?.embalagemDetalhe ?? ""} />
        </Field>
      </FormSection>

      <FormSection title="Impressão e fechamento" denso>
        <CheckGroup nome="impressao" opcoes={OPCOES_IMPRESSAO} marcados={r?.impressao} />
        <Grade cols={2}>
          <Field label="Fechamento tampa"><Input name="fechamentoTampa" defaultValue={r?.fechamentoTampa ?? ""} /></Field>
          <Field label="Fechamento fundo"><Input name="fechamentoFundo" defaultValue={r?.fechamentoFundo ?? ""} /></Field>
        </Grade>
      </FormSection>
        </div>
      </details>
     </div>
    </ClienteProvider>
  );
}
