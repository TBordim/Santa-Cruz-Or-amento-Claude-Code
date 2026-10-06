import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7 não abre mais conexão implícita a partir de DATABASE_URL — o client exige um
// "driver adapter" explícito. Usamos node-postgres (TCP puro) em vez do adapter WebSocket do
// Neon: o adapter WebSocket só fala o protocolo proprietário do proxy da Neon (não funciona
// contra o Postgres local do `npx prisma dev`, usado em desenvolvimento); node-postgres fala
// Postgres "de verdade" e funciona igual local e contra o Neon (que aceita conexão TCP normal).
function createPrismaClient() {
  // APP_DATABASE_URL (quando definida) tem prioridade: é uma variável nossa, que a integração
  // Neon–Vercel não gerencia nem reescreve. Em 06/10/2026 a integração passou a gravar na
  // DATABASE_URL de Production o banco de demonstração, e essa variável não é editável; com
  // APP_DATABASE_URL apontamos Production pro banco certo sem depender dela. Sem APP_*, tudo
  // segue como sempre (DATABASE_URL).
  const adapter = new PrismaPg({ connectionString: process.env.APP_DATABASE_URL || process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

// Cache no globalThis para não recriar o client (e o pool de conexões) a cada hot-reload do
// Next.js em desenvolvimento — padrão recomendado pela própria Prisma para apps Next.js.
const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createPrismaClient> };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
