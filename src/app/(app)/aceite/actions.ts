"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { ehAdmin } from "@/lib/permissions";
import { removerAceite, limparEscolhaDoDesfecho } from "@/lib/aceite/abrir";
import type { PrecificacaoTier } from "@/lib/orcamentos/types";
import { Prisma } from "@/generated/prisma/client";
import type { AreaKey } from "@/lib/areas";
import { modelosDoDoc, resumoDosModelos } from "@/lib/orcamentos/modelos";
import { normalizarCodigoInterno, codigoInternoValido } from "@/lib/orcamentos/codigo-interno";
import { erroNosModelos } from "@/lib/orcamentos/validacao-modelos";
import { ETAPAS_ACEITE, lerQuantidade, type EtapaAceiteKey } from "@/lib/aceite/constantes";
import { lerSuportes, situacaoGeral, suportesSemPM, textoSuporte, type SuporteAceite, type SituacaoSuporte } from "@/lib/aceite/suportes";
import { lerItens, erroNaMontagem, completarPosicoes, type ItemAceite } from "@/lib/aceite/montagem";
import { erroNaDivisao, lerItensLote, pmsDoLote } from "@/lib/aceite/lotes";
import type { DataCliente } from "@/lib/aceite/datas-cliente";
import { exigirArea, nomeSePode, revalidarAceite, avancarSePronto, type FormState } from "@/lib/aceite/servidor";
import { carregarAlvo, gravarAlvo } from "@/lib/aceite/alvo";
import { SETOR_AVISO, type SetorAviso } from "@/lib/aceite/cancelamento";
import { executarCancelamento } from "@/lib/aceite/cancelar";
import { operacoesDosLotes, type LoteEnviado } from "@/lib/aceite/gravar-lotes";
import { erroPorArtePendente } from "@/lib/protocolos/arte";

// Ações do módulo Aceite (Vendas e Engenharia). Pedido de Material mora no módulo Compras
// (compras/actions.ts) e a data de entrega no módulo PCP (pcp/actions.ts).

// ---------- 1. Vendas ----------

