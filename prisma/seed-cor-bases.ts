// Semeia o catálogo conhecido de bases IRO (Sun Chemical) + as duas metálicas vistas no
// histórico real (OURO RICO, PRATA 877). Dados de resistência vêm do material institucional
// do fornecedor ("Bases IRO com solidez" / "Códigos – Bases IRO"). Idempotente (upsert por
// código) — pode rodar de novo sem duplicar.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type Resistencia = "+" | "-" | null;

const BASES_IRO: [codigo: string, nome: string, luz: number | null, alcali: Resistencia, solvente: Resistencia, alcool: Resistencia][] = [
  ["IRO12", "Base Yellow", 7, "+", null, "+"],
  ["IRO17", "Cyan / Blue", 8, "+", "+", "+"],
  ["IRO18", "Mid Shade Yellow", 5, "+", "+", "+"],
  ["IRO21", "Orange", 5, "+", "+", "+"],
  ["IRO32", "Red 032", 6, "+", "-", "+"],
  ["IRO33", "Warm Red", 5, "+", "-", "-"],
  ["IRO35", "Blue Shade Magenta (Rubine)", 5, "-", "+", "+"],
  ["IRO45", "Opaque White", null, null, null, null],
  ["IRO48", "Transparent White", null, null, null, null],
  ["IRO50", "Untoned Black", 8, "+", "+", "+"],
  ["IRO53", "Resistant Violet", 7, "+", "+", "+"],
  ["IRO54", "Resistant Pink", 7, "+", "+", "+"],
  ["IRO71", "Green", 8, "+", "-", "+"],
];

const METALICAS = ["OURO RICO", "PRATA 877"];

async function main() {
  for (const [codigo, nome, luz, alcali, solvente, alcool] of BASES_IRO) {
    await prisma.base.upsert({
      where: { codigo },
      update: {},
      create: {
        codigo,
        nome,
        sistema: "IRO",
        resistenciaLuz: luz,
        resistenciaAlcali: alcali,
        resistenciaSolvente: solvente,
        resistenciaAlcool: alcool,
      },
    });
  }
  for (const codigo of METALICAS) {
    await prisma.base.upsert({
      where: { codigo },
      update: {},
      create: { codigo, nome: codigo, sistema: "METALICO" },
    });
  }
  console.log(`Seed ok: ${BASES_IRO.length + METALICAS.length} bases (${BASES_IRO.length} IRO + ${METALICAS.length} metálicas).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
