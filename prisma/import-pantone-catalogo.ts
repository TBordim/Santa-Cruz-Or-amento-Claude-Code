// Importa o catálogo Pantone (Formula Guide físico, transcrito pela Santa Cruz via vídeo com o
// Cowork) pra tabela cor_pantone_catalogo — a base de dados da Sugestão 1 (ver src/lib/cor/pantone.ts).
//
//   npx tsx prisma/import-pantone-catalogo.ts "<caminho do json>"
//
// O JSON de entrada é gerado a partir de formulas_pantone.json + pantone_lab.csv (ambos fora do
// repositório — dado transcrito de material licenciado Pantone), no formato:
//   [{ codigo: "194C", lab: [35, 52, 16] | null, composicao: { WarmRed: 55.6, ... }, parcial: bool, soma: number }, ...]
//
// Idempotente: upsert por código — roda de novo sempre que o catálogo for atualizado (ex.: quando
// as pendências de conferência forem resolvidas no livro físico), sem duplicar.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type Linha = {
  codigo: string;
  lab: [number, number, number] | null;
  composicao: Record<string, number>;
  parcial: boolean;
  soma: number;
};

async function main() {
  const caminho = process.argv[2];
  if (!caminho) {
    console.error('Uso: npx tsx prisma/import-pantone-catalogo.ts "<caminho do json>"');
    process.exit(1);
  }

  const linhas: Linha[] = JSON.parse(readFileSync(caminho, "utf-8"));
  console.log(`Lidas ${linhas.length} linhas de ${caminho}.`);

  for (const l of linhas) {
    const dados = {
      labL: l.lab ? l.lab[0] : null,
      labA: l.lab ? l.lab[1] : null,
      labB: l.lab ? l.lab[2] : null,
      composicao: l.composicao,
      somaPercentual: l.soma,
      parcial: l.parcial,
    };
    await prisma.pantoneCor.upsert({
      where: { codigo: l.codigo },
      create: { codigo: l.codigo, ...dados },
      update: dados,
    });
  }

  const total = await prisma.pantoneCor.count();
  const comLab = await prisma.pantoneCor.count({ where: { labL: { not: null } } });
  const parciais = await prisma.pantoneCor.count({ where: { parcial: true } });
  console.log(`Catálogo Pantone: ${total} códigos no banco (${comLab} com LAB, ${parciais} parciais).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