export async function salvarVendas(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const nome = await nomeSePode("ACEITE_VENDAS");
  if (!nome) return { erro: "Sem permissão para preencher o Aceite (área Vendas)." };
  const a = await prisma.aceite.findUniqueOrThrow({ where: { id }, include: { pedidosMaterial: true, lotes: { orderBy: { numero: "asc" } } } });
  if (a.etapa !== "VENDAS") return { erro: "Este Aceite já saiu de Vendas." };

  const agora = new Date();
  // Produto acabado em estoque (sobra na expedição): "sim", "nao" ou ainda sem resposta. A versão
  // do produto só é conferida quando há produto acabado (decisão do Thiago em 11/10/2026).
  const acabadoTxt = String(formData.get("produtoAcabado") ?? "");
  const temProdutoAcabado = acabadoTxt === "sim" ? true : acabadoTxt === "nao" ? false : null;
  const estoque = temProdutoAcabado !== null;
  const versao = temProdutoAcabado === true && formData.get("versaoVerificada") === "on";
  // Papéis do pedido (campo escondido "suportes", JSON montado pelo formulário). A situação geral do
  // Aceite sai da situação de cada papel.
  const suportes = lerSuportesDoForm(formData.get("suportes"), lerSuportes(a));
  if (!suportes) return { erro: "Não consegui ler os papéis do pedido. Recarregue a página e tente de novo." };
  const liberar = formData.get("liberar") === "1";
  // Arte do cliente sem protocolo (por exemplo, a que chegou com a ordem de compra) trava a liberação
  // para a Engenharia (17/10/2026).
  if (liberar) {
    const erroArte = await erroPorArtePendente(a.orcamentoId);
    if (erroArte) return { erro: erroArte };
  }
  // Quantidade de cada modelo que o cliente pediu (campo "qtd_" + id do modelo).
  const itens: ItemAceite[] = lerItens(a.itens).map((i) => {
    const q = lerQuantidade(formData.get(`qtd_${i.modeloId}`));
    // Quanto sai do estoque de produto acabado: só vale quando Vendas marcou que há sobra.
    const e = temProdutoAcabado ? lerQuantidade(formData.get(`estoque_${i.modeloId}`)) : null;
    return { ...i, quantidade: q === null ? null : Math.round(q), emEstoque: e === null || e <= 0 ? null : Math.round(e) };
  });
  // Lotes (divisão do pedido, só nesta etapa). Sem o campo "lotes" o servidor não mexe neles; com a
  // lista vazia desfaz a divisão; com lotes confere a soma por modelo contra o pedido digitado agora.
  const lotesEnviados = lerLotesDoForm(formData.get("lotes"), [...lerSuportes(a), ...a.lotes.flatMap((l) => (Array.isArray(l.suportes) ? (l.suportes as SuporteAceite[]) : []))]);
  if (lotesEnviados === null) return { erro: "Não consegui ler os lotes. Recarregue a página e tente de novo." };
  // Os lotes enviados são reconhecidos pelo id (a posição pode mudar ao remover um lote). Pedido de Material
  // NÃO trava mais a divisão: o PM de um lote removido fica sem lote (nunca é apagado) e Vendas o liga a outro
  // lote; ao desfazer a divisão, ele passa a ser PM do Aceite todo.
  const idsDosLotes = new Set(a.lotes.map((l) => l.id));
  if (lotesEnviados !== undefined && lotesEnviados.length > 0) {
    const erroDiv = erroNaDivisao(itens, lotesEnviados);
    if (erroDiv) return { erro: erroDiv };
  } else if (lotesEnviados === undefined && a.lotes.length) {
    const erroDiv = erroNaDivisao(itens, a.lotes.map((l) => ({ itens: lerItensLote(l.itens) })));
    if (erroDiv) return { erro: `A divisão em lotes não bate mais com o pedido: ${erroDiv}` };
  }
  // Lotes que valem depois deste salvamento (para as conferências do "Liberar").
  const lotesEfetivos =
    lotesEnviados === undefined
      ? a.lotes.map((l) => ({ id: l.id as string | null, numero: l.numero, suportes: (Array.isArray(l.suportes) ? l.suportes : []) as SuporteAceite[] }))
      : lotesEnviados.map((l) => ({ id: (l.id && idsDosLotes.has(l.id) ? l.id : null) as string | null, numero: l.numero, suportes: l.suportes }));

  // Nº do Aceite vem do ERP (Vendas digita). Não pode repetir em outro Aceite.
  const numero = String(formData.get("numero") ?? "").trim() || null;
  if (numero) {
    const outro = await prisma.aceite.findFirst({ where: { numero, NOT: { id } }, select: { id: true } });
    if (outro) return { erro: `O Aceite nº ${numero} já está registrado em outro pedido.` };
  }

  if (liberar) {
    if (!numero) return { erro: "Informe o Nº do Aceite gerado no ERP." };
    const semQtd = itens.find((i) => !i.quantidade);
    if (semQtd) return { erro: `Informe a quantidade pedida de ${semQtd.descricao || "cada modelo"}.` };
    if (!estoque) return { erro: "Informe se há produto acabado em estoque (sobra na expedição), conferido no ERP." };
    const passou = itens.find((i) => (i.emEstoque ?? 0) > (i.quantidade ?? 0));
    if (passou) return { erro: `${passou.descricao || "O modelo"}: o estoque usado não pode passar do pedido.` };
    if (temProdutoAcabado && !itens.some((i) => (i.emEstoque ?? 0) > 0)) return { erro: "Há produto acabado em estoque: informe quanto de cada modelo será usado no pedido." };
    if (temProdutoAcabado && !versao) return { erro: "Há produto acabado em estoque: confira se a versão dele está atualizada." };
    if (lotesEfetivos.length) {
      // Aceite dividido: o papel e o PM são conferidos lote a lote.
      for (const l of lotesEfetivos) {
        if (!l.suportes.length) return { erro: `Lote ${l.numero}: informe ao menos um papel.` };
        const semSituacao = l.suportes.find((x) => x.situacao === "NAO_VERIFICADO");
        if (semSituacao) return { erro: `Lote ${l.numero}: informe a situação no estoque de ${textoSuporte(semSituacao)}.` };
        const semPM = suportesSemPM(l.suportes, l.id ? pmsDoLote({ id: l.id }, a.pedidosMaterial) : []);
        if (semPM.length) return { erro: `Lote ${l.numero}: sem todo o papel em estoque, emita o Pedido de Material do lote antes de liberar.` };
      }
    } else {
      if (!suportes.length) return { erro: "Informe ao menos um papel do pedido." };
      const semSituacao = suportes.find((x) => x.situacao === "NAO_VERIFICADO");
      if (semSituacao) return { erro: `Informe a situação no estoque de ${textoSuporte(semSituacao)}.` };
      const semPM = suportesSemPM(suportes, a.pedidosMaterial);
      if (semPM.length) return { erro: `Sem todo o papel em estoque: emita o Pedido de Material de ${textoSuporte(semPM[0])} antes de liberar.` };
    }
  }

  // Situação geral do papel: do conjunto de papéis do Aceite, ou de todos os papéis de todos os lotes.
  const situacao = situacaoGeral(lotesEfetivos.length ? lotesEfetivos.flatMap((l) => l.suportes) : suportes);
  const gravarLotes = lotesEnviados === undefined ? [] : operacoesDosLotes(id, nome, a, lotesEnviados);
  const gravarCodigos = await operacaoCodigosCliente(a.orcamentoId, formData);

  await prisma.$transaction([
    ...gravarCodigos,
    prisma.aceite.update({
    where: { id },
    data: {
      temProdutoAcabado,
      estoqueVerificadoEm: estoque ? (a.estoqueVerificadoEm ?? agora) : null,
      estoqueVerificadoPor: estoque ? (a.estoqueVerificadoPor ?? nome) : null,
      versaoVerificadaEm: versao ? (a.versaoVerificadaEm ?? agora) : null,
      versaoVerificadaPor: versao ? (a.versaoVerificadaPor ?? nome) : null,
      situacaoPapel: situacao,
      itens: JSON.parse(JSON.stringify(itens)),
      numero,
      pedidoInterno: String(formData.get("pedidoInterno") ?? "").trim() || null,
      suportes: JSON.parse(JSON.stringify(suportes)),
      ...datasDoForm(formData.get("datasCliente")),
      ...(liberar ? { etapa: "ENGENHARIA_MATERIAL" as const, vendasLiberadoEm: agora, vendasLiberadoPor: nome } : {}),
    },
    }),
    ...gravarLotes,
  ]);
  if (liberar) {
    // Volta de etapa pode ter deixado a Engenharia já confirmada e o papel garantido.
    await avancarSePronto(id);
    revalidarAceite();
    redirect("/aceite/vendas");
  }
  revalidarAceite();
  return { ok: "Salvo." };
}

