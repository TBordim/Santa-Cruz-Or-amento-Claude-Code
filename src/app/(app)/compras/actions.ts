"use server";

import { prisma } from "@/lib/db";
import { STATUS_PM, TIPOS_MATERIAL, fmtDia, fmtQuantidade, lerData, lerQuantidade, statusPMInfo } from "@/lib/aceite/constantes";
import { exigirArea, nomeSePode, revalidarAceite, avancarSePronto, type FormState } from "@/lib/aceite/servidor";
import { pesoKg as calcularPeso, sobraDoMinimo, quantidadeComprada } from "@/lib/aceite/papel-calculo";
import { hojeBrasil } from "@/lib/aceite/agenda";

// Ações do módulo Compras: os Pedidos de Material (PM). Qualquer módulo pede material criando um
// PM com a própria origem; hoje só o Aceite (Vendas) pede. Compras responde com fornecedor, prazo,
// pedido mínimo e sobra.

// ---------- Pedido de Material (PM) ----------
// Tabela independente do Aceite: `origem` diz qual módulo pediu (hoje só "ACEITE").

export async function criarPedidoMaterial(_prev: FormState, formData: FormData): Promise<FormState> {
  const aceiteId = String(formData.get("aceiteId") ?? "");
  const nome = await nomeSePode("ACEITE_VENDAS");
  if (!nome) return { erro: "Sem permissão para emitir Pedido de Material (área Vendas)." };
  const a = await prisma.aceite.findUniqueOrThrow({ where: { id: aceiteId } });
  if (["PEDIDO", "ATENDIMENTO", "ENTREGA", "CONCLUIDO"].includes(a.etapa)) return { erro: "O Aceite já passou do PCP; não dá mais para pedir material por ele." };

  const materialTxt = String(formData.get("material") ?? "PAPEL");
  const material = (TIPOS_MATERIAL.some((t) => t.key === materialTxt) ? materialTxt : "PAPEL") as (typeof TIPOS_MATERIAL)[number]["key"];
  const descricao = String(formData.get("descricao") ?? "").trim();
  const quantidade = lerQuantidade(formData.get("quantidade"));
  const unidade = String(formData.get("unidade") ?? "fls").trim() || "fls";
  if (!descricao) return { erro: "Descreva o material (ex.: Cartão Triplex 300 g, 66 x 96)." };
  if (quantidade === null || quantidade <= 0) return { erro: "Informe a quantidade que falta." };
  const formato = String(formData.get("formato") ?? "").trim() || null;
  const gramaturaN = lerQuantidade(formData.get("gramatura"));
  const gramatura = gramaturaN ? Math.round(gramaturaN) : null;

  const pm = await prisma.pedidoMaterial.create({
    data: {
      origem: "ACEITE",
      aceiteId,
      material,
      descricao,
      quantidade,
      unidade,
      codigoMaterial: String(formData.get("codigoMaterial") ?? "").trim() || null,
      formato,
      gramatura,
      pesoKg: calcularPeso(quantidade, unidade, formato, gramatura),
      formatoMinimo: String(formData.get("formatoMinimo") ?? "").trim() || null,
      entregaDesejada: String(formData.get("entregaDesejada") ?? "").trim() || null,
      suporteRef: String(formData.get("suporteRef") ?? "").trim() || null,
      obs: String(formData.get("obs") ?? "").trim() || null,
      solicitadoPor: nome,
      eventos: { create: { tipo: "CRIADO", texto: `PM emitido: ${fmtQuantidade(quantidade, unidade)} de ${descricao}.`, porNome: nome } },
    },
  });
  revalidarAceite();
  return { ok: `PM ${pm.numero} emitido para Compras.` };
}

