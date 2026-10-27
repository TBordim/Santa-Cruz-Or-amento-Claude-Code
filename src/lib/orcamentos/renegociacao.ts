import { chave } from "./chave";
import { parseQuantidade } from "./motor";
import type { OfertaGuardada, PrecificacaoTier, Renegociacao, ReqTecnicos } from "./types";

// Renegociação de preço depois que a oferta foi enviada (pedido do Thiago em 28/10/2026): o cliente pede
// desconto, a oferta anterior fica guardada como está, o card volta ao Orçamento, a Diretoria reaprova
// sempre à mão e a oferta nova segue ao cliente. Sem acesso ao banco.

export function renegociacoesDe(r: unknown): Renegociacao[] {
  const lista = (r as ReqTecnicos | null)?.renegociacoes;
  return Array.isArray(lista) ? lista : [];
}

// A renegociação em andamento: a última, enquanto a oferta nova não foi marcada como enviada.
export function renegociacaoAberta(r: unknown): Renegociacao | null {
  const ultima = renegociacoesDe(r).at(-1);
  return ultima && !ultima.concluidaEm ? ultima : null;
}

export function guardarOferta(t: PrecificacaoTier): OfertaGuardada {
  return {
    quantidade: t.quantidade,
    ...(t.papelIdx !== undefined ? { papelIdx: t.papelIdx } : {}),
    ...(t.papel !== undefined ? { papel: t.papel } : {}),
    numeroSequencial: t.numeroSequencial,
    precoProjetado: t.precoProjetado,
    precoFinal: t.precoFinal ?? t.precoFinalSugerido ?? null,
    custoPrimarioPct: t.custoPrimarioPct,
    margemP2Pct: t.margemP2Pct,
    margemP1Pct: t.margemP1Pct ?? null,
    ...(t.decididoPor ? { decididoPor: t.decididoPor } : {}),
    ...(t.decididoEm ? { decididoEm: t.decididoEm } : {}),
  };
}

const chaveDaOferta = (o: { quantidade: string; papelIdx?: number; papel?: string }) => `${o.papelIdx ?? o.papel ?? ""}|${chave(o.quantidade)}`;

// Valor do que foi ofertado: preço por milheiro × milheiros.
export function valorDaOferta(o: Pick<OfertaGuardada, "quantidade" | "precoFinal" | "precoProjetado">): number {
  return (o.precoFinal ?? o.precoProjetado ?? 0) * ((parseQuantidade(o.quantidade) ?? 0) / 1000);
}

export type LinhaComparada = {
  rotulo: string;
  antes: OfertaGuardada | null;
  // Preço por milheiro de agora: o projetado enquanto a Diretoria não decidiu; o final depois.
  agoraPreco: number | null;
  agoraCusto: number | null;
  agoraMargem: number | null;
  agoraP1: number | null;
  variacaoPct: number | null;
};

// Casa cada SO de agora com a que foi ofertada antes (mesma quantidade e papel).
export function compararComOfertaAnterior(tiers: PrecificacaoTier[], reneg: Renegociacao, usarFinal: boolean): LinhaComparada[] {
  return tiers.map((t) => {
    const antes = reneg.oferta.find((o) => chaveDaOferta(o) === chaveDaOferta(t)) ?? null;
    const agoraPreco = usarFinal ? (t.precoFinal ?? t.precoProjetado) : t.precoProjetado;
    const base = antes ? (antes.precoFinal ?? antes.precoProjetado) : null;
    return {
      rotulo: `${t.numeroSequencial ? `SO ${t.numeroSequencial} · ` : ""}${t.quantidade}${t.papel ? ` · ${t.papel}` : ""}`,
      antes,
      agoraPreco: Number.isFinite(agoraPreco) ? agoraPreco : null,
      agoraCusto: t.custoPrimarioPct,
      agoraMargem: t.margemP2Pct,
      agoraP1: t.margemP1Pct ?? null,
      variacaoPct: base && Number.isFinite(agoraPreco) ? ((agoraPreco - base) / base) * 100 : null,
    };
  });
}

// Quanto o desconto custou: soma, nas SOs casadas, de (valor antes − valor agora) quando for positivo.
type Linha = { quantidade: string; papelIdx?: number; papel?: string; precoFinal?: number | null; precoProjetado: number };
export function valorCedido(depois: Linha[], reneg: Renegociacao): number {
  let total = 0;
  for (const t of depois) {
    const antes = reneg.oferta.find((o) => chaveDaOferta(o) === chaveDaOferta(t));
    if (!antes) continue;
    const dif = valorDaOferta(antes) - valorDaOferta({ quantidade: t.quantidade, precoFinal: t.precoFinal ?? null, precoProjetado: t.precoProjetado });
    if (dif > 0) total += dif;
  }
  return total;
}
