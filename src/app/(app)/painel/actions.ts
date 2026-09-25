"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { sessaoAtual, podeEditar } from "@/lib/permissions";
import { lerCamposComerciais, lerReqTecnicos, parseValorBR } from "@/lib/orcamentos/leitura";
import { montarPrecificacao, decidirFaixa, type FaixaInput } from "@/lib/orcamentos/tiers";
import { buscarOrcamentoAnterior } from "@/lib/orcamentos/legado";
import { normalizarCodigoInterno, codigoInternoValido } from "@/lib/orcamentos/codigo-interno";
import type { ReqCliente, ReqTecnicos, PrecificacaoTier } from "@/lib/orcamentos/types";
import type { AreaKey } from "@/lib/areas";
import { CREDITO_LIBERA } from "@/lib/orcamentos/constantes";

export type FormState = { erro?: string } | undefined;

async function exigirEdicao(id: string): Promise<{ etapa: AreaKey; nomeAtor: string }> {
  const sessao = await sessaoAtual();
  const doc = await prisma.orcamento.findUniqueOrThrow({ where: { id } });
  const etapa = (doc.etapa ?? "HISTORICO") as AreaKey;
  if (!(await podeEditar(etapa))) throw new Error("Sem permissão para editar esta etapa.");
  return { etapa, nomeAtor: sessao?.nome ?? "Representante (sem login)" };
}

// ---------- Etapa 1 — Em Aberto ----------

export async function salvarAberto(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  try {
    await exigirEdicao(id);
  } catch {
    return { erro: "Sem permissão para editar esta etapa." };
  }
  const campos = lerCamposComerciais(formData);
  await prisma.orcamento.update({ where: { id }, data: campos });
  revalidatePath(`/painel/${id}`);
  return undefined;
}

export async function avancarEngenharia(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  await exigirEdicao(id);
  const credito = String(formData.get("analiseCredito") ?? "");
  if (!CREDITO_LIBERA.includes(credito)) {
    return {
      erro: `Análise de crédito está como "${credito || "não informada"}". Só é possível liberar para a Engenharia com a análise Aprovada ou Não aplicável.`,
    };
  }
  const campos = lerCamposComerciais(formData);
  const ehRepeticao = !!campos.classificacao?.startsWith("REPETICAO");
  if (ehRepeticao && !campos.codInterno) {
    return { erro: "Como esta solicitação é uma repetição, o Código interno (Santa Cruz) é obrigatório." };
  }
  if (campos.codInterno && !codigoInternoValido(campos.codInterno)) {
    return { erro: "Código interno (Santa Cruz) deve ter o formato 0.000.000 (7 dígitos)." };
  }
  await prisma.orcamento.update({ where: { id }, data: { ...campos, etapa: "ENGENHARIA" } });
  // Fecha a gaveta ao avançar de etapa (volta pro /painel em vez de /painel/[id]) — só reabre
  // se a pessoa clicar de novo no card, na coluna nova. Pedido do Thiago em 19/09/2026: a gaveta
  // ficava aberta na etapa nova, e ele queria voltar pro quadro geral depois de liberar.
  redirect("/painel");
}

// ---------- Etapa 2 — Engenharia ----------

export async function salvarRequisitos(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const doc = await prisma.orcamento.findUniqueOrThrow({ where: { id } });
  await exigirEdicao(id);
  const reqTecnicos = lerReqTecnicos(formData, doc.reqTecnicos as ReqTecnicos | null);
  const codInternoForm = normalizarCodigoInterno(String(formData.get("codInterno") ?? ""));
  await prisma.orcamento.update({
    where: { id },
    data: {
      reqTecnicos,
      preCadastro: String(formData.get("preCadastro") ?? "").trim(),
      codInterno: codInternoForm || doc.codInterno || "",
      obsEngenharia: String(formData.get("obsEngenharia") ?? "").trim(),
    },
  });
  revalidatePath(`/painel/${id}`);
  return undefined;
}