export async function cancelarPedidoMaterial(formData: FormData) {
  const pedidoId = String(formData.get("pedidoId") ?? "");
  const nome = await exigirArea("ACEITE_VENDAS", "COMPRAS_PM");
  const pm = await prisma.pedidoMaterial.findUniqueOrThrow({ where: { id: pedidoId }, include: { aceite: true } });
  if (pm.status === "CANCELADO") return;
  // Com data de chegada já definida, cancelar também muda o que o PCP planejou: acende o alerta.
  const avisar = !!pm.prazoPrevisto || pm.status === "PRAZO_CONFIRMADO" || (pm.aceite && pm.aceite.etapa !== "VENDAS" && pm.aceite.etapa !== "ENGENHARIA_MATERIAL");
  await prisma.pedidoMaterial.update({
    where: { id: pedidoId },
    data: {
      status: "CANCELADO",
      ...(avisar ? { alertaEm: new Date() } : {}),
      eventos: { create: { tipo: "STATUS", texto: "PM cancelado.", porNome: nome } },
    },
  });
  if (pm.aceiteId) {
    await avancarSePronto(pm.aceiteId);
    revalidarAceite();
  }
  }

// Compras lança o que o fornecedor respondeu. Qualquer mudança vira evento no histórico do PM; se
// o prazo já tinha sido confirmado (ou o pedido já está no PCP), prazo, quantidade ou status
// mudando acendem o alerta pro PCP e Vendas (pedido do Thiago em 08/10/2026).
export async function atualizarPedidoMaterial(_prev: FormState, formData: FormData): Promise<FormState> {
  const pedidoId = String(formData.get("pedidoId") ?? "");
  const nome = await nomeSePode("COMPRAS_PM");
  if (!nome) return { erro: "Sem permissão para atualizar Pedido de Material (área Compras)." };
  const pm = await prisma.pedidoMaterial.findUniqueOrThrow({ where: { id: pedidoId }, include: { aceite: true } });
  if (pm.status === "CANCELADO") return { erro: "PM cancelado não pode ser alterado." };

  const statusTxt = String(formData.get("status") ?? pm.status);
  const status = (STATUS_PM.some((s) => s.key === statusTxt) && statusTxt !== "CANCELADO" ? statusTxt : pm.status) as Exclude<
    (typeof STATUS_PM)[number]["key"],
    "CANCELADO"
  >;
  const prazo = lerData(formData.get("prazoPrevisto"));
  const fornecedor = String(formData.get("fornecedor") ?? "").trim() || null;
  const quantidade = lerQuantidade(formData.get("quantidade"));
  const minimo = lerQuantidade(formData.get("minimoFornecedor"));
  const formato = String(formData.get("formato") ?? "").trim() || null;
  const gramaturaN = lerQuantidade(formData.get("gramatura"));
  const gramatura = gramaturaN ? Math.round(gramaturaN) : null;
  // Calculados aqui, nunca vindos da tela: sobra = mínimo - o que falta; peso = folhas compradas
  // (o que falta ou o mínimo, o maior) × formato × gramatura (pedido do Thiago em 11/10/2026).
  const sobra = sobraDoMinimo(quantidade, minimo);
  const pesoKg = calcularPeso(quantidadeComprada(quantidade, minimo), pm.unidade, formato, gramatura);
  const sobraJaRecebida = Number(pm.sobraRecebida ?? 0);
  if (sobraJaRecebida > 0 && (sobra ?? 0) < sobraJaRecebida) {
    return { erro: `Já foram recebidos ${fmtQuantidade(sobraJaRecebida, pm.unidade)} da sobra: o pedido mínimo não pode deixar a sobra abaixo disso.` };
  }
  const sobraEncerradaEm = sobraJaRecebida > 0 && sobraJaRecebida >= (sobra ?? 0) ? (pm.sobraEncerradaEm ?? new Date()) : null;
  const numeroSC = String(formData.get("numeroSC") ?? "").trim() || null;
  const numeroOC = String(formData.get("numeroOC") ?? "").trim() || null;
  const motivo = String(formData.get("motivo") ?? "").trim();

  if ((status === "PRAZO_CONFIRMADO" || status === "RECEBIDO") && !prazo) {
    return { erro: "Informe o prazo de entrega do fornecedor para confirmar." };
  }
  if (quantidade === null || quantidade <= 0) return { erro: "Informe a quantidade do pedido." };
  if (status === "RECEBIDO" && pm.status !== "RECEBIDO") return { erro: "Para dar o PM como recebido, use \"Confirmar recebimento\" no cartão." };
  const jaRecebido = Number(pm.quantidadeRecebida ?? 0);
  if (quantidade < jaRecebido) return { erro: `Já foram recebidos ${fmtQuantidade(jaRecebido, pm.unidade)}: a quantidade não pode ficar abaixo disso.` };

  const eventos: { tipo: string; texto: string; prazoAnterior?: Date | null; prazoNovo?: Date | null }[] = [];
  const mesmoDia = (x: Date | null, y: Date | null) => (x?.getTime() ?? null) === (y?.getTime() ?? null);
  if (!mesmoDia(pm.prazoPrevisto, prazo)) {
    eventos.push({
      tipo: "PRAZO",
      texto: pm.prazoPrevisto ? `Prazo mudou de ${fmtDia(pm.prazoPrevisto)} para ${fmtDia(prazo)}.` : `Prazo informado: ${fmtDia(prazo)}.`,
      prazoAnterior: pm.prazoPrevisto,
      prazoNovo: prazo,
    });
  }
  if (status !== pm.status) eventos.push({ tipo: "STATUS", texto: `Situação: ${statusPMInfo(pm.status).label} → ${statusPMInfo(status).label}.` });
  if (Number(pm.quantidade ?? 0) !== quantidade) {
    eventos.push({ tipo: "QUANTIDADE", texto: `Quantidade: ${fmtQuantidade(pm.quantidade, pm.unidade)} → ${fmtQuantidade(quantidade, pm.unidade)}.` });
  }
  if ((pm.fornecedor ?? null) !== fornecedor) eventos.push({ tipo: "FORNECEDOR", texto: `Fornecedor: ${fornecedor ?? "—"}.` });
  if ((pm.numeroSC ?? null) !== numeroSC || (pm.numeroOC ?? null) !== numeroOC) {
    eventos.push({ tipo: "ERP", texto: `SC ${numeroSC ?? "—"} · OC ${numeroOC ?? "—"}.` });
  }
  if (Number(pm.pesoKg ?? -1) !== (pesoKg ?? -1)) eventos.push({ tipo: "PESO", texto: `Peso: ${fmtQuantidade(pesoKg, "kg")}.` });
  if (Number(pm.minimoFornecedor ?? -1) !== (minimo ?? -1) || Number(pm.sobraPrevista ?? -1) !== (sobra ?? -1)) {
    eventos.push({ tipo: "SOBRA", texto: `Pedido mínimo ${fmtQuantidade(minimo, pm.unidade)}; sobra prevista ${fmtQuantidade(sobra, pm.unidade)}.` });
  }
  if (!eventos.length && !motivo) return { ok: "Nada mudou." };
  if (motivo) eventos.push({ tipo: "OBS", texto: motivo });

  // Com data de chegada já definida, o PCP pode ter planejado em cima dela: mudança alerta.
  const jaPlanejado =
    !!pm.prazoPrevisto || pm.status === "PRAZO_CONFIRMADO" || pm.status === "RECEBIDO" || (pm.aceite && ["PCP", "PEDIDO", "ATENDIMENTO", "ENTREGA", "CONCLUIDO"].includes(pm.aceite.etapa));
  const mudouAlgoQueImporta = eventos.some((e) => e.tipo === "PRAZO" || e.tipo === "QUANTIDADE") || (status !== pm.status && status !== "RECEBIDO");
  const alertar = !!jaPlanejado && mudouAlgoQueImporta;

  await prisma.pedidoMaterial.update({
    where: { id: pedidoId },
    data: {
      status,
      prazoPrevisto: prazo,
      fornecedor,
      quantidade,
      minimoFornecedor: minimo,
      sobraPrevista: sobra,
      sobraEncerradaEm,
      pesoKg,
      formato,
      gramatura,
      numeroSC,
      numeroOC,
      ...(alertar ? { alertaEm: new Date() } : {}),
      eventos: { create: eventos.map((e) => ({ ...e, porNome: nome })) },
    },
  });
  if (pm.aceiteId) {
    await avancarSePronto(pm.aceiteId);
    revalidarAceite();
  }
    return { ok: alertar ? "Atualizado. O PCP e Vendas foram alertados da mudança." : "Atualizado." };
}

