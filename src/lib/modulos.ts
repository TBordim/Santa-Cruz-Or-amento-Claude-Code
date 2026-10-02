// Registro central de módulos do sistema — pensado pra crescer: cada área bem diferente da
// empresa (Orçamento, Laboratório, e o que vier depois) é um módulo com sua própria home e
// seus próprios itens de navegação, trocados por um seletor no topo da sidebar
// (ver ModuloSwitcher). Adicionar um módulo novo deveria ser só uma entrada aqui + uma pasta
// de rotas nova — não mexer na lógica da sidebar.
import { AREAS } from "./areas";

export type ModuloKey = "orcamento" | "laboratorio" | "treinamentos" | "administracao";

export type Modulo = {
  key: ModuloKey;
  label: string;
  // Uma linha que aparece no cartão do módulo na página de entrada ("/").
  descricao: string;
  // Também usado pra decidir "em qual módulo eu estou" a partir do pathname (ver moduloAtual).
  basePath: string;
};

export const MODULOS: Modulo[] = [
  { key: "orcamento", label: "Orçamento", descricao: "Solicitações, precificação e aprovação de orçamentos.", basePath: "/painel" },
  { key: "laboratorio", label: "Laboratório", descricao: "Formulação, ajuste e aprovação de cores.", basePath: "/laboratorio" },
  // Aberto a qualquer colaborador logado (ver modulosAcessiveis); cada pessoa só enxerga os vídeos do seu perfil.
  { key: "treinamentos", label: "Treinamentos", descricao: "Vídeos de treinamento do seu perfil e quiz de cada um.", basePath: "/treinamentos" },
  // Serve todos os módulos (usuários e perfis valem pro sistema inteiro), por isso é um módulo
  // próprio e não um item dentro do Orçamento. Só administrador entra.
  { key: "administracao", label: "Administração", descricao: "Usuários, perfis de acesso e configurações do sistema.", basePath: "/administracao" },
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
export function modulosAcessiveis(admin: boolean, areas: readonly string[]): ModuloKey[] {
  if (admin) return MODULOS.map((m) => m.key);
  const doPerfil = new Set(AREAS.filter((a) => areas.includes(a.key)).map((a) => a.modulo));
  return MODULOS.filter((m) => m.key === "treinamentos" || (m.key !== "administracao" && doPerfil.has(m.key))).map((m) => m.key);
}
