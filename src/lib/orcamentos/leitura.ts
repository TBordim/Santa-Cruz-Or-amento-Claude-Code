import { randomUUID } from "node:crypto";
import { chave } from "./chave";
import { normalizarCodigoInterno } from "./codigo-interno";
import { CLASSIFICACOES_MODELO, resumoDosModelos } from "./modelos";
import type { ClassificacaoModelo, Modelo, ReqCliente, ReqTecnicos, Suporte, SuporteTecnico } from "./types";

function str(fd: FormData, nome: string): string {
  return String(fd.get(nome) ?? "").trim();
}

// Números no formato BR ("1.234,56") — usado nos campos de preço/percentual do Orçamento.
export function parseValorBR(v: string | null | undefined): number {
  if (!v) return NaN;
  const limpo = String(v).trim().replace(/\./g, "").replace(",", ".");
  return parseFloat(limpo);
}

// `suporteUso` vem em toda linha (a primeira manda "opcao" num campo escondido), então os três
// getAll ficam pareados por índice. Uso não escolhido não é gravado — avancarEngenharia cobra.
function lerSuportesCliente(fd: FormData): Suporte[] {
  const descricoes = fd.getAll("suporteDescricao").map(String);
  const gramaturas = fd.getAll("suporteGramatura").map(String);
  const usos = fd.getAll("suporteUso").map(String);
  return descricoes
    .map((descricao, i): Suporte => {
      const uso = usos[i];
      return {
        descricao: descricao.trim(),
        gramatura: (gramaturas[i] ?? "").trim(),
        ...(uso === "opcao" || uso === "conjunto" ? { uso } : {}),
      };
    })
    .filter((s) => s.descricao || s.gramatura);
}

// Modelos do orçamento (mesma faca). Linha sem descrição e sem código é ignorada. Modelo novo
// chega sem id e ganha um aqui — é o id que liga o modelo à própria arte (Anexo.modeloId).
export function lerModelos(fd: FormData): Modelo[] {
  const ids = fd.getAll("modeloId").map(String);
  const descricoes = fd.getAll("modeloDescricao").map(String);
  const codigosCliente = fd.getAll("modeloCodigoCliente").map(String);
  const codigosInternos = fd.getAll("modeloCodInterno").map(String);
  const classificacoes = fd.getAll("modeloClassificacao").map(String);
  return descricoes
    .map((descricao, i): Modelo => ({
      id: ids[i]?.trim() || randomUUID(),
      descricao: descricao.trim(),
      codigoCliente: (codigosCliente[i] ?? "").trim(),
      codInterno: normalizarCodigoInterno(codigosInternos[i]),
      classificacao: (CLASSIFICACOES_MODELO.includes(classificacoes[i] as ClassificacaoModelo)
        ? classificacoes[i]
        : "NOVO") as ClassificacaoModelo,
    }))
    .filter((m) => m.descricao || m.codigoCliente || m.codInterno);
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

// Um bloco por material da Solicitação, na mesma ordem — por isso NÃO filtra linha vazia: o
// índice precisa continuar batendo com ReqCliente.suportes (é o papelIdx das SOs).
const CAMPOS_SUPORTE_TEC = {
  formato: "suporteTecFormato",
  codigo: "suporteTecCodigo",
  qtdFolha: "suporteTecQtdFolha",
  flsAcerto: "suporteTecFlsAcerto",
  fatorC: "suporteTecFatorC",
  fatorL: "suporteTecFatorL",
  corte: "suporteTecCorte",
  qtdCh: "suporteTecQtdCh",
  idealC: "suporteTecIdealC",
  idealL: "suporteTecIdealL",
} as const;

function lerSuportesTecnicos(fd: FormData): SuporteTecnico[] {
  const colunas = Object.fromEntries(
    Object.entries(CAMPOS_SUPORTE_TEC).map(([campo, nome]) => [campo, fd.getAll(nome).map((v) => String(v).trim())]),
  ) as Record<keyof SuporteTecnico, string[]>;
  return colunas.formato.map((_, i) => {
    const linha = Object.fromEntries(Object.keys(CAMPOS_SUPORTE_TEC).map((campo) => [campo, colunas[campo as keyof SuporteTecnico][i] ?? ""]));
    return linha as SuporteTecnico;
  });
}

// Equivalente a lerRequisitosTecnicos() (santa-cruz-orcamentos.html, linhas 2202-2242). O merge
// com `anterior` preserva campos "mortos" (caixaC/L/A, recursos*, processosManuais...) que
// registros antigos possam ter e a UI atual não escreve mais — ver simplificação #5 do plano.
//
// Os campos soltos de formato suporte (qtdFolha, fatorC...) passaram pra dentro de cada material
// em 30/09/2026 — o formulário já abre o primeiro material com os valores soltos antigos, então
// ao salvar eles são apagados daqui, pra não aparecerem duplicados.
const CAMPOS_SOLTOS_ANTIGOS = ["qtdFolha", "fatorC", "fatorL", "corte", "qtdCh", "idealC", "idealL", "flsAcerto"] as const;

export function lerReqTecnicos(fd: FormData, anterior: ReqTecnicos | null): ReqTecnicos {
  const r: ReqTecnicos = {
    ...(anterior as object),
    suportes: lerSuportesTecnicos(fd),
    anexos: fd.getAll("anexosPrevistos").map(String),
    infoComplementares: str(fd, "infoComplementares"),
  };
  for (const campo of CAMPOS_SOLTOS_ANTIGOS) delete r[campo];
  return r;
}

// Equivalente a lerCamposComerciais() (santa-cruz-orcamentos.html, linhas 1942-1984).
// Descrição, códigos e classificação do produto vêm da lista de modelos; os campos soltos de
// produto (produtoDescricao, codInterno...) são gravados como resumo dela — ver
// resumoDosModelos em modelos.ts.
export function lerCamposComerciais(fd: FormData) {
  const cliente = str(fd, "cliente");
  const modelos = lerModelos(fd);

  return {
    cliente,
    clienteChave: chave(cliente),
    modelos,
    ...resumoDosModelos(modelos),
    obs: str(fd, "obs"),
    reqCliente: lerReqCliente(fd),
    origemPedido: str(fd, "origemPedido"),
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
    condPagamento: str(fd, "condPagamento"),
    entregaLocalidade: str(fd, "entregaLocalidade"),
    modalidade: str(fd, "modalidade"),
    qtdEntregas: str(fd, "qtdEntregas"),
    entregaDatas: str(fd, "entregaDatas"),
  };
}
