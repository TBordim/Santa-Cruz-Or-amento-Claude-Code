"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { chegadaDoPapel, fmtDia, fmtQuantidade, lerData, lerQuantidade } from "@/lib/aceite/constantes";
import { lerItens, quantidadeTotal } from "@/lib/aceite/montagem";
import { nomeSePode, revalidarAceite, type FormState } from "@/lib/aceite/servidor";
import { hojeBrasil } from "@/lib/aceite/agenda";

// Ações do módulo PCP: a data de entrega dos Aceites, a negociação de data e a confirmação da entrega.

// ---------- 3. PCP ----------
// Enquanto o módulo PCP não existe, o PCP só lança a data. O campo de data sugerida já existe no
// banco pro módulo PCP preencher depois.

export async function salvarPcp(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const nome = await nomeSePode("PCP_ENTREGA");
  if (!nome) return { erro: "Sem permissão para definir a data (área PCP)." };
  const a = await prisma.aceite.findUniqueOrThrow({ where: { id }, include: { pedidosMaterial: true } });
  if (a.etapa !== "PCP") return { erro: "O Aceite não está no PCP." };
  const data = lerData(formData.get("dataEntrega"));
  if (!data) return { erro: "Informe a data de entrega." };
  const chegada = chegadaDoPapel(a.pedidosMaterial);
  if (chegada && data < chegada) return { erro: `A data de entrega não pode ser antes da chegada do papel (${fmtDia(chegada)}).` };

  const agora = new Date();
  await prisma.$transaction([
    prisma.aceite.update({
      where: { id },
      data: { dataEntrega: data, pcpEm: agora, pcpPor: nome, pcpObs: String(formData.get("pcpObs") ?? "").trim() || null, etapa: "PEDIDO" },
    }),
    // Definir a data com os PMs na tela conta como ter visto as mudanças do fornecedor.
    prisma.pedidoMaterial.updateMany({ where: { aceiteId: id, alertaEm: { not: null } }, data: { alertaVistoEm: agora } }),
  ]);
  revalidarAceite();
  redirect("/pcp");
}


// ---------- Negociação de data ----------
// O cliente não aceitou a data e o Atendimento pediu outra: o PCP reanalisa. Se a data mudar, a
// entrega acordada do Aceite muda junto; a anterior fica registrada na negociação.

export async function responderNegociacao(_prev: FormState, formData: FormData): Promise<FormState> {
  const negId = String(formData.get("negociacaoId") ?? "");
  const nome = await nomeSePode("PCP_ENTREGA");
  if (!nome) return { erro: "Sem permissão para responder (área PCP)." };
  const n = await prisma.negociacaoData.findUniqueOrThrow({ where: { id: negId }, include: { aceite: { include: { pedidosMaterial: true } } } });
  if (n.status !== "AGUARDANDO_PCP") return { erro: "Esta negociação não está esperando o PCP." };
  const resultado = String(formData.get("resultado") ?? "");
  if (resultado !== "ATENDE" && resultado !== "OUTRA_DATA" && resultado !== "MANTIDA") return { erro: "Escolha a resposta do PCP." };
  const obs = String(formData.get("respostaObs") ?? "").trim();

  let novaData: Date | null = null;
  if (resultado === "ATENDE") {
    if (!n.dataPedida) return { erro: "O cliente não informou uma data; responda com outra data ou mantenha a atual." };
    novaData = n.dataPedida;
  } else if (resultado === "OUTRA_DATA") {
    novaData = lerData(formData.get("dataProposta"));
    if (!novaData) return { erro: "Informe a data possível." };
  } else if (!obs) {
    return { erro: "Explique por que a data não pode mudar: o Atendimento vai repassar ao cliente." };
  }
  const chegada = chegadaDoPapel(n.aceite.pedidosMaterial);
  if (novaData && chegada && novaData < chegada) return { erro: `A data não pode ser antes da chegada do papel (${fmtDia(chegada)}).` };

  const agora = new Date();
  await prisma.$transaction([
    prisma.negociacaoData.update({
      where: { id: negId },
      data: { status: "AGUARDANDO_ATENDIMENTO", resultado, dataProposta: novaData, respostaObs: obs || null, respondidaEm: agora, respondidaPor: nome },
    }),
    ...(novaData ? [prisma.aceite.update({ where: { id: n.aceiteId }, data: { dataEntrega: novaData, pcpEm: agora, pcpPor: nome } })] : []),
  ]);
  revalidarAceite();
  return { ok: "Resposta enviada ao Atendimento." };
}

