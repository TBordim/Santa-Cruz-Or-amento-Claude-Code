"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { sessaoAtual } from "@/lib/permissions";
import { salvarAnexoNoBlob, excluirAnexoDoBlob } from "@/lib/anexos/storage";
import type { AreaKey } from "@/lib/areas";

// Áreas que controlam cada tipo de anexo — arte é anexada em Em Aberto, anexos técnicos em
// Engenharia (mesma regra de podeEditar por etapa do sistema atual). Ordem de compra do cliente: só
// quem registra o desfecho (Retorno do Cliente) anexa; Vendas e os demais só consultam no Aceite.
type TipoAnexoKey = "ARTE" | "ENGENHARIA" | "ORDEM_COMPRA";
const AREAS_POR_TIPO: Record<TipoAnexoKey, AreaKey[]> = {
  ARTE: ["ABERTO"],
  ENGENHARIA: ["ENGENHARIA"],
  ORDEM_COMPRA: ["FINALIZADO"],
};
const tipoDe = (v: unknown): TipoAnexoKey => (v === "ENGENHARIA" || v === "ORDEM_COMPRA" ? v : "ARTE");

export async function adicionarAnexo(formData: FormData) {
  const orcamentoId = String(formData.get("orcamentoId") ?? "");
  const tipo = tipoDe(formData.get("tipo"));
  const caminho = String(formData.get("caminho") ?? "");
  const modeloId = String(formData.get("modeloId") ?? "") || null;
  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || !orcamentoId) throw new Error("Arquivo inválido.");

  const sessao = await sessaoAtual();
  if (!sessao || !(sessao.admin || AREAS_POR_TIPO[tipo].some((a) => sessao.areas.includes(a)))) {
    throw new Error("Sem permissão para anexar arquivo nesta etapa.");
  }

  const { url, pathname } = await salvarAnexoNoBlob(orcamentoId, arquivo);
  await prisma.anexo.create({
    data: {
      orcamentoId,
      tipo,
      modeloId,
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

  const tipo = tipoDe(anexo.tipo);
  const sessao = await sessaoAtual();
  if (!sessao || !(sessao.admin || AREAS_POR_TIPO[tipo].some((a) => sessao.areas.includes(a)))) {
    throw new Error("Sem permissão para excluir este anexo.");
  }

  await excluirAnexoDoBlob(anexo.pathname);
  await prisma.anexo.delete({ where: { id } });
  if (caminho) revalidatePath(caminho);
}
