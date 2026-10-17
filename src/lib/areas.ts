// Portado 1:1 do array AREAS do santa-cruz-orcamentos.html (linhas 694-704) — mesma chave,
// mesmo rótulo, mesma ordem, pro grupo "orcamento". É o checklist de permissões usado na tela
// de Administração (perfis) e o controle de "pode editar" em cada etapa do fluxo. Cada área
// carrega o módulo (ver src/lib/modulos.ts) a que pertence, pra Administração conseguir
// agrupar por módulo de verdade em vez de misturar tudo numa lista só — o mesmo campo
// `Perfil.areas: String[]` no banco guarda todas, só a apresentação é que separa.
import type { ModuloKey } from "./modulos";

export type AreaKey =
  | "NOVO"
  | "ABERTO"
  | "ENGENHARIA"
  | "ORCAMENTO"
  | "DIRETORIA"
  | "ENVIO_OFERTA"
  | "FINALIZADO"
  | "CADASTRO_PRODUTO"
  | "CLIENTES"
  | "LEGADO"
  | "HISTORICO"
  // "Consulta" de cada módulo: só dá entrada no módulo, pra ver, sem editar nada. Desde
  // 27/09/2026 a pessoa só entra num módulo se o perfil tiver alguma área dele (ver
  // modulosAcessiveis em modulos.ts) — antes consultar era livre pra qualquer um logado.
  | "CONSULTA_ORCAMENTO"
  // Módulo Atendimento ao Cliente: envia ao cliente/representante a data prevista do pedido.
  | "ATENDIMENTO_CLIENTE"
  | "CONSULTA_ATENDIMENTO"
  // Módulo Aceite de Pedido (Vendas).
  | "ACEITE_VENDAS"
  | "CONSULTA_ACEITE"
  // Módulo Engenharia: conferência do Aceite (cadastro de produto, montagem, ferramental).
  | "ACEITE_ENGENHARIA"
  | "CONSULTA_ENGENHARIA"
  // Módulo Compras: lança fornecedor, prazo e mudanças nos Pedidos de Material.
  | "COMPRAS_PM"
  | "CONSULTA_COMPRAS"
  // Módulo PCP: define a data de entrega dos Aceites.
  | "PCP_ENTREGA"
  | "CONSULTA_PCP"
  // Módulo Laboratório, área Cor (formulação de tinta). Só Laboratório e Engenharia
  // registram/editam; Produção, que só consulta, recebe a "Consulta" do Laboratório.
  | "COR_LABORATORIO"
  | "COR_ENGENHARIA"
  | "CONSULTA_LABORATORIO"
  // Módulo Treinamentos: todo colaborador entra e vê os vídeos do seu perfil sem área nenhuma; esta é só a
  // permissão do painel de acompanhamento (Diretoria). O cadastro de vídeos é só do administrador.
  | "TREINAMENTOS_ACOMPANHAMENTO"
  // Módulo Protocolos de arte do cliente (Vendas protocola; Consulta só vê).
  | "PROTOCOLOS_VENDAS"
  | "CONSULTA_PROTOCOLOS";

export type Area = {
  key: AreaKey;
  label: string;
  hint: string;
  modulo: ModuloKey;
};

