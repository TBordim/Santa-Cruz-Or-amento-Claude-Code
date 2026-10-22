"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { podeEditar, sessaoAtual } from "@/lib/permissions";
import { OrigemRodada, ContextoLeitura, TipoReferencia } from "@/generated/prisma/client";
import { parseLabAlvoOuErro, validarLab } from "@/lib/cor/lab-alvo";
import { num } from "@/lib/cor/formato";
import { somaFecha100 } from "@/lib/cor/composicao";

async function exigirAcessoCor() {
  const podeLab = await podeEditar("COR_LABORATORIO");
  const podeEng = await podeEditar("COR_ENGENHARIA");
  if (!podeLab && !podeEng) {
    throw new Error("Sem permissão para registrar no módulo Cor.");
  }
}

export type FormState = string | undefined;

function parseDecimalOrNull(formData: FormData, name: string): number | null {
  const raw = String(formData.get(name) ?? "").trim().replace(",", ".");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

// Lê e valida as linhas de composição (base + %) vindas de um NovaRodadaForm/EditarRodadaForm —
// compartilhado pelas duas actions pra não duplicar a regra de validação entre criar e corrigir.
async function lerComposicao(formData: FormData): Promise<{ linhas: { baseId: string; percentual: number }[] } | { erro: string }> {
  const baseIds = formData.getAll("baseId").map(String);
  const percentuais = formData.getAll("percentual").map((v) => Number(String(v).replace(",", ".")));

  const linhas = baseIds
    .map((baseId, i) => ({ baseId, percentual: percentuais[i] }))
    .filter((l) => l.baseId && Number.isFinite(l.percentual) && l.percentual > 0);

  if (linhas.length === 0) return { erro: "Adicione pelo menos uma tinta com percentual." };

  // A mesma tinta em duas linhas é erro de digitação (a fórmula real teria uma linha só com a soma).
  const repetida = linhas.find((l, i) => linhas.findIndex((o) => o.baseId === l.baseId) !== i);
  if (repetida) {
    const base = await prisma.base.findUnique({ where: { id: repetida.baseId }, select: { codigo: true } });
    return { erro: `A tinta ${base?.codigo ?? ""} aparece em mais de uma linha — junte numa linha só.` };
  }

  // Sem tolerância: a soma precisa fechar em 100,00% exatos (ver somaFecha100).
  const total = linhas.reduce((s, l) => s + l.percentual, 0);
  if (!somaFecha100(total)) {
    return { erro: `A soma dos percentuais precisa fechar em 100,00% — está em ${num(total, 2)}%.` };
  }
  return { linhas };
}

// Registra uma rodada completa (fórmula inicial do fornecedor, ou um ajuste nosso) com sua
// composição — Fase 1: só captura, nenhum cálculo de sugestão aqui (isso é Fase 3).
export async function criarRodada(_prev: FormState, formData: FormData): Promise<FormState> {
  await exigirAcessoCor();
  const sessao = await sessaoAtual();

  const corId = String(formData.get("corId") ?? "");
  const numero = Number(formData.get("numero") ?? 0);
  const origemRaw = String(formData.get("origem") ?? "");
  const origem = (Object.values(OrigemRodada) as string[]).includes(origemRaw) ? (origemRaw as OrigemRodada) : null;

  if (!corId || !numero || !origem) return "Escolha a origem da rodada.";

  const composicao = await lerComposicao(formData);
  if ("erro" in composicao) return composicao.erro;

  await prisma.rodada.create({
    data: {
      corId,
      numero,
      origem,
      registradaPorId: sessao?.usuarioId,
      composicoes: { create: composicao.linhas.map((l) => ({ baseId: l.baseId, percentual: l.percentual })) },
    },
  });

  revalidatePath(`/laboratorio/cor/${corId}`);
  return undefined;
}

// Corrige a origem e/ou a composição de uma rodada já salva — antes disso, um erro de digitação
// (base errada, % trocado) só dava pra corrigir criando uma rodada nova, poluindo o histórico.
export async function editarRodada(_prev: FormState, formData: FormData): Promise<FormState> {
  await exigirAcessoCor();

  const rodadaId = String(formData.get("rodadaId") ?? "");
  const corId = String(formData.get("corId") ?? "");
  const origemRaw = String(formData.get("origem") ?? "");
  const origem = (Object.values(OrigemRodada) as string[]).includes(origemRaw) ? (origemRaw as OrigemRodada) : null;

  if (!rodadaId || !origem) return "Escolha a origem da rodada.";

  const composicao = await lerComposicao(formData);
  if ("erro" in composicao) return composicao.erro;

  await prisma.$transaction([
    prisma.composicao.deleteMany({ where: { rodadaId } }),
    prisma.rodada.update({
      where: { id: rodadaId },
      data: {
        origem,
        composicoes: { create: composicao.linhas.map((l) => ({ baseId: l.baseId, percentual: l.percentual })) },
      },
    }),
  ]);

  revalidatePath(`/laboratorio/cor/${corId}`);
  revalidatePath("/laboratorio/cor");
  return undefined;
}

// Exclui uma rodada (e junto, em cascata, suas composições e leituras). Se era a aprovada, a cor
// volta pra "Em desenvolvimento" — sem isso ficaria marcada Aprovado sem nenhuma rodada aprovada.
export async function excluirRodada(formData: FormData): Promise<{ erro?: string } | undefined> {
  await exigirAcessoCor();

  const rodadaId = String(formData.get("rodadaId") ?? "");
  const rodada = await prisma.rodada.findUnique({ where: { id: rodadaId } });
  if (!rodada) return { erro: "Rodada não encontrada." };

  if (rodada.aprovada) {
    await prisma.$transaction([
      prisma.rodada.delete({ where: { id: rodadaId } }),
      prisma.cor.update({ where: { id: rodada.corId }, data: { status: "EM_DESENVOLVIMENTO" } }),
    ]);
  } else {
    await prisma.rodada.delete({ where: { id: rodadaId } });
  }

  revalidatePath(`/laboratorio/cor/${rodada.corId}`);
  revalidatePath("/laboratorio/cor");
  return undefined;
}

// Corrige os dados cadastrais da cor (cliente, LAB alvo, substrato...) depois de criada — antes só
// dava pra registrar uma vez, sem volta, mesmo pra corrigir um erro de digitação. O código fica de
// fora de propósito: é gerado pelo sistema na criação e não muda depois.
export async function editarCor(_prev: FormState, formData: FormData): Promise<FormState> {
  await exigirAcessoCor();

  const id = String(formData.get("id") ?? "");
  if (!id) return "Cor não encontrada.";

  const { lab: labAlvo, erro: erroLab } = parseLabAlvoOuErro(formData);
  if (erroLab) return erroLab;

  const tipoReferenciaRaw = String(formData.get("tipoReferencia") ?? "");
  const tipoReferencia = (Object.values(TipoReferencia) as string[]).includes(tipoReferenciaRaw)
    ? (tipoReferenciaRaw as TipoReferencia)
    : null;

  await prisma.cor.update({
    where: { id },
    data: {
      cliente: String(formData.get("cliente") ?? "").trim() || null,
      codigoProduto: String(formData.get("codigoProduto") ?? "").trim() || null,
      referenciaDeclarada: String(formData.get("referenciaDeclarada") ?? "").trim() || null,
      tipoReferencia,
      // null (não undefined): apagar os 3 campos na edição precisa apagar o alvo no banco —
      // undefined faria o Prisma deixar o valor antigo intocado.
      labAlvoL: labAlvo?.l ?? null,
      labAlvoA: labAlvo?.a ?? null,
      labAlvoB: labAlvo?.b ?? null,
      substrato: String(formData.get("substrato") ?? "").trim() || null,
      acabamento: String(formData.get("acabamento") ?? "").trim() || null,
      resistenciaExigida: String(formData.get("resistenciaExigida") ?? "").trim() || null,
    },
  });

  revalidatePath(`/laboratorio/cor/${id}`);
  revalidatePath("/laboratorio/cor");
  return undefined;
}

// Registra o resultado da "puxada" (Quick Peek) da rodada: só o MELHOR LAB achado — o mais próximo
// do alvo. O laboratório não lê todas as faixas (moroso) nem tem densidade, então é 1 leitura por
// rodada; registrar de novo corrige a anterior em vez de acumular.
export async function registrarPuxada(_prev: FormState, formData: FormData): Promise<FormState> {
  await exigirAcessoCor();
  const sessao = await sessaoAtual();

  const rodadaId = String(formData.get("rodadaId") ?? "");
  const corId = String(formData.get("corId") ?? "");
  const l = parseDecimalOrNull(formData, "l");
  const a = parseDecimalOrNull(formData, "a");
  const b = parseDecimalOrNull(formData, "b");

  if (!rodadaId || l == null || a == null || b == null) return "Preencha os 3 valores de LAB.";
  const erroLab = validarLab(l, a, b);
  if (erroLab) return erroLab;

  const existente = await prisma.leituraLab.findFirst({ where: { rodadaId, contexto: ContextoLeitura.PUXADA } });
  const dados = { l, a, b, lidaPorId: sessao?.usuarioId, lidaEm: new Date() };
  if (existente) {
    await prisma.leituraLab.update({ where: { id: existente.id }, data: dados });
  } else {
    await prisma.leituraLab.create({ data: { rodadaId, contexto: ContextoLeitura.PUXADA, ...dados } });
  }

  revalidatePath(`/laboratorio/cor/${corId}`);
  return undefined;
}

// Aprova a rodada: é o fim do ciclo (puxada → ajuste → puxada… até o menor LAB). Só uma rodada por
// cor fica aprovada; a cor passa a APROVADO. Exige ao menos uma leitura pra não aprovar às cegas.
export async function aprovarRodada(formData: FormData): Promise<void> {
  await exigirAcessoCor();

  const rodadaId = String(formData.get("rodadaId") ?? "");
  const rodada = await prisma.rodada.findUnique({ where: { id: rodadaId }, include: { leituras: { select: { id: true } } } });
  if (!rodada) throw new Error("Rodada não encontrada.");
  if (rodada.leituras.length === 0) throw new Error("Registre a puxada desta rodada antes de aprovar.");

  await prisma.$transaction([
    prisma.rodada.updateMany({ where: { corId: rodada.corId }, data: { aprovada: false } }),
    prisma.rodada.update({ where: { id: rodada.id }, data: { aprovada: true } }),
    prisma.cor.update({ where: { id: rodada.corId }, data: { status: "APROVADO" } }),
  ]);

  revalidatePath(`/laboratorio/cor/${rodada.corId}`);
  revalidatePath("/laboratorio/cor");
}
