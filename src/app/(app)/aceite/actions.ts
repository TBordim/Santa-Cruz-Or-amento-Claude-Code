"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import type { AreaKey } from "@/lib/areas";
import { modelosDoDoc, resumoDosModelos } from "@/lib/orcamentos/modelos";
import { normalizarCodigoInterno, codigoInternoValido } from "@/lib/orcamentos/codigo-interno";
import { erroNosModelos } from "@/lib/orcamentos/validacao-modelos";
import { ETAPAS_ACEITE, lerQuantidade, type EtapaAceiteKey } from "@/lib/aceite/constantes";
import { lerSuportes, situacaoGeral, suportesSemPM, textoSuporte, type SuporteAceite, type SituacaoSuporte } from "@/lib/aceite/suportes";
import { lerItens, erroNaMontagem, type ItemAceite } from "@/lib/aceite/montagem";
import { exigirArea, nomeSePode, revalidarAceite, avancarSePronto, type FormState } from "@/lib/aceite/servidor";

// Ações do módulo Aceite (Vendas e Engenharia). Pedido de Material mora no módulo Compras
// (compras/actions.ts) e a data de entrega no módulo PCP (pcp/actions.ts).

// ---------- 1. Vendas ----------

export async function salvarVendas(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const nome = await nomeSePode("ACEITE_VENDAS");
  if (!nome) return { erro: "Sem permissão para preencher o Aceite (área Vendas)." };
  const a = await prisma.aceite.findUniqueOrThrow({ where: { id }, include: { pedidosMaterial: true } });
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
  const situacao = situacaoGeral(suportes);
  const liberar = formData.get("liberar") === "1";
  // Quantidade de cada modelo que o cliente pediu (campo "qtd_" + id do modelo).
  const itens: ItemAceite[] = lerItens(a.itens).map((i) => {
    const q = lerQuantidade(formData.get(`qtd_${i.modeloId}`));
    // Quanto sai do estoque de produto acabado: só vale quando Vendas marcou que há sobra.
    const e = temProdutoAcabado ? lerQuantidade(formData.get(`estoque_${i.modeloId}`)) : null;
    return { ...i, quantidade: q === null ? null : Math.round(q), emEstoque: e === null || e <= 0 ? null : Math.round(e) };
  });
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
    if (!suportes.length) return { erro: "Informe ao menos um papel do pedido." };
    const semSituacao = suportes.find((x) => x.situacao === "NAO_VERIFICADO");
    if (semSituacao) return { erro: `Informe a situação no estoque de ${textoSuporte(semSituacao)}.` };
    const semPM = suportesSemPM(suportes, a.pedidosMaterial);
    if (semPM.length) return { erro: `Sem todo o papel em estoque: emita o Pedido de Material de ${textoSuporte(semPM[0])} antes de liberar.` };
  }

  await prisma.aceite.update({
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
  });
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

  // Montagem: grupo ("montagem_" + id) e posições na folha ("posicoes_" + id) de cada modelo. O
  // código do item acompanha o que a Engenharia acabou de lançar.
  const itens: ItemAceite[] = lerItens(a.itens).map((i) => {
    const grupo = lerQuantidade(formData.get(`montagem_${i.modeloId}`));
    const posicoes = lerQuantidade(formData.get(`posicoes_${i.modeloId}`));
    return {
      ...i,
      codInterno: modelos.find((m) => m.id === i.modeloId)?.codInterno ?? i.codInterno,
      montagem: grupo ? Math.round(grupo) : null,
      posicoes: posicoes ? Math.round(posicoes) : null,
    };
  });
  const erroMontagem = erroNaMontagem(itens, lerSuportes(a)[0]?.qtdFolha ?? null);
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
  const a = await prisma.aceite.findUniqueOrThrow({ where: { id } });
  if (a.etapa !== "PEDIDO") return { erro: "O Aceite não está na etapa Cadastro do pedido." };
  // O nº do pedido no ERP é o próprio Nº do Aceite, informado por Vendas no preenchimento.
  const numeroPedido = a.numero;
  // O pedido interno precisa estar preenchido para cadastrar o pedido (pode ser informado aqui).
  const pedidoInterno = String(formData.get("pedidoInterno") ?? "").trim() || a.pedidoInterno;
  if (!pedidoInterno) return { erro: "Informe o pedido interno antes de cadastrar o pedido." };
  const agora = new Date();
  await prisma.aceite.update({
    where: { id },
    data: {
      numeroPedido,
      pedidoInterno,
      pedidoCadastradoEm: a.pedidoCadastradoEm ?? agora,
      pedidoCadastradoPor: a.pedidoCadastradoPor ?? nome,
      numeroOF: String(formData.get("numeroOF") ?? "").trim() || null,
      etapa: "ATENDIMENTO",
    },
  });
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
  await prisma.aceite.update({ where: { id }, data: { numeroOF } });
  revalidarAceite();
  return { ok: "Nº da OF registrado." };
}

// ---------- Voltar etapa ----------

const QUEM_VOLTA: Record<EtapaAceiteKey, AreaKey[]> = {
  VENDAS: [],
  ENGENHARIA_MATERIAL: ["ACEITE_VENDAS", "ACEITE_ENGENHARIA"],
  PCP: ["PCP_ENTREGA"],
  PEDIDO: ["ACEITE_VENDAS", "PCP_ENTREGA"],
  ATENDIMENTO: ["ATENDIMENTO_CLIENTE", "ACEITE_VENDAS"],
  ENTREGA: ["ATENDIMENTO_CLIENTE", "ACEITE_VENDAS"],
  // Desfazer a confirmação da entrega é com o PCP, que confirmou.
  CONCLUIDO: ["PCP_ENTREGA"],
};

export async function voltarEtapaAceite(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const a = await prisma.aceite.findUniqueOrThrow({ where: { id } });
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
  const voltarPara = String(formData.get("voltarPara") ?? "");
  redirect(["/aceite", "/pcp", "/engenharia", "/atendimento"].some((p) => voltarPara.startsWith(p)) ? voltarPara : "/aceite");
}

// Datas do cliente (campo escondido "datasCliente", JSON do formulário). A mais cedo vira dataCliente.
function datasDoForm(raw: FormDataEntryValue | null) {
  let lista: { data?: string; quantidade?: number | null; obs?: string }[] = [];
  try {
    lista = JSON.parse(String(raw ?? "[]"));
  } catch {
    lista = [];
  }
  const datas = (Array.isArray(lista) ? lista : [])
    .filter((d) => typeof d?.data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.data))
    .map((d) => ({ data: d.data as string, quantidade: typeof d.quantidade === "number" && d.quantidade > 0 ? Math.round(d.quantidade) : null, obs: String(d.obs ?? "").trim().slice(0, 200) }))
    .sort((x, y) => x.data.localeCompare(y.data));
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
