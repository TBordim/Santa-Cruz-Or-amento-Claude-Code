"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { sessaoAtual } from "@/lib/permissions";
import { salvarAnexoNoBlob, excluirAnexoDoBlob } from "@/lib/anexos/storage";
import { podeAnexar, tipoDe } from "./permissao";
import { registrarArteDeAnexo } from "@/lib/protocolos/arte";

export async function adicionarAnexo(formData: FormData) {
  const orcamentoId = String(formData.get("orcamentoId") ?? "");
  const tipo = tipoDe(formData.get("tipo"));
  const caminho = String(formData.get("caminho") ?? "");
  const modeloId = String(formData.get("modeloId") ?? "") || null;
  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || !orcamentoId) throw new Error("Arquivo inválido.");

  const sessao = await sessaoAtual();
  if (!sessao || !podeAnexar(sessao, tipo)) {
    throw new Error("Sem permissão para anexar arquivo nesta etapa.");
  }

  const { url, pathname } = await salvarAnexoNoBlob(orcamentoId, arquivo);
  const anexo = await prisma.anexo.create({
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
  // Arte do cliente nova vira pendência de protocolo de Vendas e trava o card (17/10/2026).
  if (tipo === "ARTE") {
    await registrarArteDeAnexo({ anexoId: anexo.id, orcamentoId, modeloId, rotulo: arquivo.name, origem: "ORCAMENTO", enviadoPor: sessao.nome });
  }
  if (caminho) revalidatePath(caminho);
}

// Arquivo grande: o navegador já enviou direto para o Vercel Blob (ver api/anexos/upload/route.ts)
// e aqui só se registra no banco. A confirmação do endereço evita registrar um link qualquer.
export async function registrarAnexoEnviado(formData: FormData) {
  const orcamentoId = String(formData.get("orcamentoId") ?? "");
  const tipo = tipoDe(formData.get("tipo"));
  const caminho = String(formData.get("caminho") ?? "");
  const modeloId = String(formData.get("modeloId") ?? "") || null;
  const url = String(formData.get("url") ?? "");
  const pathname = String(formData.get("pathname") ?? "");
  const nome = String(formData.get("nome") ?? "").slice(0, 255);
  const mime = String(formData.get("mime") ?? "");
  const tamanho = Number(formData.get("tamanho") ?? 0);
  if (!orcamentoId || !nome || !pathname.startsWith(`orcamentos/${orcamentoId}/`) || pathname.includes("..")) throw new Error("Arquivo inválido.");
  let host = "";
  try { host = new URL(url).hostname; } catch { /* url inválida cai no erro abaixo */ }
  if (!host.endsWith(".public.blob.vercel-storage.com")) throw new Error("Endereço do arquivo inválido.");

  const sessao = await sessaoAtual();
  if (!sessao || !podeAnexar(sessao, tipo)) throw new Error("Sem permissão para anexar arquivo nesta etapa.");

  const anexo = await prisma.anexo.create({
    data: { orcamentoId, tipo, modeloId, nome, mime, tamanho: Number.isFinite(tamanho) ? tamanho : 0, url, pathname, enviadoPorId: sessao.usuarioId },
  });
  if (tipo === "ARTE") {
    await registrarArteDeAnexo({ anexoId: anexo.id, orcamentoId, modeloId, rotulo: nome, origem: "ORCAMENTO", enviadoPor: sessao.nome });
  }
  if (caminho) revalidatePath(caminho);
}

export async function excluirAnexo(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const caminho = String(formData.get("caminho") ?? "");
  const anexo = await prisma.anexo.findUnique({ where: { id } });
  if (!anexo) return;

  const tipo = tipoDe(anexo.tipo);
  const sessao = await sessaoAtual();
  if (!sessao || !podeAnexar(sessao, tipo)) {
    throw new Error("Sem permissão para excluir este anexo.");
  }

  // Arte já protocolada é propriedade do cliente: não se apaga (a revisão tem a própria cópia, mas o
  // registro de que ela veio neste orçamento fica).
  const arte = await prisma.arteEnviada.findUnique({ where: { anexoId: id }, select: { estado: true } });
  if (arte && arte.estado !== "PENDENTE") throw new Error("Esta arte já foi protocolada e não pode ser excluída.");

  await excluirAnexoDoBlob(anexo.pathname);
  await prisma.anexo.delete({ where: { id } });
  if (caminho) revalidatePath(caminho);
}
