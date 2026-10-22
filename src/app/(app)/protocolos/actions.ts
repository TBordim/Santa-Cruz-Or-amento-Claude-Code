"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { podeEditar, sessaoAtual } from "@/lib/permissions";
import { ErroProtocolo, protocolarAlterado, protocolarJaExistente, protocolarNovo } from "@/lib/protocolos/decidir";

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
  const base = { arteId, por: sessao?.nome ?? "Vendas", modeloId: t("modeloId") || null, copia };

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