const SITUACOES_VALIDAS: SituacaoSuporte[] = ["NAO_VERIFICADO", "RESERVADO_TOTAL", "RESERVADO_PARCIAL", "SEM_ESTOQUE"];

// Lê a lista de papéis enviada pelo formulário, guardando de cada papel só os campos conhecidos.
// O que veio do orçamento (doOrcamento) é mantido do que já estava gravado, nunca do formulário.
function lerSuportesDoForm(valor: FormDataEntryValue | null, atuais: SuporteAceite[]): SuporteAceite[] | null {
  if (valor === null) return atuais;
  try {
    const lista = JSON.parse(String(valor));
    if (!Array.isArray(lista)) return null;
    const txt = (v: unknown) => String(v ?? "").trim().slice(0, 200);
    const num = (v: unknown) => {
      const n = lerQuantidade(v === null || v === undefined ? null : String(v));
      return n === null ? null : Math.round(n);
    };
    return lista.slice(0, 20).map((x: Record<string, unknown>, i: number) => {
      const id = txt(x.id) || `s${Date.now()}${i}`;
      return {
        id,
        descricao: txt(x.descricao),
        gramatura: txt(x.gramatura),
        codigo: txt(x.codigo),
        formato: txt(x.formato),
        qtdFolha: num(x.qtdFolha),
        folhas: num(x.folhas),
        situacao: SITUACOES_VALIDAS.includes(x.situacao as SituacaoSuporte) ? (x.situacao as SituacaoSuporte) : "NAO_VERIFICADO",
        obs: txt(x.obs),
        doOrcamento: atuais.find((s) => s.id === id)?.doOrcamento ?? null,
      };
    });
  } catch {
    return null;
  }
}

// ---------- Alertas de mudança do fornecedor ----------

export async function marcarAlertasVistos(formData: FormData) {
  const aceiteId = String(formData.get("aceiteId") ?? "");
  await exigirArea("PCP_ENTREGA", "ACEITE_VENDAS", "ATENDIMENTO_CLIENTE");
  await prisma.pedidoMaterial.updateMany({ where: { aceiteId, alertaEm: { not: null } }, data: { alertaVistoEm: new Date() } });
  revalidarAceite();
}

// ---------- 2. Engenharia ----------
// TP de Engenharia 3.2.1: confere o Cadastro Técnico; produto novo ganha código novo (Nota 1:
// arquivo digital obrigatório). Lançar o código aqui é o mesmo que a etapa 7 do Orçamento pede:
// grava nos modelos do orçamento e, se o card estava esperando na etapa 7, libera pro Histórico.

