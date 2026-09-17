"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { sessaoAtual } from "@/lib/permissions";
import { salvarAnexoNoBlob, excluirAnexoDoBlob } from "@/lib/anexos/storage";
import type { AreaKey } from "@/lib/areas";

// Áreas que controlam cada tipo de anexo — arte é anexada em Em Aberto, anexos técnicos em
// Engenharia (mesma regra de podeEditar por etapa do sistema atual).
const AREA_POR_TIPO: Record<"ARTE" | "ENGENHARIA", AreaKey> = {
  ARTE: "ABERTO",
  ENGENHARIA: "ENGENHARIA",
};

export async function adicionarAnexo(formData: FormData) {
  const orcamentoId = String(formData.get("orcamentoId") ?? "");
  const tipo = formData.get("tipo") === "ENGENHARIA" ? "ENGENHARIA" : "ARTE";
  const caminho = String(formData.get("caminho") ?? "");
  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || !orcamentoId) throw new Error("Arquivo inválido.");

  const sessao = await sessaoAtual();
  if (!sessao || !(sessao.admin || sessao.areas.includes(AREA_POR_TIPO[tipo]))) {
    throw new Error("Sem permissão para anexar arquivo nesta etapa.");
  }

  const { url, pathname } = await salvarAnexoNoBlob(orcamentoId, arquivo);
  await prisma.anexo.create({
    data: {
      orcamentoId,
      tipo,
      nome: arquivo.name,
      mime: arquivo.type,
      tamanho: arquivo.size,
      url,
      pathname,
      enviadoPorId: sessao.usuarioId,
    },
  });
  if (caminho) revalidatePath(caminho);
}

export async function excluirAnexo(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const caminho = String(formData.get("caminho") ?? "");
  const anexo = await prisma.anexo.findUnique({ where: { id } });
  if (!anexo) return;

  const tipo = anexo.tipo === "ENGENHARIA" ? "ENGENHARIA" : "ARTE";
  const sessao = await sessaoAtual();
  if (!sessao || !(sessao.admin || sessao.areas.includes(AREA_POR_TIPO[tipo]))) {
    throw new Error("Sem permissão para excluir este anexo.");
  }

  await excluirAnexoDoBlob(anexo.pathname);
  await prisma.anexo.delete({ where: { id } });
  if (caminho) revalidatePath(caminho);
}
