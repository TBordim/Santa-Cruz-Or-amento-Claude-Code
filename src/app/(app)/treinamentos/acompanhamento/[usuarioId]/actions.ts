"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { ehAdmin } from "@/lib/permissions";

// Zera as tentativas de UMA pessoa em UM treinamento: ela volta a "Pendente" e pode refazer o quiz. Só administrador
// (conferido aqui, não só escondido na tela). Apaga o histórico daquelas tentativas, por isso a tela pede confirmação.
export async function apagarTentativas(usuarioId: string, treinamentoId: string): Promise<{ erro: string } | { ok: true; apagadas: number }> {
  if (!(await ehAdmin())) return { erro: "Só administrador pode apagar tentativas." };
  if (!usuarioId || !treinamentoId) return { erro: "Pessoa ou treinamento não encontrados." };

  const { count } = await prisma.tentativaTreinamento.deleteMany({ where: { usuarioId, treinamentoId } });
  revalidatePath("/treinamentos", "layout");
  return { ok: true, apagadas: count };
}