export async function avancarOrcamento(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const doc = await prisma.orcamento.findUniqueOrThrow({ where: { id } });
  await exigirEdicao(id);

  const preCadastro = String(formData.get("preCadastro") ?? "").trim();
  if (!preCadastro) return { erro: "Informe o Nº de Pré Cadastro antes de liberar para o Orçamento." };

  // Produto novo não exige mais Código interno nesta etapa — gerar um código pra cada produto
  // que só vira orçamento (nunca produção) inflava o cadastro à toa. Agora o código só é
  // pedido depois que o cliente aprova de verdade, na etapa 7 (Cadastro de Produto — ver
  // registrarDesfecho e salvarCadastroProduto). Repetição continua exigindo aqui: o produto já existe, o código
  // já deveria ter vindo da Solicitação (é por ele que a Diretoria casa com o histórico).
  const ehRepeticao = !!doc.classificacao?.startsWith("REPETICAO");
  const codInternoForm = normalizarCodigoInterno(String(formData.get("codInterno") ?? ""));
  const codInternoFinal = codInternoForm || doc.codInterno || "";
  if (ehRepeticao && !codInternoFinal) {
    return { erro: "Como esta solicitação é uma repetição, o Código interno (Santa Cruz) é obrigatório antes de liberar para o Orçamento." };
  }
  if (codInternoFinal && !codigoInternoValido(codInternoFinal)) {
    return { erro: "Código interno (Santa Cruz) deve ter o formato 0.000.000 (7 dígitos)." };
  }

  const reqTecnicos = lerReqTecnicos(formData, doc.reqTecnicos as ReqTecnicos | null);
  const sessao = await sessaoAtual();
  await prisma.orcamento.update({
    where: { id },
    data: {
      etapa: "ORCAMENTO",
      reqTecnicos,
      preCadastro,
      codInterno: codInternoFinal,
      obsEngenharia: String(formData.get("obsEngenharia") ?? "").trim(),
      vistoEngenhariaPor: sessao?.nome ?? "",
      vistoEngenhariaEm: new Date(),
    },
  });
  redirect("/painel");
}

// ---------- Etapa 3 — Orçamento ----------

function lerFaixas(formData: FormData, quantidades: string[]): FaixaInput[] {
  return quantidades.map((quantidade, i) => ({
    quantidade,
    numeroSequencial: String(formData.get(`numeroSequencial_${i}`) ?? "").trim(),
    precoProjetado: parseValorBR(String(formData.get(`precoProjetado_${i}`) ?? "")),
    custoPrimarioPct: (() => {
      const v = parseValorBR(String(formData.get(`custoPrimarioPct_${i}`) ?? ""));
      return Number.isNaN(v) ? null : v;
    })(),
    margemP2Pct: (() => {
      const v = parseValorBR(String(formData.get(`margemP2Pct_${i}`) ?? ""));
      return Number.isNaN(v) ? null : v;
    })(),
    numeroLotes: String(formData.get(`numeroLotes_${i}`) ?? "").trim(),
    numeroSetups: String(formData.get(`numeroSetups_${i}`) ?? "").trim(),
  }));
}

// Resumo dos SOPPs de todas as faixas pra exibir no título do card/coluna do Painel (um campo
// só, sempre foi assim visualmente) — cada faixa continua com o próprio número gravado, este
// resumo é só pra exibição rápida, nunca editado direto.
function resumoSopp(rascunho: { numeroSequencial: string }[]): string {
  return rascunho.map((r) => r.numeroSequencial).filter(Boolean).join(", ");
}

