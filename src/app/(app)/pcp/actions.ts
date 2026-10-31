"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { chegadaDoPapel, fmtDia, fmtQuantidade, lerData, lerQuantidade } from "@/lib/aceite/constantes";
import { lerItens, quantidadeTotal } from "@/lib/aceite/montagem";
import { nomeSePode, revalidarAceite, type FormState } from "@/lib/aceite/servidor";
import { carregarAlvo, gravarAlvo, fecharAceiteSeLotesConcluidos } from "@/lib/aceite/alvo";
import { hojeBrasil } from "@/lib/aceite/agenda";
import { erroDataPrevista, erroDataRegistrada } from "@/lib/aceite/datas-validas";

// Ações do módulo PCP: a data de entrega dos Aceites, a negociação de data e a confirmação da entrega.

// ---------- 3. PCP ----------
// Enquanto o módulo PCP não existe, o PCP só lança a data. O campo de data sugerida já existe no
// banco pro módulo PCP preencher depois.

export async function salvarPcp(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const nome = await nomeSePode("PCP_ENTREGA");
  if (!nome) return { erro: "Sem permissão para definir a data (área PCP)." };
  const alvo = await carregarAlvo(id, formData.get("loteId"));
  if ("erro" in alvo) return alvo;
  const { a, lote } = alvo;
  if (a.etapa !== "PCP") return { erro: lote ? "Este lote não está no PCP." : "O Aceite não está no PCP." };
  const data = lerData(formData.get("dataEntrega"));
  if (!data) return { erro: "Informe a data de entrega." };
  const erroData = erroDataPrevista(data, "data de entrega", hojeBrasil(new Date()));
  if (erroData) return { erro: erroData };
  const chegada = chegadaDoPapel(a.pedidosMaterial);
  if (chegada && data < chegada) return { erro: `A data de entrega não pode ser antes da chegada do papel (${fmtDia(chegada)}).` };

  const agora = new Date();
  await prisma.$transaction([
    gravarAlvo(id, lote, { dataEntrega: data, pcpEm: agora, pcpPor: nome, pcpObs: String(formData.get("pcpObs") ?? "").trim() || null, etapa: "PEDIDO" }),
    // Definir a data com os PMs na tela conta como ter visto as mudanças do fornecedor (do lote, se for um lote).
    prisma.pedidoMaterial.updateMany({ where: { aceiteId: id, ...(lote ? { loteId: lote.id } : {}), alertaEm: { not: null } }, data: { alertaVistoEm: agora } }),
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
  // Negociação de um lote: o papel e a data que valem são os do lote.
  const pmsDaNegociacao = n.loteId ? n.aceite.pedidosMaterial.filter((x) => x.loteId === n.loteId) : n.aceite.pedidosMaterial;
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
    const erroProposta = erroDataPrevista(novaData, "data possível", hojeBrasil(new Date()));
    if (erroProposta) return { erro: erroProposta };
  } else if (!obs) {
    return { erro: "Explique por que a data não pode mudar: o Atendimento vai repassar ao cliente." };
  }
  const chegada = chegadaDoPapel(pmsDaNegociacao);
  if (novaData && chegada && novaData < chegada) return { erro: `A data não pode ser antes da chegada do papel (${fmtDia(chegada)}).` };

  const agora = new Date();
  await prisma.$transaction([
    prisma.negociacaoData.update({
      where: { id: negId },
      data: { status: "AGUARDANDO_ATENDIMENTO", resultado, dataProposta: novaData, respostaObs: obs || null, respondidaEm: agora, respondidaPor: nome },
    }),
    ...(novaData ? [gravarAlvo(n.aceiteId, n.loteId ? { id: n.loteId } : null, { dataEntrega: novaData, pcpEm: agora, pcpPor: nome })] : []),
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
  const alvo = await carregarAlvo(id, formData.get("loteId"));
  if ("erro" in alvo) return alvo;
  const { a, lote } = alvo;
  if (a.etapa !== "ENTREGA") return { erro: lote ? "Este lote não está esperando a confirmação da entrega." : "O Aceite não está esperando a confirmação da entrega." };
  if (a.negociacoes.some((n) => n.status !== "ENCERRADA")) {
    return { erro: "Há uma negociação de data em andamento. Encerre-a antes de confirmar a entrega." };
  }
  const modo = String(formData.get("modo") ?? "total");
  if (!["total", "parcial", "cancelar"].includes(modo)) return { erro: "Escolha como foi a entrega." };
  const entregueEm = lerData(formData.get("entregueEm"));
  if (!entregueEm) return { erro: "Informe a data da entrega." };
  const erroEntregue = erroDataRegistrada(entregueEm, "data da entrega", a.criadoEm, hojeBrasil(new Date()));
  if (erroEntregue) return { erro: erroEntregue };
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
  const erroSaldo = modo === "parcial" ? erroDataPrevista(novaData, "previsão de entrega do saldo", hojeBrasil(new Date())) : null;
  if (erroSaldo) return { erro: erroSaldo };

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
      ? [prisma.entregaAceite.create({ data: { aceiteId: id, loteId: lote?.id ?? null, quantidade: qtdAgora, entregueEm, obs: registro, porNome: nome } })]
      : []),
    gravarAlvo(
      id,
      lote,
      concluir
        ? {
            entregueEm,
            entregaConfirmadaEm: agora,
            entregaConfirmadaPor: nome,
            entregaObs: obs,
            ...(modo === "cancelar" ? { entregaSaldoCancelado: restante, entregaCancelamentoMotivo: motivo } : {}),
            etapa: "CONCLUIDO",
          }
        : { dataEntrega: novaData }, // parcial: a data do saldo vira a data vigente
    ),
  ]);
  // Aceite dividido: ele só conclui quando todos os lotes estão concluídos.
  if (lote && concluir) await fecharAceiteSeLotesConcluidos(id);
  revalidarAceite();
  if (modo === "parcial") return { ok: `Entrega parcial registrada. Saldo previsto para ${fmtDia(novaData)}.` };
  redirect("/pcp");
}

