"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { podeEditar, sessaoAtual } from "@/lib/permissions";
import { TipoReferencia } from "@/generated/prisma/client";
import { parseLabAlvoOuErro } from "@/lib/cor/lab-alvo";
import { proximoCodigoCor } from "@/lib/cor/codigo";

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

export async function criarCor(_prev: FormState, formData: FormData): Promise<FormState> {
  await exigirAcessoCor();
  const sessao = await sessaoAtual();

  const { lab: labAlvo, erro: erroLab } = parseLabAlvoOuErro(formData);
  if (erroLab) return erroLab;

  const tipoReferenciaRaw = String(formData.get("tipoReferencia") ?? "");
  const tipoReferencia = (Object.values(TipoReferencia) as string[]).includes(tipoReferenciaRaw)
    ? (tipoReferenciaRaw as TipoReferencia)
    : null;

  const dados = {
    cliente: String(formData.get("cliente") ?? "").trim() || null,
    codigoProduto: String(formData.get("codigoProduto") ?? "").trim() || null,
    referenciaDeclarada: String(formData.get("referenciaDeclarada") ?? "").trim() || null,
    tipoReferencia,
    labAlvoL: labAlvo?.l,
    labAlvoA: labAlvo?.a,
    labAlvoB: labAlvo?.b,
    substrato: String(formData.get("substrato") ?? "").trim() || null,
    acabamento: String(formData.get("acabamento") ?? "").trim() || null,
    resistenciaExigida: String(formData.get("resistenciaExigida") ?? "").trim() || null,
    criadaPorId: sessao?.usuarioId,
  };

  // O código é gerado aqui, não digitado. Se duas pessoas criarem uma cor no mesmo instante, as
  // duas calculam o mesmo número e a segunda bate no @unique do banco (P2002) — recalcula e tenta
  // de novo em vez de mostrar erro.
  let corId: string | null = null;
  for (let tentativa = 0; tentativa < 3 && !corId; tentativa++) {
    try {
      const cor = await prisma.cor.create({ data: { codigo: await proximoCodigoCor(), ...dados } });
      corId = cor.id;
    } catch (e) {
      if ((e as { code?: string }).code !== "P2002") throw e;
    }
  }
  if (!corId) return "Não foi possível gerar o código da cor agora. Tente de novo.";

  redirect(`/laboratorio/cor/${corId}`);
}