export async function salvarOrcamento(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const doc = await prisma.orcamento.findUniqueOrThrow({ where: { id } });
  await exigirEdicao(id);
  const reqCliente = doc.reqCliente as ReqCliente | null;
  const quantidades = reqCliente?.quantidadesLista ?? [];
  const faixas = lerFaixas(formData, quantidades);
  const existentes = (doc.precificacao as PrecificacaoTier[] | null) ?? [];

  const rascunho = faixas.map((f, i) => ({
    ...(existentes[i] ?? {}),
    quantidade: f.quantidade,
    numeroSequencial: f.numeroSequencial || existentes[i]?.numeroSequencial || "",
    precoProjetado: Number.isNaN(f.precoProjetado) ? (existentes[i]?.precoProjetado ?? null) : f.precoProjetado,
    custoPrimarioPct: f.custoPrimarioPct ?? existentes[i]?.custoPrimarioPct ?? null,
    margemP2Pct: f.margemP2Pct ?? existentes[i]?.margemP2Pct ?? null,
    numeroLotes: f.numeroLotes || existentes[i]?.numeroLotes || "",
    numeroSetups: f.numeroSetups || existentes[i]?.numeroSetups || "",
  }));

  await prisma.orcamento.update({
    where: { id },
    data: {
      precificacao: rascunho,
      numeroSequencial: resumoSopp(rascunho),
      comissaoEspecial: formData.get("comissaoEspecial") === "on",
      comissaoObs: String(formData.get("comissaoObs") ?? "").trim(),
      acabamento: String(formData.get("acabamento") ?? "").trim(),
    },
  });
  revalidatePath(`/painel/${id}`);
  return undefined;
}

export async function solicitarCompras(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  await exigirEdicao(id);
  const sessao = await sessaoAtual();
  await prisma.orcamento.update({
    where: { id },
    data: {
      aguardandoCompras: true,
      comprasPedidoEm: new Date(),
      comprasRetornoEm: null,
      comprasItem: String(formData.get("item") ?? "").trim(),
      comprasSolicitadoPor: sessao?.nome ?? "",
    },
  });
  revalidatePath(`/painel/${id}`);
  return undefined;
}

export async function registrarRetornoCompras(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await exigirEdicao(id);
  await prisma.orcamento.update({ where: { id }, data: { aguardandoCompras: false, comprasRetornoEm: new Date() } });
  revalidatePath(`/painel/${id}`);
}

export async function enviarParaDiretoria(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const doc = await prisma.orcamento.findUniqueOrThrow({ where: { id } });
  await exigirEdicao(id);

  const reqCliente = doc.reqCliente as ReqCliente | null;
  const quantidades = reqCliente?.quantidadesLista ?? [];
  if (!quantidades.length) {
    return { erro: "Não há nenhuma quantidade lançada — volte para a Solicitação e adicione ao menos uma." };
  }
  if (doc.aguardandoCompras) return { erro: "Registre o retorno de Compras antes de enviar para a Diretoria." };

  const faixas = lerFaixas(formData, quantidades);
  if (faixas.some((f) => Number.isNaN(f.precoProjetado))) {
    return { erro: 'Preencha o "Preço projetado" de todas as faixas de quantidade.' };
  }
  // Um SOPP por faixa, não um só pro card — cada quantidade é uma ordem de produção separada.
  if (faixas.some((f) => !f.numeroSequencial)) {
    return { erro: "Informe o Nº de SOPP de todas as faixas de quantidade antes de enviar para a Diretoria." };
  }

  const acabamento = String(formData.get("acabamento") ?? "").trim();
  const comissaoEspecial = formData.get("comissaoEspecial") === "on";
  const produtoNovoClassificacao = doc.classificacao === "NOVO" || doc.classificacao === "REPETICAO_NOVO";

  const anterior = await buscarOrcamentoAnterior(doc.clienteChave ?? "", doc.codInterno, doc.id);

  const precificacao = montarPrecificacao({ faixas, comissaoEspecial, acabamentoAtual: acabamento, produtoNovoClassificacao, anterior });
  const todosAuto = precificacao.every((t) => t.statusDiretoria === "auto_aprovado");
  const t0 = precificacao[0];

  await prisma.orcamento.update({
    where: { id },
    data: {
      precificacao,
      numeroSequencial: resumoSopp(precificacao),
      orcamentoAnteriorId: anterior?.id ?? null,
      precoAnterior: anterior?.precoFinal ?? null,
      comissaoEspecial,
      comissaoObs: String(formData.get("comissaoObs") ?? "").trim(),
      acabamento,
      produtoNovo: t0.produtoNovo,
      conflitoClassificacao: doc.classificacao === "REPETICAO_SEM_ALTERACAO" && t0.premissasDivergentes.length > 0,
      etapa: todosAuto ? "ENVIO_OFERTA" : "DIRETORIA",
      statusDiretoria: todosAuto ? "AUTO_APROVADO" : "PENDENTE",
    },
  });
  redirect("/painel");
}

