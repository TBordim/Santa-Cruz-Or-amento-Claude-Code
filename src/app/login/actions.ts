"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { prisma } from "@/lib/db";
import { PIN_REGEX, BCRYPT_ROUNDS } from "@/lib/validation";

export type FormState = string | undefined;

// Equivalente a fazerLogin() (linhas 1848-1859 do HTML original), mas verificando o PIN contra
// o hash bcrypt no servidor em vez de comparar texto puro no navegador.
export async function autenticar(_prevState: FormState, formData: FormData): Promise<FormState> {
  const usuarioId = formData.get("usuarioId");
  const pin = formData.get("pin");
  if (typeof usuarioId !== "string" || !usuarioId) return "Escolha seu nome.";
  if (typeof pin !== "string" || !pin.trim()) return "Digite o PIN.";

  try {
    await signIn("credentials", { usuarioId, pin, redirectTo: "/painel" });
  } catch (error) {
    if (error instanceof AuthError) {
      // Mesma mensagem para usuário inexistente, inativo ou PIN errado — de propósito, não
      // revela qual dos três motivos foi (o app antigo distinguia "Usuário não encontrado" de
      // "PIN incorreto"; aqui isso é tratado como um detalhe de segurança a não expor).
      return "Nome ou PIN incorretos.";
    }
    throw error;
  }
}

// Equivalente a criarPrimeiroAdmin() (linhas 1871-1893). Só funciona enquanto não existir
// nenhum usuário no banco — resolve o "ovo e galinha" do primeiro acesso sem precisar de um
// script de seed rodado manualmente.
export async function criarPrimeiroAdmin(_prevState: FormState, formData: FormData): Promise<FormState> {
  const nome = String(formData.get("nome") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();

  if (!nome) return "Digite seu nome.";
  if (!PIN_REGEX.test(pin)) return "O PIN precisa ter de 4 a 6 números.";

  const totalUsuarios = await prisma.usuario.count();
  if (totalUsuarios > 0) {
    return "Já existe pelo menos um usuário cadastrado — atualize a página e entre pelo login normal.";
  }

  const pinHash = await bcrypt.hash(pin, BCRYPT_ROUNDS);
  const perfil = await prisma.perfil.create({
    data: { nome: "Administrador", admin: true, areas: [] },
  });
  const usuario = await prisma.usuario.create({
    data: { nome, pinHash, perfilId: perfil.id, ativo: true },
  });

  try {
    await signIn("credentials", { usuarioId: usuario.id, pin, redirectTo: "/administracao" });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Administrador criado — entre com o nome e o PIN que você acabou de definir.";
    }
    throw error;
  }
}