export const AREAS: Area[] = [
  { key: "NOVO", label: "Novo Orçamento", hint: "Abrir um pedido novo", modulo: "orcamento" },
  { key: "ABERTO", label: "Solicitação de Orçamento", hint: "Etapa 1 — dados comerciais", modulo: "orcamento" },
  { key: "ENGENHARIA", label: "Engenharia", hint: "Etapa 2", modulo: "orcamento" },
  { key: "ORCAMENTO", label: "Orçamento", hint: "Etapa 3 — preço e margem", modulo: "orcamento" },
  { key: "DIRETORIA", label: "Diretoria", hint: "Etapa 4 — aprovação", modulo: "diretoria" },
  { key: "ENVIO_OFERTA", label: "Envio de Oferta", hint: "Etapa 5 — monta e envia a oferta ao cliente", modulo: "orcamento" },
  { key: "FINALIZADO", label: "Retorno do Cliente", hint: "Etapa 6 — registra o retorno do cliente", modulo: "orcamento" },
  { key: "CADASTRO_PRODUTO", label: "Cadastro de Produto", hint: "Etapa 7 — lança o Nº de Cadastro de Produto de produto novo aprovado pelo cliente", modulo: "orcamento" },
  { key: "CLIENTES", label: "Clientes", hint: "Conferir, editar e desativar o cadastro de clientes", modulo: "orcamento" },
  { key: "LEGADO", label: "Arquivo legado", hint: "Cadastrar, editar e excluir registros antigos", modulo: "orcamento" },
  { key: "HISTORICO", label: "Histórico", hint: "Excluir registros do histórico", modulo: "orcamento" },
  { key: "CONSULTA_ORCAMENTO", label: "Consulta", hint: "Só ver o módulo Orçamento, sem editar nada", modulo: "orcamento" },
  { key: "ATENDIMENTO_CLIENTE", label: "Atendimento", hint: "Envia ao cliente e/ou representante a data prevista do pedido", modulo: "atendimento" },
  { key: "CONSULTA_ATENDIMENTO", label: "Consulta", hint: "Só ver o módulo Atendimento ao Cliente, sem editar nada", modulo: "atendimento" },
  { key: "ACEITE_VENDAS", label: "Vendas", hint: "Preenche o Aceite, verifica estoque de produto acabado, versão e papel, emite PM e cadastra o pedido no ERP", modulo: "aceite" },
  { key: "CONSULTA_ACEITE", label: "Consulta", hint: "Só ver o módulo Aceite de Pedido, sem editar nada", modulo: "aceite" },
  { key: "ACEITE_ENGENHARIA", label: "Aceite de Pedido", hint: "Confere o cadastro de produto, define a montagem, cria código novo e confirma o Aceite", modulo: "engenharia" },
  { key: "CONSULTA_ENGENHARIA", label: "Consulta", hint: "Só ver o módulo Engenharia, sem editar nada", modulo: "engenharia" },
  { key: "COMPRAS_PM", label: "Pedidos de Material", hint: "Lança fornecedor, prazo, mudanças e sobras dos Pedidos de Material", modulo: "compras" },
  { key: "CONSULTA_COMPRAS", label: "Consulta", hint: "Só ver o módulo Compras, sem editar nada", modulo: "compras" },
  { key: "PCP_ENTREGA", label: "Data de entrega", hint: "Define a data de entrega dos pedidos aceitos", modulo: "pcp" },
  { key: "CONSULTA_PCP", label: "Consulta", hint: "Só ver o módulo PCP, sem editar nada", modulo: "pcp" },
  { key: "COR_LABORATORIO", label: "Laboratório", hint: "Testes, fórmulas e ajustes de cor", modulo: "laboratorio" },
  { key: "COR_ENGENHARIA", label: "Engenharia de cor", hint: "Registro e gestão das fórmulas de cor", modulo: "laboratorio" },
  { key: "CONSULTA_LABORATORIO", label: "Consulta", hint: "Só ver o módulo Laboratório, sem editar nada", modulo: "laboratorio" },
  { key: "PROTOCOLOS_VENDAS", label: "Protocolos (Vendas)", hint: "Protocola as artes do cliente: novo, alterado ou já protocolado", modulo: "protocolos" },
  { key: "CONSULTA_PROTOCOLOS", label: "Consulta", hint: "Só ver o módulo Protocolos, sem editar nada", modulo: "protocolos" },
  { key: "TREINAMENTOS_ACOMPANHAMENTO", label: "Acompanhamento", hint: "Ver quem já fez cada treinamento, com nota e data", modulo: "treinamentos" },
];

export const AREA_KEYS: AreaKey[] = AREAS.map((a) => a.key);

export function isAreaKey(value: string): value is AreaKey {
  return (AREA_KEYS as string[]).includes(value);
}

// Representante comercial: perfil cuja única área é "Novo Orçamento". Só abre o Novo Orçamento —
// não enxerga Painel, histórico nem nenhum outro módulo (decisão do Thiago em 02/10/2026).
// Sem imports de banco, pra poder rodar no middleware (Edge).
export function soNovoOrcamento(admin: boolean, areas: readonly string[]): boolean {
  return !admin && areas.length > 0 && areas.every((a) => a === "NOVO");
}

export function areaLabel(key: string): string {
  return AREAS.find((a) => a.key === key)?.label ?? key;
}