// ---------- Etapa 4 — Diretoria ----------

export async function salvarRascunhoDiretoria(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const idx = parseInt(String(formData.get("idx") ?? "0"), 10);
  const doc = await prisma.orcamento.findUniqueOrThrow({ where: { id } });
  await exigirEdicao(id);
  const precificacao = ((doc.precificacao as PrecificacaoTier[] | null) ?? []).map((t) => ({ ...t }));
  if (!precificacao[idx]) return;
  const precoFinal = parseValorBR(String(formData.get("precoFinal") ?? ""));
  precificacao[idx].rascunhoPrecoFinal = Number.isNaN(precoFinal) ? null : precoFinal;
  precificacao[idx].rascunhoComentario = String(formData.get("comentario") ?? "").trim();
  await prisma.orcamento.update({ where: { id }, data: { precificacao } });
  revalidatePath(`/painel/${id}`);
}

export async function decidirDiretoriaFaixa(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const idx = parseInt(String(formData.get("idx") ?? "0"), 10);
  const aprovado = formData.get("aprovado") === "true";
  const doc = await prisma.orcamento.findUniqueOrThrow({ where: { id } });
  const { nomeAtor } = await exigirEdicao(id);

  const precificacaoAtual = (doc.precificacao as PrecificacaoTier[] | null) ?? [];
  const precoFinalForm = parseValorBR(String(formData.get("precoFinal") ?? ""));
  const resultado = decidirFaixa(precificacaoAtual, idx, {
    aprovado,
    comentario: String(formData.get("comentario") ?? "").trim(),
    precoFinal: Number.isNaN(precoFinalForm) ? null : precoFinalForm,
    decididoPor: nomeAtor,
  });

  const data: Record<string, unknown> = { precificacao: resultado.precificacao };
  if (resultado.proximo.tipo === "volta_orcamento") {
    data.etapa = "ORCAMENTO";
    data.statusDiretoria = "REVISAO";
  } else if (resultado.proximo.tipo === "continua_diretoria") {
    data.etapa = "DIRETORIA";
    data.statusDiretoria = "PENDENTE";
  } else {
    data.etapa = "ENVIO_OFERTA";
    data.statusDiretoria = resultado.proximo.statusDiretoria === "auto_aprovado" ? "AUTO_APROVADO" : "APROVADO";
  }
  await prisma.orcamento.update({ where: { id }, data });
  revalidatePath("/diretoria");
  // Toda mudança de etapa fecha a gaveta e volta pro quadro — avançando pro Envio de Oferta OU
  // voltando pro Orçamento (revisão), sem exceção, pra quem estava operando escolher
  // manualmente o próximo card. Só continua aberta quando a etapa não mudou de verdade (outra
  // faixa deste mesmo card ainda pendente na Diretoria) — aí sim a pessoa está com trabalho
  // pendente neste card específico. Pedido do Thiago em 25/09/2026.
  if (resultado.proximo.tipo !== "continua_diretoria") {
    redirect("/painel");
  }
  revalidatePath(`/painel/${id}`);
}

