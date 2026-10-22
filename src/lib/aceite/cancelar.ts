import { prisma } from "@/lib/db";
import { avaliarCancelamento, pendenciaNoErp } from "./cancelamento";

// Núcleo do cancelamento de pedido (a ação só confere a permissão e redireciona). Só depende do banco.
export async function executarCancelamento(
  id: string,
  nome: string,
  motivoBruto: string,
  feito: { pedido: boolean; of: boolean; envelope: boolean },
): Promise<{ ok: true } | { erro: string }> {
  const a = await prisma.aceite.findUniqueOrThrow({ where: { id }, include: { pedidosMaterial: true, lotes: true, entregas: true } });
  if (a.etapa === "CANCELADO") return { erro: "Este pedido já está cancelado." };
  if (a.etapa === "CONCLUIDO") return { erro: "O pedido já foi entregue e concluído: não dá para cancelar." };
  if (a.entregas.length > 0) return { erro: "Já houve entrega confirmada neste pedido. Para o que falta, cancele o saldo na entrega." };
  const motivo = motivoBruto.trim();
  if (!motivo) return { erro: "Informe o motivo do cancelamento." };

  const c = avaliarCancelamento(a);
  const agora = new Date();
  const pmsAtivos = a.pedidosMaterial.filter((p) => p.status !== "CANCELADO");
  await prisma.$transaction([
    prisma.aceite.update({
      where: { id },
      data: {
        etapa: "CANCELADO",
        canceladoEm: agora,
        canceladoPor: nome,
        canceladoMotivo: motivo.slice(0, 500),
        canceladoNaEtapa: a.etapa,
        canceladoErpPendente: pendenciaNoErp(c, feito),
        canceladoAvisarPreImpressao: c.avisarPreImpressao,
      },
    }),
    // Negociação de data em aberto deixa de esperar alguém.
    prisma.negociacaoData.updateMany({
      where: { aceiteId: id, status: { not: "ENCERRADA" } },
      data: { status: "ENCERRADA", encerradaEm: agora, encerradaPor: nome, encerradaObs: "Pedido cancelado." },
    }),
    ...(c.avisos.length ? [prisma.avisoCancelamento.createMany({ data: c.avisos.map((x) => ({ aceiteId: id, setor: x.setor, texto: x.texto })) })] : []),
    // Cada PM ativo ganha um registro no histórico: Compras vê o motivo e decide a Ordem de Compra.
    ...(pmsAtivos.length
      ? [
          prisma.pedidoMaterialEvento.createMany({
            data: pmsAtivos.map((p) => ({ pedidoId: p.id, tipo: "ACEITE_CANCELADO", texto: `Pedido cancelado por Vendas: ${motivo.slice(0, 200)}. Decida se esta Ordem de Compra pode ser cancelada.`, porNome: nome })),
          }),
        ]
      : []),
  ]);
  return { ok: true };
}
