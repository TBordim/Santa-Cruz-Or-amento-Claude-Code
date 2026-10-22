"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { podeEditar } from "@/lib/permissions";
import { removerAceite } from "@/lib/aceite/abrir";

export async function excluirHistorico(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!(await podeEditar("HISTORICO"))) throw new Error("Sem permissão para excluir do Histórico.");
  const doc = await prisma.orcamento.findUnique({ where: { id } });
  if (doc?.origem === "LEGADO") throw new Error("Registros do Arquivo legado se excluem por lá.");
  await removerAceite(id); // PMs do Aceite saem junto (senão ficam órfãos em Compras)
  await prisma.orcamento.delete({ where: { id } });
  redirect("/historico");
}