// ---------- Parâmetros da sugestão de data ----------
// O PCP ajusta os prazos que a sugestão de data usa (lib/pcp/sugestao.ts).
export async function salvarParametrosPcp(_prev: FormState, formData: FormData): Promise<FormState> {
  const nome = await nomeSePode("PCP_ENTREGA");
  if (!nome) return { erro: "Sem permissão para alterar os parâmetros (área PCP)." };
  const campo = (k: string, min: number, max: number): number | null => {
    const n = lerQuantidade(formData.get(k));
    return n !== null && Number.isInteger(n) && n >= min && n <= max ? n : null;
  };
  const v = {
    diasProducaoMinimo: campo("diasProducaoMinimo", 0, 90),
    folhasPorDia: campo("folhasPorDia", 1, 1000000),
    diasFacaNova: campo("diasFacaNova", 0, 90),
    diasClicheNovo: campo("diasClicheNovo", 0, 90),
    diasAcabamentoEspecial: campo("diasAcabamentoEspecial", 0, 90),
    diasMargem: campo("diasMargem", 0, 30),
  };
  const invalido = Object.entries(v).find(([, x]) => x === null);
  if (invalido) return { erro: "Preencha todos os campos com números inteiros (dias de 0 a 90; capacidade a partir de 1)." };
  const dados = v as { [K in keyof typeof v]: number };
  await prisma.pcpParametros.upsert({
    where: { id: "padrao" },
    create: { id: "padrao", ...dados, atualizadoPor: nome },
    update: { ...dados, atualizadoPor: nome },
  });
  revalidarAceite();
  return { ok: "Parâmetros salvos. A próxima sugestão de data já usa estes valores." };
}
