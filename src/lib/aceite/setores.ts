import type { AreaKey } from "@/lib/areas";

// Cada setor que trabalha no Aceite tem o próprio ambiente (tela com só o que é dele), em vez de
// um quadro de cards como o Orçamento. Pedido do Thiago em 08/10/2026. Engenharia, Compras e PCP
// também participam, mas pelos próprios módulos (/engenharia, /compras e /pcp), fora do Aceite.
// "Acompanhamento" é a visão de todos os Aceites, só leitura, aberta a quem entra no módulo.
export const SETORES_ACEITE = [
  {
    key: "vendas",
    label: "Vendas",
    area: "ACEITE_VENDAS",
    color: "#2E6B4F",
    descricao: "Preenche o Aceite, verifica papel e versão no ERP, emite PM e cadastra o pedido no ERP.",
  },
] as const satisfies readonly { key: string; label: string; area: AreaKey; color: string; descricao: string }[];

export type SetorAceite = (typeof SETORES_ACEITE)[number]["key"];

export function setorInfo(key: string) {
  return SETORES_ACEITE.find((s) => s.key === key);
}

// Setores do Aceite em que a pessoa trabalha (administrador: todos).
export function setoresDaPessoa(admin: boolean, areas: readonly string[]): SetorAceite[] {
  return SETORES_ACEITE.filter((s) => admin || areas.includes(s.area)).map((s) => s.key);
}