export async function confirmarEngenharia(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const nome = await nomeSePode("ACEITE_ENGENHARIA");
  if (!nome) return { erro: "Sem permissão para confirmar pela Engenharia." };
  const a = await prisma.aceite.findUniqueOrThrow({ where: { id }, include: { orcamento: true } });
  if (a.etapa !== "ENGENHARIA_MATERIAL") return { erro: "O Aceite não está na etapa de Engenharia." };
  if (a.engenhariaEm) return { erro: "A Engenharia já confirmou este Aceite." };
  const erroArte = await erroPorArtePendente(a.orcamentoId);
  if (erroArte) return { erro: erroArte };

  const atuais = modelosDoDoc(a.orcamento);
  const novos = atuais.filter((m) => !m.codInterno);
  const modelos = atuais.map((m) =>
    m.codInterno ? m : { ...m, codInterno: normalizarCodigoInterno(String(formData.get(`codInterno_${m.id}`) ?? "")) },
  );
  for (const [i, m] of modelos.entries()) {
    const nomeModelo = modelos.length > 1 ? ` do modelo ${i + 1} (${m.descricao || "sem descrição"})` : "";
    if (!m.codInterno) return { erro: `Crie o cadastro e informe o Nº de Cadastro de Produto${nomeModelo}.` };
    if (!codigoInternoValido(m.codInterno)) return { erro: `Nº de Cadastro de Produto${nomeModelo} deve ter o formato 0.000.000 (7 dígitos).` };
  }
  const erroModelos = erroNosModelos(modelos);
  if (erroModelos) return { erro: erroModelos };
  if (novos.length && formData.get("arquivoDigital") !== "on") {
    return { erro: "Produto novo: confirme que o arquivo digital foi recebido (TP de Engenharia, Nota 1)." };
  }
  if (formData.get("ctpSalvo") !== "on") return { erro: "Confirme que a cópia do Cadastro Técnico foi salva na pasta CTP." };

  // Montagem e posições vêm do orçamento (conjugação e pré-montagem da Engenharia); aqui só se completa o que faltar
  // e se acompanha o código do item com o que a Engenharia acabou de lançar.
  const capacidadeFolha = lerSuportes(a)[0]?.qtdFolha ?? null;
  const itens: ItemAceite[] = completarPosicoes(
    lerItens(a.itens).map((i) => ({ ...i, codInterno: modelos.find((m) => m.id === i.modeloId)?.codInterno ?? i.codInterno })),
    capacidadeFolha,
  );
  const erroMontagem = erroNaMontagem(itens, capacidadeFolha);
  if (erroMontagem) return { erro: erroMontagem };

  const agora = new Date();
  await prisma.$transaction([
    ...(novos.length
      ? [
          prisma.orcamento.update({
            where: { id: a.orcamentoId },
            data: {
              modelos,
              ...resumoDosModelos(modelos),
              ...(a.orcamento.etapa === "CADASTRO_PRODUTO" ? { etapa: "FINALIZADO" as const } : {}),
            },
          }),
        ]
      : []),
    prisma.aceite.update({
      where: { id },
      data: {
        cadastroSituacao: novos.length ? "CRIADO" : "EXISTENTE",
        itens: JSON.parse(JSON.stringify(itens)),
        facaNova: formData.get("facaNova") === "on",
        codigoFaca: String(formData.get("codigoFaca") ?? "").trim() || null,
        clicheNovo: formData.get("clicheNovo") === "on",
        engenhariaEm: agora,
        engenhariaPor: nome,
        engenhariaObs: String(formData.get("engenhariaObs") ?? "").trim() || null,
      },
    }),
  ]);
  const foiAoPcp = await avancarSePronto(id);
  revalidatePath("/painel");
  revalidatePath("/historico");
  revalidarAceite();
  if (foiAoPcp) redirect("/engenharia");
  return { ok: "Aceite confirmado pela Engenharia. Falta o papel ficar garantido para ir ao PCP." };
}

// ---------- 4. Cadastro do pedido ----------
// TP de Vendas 3.2.2: Vendas cadastra o pedido no sistema informatizado e passa o Aceite ao
// Atendimento ao Cliente, que envia a data prevista ao cliente e/ou representante (3.2.3, módulo
// Atendimento; divisão de papéis definida pelo Thiago em 08/10/2026).

export async function salvarPedido(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const nome = await nomeSePode("ACEITE_VENDAS");
  if (!nome) return { erro: "Sem permissão (área Vendas)." };
  const alvo = await carregarAlvo(id, formData.get("loteId"));
  if ("erro" in alvo) return alvo;
  const { a, lote } = alvo;
  if (a.etapa !== "PEDIDO") return { erro: lote ? "Este lote não está na etapa Cadastro do pedido." : "O Aceite não está na etapa Cadastro do pedido." };
  // O nº do pedido no ERP é o próprio Nº do Aceite, informado por Vendas no preenchimento.
  const numeroPedido = a.numero;
  // O pedido interno precisa estar preenchido para cadastrar o pedido (pode ser informado aqui).
  const pedidoInterno = String(formData.get("pedidoInterno") ?? "").trim() || a.pedidoInterno;
  if (!pedidoInterno) return { erro: "Informe o pedido interno antes de cadastrar o pedido." };
  const agora = new Date();
  // Cadastro e OF são do lote (ou do Aceite, sem divisão); nº do pedido e pedido interno são do Aceite.
  const doLote = {
    pedidoCadastradoEm: a.pedidoCadastradoEm ?? agora,
    pedidoCadastradoPor: a.pedidoCadastradoPor ?? nome,
    numeroOF: String(formData.get("numeroOF") ?? "").trim() || null,
    etapa: "ATENDIMENTO",
  };
  await prisma.$transaction([
    prisma.aceite.update({ where: { id }, data: { numeroPedido, pedidoInterno, ...(lote ? {} : (doLote as Prisma.AceiteUpdateInput)) } }),
    ...(lote ? [gravarAlvo(id, lote, doLote)] : []),
  ]);
  revalidarAceite();
  redirect("/aceite/vendas");
}

