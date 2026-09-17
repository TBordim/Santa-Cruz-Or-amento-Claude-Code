import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Usa só a metade edge-safe da config (sem Prisma/bcrypt) — o middleware roda no runtime Edge
// e só precisa decodificar o cookie de sessão assinado, nunca consultar o banco.
// (Export via desestruturação não é reconhecido pelo analisador estático do Next — precisa ser
// um export default de verdade.)
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // Todas as rotas, exceto assets estáticos, imagens, o manifest do PWA e a própria rota de
  // API do Auth.js. Sem essas exceções, o navegador recebia um redirect pro /login em vez do
  // manifest.webmanifest/ícones, e a instalação do PWA falhava silenciosamente.
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|manifest.webmanifest|icon-192.png|icon-512.png|icon-maskable-512.png|apple-touch-icon.png|logo-santa-cruz.png).*)",
  ],
};
