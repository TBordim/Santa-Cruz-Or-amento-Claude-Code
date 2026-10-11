import "server-only";
import { prisma } from "@/lib/db";
import { PARAMETROS_INICIAIS, type ParametrosPcp } from "./sugestao";

// Parâmetros do PCP: o que o PCP salvou na tela Parâmetros, ou os valores iniciais se ainda não salvou.
export async function carregarParametros(): Promise<ParametrosPcp & { salvo: boolean }> {
  const p = await prisma.pcpParametros.findUnique({ where: { id: "padrao" } });
  if (!p) return { ...PARAMETROS_INICIAIS, salvo: false };
  return {
    diasProducaoMinimo: p.diasProducaoMinimo,
    folhasPorDia: p.folhasPorDia,
    diasFacaNova: p.diasFacaNova,
    diasClicheNovo: p.diasClicheNovo,
    diasAcabamentoEspecial: p.diasAcabamentoEspecial,
    diasMargem: p.diasMargem,
    salvo: true,
  };
}
