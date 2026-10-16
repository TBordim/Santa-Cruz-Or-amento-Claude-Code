// Sugestão de data de entrega do PCP (11/10/2026). Sem acesso ao banco: recebe o que o Aceite já
// sabe e os parâmetros do PCP, e devolve a data com o passo a passo da conta, pra o PCP conferir.
//
// A conta: o preparo (faca e clichê novos) corre junto com a chegada do papel; a produção começa
// quando os dois estão prontos e leva o maior entre o mínimo e folhas ÷ capacidade por dia, mais os
// dias do acabamento especial e uma margem. Tudo em dias úteis (sábado e domingo não contam; feriados
// ainda não são considerados).

export type ParametrosPcp = {
  diasProducaoMinimo: number;
  folhasPorDia: number;
  diasFacaNova: number;
  diasClicheNovo: number;
  diasAcabamentoEspecial: number;
  diasMargem: number;
};

export const PARAMETROS_INICIAIS: ParametrosPcp = {
  diasProducaoMinimo: 5,
  folhasPorDia: 4000,
  diasFacaNova: 7,
  diasClicheNovo: 5,
  diasAcabamentoEspecial: 3,
  diasMargem: 1,
};

export type EntradaSugestao = {
  hoje: Date;
  chegadaPapel: Date | null;
  folhas: number;
  facaNova: boolean;
  clicheNovo: boolean;
  acabamentoEspecial: boolean;
};

export type Sugestao = { data: Date; passos: string[] };

const DIA = 86400000;

function dm(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
}

// Soma `n` dias úteis a partir de `d` (n = 0 devolve o próprio dia).
export function somarDiasUteis(d: Date, n: number): Date {
  let r = new Date(d.getTime());
  let falta = Math.max(0, Math.round(n));
  while (falta > 0) {
    r = new Date(r.getTime() + DIA);
    const s = r.getUTCDay();
    if (s !== 0 && s !== 6) falta--;
  }
  return r;
}

export function sugerirData(e: EntradaSugestao, p: ParametrosPcp): Sugestao {
  const passos: string[] = [];
  const preparo = (e.facaNova ? p.diasFacaNova : 0) + (e.clicheNovo ? p.diasClicheNovo : 0);
  const prontoPreparo = somarDiasUteis(e.hoje, preparo);
  if (preparo > 0) {
    passos.push(`Preparo: ${[e.facaNova && `faca nova (${p.diasFacaNova})`, e.clicheNovo && `clichê novo (${p.diasClicheNovo})`].filter(Boolean).join(" + ")} dias úteis → pronto em ${dm(prontoPreparo)}.`);
  }
  if (e.chegadaPapel) passos.push(`Papel chega em ${dm(e.chegadaPapel)}.`);
  else passos.push("Papel em estoque: sem espera de chegada.");

  const inicio = e.chegadaPapel && e.chegadaPapel > prontoPreparo ? e.chegadaPapel : prontoPreparo;
  passos.push(`Produção começa em ${dm(inicio)}.`);

  const porCapacidade = p.folhasPorDia > 0 ? Math.ceil(e.folhas / p.folhasPorDia) : 0;
  const producao = Math.max(p.diasProducaoMinimo, porCapacidade);
  passos.push(
    `Produção: ${producao} dias úteis (${e.folhas ? `${e.folhas.toLocaleString("pt-BR")} folhas ÷ ${p.folhasPorDia.toLocaleString("pt-BR")} por dia = ${porCapacidade}; ` : ""}mínimo ${p.diasProducaoMinimo}).`,
  );
  const especial = e.acabamentoEspecial ? p.diasAcabamentoEspecial : 0;
  if (especial) passos.push(`Acabamento especial: +${especial} dias úteis.`);
  if (p.diasMargem) passos.push(`Margem de segurança: +${p.diasMargem} dia(s) útil(eis).`);

  const data = somarDiasUteis(inicio, producao + especial + p.diasMargem);
  passos.push(`Entrega sugerida: ${dm(data)}.`);
  return { data, passos };
}