// A OF costuma ser aberta depois do Aceite concluído (TP de Vendas 3.3): Vendas registra o número
// quando abrir, como no rodapé do formulário de papel.
export async function salvarNumeroOF(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const nome = await nomeSePode("ACEITE_VENDAS");
  if (!nome) return { erro: "Sem permissão (área Vendas)." };
  const numeroOF = String(formData.get("numeroOF") ?? "").trim();
  if (!numeroOF) return { erro: "Informe o número da OF." };
  const alvo = await carregarAlvo(id, formData.get("loteId"));
  if ("erro" in alvo) return alvo;
  await gravarAlvo(id, alvo.lote, { numeroOF });
  revalidarAceite();
  return { ok: "Nº da OF registrado." };
}

// ---------- Voltar etapa ----------

const QUEM_VOLTA: Record<EtapaAceiteKey, AreaKey[]> = {
  VENDAS: [],
  ENGENHARIA_MATERIAL: ["ACEITE_VENDAS", "ACEITE_ENGENHARIA"],
  // Do PCP de volta à Engenharia: quem a refaz ou quem liberou (Vendas) também pode voltar.
  PCP: ["PCP_ENTREGA", "ACEITE_VENDAS", "ACEITE_ENGENHARIA"],
  PEDIDO: ["ACEITE_VENDAS", "PCP_ENTREGA"],
  ATENDIMENTO: ["ATENDIMENTO_CLIENTE", "ACEITE_VENDAS"],
  ENTREGA: ["ATENDIMENTO_CLIENTE", "ACEITE_VENDAS"],
  // Desfazer a confirmação da entrega é com o PCP, que confirmou (Vendas também, para corrigir).
  CONCLUIDO: ["PCP_ENTREGA", "ACEITE_VENDAS"],
};

export async function voltarEtapaAceite(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const a = await prisma.aceite.findUniqueOrThrow({ where: { id } });
  const voltarPara = String(formData.get("voltarPara") ?? "");
  const destino = ["/aceite", "/pcp", "/engenharia", "/atendimento"].some((p) => voltarPara.startsWith(p)) ? voltarPara : "/aceite";
  // Aceite dividido em lotes: "voltar" refaz o caminho. Todos os lotes voltam para a Engenharia e o
  // material (datas do PCP, cadastro do pedido e aviso ao cliente dos lotes são limpos) e a Engenharia
  // confirma de novo; de lá Vendas pode voltar mais um passo e refazer a divisão. Nunca apaga Pedido de
  // Material: ficam como estão. Bloqueado se algum lote já teve entrega confirmada ou tem negociação
  // aberta (16/10/2026).
  if (a.etapa === "EM_LOTES") {
    await exigirArea("ACEITE_VENDAS", "ACEITE_ENGENHARIA", "PCP_ENTREGA");
    const entregas = await prisma.entregaAceite.count({ where: { lote: { aceiteId: id } } });
    if (entregas > 0) throw new Error("Há entrega confirmada em um lote: não dá para voltar o Aceite.");
    const abertas = await prisma.negociacaoData.count({ where: { aceiteId: id, status: { not: "ENCERRADA" } } });
    if (abertas > 0) throw new Error("Há negociação de data em andamento: encerre-a antes de voltar o Aceite.");
    await prisma.$transaction([
      prisma.loteAceite.updateMany({
        where: { aceiteId: id },
        data: {
          etapa: "ENGENHARIA_MATERIAL",
          dataEntrega: null,
          dataEntregaSugerida: null,
          pcpEm: null,
          pcpPor: null,
          pcpObs: null,
          pedidoCadastradoEm: null,
          pedidoCadastradoPor: null,
          clienteInformadoEm: null,
          clienteInformadoPor: null,
        },
      }),
      // Direto a Vendas, onde a divisão e o papel se refazem (antes parava na Engenharia e exigia outro "voltar").
      prisma.aceite.update({ where: { id }, data: { etapa: "VENDAS", vendasLiberadoEm: null, vendasLiberadoPor: null, engenhariaEm: null, engenhariaPor: null } }),
    ]);
    revalidarAceite();
    redirect(destino);
  }
  const etapa = a.etapa as EtapaAceiteKey;
  await exigirArea(...QUEM_VOLTA[etapa]);
  const ordem = ETAPAS_ACEITE.map((e) => e.key);
  const idx = ordem.indexOf(etapa);
  if (idx <= 0) return;
  await prisma.aceite.update({
    where: { id },
    data: {
      etapa: ordem[idx - 1],
      // Do PCP de volta pra Engenharia e material: a Engenharia confirma de novo, senão o Aceite
      // voltaria pro PCP no primeiro movimento de PM.
      ...(etapa === "PCP" ? { engenhariaEm: null, engenhariaPor: null } : {}),
      ...(etapa === "ENGENHARIA_MATERIAL" ? { vendasLiberadoEm: null, vendasLiberadoPor: null } : {}),
      ...(etapa === "ENTREGA" ? { clienteInformadoEm: null, clienteInformadoPor: null } : {}),
      ...(etapa === "CONCLUIDO" ? { entregueEm: null, entregaConfirmadaEm: null, entregaConfirmadaPor: null, entregaObs: null, entregaSaldoCancelado: null, entregaCancelamentoMotivo: null } : {}),
    },
  });
  revalidarAceite();
  redirect(destino);
}

