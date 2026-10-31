"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { lerData, fmtDia } from "@/lib/aceite/constantes";
import { hojeBrasil } from "@/lib/aceite/agenda";
import { erroDataPrevista } from "@/lib/aceite/datas-validas";
import { nomeSePode, revalidarAceite, type FormState } from "@/lib/aceite/servidor";
import { carregarAlvo, gravarAlvo } from "@/lib/aceite/alvo";

// Ações do módulo Atendimento ao Cliente: enviar ao cliente e/ou representante a data prevista do
// pedido (TP de Vendas 3.2.3), o que passa o Aceite à etapa Entrega (o PCP conclui ao entregar), e
// negociar a data quando o cliente não aceita.

export async function informarCliente(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const nome = await nomeSePode("ATENDIMENTO_CLIENTE");
  if (!nome) return { erro: "Sem permissão (área Atendimento)." };
  const alvo = await carregarAlvo(id, formData.get("loteId"));
  if ("erro" in alvo) return alvo;
  const { a, lote } = alvo;
  if (a.etapa !== "ATENDIMENTO") return { erro: lote ? "Este lote não está esperando o Atendimento." : "O Aceite não está esperando o Atendimento." };
  if (a.negociacoes.some((n) => n.status === "AGUARDANDO_PCP")) {
    return { erro: "Há uma negociação de data esperando o PCP. Conclua depois que o PCP responder." };
  }
  const cliente = formData.get("avisouCliente") === "on";
  const representante = formData.get("avisouRepresentante") === "on";
  if (!cliente && !representante) return { erro: "Marque para quem a data foi enviada: cliente, representante ou os dois." };
  const para = [cliente && "cliente", representante && "representante"].filter(Boolean).join(" e ");
  const obs = String(formData.get("obs") ?? "").trim();
  const agora = new Date();
  await prisma.$transaction([
    gravarAlvo(id, lote, {
      clienteInformadoEm: agora,
      // Quem avisou e para quem, num campo só (sem coluna nova): "Ana → cliente e representante".
      clienteInformadoPor: `${nome} → ${para}${obs ? ` (${obs.slice(0, 200)})` : ""}`,
      etapa: "ENTREGA",
    }),
    // Informar a data final também encerra a negociação que o PCP já respondeu (a do lote, se for um lote).
    prisma.negociacaoData.updateMany({
      where: { aceiteId: id, ...(lote ? { loteId: lote.id } : {}), status: "AGUARDANDO_ATENDIMENTO" },
      data: { status: "ENCERRADA", encerradaEm: agora, encerradaPor: nome, encerradaObs: `Data enviada ao ${para}.` },
    }),
  ]);
  revalidarAceite();
  redirect("/atendimento");
}

// O cliente não aceitou a data: registra a data que ele quer e abre a pendência para o PCP.
export async function abrirNegociacao(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const nome = await nomeSePode("ATENDIMENTO_CLIENTE");
  if (!nome) return { erro: "Sem permissão (área Atendimento)." };
  const alvo = await carregarAlvo(id, formData.get("loteId"));
  if ("erro" in alvo) return alvo;
  const { a, lote } = alvo;
  if (!["ATENDIMENTO", "ENTREGA"].includes(a.etapa) || !a.dataEntrega) {
    return { erro: "Só dá para negociar depois que o PCP definiu a data e o pedido chegou ao Atendimento." };
  }
  if (a.negociacoes.some((n) => n.status !== "ENCERRADA")) return { erro: "Já há uma negociação em andamento neste Aceite." };
  const dataPedida = lerData(formData.get("dataPedida"));
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!dataPedida && !motivo) return { erro: "Informe a data que o cliente quer ou o que ele pediu." };
  const erroPedida = erroDataPrevista(dataPedida, "data que o cliente quer", hojeBrasil(new Date()));
  if (erroPedida) return { erro: erroPedida };
  await prisma.negociacaoData.create({
    data: { aceiteId: id, loteId: lote?.id ?? null, dataAtual: a.dataEntrega, dataPedida, motivo: motivo || null, abertaPor: nome },
  });
  revalidarAceite();
  return { ok: "Negociação enviada ao PCP." };
}

// PCP já respondeu: o Atendimento informou o cliente. Se ele ainda não aceita, abre-se outra rodada.
export async function encerrarNegociacao(_prev: FormState, formData: FormData): Promise<FormState> {
  const negId = String(formData.get("negociacaoId") ?? "");
  const nome = await nomeSePode("ATENDIMENTO_CLIENTE");
  if (!nome) return { erro: "Sem permissão (área Atendimento)." };
  const n = await prisma.negociacaoData.findUniqueOrThrow({ where: { id: negId }, include: { aceite: true, lote: true } });
  if (n.status !== "AGUARDANDO_ATENDIMENTO") return { erro: "Esta negociação não está esperando o Atendimento." };
  const aceitou = String(formData.get("aceitou") ?? "");
  if (aceitou !== "sim" && aceitou !== "nao") return { erro: "Diga se o cliente aceitou a resposta." };
  const obs = String(formData.get("obs") ?? "").trim();
  await prisma.negociacaoData.update({
    where: { id: negId },
    data: {
      status: "ENCERRADA",
      encerradaEm: new Date(),
      encerradaPor: nome,
      encerradaObs: `${aceitou === "sim" ? "Cliente aceitou" : "Cliente não aceitou"} ${fmtDia(n.lote?.dataEntrega ?? n.aceite.dataEntrega)}.${obs ? ` ${obs.slice(0, 300)}` : ""}`,
    },
  });
  revalidarAceite();
  return { ok: aceitou === "sim" ? "Negociação encerrada." : "Negociação encerrada. Abra uma nova rodada com a data que o cliente pediu." };
}
