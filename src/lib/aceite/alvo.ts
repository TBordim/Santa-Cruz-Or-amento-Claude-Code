import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { lotesDoAceite, comoAceite, todosConcluidos, type LinhaLote } from "./lotes";

// ---------- alvo de uma ação: o Aceite, ou um lote dele ----------
// Aceite dividido (16/10/2026): PCP, cadastro do pedido, aviso ao cliente e entrega são por lote. O
// formulário manda o loteId; aqui o lote vira "o Aceite" (campos, PMs, entregas e negociações dele), e
// a gravação vai para a tabela certa. Aceite sem divisão: o alvo é o próprio Aceite, como sempre foi.
const incluirAlvo = { pedidosMaterial: true, negociacoes: true, entregas: true, lotes: { orderBy: { numero: "asc" as const } } };
type AceiteDoAlvo = Prisma.AceiteGetPayload<{ include: typeof incluirAlvo }>;
export type Alvo = { a: LinhaLote<AceiteDoAlvo>; lote: AceiteDoAlvo["lotes"][number] | null };

export async function carregarAlvo(aceiteId: string, loteId: FormDataEntryValue | null): Promise<Alvo | { erro: string }> {
  const base = await prisma.aceite.findUniqueOrThrow({ where: { id: aceiteId }, include: incluirAlvo });
  if (!base.lotes.length) return { a: { ...base, linha: base.id, lote: null }, lote: null };
  const lote = base.lotes.find((l) => l.id === String(loteId ?? "").trim());
  if (!lote) return { erro: "Este Aceite está dividido em lotes: abra o lote e faça a ação nele." };
  const vista = lotesDoAceite(base).find((v) => v.id === lote.id)!;
  return { a: comoAceite(base, vista), lote };
}

// Grava no lote ou no Aceite (as colunas têm os mesmos nomes). Devolve a operação, para usar em $transaction.
export function gravarAlvo(aceiteId: string, lote: { id: string } | null, data: Record<string, unknown>) {
  return lote
    ? prisma.loteAceite.update({ where: { id: lote.id }, data: data as Prisma.LoteAceiteUpdateInput })
    : prisma.aceite.update({ where: { id: aceiteId }, data: data as Prisma.AceiteUpdateInput });
}

// Depois de concluir um lote: se todos os lotes do Aceite estão concluídos, o Aceite conclui. A data de
// entrega e quem confirmou do Aceite passam a ser os do último lote (as listas usam esses campos).
export async function fecharAceiteSeLotesConcluidos(aceiteId: string): Promise<boolean> {
  const lotes = await prisma.loteAceite.findMany({ where: { aceiteId }, orderBy: { entregaConfirmadaEm: "desc" } });
  if (!lotes.length || !todosConcluidos(lotes.map((l) => ({ etapa: l.etapa as "CONCLUIDO" })))) return false;
  const ultimo = lotes[0];
  await prisma.aceite.update({
    where: { id: aceiteId },
    data: { etapa: "CONCLUIDO", entregueEm: ultimo.entregueEm, entregaConfirmadaEm: ultimo.entregaConfirmadaEm, entregaConfirmadaPor: ultimo.entregaConfirmadaPor },
  });
  return true;
}
