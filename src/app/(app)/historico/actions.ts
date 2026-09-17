"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { podeEditar } from "@/lib/permissions";

export async function excluirHistorico(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!(await podeEditar("HISTORICO"))) throw new Error("Sem permissão para excluir do Histórico.");
  const doc = await prisma.orcamento.findUnique({ where: { id } });
  if (doc?.origem === "LEGADO") throw new Error("Registros do Arquivo legado se excluem por lá.");
  await prisma.orcamento.delete({ where: { id } });
  redirect("/historico");
}
