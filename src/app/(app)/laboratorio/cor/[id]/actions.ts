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

// Registra uma leitura LAB (referência, uma das 5 faixas do Quick Peek, final ou produção) —
// tudo que hoje se perde (só a faixa vencedora sobrevive) passa a ficar registrado.
export async function registrarLeitura(_prev: FormState, formData: FormData): Promise<FormState> {
  await exigirAcessoCor();
  const sessao = await sessaoAtual();

  const rodadaId = String(formData.get("rodadaId") ?? "");
  const corId = String(formData.get("corId") ?? "");
  const contextoRaw = String(formData.get("contexto") ?? "");
  const contexto = (Object.values(ContextoLeitura) as string[]).includes(contextoRaw)
    ? (contextoRaw as ContextoLeitura)
    : null;
  const l = parseDecimalOrNull(formData, "l");
  const a = parseDecimalOrNull(formData, "a");
  const b = parseDecimalOrNull(formData, "b");

  if (!rodadaId || !contexto || l == null || a == null || b == null) {
    return "Preencha o contexto e os 3 valores de LAB.";
  }

  await prisma.leituraLab.create({
    data: {
      rodadaId,
      contexto,
      vencedora: formData.get("vencedora") === "on",
      l,
      a,
      b,
      densidade: parseDecimalOrNull(formData, "densidade"),
      instrumento: String(formData.get("instrumento") ?? "").trim() || null,
      iluminante: String(formData.get("iluminante") ?? "").trim() || null,
      observador: String(formData.get("observador") ?? "").trim() || null,
      substratoReal: String(formData.get("substratoReal") ?? "").trim() || null,
      lidaPorId: sessao?.usuarioId,
    },
  });

  revalidatePath(`/laboratorio/cor/${corId}`);
  return undefined;
}
