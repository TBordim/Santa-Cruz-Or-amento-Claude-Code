"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { ehAdmin, sessaoAtual } from "@/lib/permissions";
import { PIN_REGEX, BCRYPT_ROUNDS } from "@/lib/validation";
import { isAreaKey } from "@/lib/areas";

// Reforço server-side: a própria página já barra quem não é admin (redirect em page.tsx), mas
// uma server action pode ser chamada diretamente, então cada uma confirma de novo por conta
// própria — mesmo espírito do podeEditar()/reforço citado nas linhas 727-733 do HTML original.
async function exigirAdmin() {
  if (!(await ehAdmin())) {
    throw new Error("Sem permissão para gerenciar Administração.");
  }
}

export type FormState = string | undefined;

// Equivalente a criarPerfil()/salvarPerfil() (linhas 1894-1905) — um único formulário/ação para
// criar (id vazio) e editar (id preenchido), como no form-perfil original.
export async function salvarPerfil(_prev: FormState, formData: FormData): Promise<FormState> {
  await exigirAdmin();

  const id = String(formData.get("id") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();
  const admin = formData.get("admin") === "on";
  const areas = formData.getAll("areas").map(String).filter(isAreaKey);

  if (!nome) return "Dê um nome ao perfil.";

  if (id) {
    await prisma.perfil.update({ where: { id }, data: { nome, admin, areas } });
  } else {
    await prisma.perfil.create({ data: { nome, admin, areas } });
  }
  redirect("/administracao?aba=perfis");
}

// Equivalente a excluirPerfil() (linhas 1906-1914): recusa se algum usuário ainda usa o perfil.
export async function excluirPerfil(formData: FormData) {
  await exigirAdmin();
  const id = String(formData.get("id") ?? "");

  const emUso = await prisma.usuario.count({ where: { perfilId: id } });
  if (emUso > 0) {
    const msg = "Este perfil está em uso por pelo menos um usuário — troque o perfil dele(s) antes de excluir.";
    redirect(`/administracao?aba=perfis&excluirPerfil=${id}&erroPerfil=${encodeURIComponent(msg)}`);
  }

  await prisma.perfil.delete({ where: { id } });
  redirect("/administracao?aba=perfis");
}

// Equivalente a criarUsuario()/salvarUsuario() (linhas 1915-1928). PIN em branco na edição
// mantém o hash atual — mesma regra do form-usuario original ("deixe em branco para manter").
export async function salvarUsuario(_prev: FormState, formData: FormData): Promise<FormState> {
  await exigirAdmin();

  const id = String(formData.get("id") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();
  const perfilId = String(formData.get("perfilId") ?? "").trim();
  const ativo = formData.get("ativo") === "on";

  if (!nome || !perfilId) return "Preencha o nome e escolha um perfil.";
  if (pin && !PIN_REGEX.test(pin)) return "O PIN precisa ter de 4 a 6 números.";

  if (id) {
    const data: { nome: string; perfilId: string; ativo: boolean; pinHash?: string } = { nome, perfilId, ativo };
    if (pin) data.pinHash = await bcrypt.hash(pin, BCRYPT_ROUNDS);
    await prisma.usuario.update({ where: { id }, data });
  } else {
    if (!PIN_REGEX.test(pin)) return "O PIN precisa ter de 4 a 6 números.";
    const pinHash = await bcrypt.hash(pin, BCRYPT_ROUNDS);
    await prisma.usuario.create({ data: { nome, pinHash, perfilId, ativo: true } });
  }
  redirect("/administracao?aba=usuarios");
}

// Equivalente a excluirUsuario() (linhas 1929-1936): se a pessoa excluir a própria conta, ela é
// deslogada em seguida (fazerLogout() no original).
export async function excluirUsuario(formData: FormData) {
  await exigirAdmin();
  const id = String(formData.get("id") ?? "");
  const sessao = await sessaoAtual();

  await prisma.usuario.delete({ where: { id } });

  if (sessao?.usuarioId === id) {
    await signOut({ redirectTo: "/login" });
    return;
  }
  redirect("/administracao?aba=usuarios");
}
