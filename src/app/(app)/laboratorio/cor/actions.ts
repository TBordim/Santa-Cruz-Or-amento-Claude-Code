"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { podeEditar, sessaoAtual } from "@/lib/permissions";
import { TipoReferencia } from "@/generated/prisma/client";

// Mesmo espírito do exigirAdmin() de administracao/actions.ts: a página já barra quem não tem
// acesso, mas a action confirma de novo por conta própria. Laboratório e Engenharia podem
// registrar; Produção não tem chave de edição (só consulta, que já é livre pra todo logado).
async function exigirAcessoCor() {
  const podeLab = await podeEditar("COR_LABORATORIO");
  const podeEng = await podeEditar("COR_ENGENHARIA");
  if (!podeLab && !podeEng) {
    throw new Error("Sem permissão para registrar no módulo Cor.");
  }
}

export type FormState = string | undefined;

function parseDecimal(formData: FormData, name: string): number | null {
  const raw = String(formData.get(name) ?? "").trim().replace(",", ".");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function criarCor(_prev: FormState, formData: FormData): Promise<FormState> {
  await exigirAcessoCor();
  const sessao = await sessaoAtual();

  const codigo = String(formData.get("codigo") ?? "").trim();
  if (!codigo) return "Dê um código pra essa cor.";

  const existente = await prisma.cor.findUnique({ where: { codigo } });
  if (existente) return "Já existe uma cor com esse código.";

  const tipoReferenciaRaw = String(formData.get("tipoReferencia") ?? "");
  const tipoReferencia = (Object.values(TipoReferencia) as string[]).includes(tipoReferenciaRaw)
    ? (tipoReferenciaRaw as TipoReferencia)
    : null;

  const cor = await prisma.cor.create({
    data: {
      codigo,
      cliente: String(formData.get("cliente") ?? "").trim() || null,
      codigoProduto: String(formData.get("codigoProduto") ?? "").trim() || null,
      referenciaDeclarada: String(formData.get("referenciaDeclarada") ?? "").trim() || null,
      tipoReferencia,
      labAlvoL: parseDecimal(formData, "labAlvoL"),
      labAlvoA: parseDecimal(formData, "labAlvoA"),
      labAlvoB: parseDecimal(formData, "labAlvoB"),
      substrato: String(formData.get("substrato") ?? "").trim() || null,
      acabamento: String(formData.get("acabamento") ?? "").trim() || null,
      resistenciaExigida: String(formData.get("resistenciaExigida") ?? "").trim() || null,
      criadaPorId: sessao?.usuarioId,
    },
  });

  redirect(`/laboratorio/cor/${cor.id}`);
}