// Primeira etapa do Aceite (Vendas): voltar leva o card ao Retorno do Cliente, no módulo Orçamento, e
// desfaz o desfecho positivo (o mesmo que "Voltar etapa" do orçamento faz). O Aceite some junto, por isso
// só é possível enquanto ninguém lançou Pedido de Material nele; com PM, é o administrador (que cancela o
// Aceite) ou os PMs precisam ser cancelados antes.
export async function voltarAceiteParaOrcamento(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await exigirArea("ACEITE_VENDAS");
  const a = await prisma.aceite.findUniqueOrThrow({ where: { id }, select: { id: true, etapa: true, orcamentoId: true, _count: { select: { pedidosMaterial: true } } } });
  if (a.etapa !== "VENDAS") throw new Error("Só o Aceite em Vendas volta para o orçamento.");
  if (a._count.pedidosMaterial > 0) throw new Error("Este Aceite já tem Pedido de Material: peça ao administrador para desfazer o pedido.");
  const doc = await prisma.orcamento.findUniqueOrThrow({ where: { id: a.orcamentoId } });
  await prisma.aceite.delete({ where: { id: a.id } });
  await prisma.orcamento.update({
    where: { id: doc.id },
    data: {
      etapa: "FINALIZADO",
      desfecho: "AGUARDANDO",
      desfechoMotivo: "",
      desfechoPor: "",
      desfechoEm: null,
      precificacao: limparEscolhaDoDesfecho(doc.precificacao as PrecificacaoTier[] | null) as unknown as Prisma.InputJsonValue,
    },
  });
  revalidarAceite();
  revalidatePath("/painel");
  revalidatePath("/historico");
  redirect("/aceite");
}

// Voltar etapa DE UM LOTE (Aceite dividido): do cadastro do pedido em diante, um passo por vez. Do PCP
// para trás é pelo Aceite ("Voltar o Aceite"), porque a Engenharia e a divisão são do Aceite todo.
const QUEM_VOLTA_LOTE: Record<string, AreaKey[]> = {
  PEDIDO: ["ACEITE_VENDAS", "PCP_ENTREGA"],
  ATENDIMENTO: ["ATENDIMENTO_CLIENTE", "ACEITE_VENDAS"],
  ENTREGA: ["ATENDIMENTO_CLIENTE", "ACEITE_VENDAS"],
  CONCLUIDO: ["PCP_ENTREGA", "ACEITE_VENDAS"],
};
const ETAPA_ANTERIOR_LOTE: Record<string, "PCP" | "PEDIDO" | "ATENDIMENTO" | "ENTREGA"> = {
  PEDIDO: "PCP",
  ATENDIMENTO: "PEDIDO",
  ENTREGA: "ATENDIMENTO",
  CONCLUIDO: "ENTREGA",
};

export async function voltarEtapaLote(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const loteId = String(formData.get("loteId") ?? "");
  const lote = await prisma.loteAceite.findFirstOrThrow({ where: { id: loteId, aceiteId: id } });
  const quem = QUEM_VOLTA_LOTE[lote.etapa];
  if (!quem) throw new Error("Esta etapa do lote não volta por aqui.");
  await exigirArea(...quem);
  await prisma.$transaction([
    prisma.loteAceite.update({
      where: { id: lote.id },
      data: {
        etapa: ETAPA_ANTERIOR_LOTE[lote.etapa],
        ...(lote.etapa === "ENTREGA" ? { clienteInformadoEm: null, clienteInformadoPor: null } : {}),
        ...(lote.etapa === "CONCLUIDO" ? { entregueEm: null, entregaConfirmadaEm: null, entregaConfirmadaPor: null, entregaObs: null, entregaSaldoCancelado: null, entregaCancelamentoMotivo: null } : {}),
      },
    }),
    // Reabrir um lote concluído reabre o Aceite, que só conclui com todos os lotes concluídos.
    ...(lote.etapa === "CONCLUIDO"
      ? [prisma.aceite.update({ where: { id }, data: { etapa: "EM_LOTES", entregueEm: null, entregaConfirmadaEm: null, entregaConfirmadaPor: null } })]
      : []),
  ]);
  revalidarAceite();
  const voltarPara = String(formData.get("voltarPara") ?? "");
  redirect(["/aceite", "/pcp", "/engenharia", "/atendimento"].some((p) => voltarPara.startsWith(p)) ? voltarPara : "/aceite");
}

