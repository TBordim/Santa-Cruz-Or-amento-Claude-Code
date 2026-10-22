import "server-only";
import { prisma } from "@/lib/db";
import { podeEditar } from "@/lib/permissions";
import { SETOR_AVISO, type SetorAviso } from "./cancelamento";

// Avisos de pedido cancelado que o setor ainda não deu ciência (19/10/2026). Só aparece para quem pode
// agir no setor (administrador vê todos), como nas pendências.

export async function listarAvisosCancelamento(setor: SetorAviso) {
  if (!(await podeEditar(SETOR_AVISO[setor].area))) return [];
  return prisma.avisoCancelamento.findMany({
    where: { setor, vistoEm: null },
    orderBy: { criadoEm: "asc" },
    include: { aceite: { select: { id: true, numero: true, canceladoMotivo: true, canceladoPor: true, canceladoEm: true, orcamento: { select: { cliente: true, produtoDescricao: true } } } } },
  });
}

export async function contarAvisosCancelamento(setor: SetorAviso): Promise<number> {
  if (!(await podeEditar(SETOR_AVISO[setor].area))) return 0;
  return prisma.avisoCancelamento.count({ where: { setor, vistoEm: null } });
}
