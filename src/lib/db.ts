import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7 não abre mais conexão implícita a partir de DATABASE_URL — o client exige um
// "driver adapter" explícito. Usamos node-postgres (TCP puro) em vez do adapter WebSocket do
// Neon: o adapter WebSocket só fala o protocolo proprietário do proxy da Neon (não funciona
// contra o Postgres local do `npx prisma dev`, usado em desenvolvimento); node-postgres fala
// Postgres "de verdade" e funciona igual local e contra o Neon (que aceita conexão TCP normal).
function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

// Cache no globalThis para não recriar o client (e o pool de conexões) a cada hot-reload do
// Next.js em desenvolvimento — padrão recomendado pela própria Prisma para apps Next.js.
const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createPrismaClient> };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
