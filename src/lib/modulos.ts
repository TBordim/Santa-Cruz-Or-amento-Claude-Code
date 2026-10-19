// Registro central de módulos do sistema — pensado pra crescer: cada área bem diferente da
// empresa (Orçamento, Laboratório, e o que vier depois) é um módulo com sua própria home e
// seus próprios itens de navegação, trocados por um seletor no topo da sidebar
// (ver ModuloSwitcher). Adicionar um módulo novo deveria ser só uma entrada aqui + uma pasta
// de rotas nova — não mexer na lógica da sidebar.
import { AREAS } from "./areas";

export type ModuloKey = "orcamento" | "diretoria" | "atendimento" | "aceite" | "engenharia" | "compras" | "pcp" | "protocolos" | "laboratorio" | "treinamentos" | "administracao";

// Grupos da página de entrada: com cada vez mais módulos, a entrada mostra por área da empresa em
// vez de uma grade única (pedido do Thiago em 08/10/2026).
export const GRUPOS_MODULO = [
  { key: "comercial", label: "Comercial" },
  { key: "producao", label: "Engenharia e produção" },
  { key: "pessoas", label: "Pessoas e sistema" },
] as const;

export type GrupoModulo = (typeof GRUPOS_MODULO)[number]["key"];

export type Modulo = {
  key: ModuloKey;
  label: string;
  // Uma linha que aparece no cartão do módulo na página de entrada ("/").
  descricao: string;
  // Também usado pra decidir "em qual módulo eu estou" a partir do pathname (ver moduloAtual).
  basePath: string;
  grupo: GrupoModulo;
};

export const MODULOS: Modulo[] = [
  { key: "orcamento", label: "Orçamento", descricao: "Solicitações, precificação e aprovação de orçamentos.", basePath: "/painel", grupo: "comercial" },
  // Diretoria (11/10/2026): saiu de dentro do Orçamento; a decisão em si continua na gaveta do
  // orçamento, e aqui ficam as pendências e o registro dos já decididos.
  { key: "diretoria", label: "Diretoria", descricao: "Orçamentos esperando decisão e o registro dos já aprovados.", basePath: "/diretoria", grupo: "comercial" },
  // Aceite de Pedido (08/10/2026): o pedido do cliente depois do orçamento aprovado. Engenharia,
  // Compras e PCP são módulos próprios desde o começo (decisões do Thiago em 08/10/2026): hoje só
  // com o que o Aceite precisa, e cada um cresce na própria branch depois.
  // Atendimento ao Cliente (nome ainda provisório, 08/10/2026): quem recebe o retorno do cliente
  // sobre o orçamento, envia a data prevista do pedido ao cliente e/ou representante e responde
  // quando o cliente pergunta do pedido.
  { key: "atendimento", label: "Atendimento ao Cliente", descricao: "Retorno dos orçamentos, data prevista ao cliente e acompanhamento dos pedidos.", basePath: "/atendimento", grupo: "comercial" },
  { key: "aceite", label: "Aceite de Pedido", descricao: "Pedido do cliente: papel, quantidades e confirmação do pedido.", basePath: "/aceite", grupo: "comercial" },
  // Engenharia recebe pendências de vários módulos (Orçamento, Aceite e o que vier): é o lugar onde
  // ela vê tudo que espera decisão ou preenchimento dela.
  { key: "engenharia", label: "Engenharia", descricao: "Tudo que espera a Engenharia: orçamentos, aceites e cadastros de produto.", basePath: "/engenharia", grupo: "producao" },
  // Compras é acionado por vários módulos; por enquanto recebe os Pedidos de Material do Aceite.
  { key: "compras", label: "Compras", descricao: "Pedidos de Material: fornecedor, prazo, mudanças e sobras no fornecedor.", basePath: "/compras", grupo: "producao" },
  // PCP: por enquanto a data de entrega dos Aceites; capacidade, programação e painéis vêm depois.
  { key: "pcp", label: "PCP", descricao: "Datas de entrega dos pedidos e acompanhamento dos prazos de material.", basePath: "/pcp", grupo: "producao" },
  // Protocolos de arte do cliente (17/10/2026): toda arte do cliente é propriedade intelectual dele e
  // recebe um número de protocolo, feito por Vendas; o mesmo número serve a vários pedidos.
  { key: "protocolos", label: "Protocolos", descricao: "Artes do cliente: protocolo, revisões e rastreabilidade.", basePath: "/protocolos", grupo: "comercial" },
  { key: "laboratorio", label: "Laboratório", descricao: "Formulação, ajuste e aprovação de cores.", basePath: "/laboratorio", grupo: "producao" },
  // Aberto a qualquer colaborador logado (ver modulosAcessiveis); cada pessoa só enxerga os vídeos do seu perfil.
  { key: "treinamentos", label: "Treinamentos", descricao: "Vídeos de treinamento do seu perfil e quiz de cada um.", basePath: "/treinamentos", grupo: "pessoas" },
  // Serve todos os módulos (usuários e perfis valem pro sistema inteiro), por isso é um módulo
  // próprio e não um item dentro do Orçamento. Só administrador entra.
  { key: "administracao", label: "Administração", descricao: "Usuários, perfis de acesso e configurações do sistema.", basePath: "/administracao", grupo: "pessoas" },
];

