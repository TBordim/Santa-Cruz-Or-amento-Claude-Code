"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { ehAdmin, sessaoAtual } from "@/lib/permissions";

async function exigirAdmin() {
  if (!(await ehAdmin())) {
    throw new Error("Sem permissão para gerenciar o catálogo de bases.");
  }
}

// Excluir uma base é destrutivo pra toda fórmula que já usou ela, então pede o PIN do próprio
// admin logado de novo (bcrypt.compare contra o pinHash dele) — mais forte que só checar o papel
// admin=true, que qualquer sessão aberta já carrega. Recusa também se alguma composição ainda usa
// a base (em vez de deixar o banco recusar com um erro de chave estrangeira ilegível).
export async function excluirBase(formData: FormData): Promise<{ erro?: string } | undefined> {
  await exigirAdmin();

  const id = String(formData.get("id") ?? "");
  const senha = String(formData.get("senha") ?? "").trim();
  if (!id) return { erro: "Base não encontrada." };
  if (!senha) return { erro: "Digite seu PIN de administrador pra confirmar." };

  const sessao = await sessaoAtual();
  const usuario = sessao ? await prisma.usuario.findUnique({ where: { id: sessao.usuarioId } }) : null;
  if (!usuario) return { erro: "Sessão expirada — entre novamente." };

  const senhaOk = await bcrypt.compare(senha, usuario.pinHash);
  if (!senhaOk) return { erro: "PIN incorreto." };

  const emUso = await prisma.composicao.count({ where: { baseId: id } });
  if (emUso > 0) {
    return { erro: `Essa tinta está em uso em ${emUso} ${emUso === 1 ? "fórmula" : "fórmulas"} — não pode ser excluída.` };
  }

  await prisma.base.delete({ where: { id } });
  revalidatePath("/laboratorio/bases");
  revalidatePath("/laboratorio/cor");
  return undefined;
}
