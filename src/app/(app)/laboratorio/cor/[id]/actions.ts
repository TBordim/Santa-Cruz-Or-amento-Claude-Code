"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { podeEditar, sessaoAtual } from "@/lib/permissions";
import { OrigemRodada, ContextoLeitura } from "@/generated/prisma/client";

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

  const baseIds = formData.getAll("baseId").map(String);
  const percentuais = formData.getAll("percentual").map((v) => Number(String(v).replace(",", ".")));

  const linhas = baseIds
    .map((baseId, i) => ({ baseId, percentual: percentuais[i] }))
    .filter((l) => l.baseId && Number.isFinite(l.percentual) && l.percentual > 0);

  if (linhas.length === 0) return "Adicione pelo menos uma tinta com percentual.";

  const total = linhas.reduce((s, l) => s + l.percentual, 0);
  if (Math.abs(total - 100) > 1) {
    return `A soma dos percentuais está em ${total.toFixed(2)}% — ajuste pra fechar perto de 100%.`;
  }

  await prisma.rodada.create({
    data: {
      corId,
      numero,
      origem,
      registradaPorId: sessao?.usuarioId,
      composicoes: { create: linhas.map((l) => ({ baseId: l.baseId, percentual: l.percentual })) },
    },
  });

  revalidatePath(`/laboratorio/cor/${corId}`);
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
