import "server-only";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { sessaoAtual, podeEditar } from "@/lib/permissions";
import type { AreaKey } from "@/lib/areas";
import { papelGarantido } from "./suportes";
import { lotesDoAceite, loteGarantido } from "./lotes";

// Peças de servidor que o Aceite, o módulo Compras e o módulo PCP usam juntos.

export type FormState = { erro?: string; ok?: string } | undefined;

// Toda ação confere a permissão no servidor (a tela só esconde o botão). Devolve o nome de quem
// fez, gravado junto de cada visto, como no resto do app.
export async function exigirArea(...areas: AreaKey[]): Promise<string> {
  const sessao = await sessaoAtual();
  if (!sessao) throw new Error("Sessão expirada. Entre de novo.");
  for (const a of areas) if (await podeEditar(a)) return sessao.nome;
  throw new Error("Sem permissão para esta ação.");
}

export async function nomeSePode(...areas: AreaKey[]): Promise<string | null> {
  try {
    return await exigirArea(...areas);
  } catch {
    return null;
  }
}

// Aceite, Engenharia, Compras e PCP leem os mesmos Aceites e PMs: qualquer mudança atualiza todos.
export function revalidarAceite() {
  revalidatePath("/aceite", "layout");
  revalidatePath("/compras", "layout");
  revalidatePath("/pcp", "layout");
  revalidatePath("/engenharia", "layout");
  revalidatePath("/atendimento", "layout");
}

// Engenharia e material correm em paralelo; quando os dois ficam prontos o Aceite vai sozinho
// para o PCP (TP de Vendas 3.2.1.11, com a espera pelo papel pedida pelo Thiago em 08/10/2026).
// Chamado pelo Aceite (Vendas e Engenharia) e por Compras (data de chegada lançada).
export async function avancarSePronto(aceiteId: string): Promise<boolean> {
  const a = await prisma.aceite.findUnique({ where: { id: aceiteId }, include: { pedidosMaterial: true, lotes: true } });
  if (!a) return false;
  if (a.lotes.length) return avancarLotes(a);
  if (a.etapa !== "ENGENHARIA_MATERIAL") return false;
  if (!a.engenhariaEm || !papelGarantido(a)) return false;
  await prisma.aceite.update({ where: { id: aceiteId }, data: { etapa: "PCP" } });
  return true;
}

// Aceite dividido (16/10/2026): a Engenharia confirma uma vez e o Aceite passa a "em lotes"; cada lote
// vai ao PCP quando o papel DELE está garantido (PM do lote com prazo, ou reservado em estoque).
async function avancarLotes(a: Prisma.AceiteGetPayload<{ include: { pedidosMaterial: true; lotes: true } }>): Promise<boolean> {
  if ((a.etapa !== "ENGENHARIA_MATERIAL" && a.etapa !== "EM_LOTES") || !a.engenhariaEm) return false;
  let mudou = false;
  if (a.etapa === "ENGENHARIA_MATERIAL") {
    await prisma.aceite.update({ where: { id: a.id }, data: { etapa: "EM_LOTES" } });
    mudou = true;
  }
  for (const l of lotesDoAceite(a)) {
    if (l.id && l.etapa === "ENGENHARIA_MATERIAL" && loteGarantido(l, a.pedidosMaterial)) {
      await prisma.loteAceite.update({ where: { id: l.id }, data: { etapa: "PCP" } });
      mudou = true;
    }
  }
  return mudou;
}