// Confirma a chegada do material: tudo o que falta, ou só uma parte. Parcial deixa saldo a receber
// e o PM aberto, com a previsão do saldo no prazo; o PM vira RECEBIDO quando o saldo zera (pedido
// do Thiago em 11/10/2026).
export async function registrarRecebimento(_prev: FormState, formData: FormData): Promise<FormState> {
  const pedidoId = String(formData.get("pedidoId") ?? "");
  const nome = await nomeSePode("COMPRAS_PM");
  if (!nome) return { erro: "Sem permissão para confirmar recebimento (área Compras)." };
  const pm = await prisma.pedidoMaterial.findUniqueOrThrow({ where: { id: pedidoId }, include: { aceite: true } });
  if (pm.status === "CANCELADO" || pm.status === "RECEBIDO") return { erro: "Este PM não tem saldo a receber." };

  const pedido = Number(pm.quantidade ?? 0);
  const jaRecebido = Number(pm.quantidadeRecebida ?? 0);
  const saldo = Math.max(0, pedido - jaRecebido);
  const parcial = formData.get("modo") === "parcial";
  const data = lerData(formData.get("dataRecebimento")) ?? hojeBrasil(new Date());
  const obs = String(formData.get("obs") ?? "").trim();

  const chegou = parcial ? lerQuantidade(formData.get("quantidadeRecebida")) : saldo;
  if (chegou === null || chegou <= 0) return { erro: "Informe quanto chegou." };
  if (parcial && chegou >= saldo) return { erro: `Chegou o saldo todo (${fmtQuantidade(saldo, pm.unidade)}): escolha "Recebi tudo".` };
  const novoPrazo = parcial ? lerData(formData.get("prazoSaldo")) : null;
  if (parcial && !novoPrazo) return { erro: "Informe a previsão de chegada do saldo." };

  const recebido = jaRecebido + chegou;
  const resta = Math.max(0, pedido - recebido);
  const eventos: { tipo: string; texto: string; prazoAnterior?: Date | null; prazoNovo?: Date | null }[] = [
    {
      tipo: "RECEBIMENTO",
      texto: resta > 0
        ? `Recebido ${fmtQuantidade(chegou, pm.unidade)} em ${fmtDia(data)}. Saldo a receber: ${fmtQuantidade(resta, pm.unidade)}.${obs ? ` ${obs}` : ""}`
        : `Recebido ${fmtQuantidade(chegou, pm.unidade)} em ${fmtDia(data)}: PM completo.${obs ? ` ${obs}` : ""}`,
    },
  ];
  const mudouPrazo = parcial && (pm.prazoPrevisto?.getTime() ?? null) !== novoPrazo!.getTime();
  if (mudouPrazo) {
    eventos.push({
      tipo: "PRAZO",
      texto: `Previsão do saldo: ${fmtDia(novoPrazo)}${pm.prazoPrevisto ? ` (antes ${fmtDia(pm.prazoPrevisto)})` : ""}.`,
      prazoAnterior: pm.prazoPrevisto,
      prazoNovo: novoPrazo,
    });
  }
  // O saldo atrasar em relação ao prazo em que o PCP se baseou é mudança que importa.
  const alertar = mudouPrazo && !!pm.aceite && ["PCP", "PEDIDO", "ATENDIMENTO", "ENTREGA", "CONCLUIDO"].includes(pm.aceite.etapa);

  await prisma.pedidoMaterial.update({
    where: { id: pedidoId },
    data: {
      quantidadeRecebida: recebido,
      recebidoEm: data,
      ...(resta > 0 ? { prazoPrevisto: novoPrazo } : { status: "RECEBIDO" as const }),
      ...(alertar ? { alertaEm: new Date() } : {}),
      eventos: { create: eventos.map((e) => ({ ...e, porNome: nome })) },
    },
  });
  if (pm.aceiteId) {
    await avancarSePronto(pm.aceiteId);
    revalidarAceite();
  }
  if (resta > 0) {
    return { ok: `Recebimento parcial registrado. Saldo de ${fmtQuantidade(resta, pm.unidade)} previsto para ${fmtDia(novoPrazo)}.${alertar ? " O PCP e Vendas foram alertados." : ""}` };
  }
  return { ok: "Recebimento confirmado. PM completo." };
}

