// Portado 1:1 do array AREAS do santa-cruz-orcamentos.html (linhas 694-704) — mesma chave,
// mesmo rótulo, mesma ordem. É o checklist de permissões usado na tela de Administração
// (perfis) e, a partir da Fase 2, o controle de "pode editar" em cada etapa do fluxo.
export type AreaKey =
  | "NOVO"
  | "ABERTO"
  | "ENGENHARIA"
  | "ORCAMENTO"
  | "DIRETORIA"
  | "ENVIO_OFERTA"
  | "FINALIZADO"
  | "LEGADO"
  | "HISTORICO";

export type Area = {
  key: AreaKey;
  label: string;
  hint: string;
};

export const AREAS: Area[] = [
  { key: "NOVO", label: "Novo Orçamento", hint: "Abrir um pedido novo" },
  { key: "ABERTO", label: "Solicitação de Orçamento", hint: "Etapa 1 — dados comerciais" },
  { key: "ENGENHARIA", label: "Engenharia", hint: "Etapa 2" },
  { key: "ORCAMENTO", label: "Orçamento", hint: "Etapa 3 — preço e margem" },
  { key: "DIRETORIA", label: "Diretoria", hint: "Etapa 4 — aprovação" },
  { key: "ENVIO_OFERTA", label: "Envio de Oferta", hint: "Etapa 5 — monta e envia a oferta ao cliente" },
  { key: "FINALIZADO", label: "Finalizado", hint: "Etapa 6 — registra o retorno do cliente" },
  { key: "LEGADO", label: "Arquivo legado", hint: "Cadastrar, editar e excluir registros antigos" },
  { key: "HISTORICO", label: "Histórico", hint: "Excluir registros do histórico" },
];

export const AREA_KEYS: AreaKey[] = AREAS.map((a) => a.key);

export function isAreaKey(value: string): value is AreaKey {
  return (AREA_KEYS as string[]).includes(value);
}

export function areaLabel(key: string): string {
  return AREAS.find((a) => a.key === key)?.label ?? key;
}
