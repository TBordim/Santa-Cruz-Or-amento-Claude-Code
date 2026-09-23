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
  | "LEGADO"
  | "HISTORICO"
  // Módulo Laboratório, área Cor (formulação de tinta). Só Laboratório e Engenharia
  // registram/editam — Produção é só consulta, e consulta já é livre pra qualquer um logado
  // (mesma regra do resto do painel), então não precisa de chave própria aqui.
  | "COR_LABORATORIO"
  | "COR_ENGENHARIA";

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
  { key: "DIRETORIA", label: "Diretoria", hint: "Etapa 4 — aprovação", modulo: "orcamento" },
  { key: "ENVIO_OFERTA", label: "Envio de Oferta", hint: "Etapa 5 — monta e envia a oferta ao cliente", modulo: "orcamento" },
  { key: "FINALIZADO", label: "Retorno do Cliente", hint: "Etapa 6 — registra o retorno do cliente e, se aprovado, a pendência de código de produto", modulo: "orcamento" },
  { key: "LEGADO", label: "Arquivo legado", hint: "Cadastrar, editar e excluir registros antigos", modulo: "orcamento" },
  { key: "HISTORICO", label: "Histórico", hint: "Excluir registros do histórico", modulo: "orcamento" },
  { key: "COR_LABORATORIO", label: "Laboratório", hint: "Testes, fórmulas e ajustes de cor", modulo: "laboratorio" },
  { key: "COR_ENGENHARIA", label: "Engenharia de cor", hint: "Registro e gestão das fórmulas de cor", modulo: "laboratorio" },
];

export const AREA_KEYS: AreaKey[] = AREAS.map((a) => a.key);

export function isAreaKey(value: string): value is AreaKey {
  return (AREA_KEYS as string[]).includes(value);
}

export function areaLabel(key: string): string {
  return AREAS.find((a) => a.key === key)?.label ?? key;
}
