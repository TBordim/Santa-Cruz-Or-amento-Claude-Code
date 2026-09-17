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

function CheckGroup({ nome, opcoes, marcados }: { nome: string; opcoes: readonly string[]; marcados?: string[] }) {
  return (
    <div className="opt-grid">
      {opcoes.map((op) => (
        <label key={op} className="checkline">
          <input type="checkbox" name={nome} value={op} defaultChecked={marcados?.includes(op)} />
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
    contatoTecnico?: string | null;
    condPagamento?: string | null;
    modalidade?: string | null;
    entregaLocalidade?: string | null;
    qtdEntregas?: string | null;
    entregaDatas?: string | null;
    produtoDescricao?: string | null;
    produtoCodigo?: string | null;
    codInterno?: string | null;
    obs?: string | null;
    reqCliente?: ReqCliente | null;
  };
}) {
  const r = defaults?.reqCliente;
  const ehRepeticao = defaults?.classificacao?.startsWith("REPETICAO");

  return (
    <>
      <div className="form-section" style={{ borderTop: "none", marginTop: 0, paddingTop: 0 }}>
        <h4>Classificação</h4>
        <div className="row2">
          <div className="field">
            <label>Origem do pedido</label>
            <select name="origemPedido" defaultValue={defaults?.origemPedido ?? ORIGENS_PEDIDO[0]}>
              {ORIGENS_PEDIDO.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Classificação</label>
            <select name="classificacao" defaultValue={defaults?.classificacao ?? "NOVO"}>
              {CLASSIFICACOES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label>Detalhe da classificação</label>
          <input name="classificacaoDetalhe" defaultValue={defaults?.classificacaoDetalhe ?? ""} />
        </div>
        <div className="row2">
          <div className="field">
            <label>Análise de crédito</label>
            <select name="analiseCredito" defaultValue={defaults?.analiseCredito ?? ANALISE_CREDITO[0]}>
              {ANALISE_CREDITO.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="field">
            <label>FSC</label>
            <select name="fsc" defaultValue={defaults?.fsc ?? OPCOES_FSC[0]}>
              {OPCOES_FSC.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <label className="checkline">
          <input type="checkbox" name="usaSelo" defaultChecked={defaults?.usaSelo ?? false} />
          <span>Usa selo</span>
        </label>
      </div>

      <div className="form-section">
        <h4>Cliente</h4>
        <div className="field">
          <label>Cliente</label>
          <input name="cliente" required defaultValue={defaults?.cliente ?? ""} />
        </div>
        <div className="row2">
          <div className="field"><label>CNPJ</label><input name="cnpj" defaultValue={defaults?.cnpj ?? ""} /></div>
          <div className="field"><label>Endereço</label><input name="endereco" defaultValue={defaults?.endereco ?? ""} /></div>
        </div>
        <div className="row2">
          <div className="field"><label>Representante</label><input name="representante" defaultValue={defaults?.representante ?? ""} /></div>
          <div className="field"><label>Comissão CEV</label><input name="comissaoCev" defaultValue={defaults?.comissaoCev ?? ""} /></div>
        </div>
        <div className="row2">
          <div className="field"><label>Telefone</label><input name="telefone" defaultValue={defaults?.telefone ?? ""} /></div>
          <div className="field"><label>E-mail</label><input name="email" type="email" defaultValue={defaults?.email ?? ""} /></div>
        </div>
        <div className="row2">
          <div className="field"><label>Contato compras</label><input name="contatoCompras" defaultValue={defaults?.contatoCompras ?? ""} /></div>
          <div className="field"><label>Contato técnico</label><input name="contatoTecnico" defaultValue={defaults?.contatoTecnico ?? ""} /></div>
        </div>
      </div>

      <div className="form-section">
        <h4>Condições comerciais e entrega</h4>
        <div className="field"><label>Condição de pagamento</label><input name="condPagamento" defaultValue={defaults?.condPagamento ?? ""} /></div>
        <div className="row2">
          <div className="field">
            <label>Modalidade</label>
            <select name="modalidade" defaultValue={defaults?.modalidade ?? OPCOES_MODALIDADE[0]}>
              {OPCOES_MODALIDADE.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="field"><label>Localidade de entrega</label><input name="entregaLocalidade" defaultValue={defaults?.entregaLocalidade ?? ""} /></div>
        </div>
        <div className="row2">
          <div className="field"><label>Qtd. de entregas</label><input name="qtdEntregas" defaultValue={defaults?.qtdEntregas ?? ""} /></div>
          <div className="field"><label>Datas de entrega</label><input name="entregaDatas" defaultValue={defaults?.entregaDatas ?? ""} /></div>
        </div>
      </div>

      <div className="form-section">
        <h4>Produto</h4>
        <div className="field">
          <label>Descrição do produto</label>
          <input name="produtoDescricao" required defaultValue={defaults?.produtoDescricao ?? ""} />
        </div>
        <div className="field">
          <label>Código do produto</label>
          <input name="produtoCodigo" defaultValue={defaults?.produtoCodigo ?? ""} />
          <span className="hint">Chave usada para casar repetições e o Arquivo legado.</span>
        </div>
        <div className="field">
          <label>Quantidades a orçar</label>
          <ListaDinamica name="quantidades" placeholder="Ex.: 5000" botaoLabel="+ Adicionar quantidade" valoresIniciais={r?.quantidadesLista} />
        </div>
        <div className="field">
          <label>Código interno (Santa Cruz)</label>
          <input name="codInterno" required={ehRepeticao} defaultValue={defaults?.codInterno ?? ""} />
          <span className="hint">
            {ehRepeticao ? "Obrigatório — o produto já existe no sistema." : "Em produto novo é gerado na Engenharia."}
          </span>
        </div>
        <div className="field"><label>Observações</label><textarea name="obs" rows={2} defaultValue={defaults?.obs ?? ""} /></div>
      </div>

      <div className="form-section">
        <h4>Medidas e suporte</h4>
        <div className="row2">
          <div className="field"><label>Formato — Comprimento (cm)</label><input name="medidaF" defaultValue={r?.medidaF ?? ""} /></div>
          <div className="field"><label>Formato — Largura (cm)</label><input name="medidaL" defaultValue={r?.medidaL ?? ""} /></div>
        </div>
        <div className="field"><label>Altura (cm)</label><input name="medidaA" defaultValue={r?.medidaA ?? ""} /></div>
        <SuportesLista
          campoA="suporteDescricao"
          campoB="suporteGramatura"
          labelA="Descrição do material"
          labelB="Gramatura (g/m²)"
          valoresIniciais={r?.suportes?.map((s) => ({ a: s.descricao, b: s.gramatura }))}
        />
      </div>

      <div className="form-section">
        <h4>Acabamento</h4>
        <CheckGroup nome="acabamentos" opcoes={OPCOES_ACABAMENTO} marcados={r?.acabamentos} />
        <div className="field" style={{ marginTop: 10 }}><label>Outro acabamento</label><input name="acabamentoOutro" defaultValue={r?.acabamentoOutro ?? ""} /></div>
      </div>

      <div className="form-section">
        <h4>Revestimento — verniz</h4>
        <CheckGroup nome="verniz" opcoes={OPCOES_VERNIZ} marcados={r?.verniz} />
      </div>

      <div className="form-section">
        <h4>Revestimento — plástico</h4>
        <CheckGroup nome="plastico" opcoes={OPCOES_PLASTICO} marcados={r?.plastico} />
      </div>

      <div className="form-section">
        <h4>Embalagem</h4>
        <CheckGroup nome="embalagem" opcoes={OPCOES_EMBALAGEM} marcados={r?.embalagem} />
        <div className="field" style={{ marginTop: 10 }}>
          <label>Detalhe da embalagem</label>
          <input name="embalagemDetalhe" defaultValue={r?.embalagemDetalhe ?? ""} />
          <span className="hint">Código e medidas da caixa são definidos pela Engenharia na próxima etapa.</span>
        </div>
      </div>

      <div className="form-section">
        <h4>Impressão e fechamento</h4>
        <CheckGroup nome="impressao" opcoes={OPCOES_IMPRESSAO} marcados={r?.impressao} />
        <div className="row2" style={{ marginTop: 10 }}>
          <div className="field"><label>Fechamento tampa</label><input name="fechamentoTampa" defaultValue={r?.fechamentoTampa ?? ""} /></div>
          <div className="field"><label>Fechamento fundo</label><input name="fechamentoFundo" defaultValue={r?.fechamentoFundo ?? ""} /></div>
        </div>
      </div>
    </>
  );
}
