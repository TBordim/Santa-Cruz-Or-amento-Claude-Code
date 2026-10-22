import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { listarAceites, listarAceitesComAlerta } from "./dados";
import { linhasPorLote } from "./lotes";
import { temAlertaPendente } from "./constantes";
import { hojeBrasil } from "./agenda";
import { contarAvisosCancelamento } from "./avisos";

// Filas de trabalho dos setores do Aceite e das telas do Aceite nos módulos Compras e PCP. Ficam
// juntas pra todas as telas contarem do mesmo jeito.

export const FILAS = {
  vendas: {
    preencher: { etapa: "VENDAS" },
    // Aceites que ainda não terminaram (a tabela "Aceites em andamento").
    // Aceite dividido (EM_LOTES) entra: cada lote tem o seu cadastro de pedido e a sua OF.
    pedido: { etapa: { in: ["PEDIDO", "EM_LOTES"] } },
    andamento: { etapa: { in: ["ENGENHARIA_MATERIAL", "PCP", "ATENDIMENTO", "ENTREGA"] } },
    concluidos: { etapa: "CONCLUIDO" },
    // Pedido já cadastrado e OF ainda não registrada: pendência de Vendas até registrar (a OF pode
    // ser aberta depois, mas não pode ser esquecida — pedido do Thiago em 11/10/2026).
    // Pedido interno: pode ficar em branco ao liberar, mas depois da Engenharia Vendas precisa informar.
    interno: { etapa: { in: ["ENGENHARIA_MATERIAL", "PCP", "PEDIDO", "ATENDIMENTO", "ENTREGA"] }, engenhariaEm: { not: null }, pedidoInterno: null },
    of: { OR: [{ etapa: { in: ["ATENDIMENTO", "ENTREGA", "CONCLUIDO"] }, pedidoCadastradoEm: { not: null }, numeroOF: null }, { etapa: "EM_LOTES" }] },
  },
  engenharia: {
    conferir: { etapa: "ENGENHARIA_MATERIAL", engenhariaEm: null },
    confirmados: { engenhariaEm: { not: null } },
  },
  pcp: {
    // Aceite dividido (EM_LOTES) entra em todas: o PCP separa por lote na tela (lib/aceite/lotes.ts).
    data: { etapa: { in: ["PCP", "EM_LOTES"] } },
    chegando: { etapa: { in: ["ENGENHARIA_MATERIAL", "EM_LOTES"] } },
    carteira: { OR: [{ etapa: { in: ["PEDIDO", "ATENDIMENTO", "ENTREGA", "CONCLUIDO"] }, dataEntrega: { not: null } }, { etapa: "EM_LOTES" }] },
    // Cliente avisado, falta o PCP confirmar a entrega.
    entregar: { etapa: { in: ["ENTREGA", "EM_LOTES"] } },
  },
} satisfies Record<string, Record<string, Prisma.AceiteWhereInput>>;

// "Aguardando prazo" = ainda sem data de chegada; "Com data" = data definida, ainda não recebido.
export const FILAS_PM = {
  prazo: { status: { in: ["SOLICITADO", "EM_COMPRA", "PRAZO_CONFIRMADO"] }, prazoPrevisto: null },
  confirmados: { status: { in: ["SOLICITADO", "EM_COMPRA", "PRAZO_CONFIRMADO"] }, prazoPrevisto: { not: null } },
  sobras: { status: { not: "CANCELADO" }, sobraPrevista: { gt: 0 }, sobraEncerradaEm: null },
  encerrados: { status: { in: ["RECEBIDO", "CANCELADO"] } },
} satisfies Record<string, Prisma.PedidoMaterialWhereInput>;

// Alertas de mudança do fornecedor que importam pra cada setor: Vendas vê todos os Aceites em
// andamento; o PCP, os que já passaram por ele ou estão nele.
export const ALERTAS_ONDE: Record<"vendas" | "pcp", Prisma.AceiteWhereInput> = {
  vendas: { etapa: { notIn: ["CONCLUIDO", "CANCELADO"] } },
  pcp: { etapa: { in: ["PCP", "EM_LOTES", "PEDIDO", "ATENDIMENTO", "ENTREGA", "CONCLUIDO"] } },
};

// Pendências de Vendas no Aceite (tela inicial do módulo e página de entrada).
// Linhas (lote ou Aceite) de cada fila de Vendas: o cadastro do pedido e a OF são por lote.
export const noCadastroDoPedido = (a: { etapa: string }) => a.etapa === "PEDIDO";
export const semOFRegistrada = (a: { etapa: string; pedidoCadastradoEm: Date | null; numeroOF: string | null }) =>
  ["ATENDIMENTO", "ENTREGA", "CONCLUIDO"].includes(a.etapa) && !!a.pedidoCadastradoEm && !a.numeroOF;
export const esperandoAtendimento = (a: { etapa: string }) => a.etapa === "ATENDIMENTO";

export async function contarPendenciasVendas() {
  const [vPreencher, pedidoB, ofB, vInterno, alertasVendas] = await Promise.all([
    prisma.aceite.count({ where: FILAS.vendas.preencher }),
    listarAceites(FILAS.vendas.pedido),
    listarAceites(FILAS.vendas.of),
    prisma.aceite.count({ where: FILAS.vendas.interno }),
    listarAceitesComAlerta(ALERTAS_ONDE.vendas),
  ]);
  const vPedido = linhasPorLote(pedidoB).filter(noCadastroDoPedido).length;
  const vOF = linhasPorLote(ofB).filter(semOFRegistrada).length;
  // Cancelamentos com algo por fazer no ERP também esperam Vendas.
  const vCancelados = await prisma.aceite.count({ where: { etapa: "CANCELADO", canceladoErpPendente: true } });
  return vPreencher + vPedido + vOF + vInterno + alertasVendas.length + vCancelados;
}

// Atendimento: lotes (ou Aceites) esperando a data ser enviada ao cliente.
export async function contarFilaAtendimento(): Promise<number> {
  return linhasPorLote(await listarAceites(FILA_ATENDIMENTO)).filter(esperandoAtendimento).length;
}

// Atendimento ao Cliente: Aceites esperando a data ser enviada ao cliente/representante.
export const FILA_ATENDIMENTO = { etapa: { in: ["ATENDIMENTO", "EM_LOTES"] } } satisfies Prisma.AceiteWhereInput;

// Pendências do PCP, contadas por lote (Aceite sem divisão conta como uma linha): datas a definir,
// clientes que pediram outra data, entregas com a data chegada e fornecedores que mudaram o prazo.
export async function contarPendenciasPcp(): Promise<number> {
  const hoje = hojeBrasil(new Date());
  const [dataB, negB, entB, alertasB] = await Promise.all([
    listarAceites(FILAS.pcp.data),
    listarAceites({ negociacoes: { some: { status: "AGUARDANDO_PCP" } } }),
    listarAceites(FILAS.pcp.entregar),
    listarAceitesComAlerta(ALERTAS_ONDE.pcp),
  ]);
  const data = linhasPorLote(dataB).filter((a) => a.etapa === "PCP");
  const negociacoes = linhasPorLote(negB).filter((a) => a.negociacoes.some((n) => n.status === "AGUARDANDO_PCP"));
  const vencidas = linhasPorLote(entB).filter((a) => a.etapa === "ENTREGA" && !!a.dataEntrega && a.dataEntrega <= hoje);
  const alertas = linhasPorLote(alertasB).filter((a) => temAlertaPendente(a.pedidosMaterial));
  return data.length + negociacoes.length + vencidas.length + alertas.length + (await contarAvisosCancelamento("PCP"));
}

