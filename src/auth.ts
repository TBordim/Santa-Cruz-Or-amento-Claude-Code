import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/db";
import type { AreaKey } from "@/lib/areas";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        usuarioId: {},
        pin: {},
      },
      async authorize(credentials) {
        const usuarioId = typeof credentials?.usuarioId === "string" ? credentials.usuarioId : "";
        const pin = typeof credentials?.pin === "string" ? credentials.pin.trim() : "";
        if (!usuarioId || !pin) return null;

        const usuario = await prisma.usuario.findUnique({
          where: { id: usuarioId },
          include: { perfil: true },
        });
        // Mesma mensagem para "não encontrado"/"inativo"/"PIN errado": não vale a pena revelar
        // qual das três falhou para quem está tentando entrar.
        if (!usuario || !usuario.ativo) return null;

        const pinValido = await bcrypt.compare(pin, usuario.pinHash);
        if (!pinValido) return null;

        return {
          id: usuario.id,
          name: usuario.nome,
          admin: usuario.perfil.admin,
          areas: usuario.perfil.areas as AreaKey[],
          perfilId: usuario.perfilId,
          perfilNome: usuario.perfil.nome,
        };
      },
    }),
  ],
});
