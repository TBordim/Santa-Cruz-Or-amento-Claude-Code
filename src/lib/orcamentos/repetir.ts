import { modelosDoDoc } from "./modelos";
import type { ClassificacaoModelo, Modelo, ReqCliente } from "./types";

// Dados de uma solicitação já enviada, usados pra abrir uma nova pré-preenchida ("Repetir", em
// Minhas Solicitações). Copia tudo, como pedido pelo Thiago em 05/10/2026 — menos os arquivos
// anexados (cada solicitação tem os seus; o link da arte vai junto, ele faz parte dos dados).
// Sem acesso ao banco.

type Origem = {
  origemPedido: string | null;
  classificacaoDetalhe: string | null;
  analiseCredito: string | null;
  fsc: string | null;
  usaSelo: boolean;
  cliente: string | null;
  cnpj: string | null;
  endereco: string | null;
  representante: string | null;
  comissaoCev: string | null;
  telefone: string | null;
  email: string | null;
  contatoCompras: string | null;
  condPagamento: string | null;
  modalidade: string | null;
  entregaLocalidade: string | null;
  qtdEntregas: string | null;
  entregaDatas: string | null;
  obs: string | null;
  reqCliente: unknown;
  modelos: unknown;
  produtoDescricao: string | null;
  codigoCliente: string | null;
  codInterno: string | null;
  classificacao: string | null;
};

// Produto que foi pedido como novo (ou como "item novo") agora é um produto que já existe:
// vira "Repetição — sem alteração". O representante muda pra "com alteração" onde precisar.
// O código interno, se o escritório já completou, vem junto.
function comoRepeticao(c: ClassificacaoModelo): ClassificacaoModelo {
  return c === "NOVO" || c === "REPETICAO_NOVO" ? "REPETICAO_SEM_ALTERACAO" : c;
}

export function defaultsParaRepetir(doc: Origem, representante: string) {
  const modelos: Modelo[] = modelosDoDoc(doc).map((m) => ({
    ...m,
    // Modelo novo, sem id: o servidor dá um id novo (o id antigo é o da arte da solicitação de origem).
    id: "",
    classificacao: comoRepeticao(m.classificacao),
  }));
  return {
    origemPedido: doc.origemPedido,
    classificacaoDetalhe: doc.classificacaoDetalhe,
    analiseCredito: doc.analiseCredito,
    fsc: doc.fsc,
    usaSelo: doc.usaSelo,
    cliente: doc.cliente,
    cnpj: doc.cnpj,
    endereco: doc.endereco,
    representante,
    comissaoCev: doc.comissaoCev,
    telefone: doc.telefone,
    email: doc.email,
    contatoCompras: doc.contatoCompras,
    condPagamento: doc.condPagamento,
    modalidade: doc.modalidade,
    entregaLocalidade: doc.entregaLocalidade,
    qtdEntregas: doc.qtdEntregas,
    entregaDatas: doc.entregaDatas,
    modelos,
    obs: doc.obs,
    reqCliente: (doc.reqCliente as ReqCliente | null) ?? null,
  };
}