// Ajusta o preço final de uma faixa JÁ decidida (aprovada automática ou manualmente) — a
// Diretoria pode ter motivo pra mudar o preço mesmo com tudo certo (ex.: negociação com o
// cliente depois do card já ter voltado da Diretoria e retornado). Não reabre a decisão
// (aprovar/solicitar revisão) nem mexe em decididoPor/decididoEm original — só troca o número
// e registra separadamente quem ajustou por último. Pedido do Thiago em 25/09/2026.
export async function ajustarPrecoFinalDiretoria(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const idx = parseInt(String(formData.get("idx") ?? "0"), 10);
  const { nomeAtor } = await exigirEdicao(id);

  const doc = await prisma.orcamento.findUniqueOrThrow({ where: { id } });
  const precificacao = ((doc.precificacao as PrecificacaoTier[] | null) ?? []).map((t) => ({ ...t }));
  const tier = precificacao[idx];
  if (!tier || tier.statusDiretoria === "pendente") return; // essa faixa ainda não foi decidida — usa o formulário normal, não este

  const precoFinal = parseValorBR(String(formData.get("precoFinal") ?? ""));
  if (Number.isNaN(precoFinal)) return;

  precificacao[idx] = { ...tier, precoFinal, precoAjustadoPor: nomeAtor, precoAjustadoEm: Date.now() };
  await prisma.orcamento.update({ where: { id }, data: { precificacao } });
  revalidatePath(`/painel/${id}`);
  revalidatePath("/painel");
}

// Cobre o card que chega na Diretoria já com todas as faixas resolvidas (auto_aprovado ou
// aprovado) sem passar pelo fim normal de decidirDiretoriaFaixa acima — acontece quando alguém
// usa "Voltar etapa" a partir do Envio de Oferta (ou de uma etapa depois) de volta pra
// Diretoria: essa ação só move a etapa pra trás, não mexe na precificação, então o card volta
// com tudo já decidido e nenhuma faixa pendente sobra pra abrir o formulário de decisão — sem
// este botão o card ficava preso, sem nenhum jeito de avançar de novo. Achado em teste real
// pelo Thiago em 25/09/2026.
export async function liberarDiretoriaResolvida(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const doc = await prisma.orcamento.findUniqueOrThrow({ where: { id } });
  await exigirEdicao(id);

  const precificacao = (doc.precificacao as PrecificacaoTier[] | null) ?? [];
  if (!precificacao.length || precificacao.some((t) => t.statusDiretoria === "pendente")) return;

  const todosAuto = precificacao.every((t) => t.statusDiretoria === "auto_aprovado");
  await prisma.orcamento.update({
    where: { id },
    data: { etapa: "ENVIO_OFERTA", statusDiretoria: todosAuto ? "AUTO_APROVADO" : "APROVADO" },
  });
  redirect("/painel");
}

// ---------- Etapa 5 — Envio de Oferta ----------

export async function salvarNumeroOrcamento(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await exigirEdicao(id);
  await prisma.orcamento.update({ where: { id }, data: { numeroOrcamento: String(formData.get("numeroOrcamento") ?? "").trim() } });
  revalidatePath(`/painel/${id}`);
}

export async function marcarFinalizado(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await exigirEdicao(id);
  const numeroOrcamento = String(formData.get("numeroOrcamento") ?? "").trim();
  await prisma.orcamento.update({
    where: { id },
    data: {
      etapa: "FINALIZADO",
      desfecho: "AGUARDANDO",
      finalizadoEm: new Date(),
      ...(numeroOrcamento ? { numeroOrcamento } : {}),
    },
  });
  redirect("/painel");
}

// ---------- Etapa 6 — Finalizado ----------