// "Orçamento" é o módulo de sempre, sem prefixo de rota próprio (compatibilidade com as rotas
// que já existiam antes dos módulos) — por isso é o padrão de qualquer pathname que não bata
// com o prefixo de outro módulo.
export function moduloAtual(pathname: string): ModuloKey {
  const porPrefixo = MODULOS.find((m) => m.key !== "orcamento" && pathname.startsWith(m.basePath));
  return porPrefixo?.key ?? "orcamento";
}

// Módulos em que a pessoa pode entrar: todos pra administrador; pros demais, os módulos em que o
// perfil tem ao menos uma área marcada (a área "Consulta" de cada módulo existe pra quem só
// precisa ver). Administração é só pra administrador. Todos os módulos continuam aparecendo na
// página de entrada — os que não estão aqui aparecem bloqueados. Decisão do Thiago em 27/09/2026.
// Treinamentos é a exceção (01/10/2026): todo colaborador logado entra, sem precisar de área marcada. O que cada
// um vê lá é filtrado pelo perfil (ver filtroDeAcesso em lib/treinamentos/dados.ts).
// Engenharia (08/10/2026): também entra quem tem a etapa Engenharia ou o Cadastro de Produto do
// Orçamento, porque as pendências dessas etapas aparecem no módulo Engenharia.
const AREAS_QUE_ABREM_ENGENHARIA = ["ENGENHARIA", "CADASTRO_PRODUTO"];
// Atendimento ao Cliente: também entra quem registra o Retorno do Cliente no Orçamento (etapa 6).
const AREAS_QUE_ABREM_ATENDIMENTO = ["FINALIZADO"];
// Quem decide pela Diretoria abre o orçamento para aprovar, que é uma tela do módulo Orçamento.
const AREAS_QUE_ABREM_ORCAMENTO = ["DIRETORIA"];

export function modulosAcessiveis(admin: boolean, areas: readonly string[]): ModuloKey[] {
  if (admin) return MODULOS.map((m) => m.key);
  const doPerfil = new Set(AREAS.filter((a) => areas.includes(a.key)).map((a) => a.modulo));
  if (areas.some((a) => AREAS_QUE_ABREM_ENGENHARIA.includes(a))) doPerfil.add("engenharia");
  if (areas.some((a) => AREAS_QUE_ABREM_ATENDIMENTO.includes(a))) doPerfil.add("atendimento");
  if (areas.some((a) => AREAS_QUE_ABREM_ORCAMENTO.includes(a))) doPerfil.add("orcamento");
  return MODULOS.filter((m) => m.key === "treinamentos" || (m.key !== "administracao" && doPerfil.has(m.key))).map((m) => m.key);
}
