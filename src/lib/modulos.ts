// Registro central de módulos do sistema — pensado pra crescer: cada área bem diferente da
// empresa (Orçamento, Laboratório, e o que vier depois) é um módulo com sua própria home e
// seus próprios itens de navegação, trocados por um seletor no topo da sidebar
// (ver ModuloSwitcher). Adicionar um módulo novo deveria ser só uma entrada aqui + uma pasta
// de rotas nova — não mexer na lógica da sidebar.
export type ModuloKey = "orcamento" | "laboratorio";

export type Modulo = {
  key: ModuloKey;
  label: string;
  // Também usado pra decidir "em qual módulo eu estou" a partir do pathname (ver moduloAtual).
  basePath: string;
};

export const MODULOS: Modulo[] = [
  { key: "orcamento", label: "Orçamento", basePath: "/painel" },
  { key: "laboratorio", label: "Laboratório", basePath: "/laboratorio" },
];

// "Orçamento" é o módulo de sempre, sem prefixo de rota próprio (compatibilidade com as rotas
// que já existiam antes dos módulos) — por isso é o padrão de qualquer pathname que não bata
// com o prefixo de outro módulo.
export function moduloAtual(pathname: string): ModuloKey {
  const porPrefixo = MODULOS.find((m) => m.key !== "orcamento" && pathname.startsWith(m.basePath));
  return porPrefixo?.key ?? "orcamento";
}
