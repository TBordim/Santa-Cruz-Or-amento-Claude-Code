// Medidas do produto (comprimento × largura × altura, em mm) e casamento de cliente — a segunda
// linha de rastreio da Diretoria. Produto que o cliente não aprovou nunca ganha Código interno
// (ele só é gerado depois da aprovação), então, quando o mesmo pedido volta, o código sozinho não
// acha o orçamento anterior; as medidas exatas do mesmo cliente acham. Pedido do Thiago em
// 09/10/2026. Sem acesso ao banco.
import { chave } from "./chave";

export type Medidas = { F: string; L: string; A: string };

export const SEM_MEDIDAS: Medidas = { F: "", L: "", A: "" };

// As medidas moram no JSON reqCliente (medidaF/medidaL/medidaA) — nos orçamentos do fluxo e,
// desde 09/10/2026, também nos registros do Arquivo legado.
export function medidasDoReq(req: unknown): Medidas {
  const r = (req ?? {}) as Record<string, unknown>;
  const t = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  return { F: t(r.medidaF), L: t(r.medidaL), A: t(r.medidaA) };
}

// "40", "40,5" e "40.5" viram número; texto que não é número vira null.
export function numeroMedida(s: string): number | null {
  const limpo = s.trim().replace(/\s/g, "").replace(",", ".");
  if (!limpo) return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

// Só vale pra comparar quem tem comprimento e largura. A altura é opcional, mas, se um lado
// informou e o outro não, não é a mesma medida.
export function temMedidasParaComparar(m: Medidas): boolean {
  return numeroMedida(m.F) !== null && numeroMedida(m.L) !== null;
}

export function medidasIguais(a: Medidas, b: Medidas): boolean {
  if (!temMedidasParaComparar(a) || !temMedidasParaComparar(b)) return false;
  const igual = (x: string, y: string) => {
    const nx = numeroMedida(x);
    const ny = numeroMedida(y);
    if (nx === null || ny === null) return nx === ny; // os dois sem altura = igual
    return Math.abs(nx - ny) < 0.01;
  };
  return igual(a.F, b.F) && igual(a.L, b.L) && igual(a.A, b.A);
}

export function textoMedidas(m: Medidas): string {
  return [m.F, m.L, m.A].map((v) => v || "—").join(" × ") + " mm";
}

type QuemE = { clienteId?: string | null; clienteChave?: string | null; cnpj?: string | null };

const digitos = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

// Mesmo cliente por qualquer um destes: o mesmo cadastro, o mesmo CNPJ ou um nome parecido (um
// contém o outro, sem diferenciar caixa/acento — "COMPACTOR" e "COMPACTOR LTDA"). O nome sozinho
// varia por digitação, por isso o cadastro e o CNPJ vêm primeiro.
export function mesmoCliente(a: QuemE, b: QuemE): boolean {
  if (a.clienteId && b.clienteId) return a.clienteId === b.clienteId;
  const ca = digitos(a.cnpj);
  const cb = digitos(b.cnpj);
  if (ca.length === 14 && cb.length === 14) return ca === cb;
  const na = chave(a.clienteChave);
  const nb = chave(b.clienteChave);
  if (na.length < 5 || nb.length < 5) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}
