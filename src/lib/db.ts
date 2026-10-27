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
  const connectionString = process.env.APP_DATABASE_URL || process.env.DATABASE_URL;
  // O Postgres local do `npx prisma dev` derruba conexões quando recebe várias ao mesmo tempo
  // ("Server has closed the connection" em telas com consultas em paralelo, achado nas telas do
  // Aceite em 08/10/2026: 5 de 12 consultas falhavam com o pool padrão, 0 com uma conexão só).
  // Só no banco local: o pool fica com uma conexão e as consultas fazem fila. Neon segue igual.
  const local = bancoLocal(connectionString);
  const adapter = new PrismaPg({ connectionString, ...(local ? { max: 1 } : {}) });
  const base = new PrismaClient({ adapter });
  // Toda mudança de etapa de um orçamento fica registrada no próprio card (hora, de onde veio, quem
  // mexeu), num ponto só: assim nenhuma ação nova deixa de registrar. Pedido do Thiago em 28/10/2026,
  // para medir quanto tempo cada card leva de uma etapa para a outra. Ver registrarEntradaNaEtapa.
  return base.$extends({
    query: {
      orcamento: {
        async create({ args, query }) {
          const etapa = typeof args.data.etapa === "string" ? args.data.etapa : null;
          if (etapa && args.data.origem !== "LEGADO") {
            const rt = (args.data.reqTecnicos ?? {}) as Record<string, unknown>;
            args.data.reqTecnicos = (await registrarEntradaNaEtapa(rt, null, etapa)) as never;
          }
          return query(args);
        },
        async update({ args, query }) {
          const nova = typeof args.data.etapa === "string" ? args.data.etapa : (args.data.etapa as { set?: string } | undefined)?.set;
          if (!nova) return query(args);
          const atual = await base.orcamento.findUnique({ where: args.where, select: { etapa: true, reqTecnicos: true } });
          if (!atual || atual.etapa === nova) return query(args);
          // Se a própria ação já está gravando reqTecnicos, parte dele; senão, do que está no banco.
          const doForm = args.data.reqTecnicos;
          const parte = doForm && typeof doForm === "object" && !("set" in (doForm as object)) ? doForm : atual.reqTecnicos;
          args.data.reqTecnicos = (await registrarEntradaNaEtapa((parte ?? {}) as Record<string, unknown>, atual.etapa, nova)) as never;
          return query(args);
        },
      },
    },
  });
}

// Acrescenta ao histórico de etapas do card (reqTecnicos.historicoEtapas) a entrada nesta etapa. Quem
// mexeu vem da sessão; fora de uma requisição (scripts), fica "Sistema".
async function registrarEntradaNaEtapa(reqTecnicos: Record<string, unknown>, de: string | null, etapa: string) {
  let por = "Sistema";
  try {
    const { sessaoAtual } = await import("@/lib/permissions");
    por = (await sessaoAtual())?.nome ?? "Sistema";
  } catch {
    // sem requisição (script de teste): fica "Sistema"
  }
  const lista = Array.isArray(reqTecnicos.historicoEtapas) ? (reqTecnicos.historicoEtapas as unknown[]) : [];
  return { ...reqTecnicos, historicoEtapas: [...lista, { etapa, ...(de ? { de } : {}), em: Date.now(), por }] };
}

function bancoLocal(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

// Cache no globalThis para não recriar o client (e o pool de conexões) a cada hot-reload do
// Next.js em desenvolvimento — padrão recomendado pela própria Prisma para apps Next.js.
const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createPrismaClient> };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