// Datas válidas de uma lista vinda do formulário, da mais cedo para a mais tarde.
function datasValidas(lista: unknown): DataCliente[] {
  return (Array.isArray(lista) ? (lista as { data?: string; quantidade?: number | null; obs?: string }[]) : [])
    .filter((d) => typeof d?.data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.data))
    .map((d) => ({ data: d.data as string, quantidade: typeof d.quantidade === "number" && d.quantidade > 0 ? Math.round(d.quantidade) : null, obs: String(d.obs ?? "").trim().slice(0, 200) }))
    .sort((x, y) => x.data.localeCompare(y.data));
}


// Lotes enviados pelo formulário (campo escondido "lotes"): undefined = campo ausente (não mexe nos
// lotes), null = ilegível, lista = a divisão (vazia = sem divisão). O número é a posição na lista.
function lerLotesDoForm(valor: FormDataEntryValue | null, suportesConhecidos: SuporteAceite[]): LoteEnviado[] | null | undefined {
  if (valor === null) return undefined;
  try {
    const lista = JSON.parse(String(valor));
    if (!Array.isArray(lista) || lista.length > 12) return null;
    const out: LoteEnviado[] = [];
    for (const [i, x] of (lista as Record<string, unknown>[]).entries()) {
      const suportes = lerSuportesDoForm(JSON.stringify(x.suportes ?? []), suportesConhecidos);
      if (!suportes) return null;
      const itens = (Array.isArray(x.itens) ? (x.itens as Record<string, unknown>[]) : [])
        .filter((it) => typeof it?.modeloId === "string")
        .map((it) => ({
          modeloId: it.modeloId as string,
          quantidade: typeof it.quantidade === "number" ? Math.round(it.quantidade) : null,
          emEstoque: typeof it.emEstoque === "number" && it.emEstoque > 0 ? Math.round(it.emEstoque) : null,
        }));
      out.push({ id: typeof x.id === "string" ? x.id : null, numero: i + 1, itens, datas: datasValidas(x.datasCliente), suportes });
    }
    return out;
  } catch {
    return null;
  }
}

// Datas do cliente (campo escondido "datasCliente", JSON do formulário). A mais cedo vira dataCliente.
function datasDoForm(raw: FormDataEntryValue | null) {
  let lista: unknown = [];
  try {
    lista = JSON.parse(String(raw ?? "[]"));
  } catch {
    lista = [];
  }
  const datas = datasValidas(lista);
  return {
    dataCliente: datas[0] ? new Date(datas[0].data + "T00:00:00.000Z") : null,
    datasCliente: datas.length ? datas : Prisma.JsonNull,
  };
}

// Pedido interno informado depois da Engenharia (pendência de Vendas, 11/10/2026).
export async function salvarPedidoInterno(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const nome = await nomeSePode("ACEITE_VENDAS");
  if (!nome) return { erro: "Sem permissão (área Vendas)." };
  const pedidoInterno = String(formData.get("pedidoInterno") ?? "").trim();
  if (!pedidoInterno) return { erro: "Informe o pedido interno." };
  await prisma.aceite.update({ where: { id }, data: { pedidoInterno } });
  revalidarAceite();
  return { ok: "Pedido interno registrado." };
}

// ---------- Administrador: cancelar e excluir (cards de teste) ----------
// Em qualquer etapa do Aceite o administrador pode cancelar o Aceite (volta o desfecho do orçamento
// para "aguardando", sem nada de oficial) ou excluir o pedido por inteiro. Pedido do Thiago em 14/10/2026.

export async function cancelarAceite(formData: FormData) {
  if (!(await ehAdmin())) throw new Error("Só o administrador cancela um Aceite.");
  const id = String(formData.get("id") ?? "");
  const a = await prisma.aceite.findUniqueOrThrow({ where: { id }, select: { orcamentoId: true, orcamento: { select: { precificacao: true } } } });
  await removerAceite(a.orcamentoId);
  await prisma.orcamento.update({
    where: { id: a.orcamentoId },
    data: {
      etapa: "FINALIZADO",
      desfecho: "AGUARDANDO",
      desfechoMotivo: "",
      desfechoPor: "",
      desfechoEm: null,
      precificacao: limparEscolhaDoDesfecho(a.orcamento.precificacao as PrecificacaoTier[] | null),
    },
  });
  revalidarAceite();
  revalidatePath("/painel");
  revalidatePath("/historico");
  redirect("/painel");
}

