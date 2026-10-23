"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { sessaoAtual } from "@/lib/permissions";
import { salvarAnexoNoBlob, excluirAnexoDoBlob, lerArquivoGuardado } from "@/lib/anexos/storage";
import { podeAnexar, tipoDe } from "./permissao";
import { registrarArteDeAnexo } from "@/lib/protocolos/arte";
import { TAMANHO_MAXIMO_ANEXO } from "@/lib/anexos/compressao";

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

// Arquivo grande (PDF de arte de 14 MB, e-mail com anexos): a Vercel recusa mais de 4,5 MB numa
// requisição, e o envio direto ao Blob não funcionou com a chave de produção. Então o navegador
// manda o arquivo em pedaços de até 3 MB (enviarParteAnexo) e, no fim, o servidor junta os pedaços
// num só arquivo e registra o anexo (concluirAnexoGrande). Só usa o mesmo "put" dos anexos comuns.
const ID_ENVIO = /^[a-z0-9-]{8,64}$/;
const MAX_PARTE = 3_500_000;

export async function enviarParteAnexo(formData: FormData): Promise<{ url: string; pathname: string } | { erro: string }> {
  try {
    const orcamentoId = String(formData.get("orcamentoId") ?? "");
    const tipo = tipoDe(formData.get("tipo"));
    const envioId = String(formData.get("envioId") ?? "");
    const indice = Number(formData.get("indice"));
    const parte = formData.get("parte");
    if (!orcamentoId || !ID_ENVIO.test(envioId) || !Number.isInteger(indice) || indice < 0 || !(parte instanceof File)) return { erro: "Pedaço de arquivo inválido." };
    if (parte.size > MAX_PARTE) return { erro: "Pedaço de arquivo grande demais." };
    const sessao = await sessaoAtual();
    if (!sessao) return { erro: "Sessão expirada. Entre de novo." };
    if (!podeAnexar(sessao, tipo)) return { erro: "Sem permissão para anexar arquivo nesta etapa." };
    const salvo = await salvarAnexoNoBlob(orcamentoId, new File([parte], `${envioId}.${indice}.parte`, { type: "application/octet-stream" }));
    return { url: salvo.url, pathname: salvo.pathname };
  } catch (e) {
    console.error("enviarParteAnexo", e);
    return { erro: "Falha ao enviar parte do arquivo. Tente de novo." };
  }
}

export async function concluirAnexoGrande(formData: FormData): Promise<{ ok: true } | { erro: string }> {
  const partes: { url: string; pathname: string }[] = [];
  try {
    const orcamentoId = String(formData.get("orcamentoId") ?? "");
    const tipo = tipoDe(formData.get("tipo"));
    const caminho = String(formData.get("caminho") ?? "");
    const modeloId = String(formData.get("modeloId") ?? "") || null;
    const envioId = String(formData.get("envioId") ?? "");
    const nome = String(formData.get("nome") ?? "").slice(0, 255);
    const mime = String(formData.get("mime") ?? "");
    const lista = JSON.parse(String(formData.get("partes") ?? "[]")) as { url: string; pathname: string }[];
    if (!orcamentoId || !nome || !ID_ENVIO.test(envioId) || !Array.isArray(lista) || lista.length === 0 || lista.length > 20) return { erro: "Arquivo inválido." };
    // Só aceita pedaços que este envio gravou, na pasta deste orçamento.
    for (const p of lista) {
      if (typeof p?.pathname !== "string" || typeof p?.url !== "string" || p.pathname.includes("..") || !p.pathname.startsWith(`orcamentos/${orcamentoId}/`) || !p.pathname.includes(envioId)) {
        return { erro: "Arquivo inválido." };
      }
      partes.push(p);
    }
    const sessao = await sessaoAtual();
    if (!sessao) return { erro: "Sessão expirada. Entre de novo." };
    if (!podeAnexar(sessao, tipo)) return { erro: "Sem permissão para anexar arquivo nesta etapa." };

    const blocos: Buffer[] = [];
    let total = 0;
    for (const p of partes) {
      const b = await lerArquivoGuardado(p.url, p.pathname);
      total += b.length;
      if (total > TAMANHO_MAXIMO_ANEXO) return { erro: "Arquivo grande demais." };
      blocos.push(b);
    }
    const arquivo = new File(blocos as unknown as BlobPart[], nome, { type: mime });
    const { url, pathname } = await salvarAnexoNoBlob(orcamentoId, arquivo);
    const anexo = await prisma.anexo.create({
      data: { orcamentoId, tipo, modeloId, nome, mime, tamanho: arquivo.size, url, pathname, enviadoPorId: sessao.usuarioId },
    });
    if (tipo === "ARTE") {
      await registrarArteDeAnexo({ anexoId: anexo.id, orcamentoId, modeloId, rotulo: nome, origem: "ORCAMENTO", enviadoPor: sessao.nome });
    }
    if (caminho) revalidatePath(caminho);
    return { ok: true };
  } catch (e) {
    console.error("concluirAnexoGrande", e);
    return { erro: "Não foi possível juntar o arquivo. Tente de novo." };
  } finally {
    for (const p of partes) await excluirAnexoDoBlob(p.pathname).catch(() => {});
  }
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
