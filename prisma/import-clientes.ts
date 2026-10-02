// Importa o cadastro de clientes de prisma/dados/clientes.json (gerado da planilha
// Clientes_Ativos, já limpo: CNPJ só dígitos e validado, CEP/telefone/e-mail padronizados).
// Idempotente: cria o que falta e atualiza só clientes de origem IMPORTADO — cliente que um
// representante cadastrou (origem REPRESENTANTE) nunca é sobrescrito pela planilha.
// Rodar: npx tsx prisma/import-clientes.ts
import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { textoBusca } from "../src/lib/clientes/busca";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type Linha = {
  cnpj: string;
  razaoSocial: string;
  endereco: string | null;
  complemento: string | null;
  bairro: string | null;
  cep: string | null;
  uf: string | null;
  municipio: string | null;
  telefone: string | null;
  email: string | null;
  contato: string | null;
  prazosPagamento: number[];
  entrega: Record<string, string | null> | null;
};

async function main() {
  const linhas = JSON.parse(readFileSync(new URL("./dados/clientes.json", import.meta.url), "utf-8")) as Linha[];
  let criados = 0;
  let atualizados = 0;
  let ignorados = 0;

  for (const l of linhas) {
    const { entrega, ...resto } = l;
    const dados = { ...resto, busca: textoBusca(l.razaoSocial), entrega: entrega ?? undefined };
    const existente = await prisma.cliente.findUnique({ where: { cnpj: l.cnpj }, select: { origem: true } });
    if (!existente) {
      await prisma.cliente.create({ data: { ...dados, origem: "IMPORTADO" } });
      criados++;
    } else if (existente.origem === "IMPORTADO") {
      await prisma.cliente.update({ where: { cnpj: l.cnpj }, data: dados });
      atualizados++;
    } else {
      ignorados++;
    }
  }
  console.log(`Clientes: ${criados} criados, ${atualizados} atualizados, ${ignorados} ignorados (cadastrados por representante).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
