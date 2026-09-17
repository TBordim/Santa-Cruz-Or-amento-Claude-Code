import { chave } from "./legado";
import type { ReqCliente, ReqTecnicos, Suporte, SuporteTecnico } from "./types";

function str(fd: FormData, nome: string): string {
  return String(fd.get(nome) ?? "").trim();
}

// Números no formato BR ("1.234,56") — usado nos campos de preço/percentual do Orçamento.
export function parseValorBR(v: string | null | undefined): number {
  if (!v) return NaN;
  const limpo = String(v).trim().replace(/\./g, "").replace(",", ".");
  return parseFloat(limpo);
}

function lerSuportesCliente(fd: FormData): Suporte[] {
  const descricoes = fd.getAll("suporteDescricao").map(String);
  const gramaturas = fd.getAll("suporteGramatura").map(String);
  return descricoes
    .map((descricao, i) => ({ descricao: descricao.trim(), gramatura: (gramaturas[i] ?? "").trim() }))
    .filter((s) => s.descricao || s.gramatura);
}

function lerReqCliente(fd: FormData): ReqCliente {
  return {
    medidaF: str(fd, "medidaF"),
    medidaL: str(fd, "medidaL"),
    medidaA: str(fd, "medidaA"),
    suportes: lerSuportesCliente(fd),
    acabamentos: fd.getAll("acabamentos").map(String),
    acabamentoOutro: str(fd, "acabamentoOutro"),
    verniz: fd.getAll("verniz").map(String),
    plastico: fd.getAll("plastico").map(String),
    embalagem: fd.getAll("embalagem").map(String),
    embalagemDetalhe: str(fd, "embalagemDetalhe"),
    impressao: fd.getAll("impressao").map(String),
    fechamentoTampa: str(fd, "fechamentoTampa"),
    fechamentoFundo: str(fd, "fechamentoFundo"),
    // Quantidades vazias não viram faixa de preço.
    quantidadesLista: fd.getAll("quantidades").map(String).map((s) => s.trim()).filter(Boolean),
  };
}

function lerSuportesTecnicos(fd: FormData): SuporteTecnico[] {
  const formatos = fd.getAll("suporteTecFormato").map(String);
  const codigos = fd.getAll("suporteTecCodigo").map(String);
  return formatos
    .map((formato, i) => ({ formato: formato.trim(), codigo: (codigos[i] ?? "").trim() }))
    .filter((s) => s.formato || s.codigo);
}

// Equivalente a lerRequisitosTecnicos() (santa-cruz-orcamentos.html, linhas 2202-2242). O merge
// com `anterior` preserva campos "mortos" (caixaC/L/A, recursos*, processosManuais...) que
// registros antigos possam ter e a UI atual não escreve mais — ver simplificação #5 do plano.
export function lerReqTecnicos(fd: FormData, anterior: ReqTecnicos | null): ReqTecnicos {
  return {
    ...(anterior as object),
    suportes: lerSuportesTecnicos(fd),
    qtdFolha: str(fd, "qtdFolha"),
    fatorC: str(fd, "fatorC"),
    fatorL: str(fd, "fatorL"),
    corte: str(fd, "corte"),
    qtdCh: str(fd, "qtdCh"),
    idealC: str(fd, "idealC"),
    idealL: str(fd, "idealL"),
    flsAcerto: str(fd, "flsAcerto"),
    anexos: fd.getAll("anexosPrevistos").map(String),
    infoComplementares: str(fd, "infoComplementares"),
  };
}

// Equivalente a lerCamposComerciais() (santa-cruz-orcamentos.html, linhas 1942-1984).
export function lerCamposComerciais(fd: FormData) {
  const cliente = str(fd, "cliente");
  const produtoDescricao = str(fd, "produtoDescricao");
  const produtoCodigo = str(fd, "produtoCodigo");

  return {
    cliente,
    clienteChave: chave(cliente),
    produtoCodigo,
    produtoDescricao,
    produtoChave: chave(produtoCodigo || produtoDescricao),
    obs: str(fd, "obs"),
    reqCliente: lerReqCliente(fd),
    origemPedido: str(fd, "origemPedido"),
    classificacao: (str(fd, "classificacao") || null) as
      | "NOVO"
      | "REPETICAO_SEM_ALTERACAO"
      | "REPETICAO_COM_ALTERACAO"
      | "REPETICAO_NOVO"
      | null,
    classificacaoDetalhe: str(fd, "classificacaoDetalhe"),
    analiseCredito: str(fd, "analiseCredito"),
    fsc: str(fd, "fsc"),
    usaSelo: fd.get("usaSelo") === "on",
    endereco: str(fd, "endereco"),
    cnpj: str(fd, "cnpj"),
    representante: str(fd, "representante"),
    comissaoCev: str(fd, "comissaoCev"),
    telefone: str(fd, "telefone"),
    email: str(fd, "email"),
    contatoCompras: str(fd, "contatoCompras"),
    contatoTecnico: str(fd, "contatoTecnico"),
    condPagamento: str(fd, "condPagamento"),
    entregaLocalidade: str(fd, "entregaLocalidade"),
    modalidade: str(fd, "modalidade"),
    qtdEntregas: str(fd, "qtdEntregas"),
    entregaDatas: str(fd, "entregaDatas"),
    codInterno: str(fd, "codInterno"),
  };
}
