import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Usa só a metade edge-safe da config (sem Prisma/bcrypt) — o middleware roda no runtime Edge
// e só precisa decodificar o cookie de sessão assinado, nunca consultar o banco.
// (Export via desestruturação não é reconhecido pelo analisador estático do Next — precisa ser
// um export default de verdade.)
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // Todas as rotas, exceto assets estáticos, imagens e a própria rota de API do Auth.js.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