export async function registrarDesfecho(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await exigirEdicao(id);
  const doc = await prisma.orcamento.findUniqueOrThrow({ where: { id } });
  const sessao = await sessaoAtual();
  const desfecho = String(formData.get("desfecho") ?? "AGUARDANDO") as "AGUARDANDO" | "POSITIVO" | "NEGATIVO" | "SEM_RETORNO";

  // Produto novo que o cliente aprovou e ainda não tem Nº de Cadastro de Produto vai pra etapa
  // 7 esperar o número. Os demais (negativo, sem retorno, ou positivo que já tem o número)
  // ficam em Retorno do Cliente, que com desfecho registrado já sai do Painel pro Histórico.
  // Pedido do Thiago em 25/09/2026.
  const precisaCadastro = desfecho === "POSITIVO" && !doc.codInterno;

  await prisma.orcamento.update({
    where: { id },
    data: {
      desfecho,
      desfechoMotivo: String(formData.get("motivo") ?? "").trim(),
      desfechoPor: sessao?.nome ?? "",
      desfechoEm: new Date(),
      ...(precisaCadastro ? { etapa: "CADASTRO_PRODUTO" as const } : {}),
    },
  });
  revalidatePath("/historico");
  // Desfecho registrado (qualquer um que não seja "aguardando") tira o card da etapa atual:
  // vai pra etapa 7 ou pro Histórico. Nos dois casos a gaveta fecha, como em toda mudança de
  // etapa. "Aguardando" continua aberto: nada mudou de lugar.
  if (desfecho !== "AGUARDANDO") redirect("/painel");
  revalidatePath(`/painel/${id}`);
}

// ---------- Etapa 7 — Cadastro de Produto ----------

// Lança o Nº de Cadastro de Produto (codInterno) do produto novo aprovado pelo cliente e devolve
// o card pra Retorno do Cliente, que com desfecho positivo e número preenchido já vai pro
// Histórico. Permissão pela área da própria etapa (CADASTRO_PRODUTO), igual às outras.
export async function salvarCadastroProduto(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  try {
    await exigirEdicao(id);
  } catch {
    return { erro: "Sem permissão para lançar o Nº de Cadastro de Produto." };
  }

  const codInterno = normalizarCodigoInterno(String(formData.get("codInterno") ?? ""));
  if (!codInterno) return { erro: "Informe o Nº de Cadastro de Produto." };
  if (!codigoInternoValido(codInterno)) return { erro: "Nº de Cadastro de Produto deve ter o formato 0.000.000 (7 dígitos)." };

  await prisma.orcamento.update({ where: { id }, data: { codInterno, etapa: "FINALIZADO" } });
  revalidatePath("/historico");
  redirect("/painel");
}

// ---------- Ações gerais do card ----------

export async function voltarEtapa(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const ordem = ["ABERTO", "ENGENHARIA", "ORCAMENTO", "DIRETORIA", "ENVIO_OFERTA", "FINALIZADO", "CADASTRO_PRODUTO"] as const;
  const doc = await prisma.orcamento.findUniqueOrThrow({ where: { id } });
  await exigirEdicao(id);
  const idx = ordem.indexOf(doc.etapa as (typeof ordem)[number]);
  if (idx <= 0) return;
  await prisma.orcamento.update({
    where: { id },
    data: {
      etapa: ordem[idx - 1],
      // Voltar da etapa 7 pra 6 é desfazer o desfecho positivo que mandou o card pra lá — sem
      // zerar, o card voltaria pra Retorno do Cliente com desfecho já registrado e sumiria do
      // Painel direto pro Histórico, sem o número de cadastro e sem ninguém ver.
      ...(doc.etapa === "CADASTRO_PRODUTO" ? { desfecho: "AGUARDANDO" as const } : {}),
    },
  });
  // Toda mudança de etapa fecha a gaveta e volta pro quadro — pra frente ou pra trás, sem
  // exceção — pra quem estava operando escolher manualmente o próximo card, nunca ficar com
  // algo aberto sozinho. Pedido do Thiago em 25/09/2026.
  redirect("/painel");
}

export async function excluirCard(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const doc = await prisma.orcamento.findUniqueOrThrow({ where: { id } });
  const area: AreaKey = doc.origem === "LEGADO" ? "LEGADO" : "HISTORICO";
  if (!(await podeEditar(area))) throw new Error("Sem permissão para excluir.");
  await prisma.orcamento.delete({ where: { id } });
  redirect("/painel");
}
