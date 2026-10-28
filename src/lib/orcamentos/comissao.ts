import type { AlteracaoComissao, ReqTecnicos } from "./types";

// Comissão do representante (campo "Comissão CEV"). Nasce na Solicitação, mas na negociação com o cliente
// ou com o representante ela pode mudar; no Orçamento a orçamentista ajusta e o sistema guarda cada mudança
// (de quanto para quanto, quem e quando) para a Diretoria ver (pedido do Thiago em 28/10/2026).
// Sem acesso ao banco.

export const MAX_COMISSAO = 200;

const limpa = (s: string | null | undefined) => (s ?? "").trim().slice(0, MAX_COMISSAO);

// Compara sem diferença de maiúscula/espaço: "5%" e " 5% " são a mesma comissão.
const igual = (a: string, b: string) => a.toLowerCase().replace(/\s+/g, "") === b.toLowerCase().replace(/\s+/g, "");

export function comissaoDoForm(bruto: unknown): string | null {
  return limpa(String(bruto ?? "")) || null;
}

// Devolve o reqTecnicos com a mudança registrada (se houve). Não muda nada quando o valor é igual.
export function comAlteracaoDeComissao(r: ReqTecnicos | null, atual: string | null, nova: string | null, por: string, agora: number = Date.now()): ReqTecnicos {
  const base = { ...(r ?? ({ suportes: [], anexos: [] } as unknown as ReqTecnicos)) };
  if (igual(limpa(atual), limpa(nova))) return base;
  base.alteracoesComissao = [...(base.alteracoesComissao ?? []), { de: limpa(atual) || null, para: limpa(nova) || null, por, em: agora }];
  return base;
}

export function alteracoesDeComissao(r: unknown): AlteracaoComissao[] {
  const lista = (r as ReqTecnicos | null)?.alteracoesComissao;
  return Array.isArray(lista) ? lista.filter((a) => a && typeof a.em === "number") : [];
}