// ---------- 6. Entrega ao cliente ----------
// O PCP confirma a entrega, e é isso que conclui o Aceite (o acompanhamento no Atendimento é só
// informativo). Três jeitos (pedido do Thiago em 11/10/2026): entrega total; entrega parcial, que
// deixa o saldo pendente com nova previsão e o Aceite na etapa; ou cancelar o saldo, com motivo.
export async function confirmarEntrega(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const nome = await nomeSePode("PCP_ENTREGA");
  if (!nome) return { erro: "Sem permissão para confirmar a entrega (área PCP)." };
  const a = await prisma.aceite.findUniqueOrThrow({ where: { id }, include: { negociacoes: true, entregas: true } });
  if (a.etapa !== "ENTREGA") return { erro: "O Aceite não está esperando a confirmação da entrega." };
  if (a.negociacoes.some((n) => n.status !== "ENCERRADA")) {
    return { erro: "Há uma negociação de data em andamento. Encerre-a antes de confirmar a entrega." };
  }
  const modo = String(formData.get("modo") ?? "total");
  if (!["total", "parcial", "cancelar"].includes(modo)) return { erro: "Escolha como foi a entrega." };
  const entregueEm = lerData(formData.get("entregueEm"));
  if (!entregueEm) return { erro: "Informe a data da entrega." };
  if (entregueEm > hojeBrasil(new Date())) return { erro: "A data da entrega não pode ser depois de hoje." };
  const obs = String(formData.get("entregaObs") ?? "").trim() || null;

  // Saldo = pedido do cliente (soma dos itens) menos o que já foi entregue; sem quantidade no Aceite, fica desconhecido.
  const total = quantidadeTotal(lerItens(a.itens)) || null;
  const jaEntregue = a.entregas.reduce((s, e) => s + Number(e.quantidade ?? 0), 0);
  const saldo = total === null ? null : Math.max(0, total - jaEntregue);
  const qtdInformada = lerQuantidade(formData.get("quantidade"));

  let agora: Date | null = null;
  const concluir = modo !== "parcial";
  let qtdAgora: number | null = null;
  if (modo === "total") qtdAgora = saldo;
  if (modo === "parcial") {
    if (qtdInformada === null || qtdInformada <= 0) return { erro: "Informe a quantidade entregue." };
    if (saldo !== null && qtdInformada >= saldo) return { erro: `Foi entregue o saldo todo (${fmtQuantidade(saldo)}): escolha "Entregue tudo".` };
    qtdAgora = qtdInformada;
  }
  if (modo === "cancelar") qtdAgora = qtdInformada && qtdInformada > 0 ? qtdInformada : null;
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (modo === "cancelar" && !motivo) return { erro: "Informe o motivo de cancelar o saldo." };
  const novaData = lerData(formData.get("dataSaldo"));
  if (modo === "parcial" && !novaData) return { erro: "Informe a previsão de entrega do saldo." };

  const restante = saldo === null || qtdAgora === null ? saldo : Math.max(0, saldo - qtdAgora);
  agora = new Date();
  const registro =
    modo === "parcial"
      ? `Entrega parcial. Saldo previsto para ${fmtDia(novaData)}.${obs ? ` ${obs}` : ""}`
      : modo === "cancelar"
        ? `Saldo cancelado${restante !== null ? ` (${fmtQuantidade(restante)})` : ""}: ${motivo}${obs ? ` · ${obs}` : ""}`
        : obs;
  await prisma.$transaction([
    ...(qtdAgora !== null || modo === "parcial"
      ? [prisma.entregaAceite.create({ data: { aceiteId: id, quantidade: qtdAgora, entregueEm, obs: registro, porNome: nome } })]
      : []),
    prisma.aceite.update({
      where: { id },
      data: concluir
        ? {
            entregueEm,
            entregaConfirmadaEm: agora,
            entregaConfirmadaPor: nome,
            entregaObs: obs,
            ...(modo === "cancelar" ? { entregaSaldoCancelado: restante, entregaCancelamentoMotivo: motivo } : {}),
            etapa: "CONCLUIDO",
          }
        : { dataEntrega: novaData }, // parcial: a data do saldo vira a data vigente
    }),
  ]);
  revalidarAceite();
  if (modo === "parcial") return { ok: `Entrega parcial registrada. Saldo previsto para ${fmtDia(novaData)}.` };
  redirect("/pcp");
}
