"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { nomeSePode } from "@/lib/aceite/servidor";
import { salvarAnexoNoBlob } from "@/lib/anexos/storage";
import { MAX_ARQUIVOS_NOVO, MAX_TOTAL_BYTES_NOVO, tipoAnexoAceito } from "@/lib/anexos/limites";
import { erroNoLink, normalizarLink } from "@/lib/orcamentos/link";
import { registrarArteDeAnexo, registrarArteDeLinkAvulso } from "@/lib/protocolos/arte";

export type FormState = { erro?: string; ok?: string } | undefined;

// O Atendimento ao Cliente recebe arte do cliente (por e-mail, link ou junto da ordem de compra) e a
// ENVIA. Se o pedido já foi confirmado (há Aceite), a arte entra na fila "Artes a protocolar" de
// Vendas e o Aceite não segue até ser protocolada; antes do pedido ela só fica junto do orçamento.
// Quem protocola é só Vendas. Decisões do Thiago em 17/10 e 19/10/2026.
export async function enviarArteParaVendas(_prev: FormState, fd: FormData): Promise<FormState> {
  const nome = await nomeSePode("ATENDIMENTO_CLIENTE");
  if (!nome) return { erro: "Sem permissão (área Atendimento)." };

  const orcamentoId = String(fd.get("orcamentoId") ?? "").trim();
  const origem = fd.get("origem") === "ORDEM_DE_COMPRA" ? "ORDEM_DE_COMPRA" : "ATENDIMENTO";
  const linkBruto = String(fd.get("link") ?? "").trim();
  if (!orcamentoId) return { erro: "Escolha o orçamento a que a arte pertence." };
  if (erroNoLink(linkBruto)) return { erro: erroNoLink(linkBruto)! };

  const arquivos = fd.getAll("anexos").filter((f): f is File => f instanceof File && f.size > 0);
  if (!arquivos.length && !linkBruto) return { erro: "Anexe a arte ou informe o link." };
  if (arquivos.length > MAX_ARQUIVOS_NOVO) return { erro: `No máximo ${MAX_ARQUIVOS_NOVO} arquivos por envio.` };
  if (arquivos.some((f) => !tipoAnexoAceito(f.type))) return { erro: "Só é possível anexar imagens ou PDF." };
  if (arquivos.reduce((s, f) => s + f.size, 0) > MAX_TOTAL_BYTES_NOVO) return { erro: "Os arquivos passam do limite de tamanho. Envie menos arquivos por vez." };

  const orc = await prisma.orcamento.findUnique({ where: { id: orcamentoId }, select: { id: true, cliente: true } });
  if (!orc) return { erro: "Orçamento não encontrado." };

  for (const arquivo of arquivos) {
    const { url, pathname } = await salvarAnexoNoBlob(orc.id, arquivo);
    const anexo = await prisma.anexo.create({
      data: { orcamentoId: orc.id, tipo: "ARTE", nome: arquivo.name, mime: arquivo.type, tamanho: arquivo.size, url, pathname },
    });
    await registrarArteDeAnexo({ anexoId: anexo.id, orcamentoId: orc.id, rotulo: arquivo.name, origem, enviadoPor: nome });
  }
  // Link enviado pelo Atendimento: registra à parte (não mexe no link do pedido de orçamento). Em
  // orçamento sem pedido confirmado o link só fica guardado aqui, sem protocolo.
  let link: string | null = null;
  if (linkBruto) {
    link = normalizarLink(linkBruto)!;
    await registrarArteDeLinkAvulso({ orcamentoId: orc.id, link, origem, enviadoPor: nome });
  }
  const comPedido = !!(await prisma.aceite.findUnique({ where: { orcamentoId: orc.id }, select: { id: true } }));
  revalidatePath("/protocolos");
  const enviado = `${arquivos.length} arquivo(s)${linkBruto ? " e 1 link" : ""}`;
  return {
    ok: comPedido
      ? `Arte enviada para Vendas (${enviado}). O Aceite só segue para a Engenharia depois que Vendas protocolar.`
      : `Arte guardada junto do orçamento (${enviado}). Ela será protocolada quando o cliente confirmar o pedido.`,
  };
}

// Arquivo anexado como "ordem de compra" no desfecho que na verdade é a arte do cliente: quem recebe o
// pedido (Atendimento ou Vendas) o manda para a fila de protocolo de Vendas. Anexos de ordem de compra
// não viram arte sozinhos (podem ser só e-mails), por isso a marcação é manual.
export async function marcarAnexoComoArte(_prev: FormState, fd: FormData): Promise<FormState> {
  const nome = await nomeSePode("ATENDIMENTO_CLIENTE", "ACEITE_VENDAS");
  if (!nome) return { erro: "Sem permissão (Atendimento ou Vendas)." };
  const anexoId = String(fd.get("anexoId") ?? "");
  const anexo = await prisma.anexo.findUnique({ where: { id: anexoId }, select: { id: true, nome: true, orcamentoId: true } });
  if (!anexo) return { erro: "Arquivo não encontrado." };
  const jaTem = await prisma.arteEnviada.findUnique({ where: { anexoId: anexo.id }, select: { id: true } });
  if (jaTem) return { ok: "Este arquivo já está na fila de protocolo." };
  if (!(await prisma.aceite.findUnique({ where: { orcamentoId: anexo.orcamentoId }, select: { id: true } }))) return { erro: "O pedido ainda não foi confirmado." };
  await registrarArteDeAnexo({ anexoId: anexo.id, orcamentoId: anexo.orcamentoId, rotulo: anexo.nome, origem: "ORDEM_DE_COMPRA", enviadoPor: nome });
  revalidatePath("/protocolos");
  revalidatePath("/aceite");
  revalidatePath("/atendimento");
  return { ok: "Arte enviada para Vendas protocolar." };
}
