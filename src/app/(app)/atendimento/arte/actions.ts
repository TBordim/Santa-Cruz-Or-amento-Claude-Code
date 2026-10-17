"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { nomeSePode } from "@/lib/aceite/servidor";
import { salvarAnexoNoBlob } from "@/lib/anexos/storage";
import { MAX_ARQUIVOS_NOVO, MAX_TOTAL_BYTES_NOVO, tipoAnexoAceito } from "@/lib/anexos/limites";
import { erroNoLink, normalizarLink } from "@/lib/orcamentos/link";
import { registrarArteDeAnexo } from "@/lib/protocolos/arte";

export type FormState = { erro?: string; ok?: string } | undefined;

// O Atendimento ao Cliente recebe arte do cliente (por e-mail, link ou junto da ordem de compra) e
// a ENVIA pra Vendas: a arte entra na fila "Artes a protocolar" e trava o card do orçamento até
// Vendas protocolar. Quem protocola é só Vendas. Decisão do Thiago em 17/10/2026.
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
  if (linkBruto) {
    // Link enviado pelo Atendimento: registra à parte (não mexe no link do pedido de orçamento).
    const link = normalizarLink(linkBruto)!;
    const jaTem = await prisma.arteEnviada.findFirst({ where: { orcamentoId: orc.id, link }, select: { id: true } });
    if (!jaTem) {
      await prisma.arteEnviada.create({
        data: { orcamentoId: orc.id, link, clienteNome: orc.cliente, rotulo: "Link da arte", origem, enviadoPor: nome },
      });
    }
  }
  revalidatePath("/protocolos");
  return { ok: `Arte enviada para Vendas (${arquivos.length} arquivo(s)${linkBruto ? " e 1 link" : ""}). O card só avança depois que Vendas protocolar.` };
}