export async function excluirPedidoCompleto(formData: FormData) {
  if (!(await ehAdmin())) throw new Error("Só o administrador exclui um pedido.");
  const id = String(formData.get("id") ?? "");
  const a = await prisma.aceite.findUniqueOrThrow({ where: { id }, select: { orcamentoId: true } });
  await removerAceite(a.orcamentoId);
  await prisma.orcamento.delete({ where: { id: a.orcamentoId } });
  revalidarAceite();
  revalidatePath("/painel");
  revalidatePath("/historico");
  redirect("/aceite");
}

// ---------- Pedido cancelado (19/10/2026, regras da Karen) ----------
// Só Vendas cancela, com motivo livre, depois do Aceite aberto e antes de qualquer entrega. Estado final:
// não reabre (cliente que volta = outro Aceite). Os setores que já tinham trabalhado no pedido recebem um
// aviso para dar ciência; o papel e as Ordens de Compra NÃO são canceladas aqui (Compras decide caso a caso).
export async function cancelarPedido(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const nome = await nomeSePode("ACEITE_VENDAS");
  if (!nome) return { erro: "Só Vendas pode cancelar o pedido." };
  const r = await executarCancelamento(id, nome, String(formData.get("motivo") ?? ""), {
    pedido: formData.get("feitoPedido") === "on",
    of: formData.get("feitoOF") === "on",
    envelope: formData.get("feitoEnvelope") === "on",
  });
  if ("erro" in r) return r;
  revalidarAceite();
  revalidatePath("/painel");
  redirect("/aceite/vendas");
}

// Vendas marca que terminou o que faltava no ERP (cancelar pedido/OF, recolher o envelope da OF).
export async function concluirCancelamentoErp(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await exigirArea("ACEITE_VENDAS");
  await prisma.aceite.update({ where: { id }, data: { canceladoErpPendente: false } });
  revalidarAceite();
}

// O setor avisado (PCP, Compras ou Engenharia) dá ciência do pedido cancelado.
export async function darCienteCancelamento(formData: FormData) {
  const avisoId = String(formData.get("avisoId") ?? "");
  const aviso = await prisma.avisoCancelamento.findUniqueOrThrow({ where: { id: avisoId } });
  const nome = await exigirArea(SETOR_AVISO[aviso.setor as SetorAviso].area);
  await prisma.avisoCancelamento.update({ where: { id: avisoId }, data: { vistoEm: new Date(), vistoPor: nome } });
  revalidarAceite();
}

// Código do cliente por modelo: não é obrigatório na solicitação, e o cliente pode mandá-lo (ou trocá-lo) depois do
// desfecho positivo. Fica na linha do produto, junto da descrição e do Nº de Cadastro; Vendas inclui ou altera até o
// pedido ser concluído, e a Engenharia vê no Aceite (pedido do Thiago em 28/10/2026). Grava nos modelos do orçamento e
// no resumo, para o card e as buscas acompanharem. Campos ausentes no formulário não mexem no modelo.
async function operacaoCodigosCliente(orcamentoId: string, formData: FormData) {
  const doc = await prisma.orcamento.findUniqueOrThrow({ where: { id: orcamentoId } });
  let mudou = false;
  const modelos = modelosDoDoc(doc).map((m) => {
    const v = formData.get(`codigoCliente_${m.id}`);
    if (v === null) return m;
    const novo = String(v).trim().slice(0, 60);
    if (novo === (m.codigoCliente ?? "")) return m;
    mudou = true;
    return { ...m, codigoCliente: novo };
  });
  if (!mudou) return [];
  return [prisma.orcamento.update({ where: { id: orcamentoId }, data: { modelos: JSON.parse(JSON.stringify(modelos)), codigoCliente: resumoDosModelos(modelos).codigoCliente } })];
}

export async function salvarCodigoCliente(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const nome = await nomeSePode("ACEITE_VENDAS");
  if (!nome) return { erro: "Sem permissão (área Vendas)." };
  const a = await prisma.aceite.findUniqueOrThrow({ where: { id }, select: { etapa: true, orcamentoId: true } });
  if (a.etapa === "CONCLUIDO" || a.etapa === "CANCELADO") return { erro: "Este Aceite já está encerrado." };
  await prisma.$transaction(await operacaoCodigosCliente(a.orcamentoId, formData));
  revalidarAceite();
  revalidatePath("/painel");
  return { ok: "Código do cliente salvo." };
}
