import type { NextAuthConfig } from "next-auth";

// Metade "edge-safe" da configuração do Auth.js: nada aqui importa Prisma/bcrypt, então pode
// rodar no middleware (runtime Edge) só para checar se existe sessão válida, sem tocar no banco.
// A parte que verifica o PIN (Credentials provider) mora em src/auth.ts, que só é carregado em
// rotas/handlers que já rodam em Node.js.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    // Janela curta de propósito: o token JWT em si não é revalidado contra o banco a cada
    // requisição (só sessaoAtual()/podeEditar() em src/lib/permissions.ts fazem isso). Expirar
    // em 8h limita por quanto tempo um usuário desativado ainda consegue navegar com o cookie
    // antigo antes de precisar logar de novo.
    maxAge: 8 * 60 * 60,
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const logado = !!auth?.user;
      const naLogin = nextUrl.pathname === "/login";
      if (naLogin) {
        // já logado tentando ver /login de novo: manda para a home
        return logado ? Response.redirect(new URL("/", nextUrl)) : true;
      }
      return logado;
    },
    jwt({ token, user }) {
      if (user) {
        token.admin = user.admin;
        token.areas = user.areas;
        token.perfilId = user.perfilId;
        token.perfilNome = user.perfilNome;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.admin = !!token.admin;
        session.user.areas = token.areas ?? [];
        session.user.perfilId = token.perfilId ?? "";
        session.user.perfilNome = token.perfilNome ?? "";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
