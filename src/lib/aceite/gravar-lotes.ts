import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { situacaoGeral, type SuporteAceite } from "./suportes";
import type { ItemLote } from "./lotes";
import type { DataCliente } from "./datas-cliente";

export type LoteEnviado = { id: string | null; numero: number; itens: ItemLote[]; datas: DataCliente[]; suportes: SuporteAceite[] };

// Gravação dos lotes que Vendas enviou, reconhecendo cada lote pelo id (a posição pode mudar ao remover um).
// Os números são liberados (+1000) para a renumeração não bater na chave única; lote que sumiu da lista é
// apagado (o PM dele fica sem lote, com um registro no histórico, nunca é apagado); os demais são atualizados
// pelo id, ganhando o número da nova posição; os novos são criados. Devolve as operações para $transaction.
export function operacoesDosLotes(
  aceiteId: string,
  nome: string,
  a: { lotes: { id: string; numero: number }[]; pedidosMaterial: { id: string; status: string; loteId: string | null }[] },
  lotesEnviados: LoteEnviado[],
) {
  const idsDosLotes = new Set(a.lotes.map((l) => l.id));
  const mantidos = new Set(lotesEnviados.map((l) => l.id).filter((x): x is string => !!x && idsDosLotes.has(x)));
  const removidos = a.lotes.filter((l) => !mantidos.has(l.id));
  const pmsDosRemovidos = a.pedidosMaterial.filter((p) => p.status !== "CANCELADO" && p.loteId && removidos.some((l) => l.id === p.loteId));
  return [
    prisma.loteAceite.updateMany({ where: { aceiteId }, data: { numero: { increment: 1000 } } }),
    ...(pmsDosRemovidos.length
      ? [
          prisma.pedidoMaterialEvento.createMany({
            data: pmsDosRemovidos.map((p) => ({
              pedidoId: p.id,
              tipo: "LOTE",
              texto: `Lote ${removidos.find((l) => l.id === p.loteId)?.numero ?? ""} removido por Vendas: este PM ficou sem lote até Vendas ligá-lo a outro lote.`,
              porNome: nome,
            })),
          }),
        ]
      : []),
    prisma.loteAceite.deleteMany({ where: { aceiteId, id: { notIn: [...mantidos] } } }),
    ...lotesEnviados.map((l) => {
      const campos = {
        numero: l.numero,
        itens: JSON.parse(JSON.stringify(l.itens)),
        dataCliente: l.datas[0] ? new Date(l.datas[0].data + "T00:00:00.000Z") : null,
        datasCliente: l.datas.length ? (JSON.parse(JSON.stringify(l.datas)) as Prisma.InputJsonValue) : Prisma.JsonNull,
        suportes: JSON.parse(JSON.stringify(l.suportes)),
        situacaoPapel: situacaoGeral(l.suportes),
      };
      return l.id && mantidos.has(l.id) ? prisma.loteAceite.update({ where: { id: l.id }, data: campos }) : prisma.loteAceite.create({ data: { aceiteId, ...campos } });
    }),
  ];
}
