"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { podeEditar, sessaoAtual } from "@/lib/permissions";
import { lerDataProtocolo } from "@/lib/protocolos/comum";
import { ErroProtocolo, dispensarArte, protocolarAlterado, protocolarJaExistente, protocolarNovo, reabrirArte } from "@/lib/protocolos/decidir";

export type FormState = { erro?: string; ok?: string } | undefined;

// Vendas decide uma arte pendente: NOVO (cria o protocolo, Rev 00), ALTERADO (próxima revisão de um
// protocolo que já existia) ou JÁ PROTOCOLADO (a arte nova é descartada e o modelo aponta pro
// existente). Só quem tem a área Protocolos (Vendas), ou o administrador.
export async function decidirArte(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!(await podeEditar("PROTOCOLOS_VENDAS"))) return { erro: "Sem permissão para protocolar artes." };
  const sessao = await sessaoAtual();
  const t = (n: string) => String(fd.get(n) ?? "").trim();
  const arteId = t("arteId");
  const modo = t("modo");
  const copiaBruta = fd.get("copia");
  const copia = copiaBruta instanceof File && copiaBruta.size > 0 ? copiaBruta : null;
  const base = { arteId, por: sessao?.nome ?? "Vendas", modeloId: t("modeloId") || null, copia, data: lerDataProtocolo(t("dataProtocolo")) };

  try {
    // Protocolo escolhido na lista de sugestões ou digitado pelo número.
    let protocoloId = t("protocoloId");
    if (modo !== "novo" && !protocoloId && t("numeroExistente")) {
      const p = await prisma.protocolo.findUnique({ where: { numero: t("numeroExistente") }, select: { id: true } });
      if (!p) return { erro: `Não existe o protocolo ${t("numeroExistente")}.` };
      protocoloId = p.id;
    }
    if (modo === "novo") {
      await protocolarNovo({ ...base, numero: t("numero"), descricao: t("descricao"), codInterno: t("codInterno") });
    } else if (modo === "alterado") {
      if (!protocoloId) return { erro: "Escolha o protocolo de que esta arte é uma versão alterada." };
      await protocolarAlterado({ ...base, protocoloId, mudou: t("mudou") });
      // Mesmo número, data nova (a data garante a rastreabilidade).
    } else if (modo === "existente") {
      if (!protocoloId) return { erro: "Escolha o protocolo a que esta arte já pertence." };
      await protocolarJaExistente({ ...base, protocoloId });
    } else {
      return { erro: "Escolha: nova, alterada ou já protocolada." };
    }
  } catch (e) {
    if (e instanceof ErroProtocolo) return { erro: e.message };
    throw e;
  }
  revalidatePath("/protocolos");
  revalidatePath("/painel");
  return { ok: "Arte protocolada." };
}

// Quem libera o Aceite (Vendas) precisa poder dizer que o arquivo não é arte, ou corrigir uma falha de quem anexou:
// vale a área Protocolos ou a de Aceite de Vendas.
async function podeDecidirArte() {
  return (await podeEditar("PROTOCOLOS_VENDAS")) || (await podeEditar("ACEITE_VENDAS"));
}

export async function dispensarArteAction(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!(await podeDecidirArte())) return { erro: "Sem permissão (Vendas)." };
  const sessao = await sessaoAtual();
  try {
    await dispensarArte({ arteId: String(fd.get("arteId") ?? ""), por: sessao?.nome ?? "Vendas", motivo: String(fd.get("motivo") ?? "") });
  } catch (e) {
    if (e instanceof ErroProtocolo) return { erro: e.message };
    throw e;
  }
  revalidatePath("/protocolos");
  revalidatePath("/aceite");
  revalidatePath("/painel");
  return { ok: "Pendência dispensada." };
}

export async function reabrirArteAction(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!(await podeDecidirArte())) return { erro: "Sem permissão (Vendas)." };
  try {
    await reabrirArte(String(fd.get("arteId") ?? ""));
  } catch (e) {
    if (e instanceof ErroProtocolo) return { erro: e.message };
    throw e;
  }
  revalidatePath("/protocolos");
  revalidatePath("/aceite");
  revalidatePath("/painel");
  return { ok: "Voltou para a fila de protocolo." };
}