// Retirada da sobra que ficou no fornecedor por causa do pedido mínimo: toda ou só uma parte. O
// saldo segue na fila de Sobras até zerar (pedido do Thiago em 11/10/2026).
export async function registrarRecebimentoSobra(_prev: FormState, formData: FormData): Promise<FormState> {
  const pedidoId = String(formData.get("pedidoId") ?? "");
  const nome = await nomeSePode("COMPRAS_PM");
  if (!nome) return { erro: "Sem permissão para confirmar recebimento (área Compras)." };
  const pm = await prisma.pedidoMaterial.findUniqueOrThrow({ where: { id: pedidoId } });
  const sobra = Number(pm.sobraPrevista ?? 0);
  const jaRecebida = Number(pm.sobraRecebida ?? 0);
  const saldo = Math.max(0, sobra - jaRecebida);
  if (pm.status === "CANCELADO" || saldo <= 0) return { erro: "Este PM não tem sobra a receber." };

  const parcial = formData.get("modo") === "parcial";
  const data = lerData(formData.get("dataRecebimento")) ?? hojeBrasil(new Date());
  const obs = String(formData.get("obs") ?? "").trim();
  const chegou = parcial ? lerQuantidade(formData.get("quantidadeRecebida")) : saldo;
  if (chegou === null || chegou <= 0) return { erro: "Informe quanto chegou." };
  if (parcial && chegou >= saldo) return { erro: `Chegou a sobra toda (${fmtQuantidade(saldo, pm.unidade)}): escolha "Recebi tudo".` };

  const resta = Math.max(0, saldo - chegou);
  await prisma.pedidoMaterial.update({
    where: { id: pedidoId },
    data: {
      sobraRecebida: jaRecebida + chegou,
      ...(resta > 0 ? {} : { sobraEncerradaEm: new Date() }),
      eventos: {
        create: {
          tipo: "SOBRA_RECEBIDA",
          texto:
            resta > 0
              ? `Sobra: recebido ${fmtQuantidade(chegou, pm.unidade)} em ${fmtDia(data)}. Ainda no fornecedor: ${fmtQuantidade(resta, pm.unidade)}.${obs ? ` ${obs}` : ""}`
              : `Sobra: recebido ${fmtQuantidade(chegou, pm.unidade)} em ${fmtDia(data)}. Nada mais no fornecedor.${obs ? ` ${obs}` : ""}`,
          porNome: nome,
        },
      },
    },
  });
  revalidarAceite();
  return { ok: resta > 0 ? `Recebimento parcial da sobra registrado. Ainda no fornecedor: ${fmtQuantidade(resta, pm.unidade)}.` : "Sobra recebida. PM saiu da fila de Sobras." };
}
