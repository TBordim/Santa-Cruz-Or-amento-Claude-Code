// Importa o histórico de fórmulas da planilha (FORMULAS_SANTA_CRUZ_IRO_2026.csv) pro módulo Cor.
//
//   npx tsx prisma/import-planilha-cores.ts "<caminho do csv>"
//
// Idempotente: cor cuja código já existe no banco é pulada, nunca sobrescrita — dá pra rodar de
// novo (ex.: depois de a planilha ganhar mais linhas) sem duplicar nem apagar nada.
//
// O CSV NÃO fica no repositório de propósito (tem nome de cliente e fórmula de produção); o
// caminho é sempre passado na hora. Decisões de mapeamento, todas declaradas no relatório final:
//  - cada linha-cabeçalho (com "CÓD SAP") vira uma Cor; as linhas seguintes são as tintas dela;
//  - só a fórmula final sobrevive na planilha, então vira UMA rodada (origem IMPORTADO);
//  - o LAB da planilha é o da fórmula final (confirmado pelo usuário), não o alvo → entra como
//    leitura FINAL e o LAB alvo fica em branco (nunca foi registrado);
//  - blocos sem nenhuma tinta (cancelados/vazios) são ignorados.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type StatusCor } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Split de CSV que respeita aspas (a planilha hoje não usa, mas não custa).
function splitCsv(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q;
    } else if (c === "," && !q) {
      out.push(cur); cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

const limpa = (s: string | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
const num = (s: string | undefined) => {
  const t = limpa(s).replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

// "IRO 48" (com espaço, erro de digitação da planilha) → "IRO48"; metálicas mantêm o nome.
function codigoBase(raw: string): string {
  const t = limpa(raw).toUpperCase();
  return /^IRO\s*\d+$/.test(t) ? t.replace(/\s+/g, "") : t;
}

type Bloco = {
  sap: string; produto: string; cliente: string; desc: string; aprov: string;
  lab: [number, number, number] | null;
  tintas: { base: string; pct: number }[];
};

function statusDe(b: Bloco): StatusCor {
  const a = b.aprov.toUpperCase();
  if (a.startsWith("APROVADO")) return "APROVADO";
  if (a.startsWith("ALTERNATIVA")) return "ALTERNATIVA";
  if (a.startsWith("AGUARDANDO")) return "AGUARDANDO_APROVACAO_CLIENTE";
  // Fórmulas de estoque (sem cliente, código numérico) não têm coluna de status: são receitas de
  // produção em uso — entram como APROVADO. Suposição registrada no relatório.
  if (!b.cliente && /^\d+$/.test(b.sap)) return "APROVADO";
  return "EM_DESENVOLVIMENTO";
}

async function main() {
  const caminho = process.argv[2];
  if (!caminho) throw new Error('Passe o caminho do CSV: npx tsx prisma/import-planilha-cores.ts "<arquivo>"');

  const linhas = readFileSync(caminho, "utf8").replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim() !== "").slice(2);

  const blocos: Bloco[] = [];
  let atual: Bloco | null = null;
  for (const l of linhas) {
    const c = splitCsv(l);
    const [, , sap, produto, cliente, desc, base, qtde, aprov, L, A, B] = c;
    if (limpa(sap)) {
      const lab = [num(L), num(A), num(B)];
      atual = {
        sap: limpa(sap), produto: limpa(produto), cliente: limpa(cliente), desc: limpa(desc), aprov: limpa(aprov),
        lab: lab.every((v) => v != null) ? (lab as [number, number, number]) : null,
        tintas: [],
      };
      blocos.push(atual);
    }
    if (atual && limpa(base)) {
      const pct = num(qtde);
      if (pct != null) atual.tintas.push({ base: codigoBase(base), pct });
    }
  }

  // Catálogo de bases (já semeado pela migration); qualquer base fora dele (ex.: o MAGENTA CMYK
  // experimental do STA0175) é criada aqui marcada como CMYK, sem misturar com as IRO.
  const bases = new Map((await prisma.base.findMany()).map((b) => [b.codigo, b.id]));
  const relatorio = { criadas: 0, jaExistiam: 0, vazias: [] as string[], mescladas: [] as string[], somaFora: [] as string[], baseNova: [] as string[], estoque: 0 };
  const vistos = new Map<string, { id: string; tintas: string }>();

  for (const b of blocos) {
    if (b.tintas.length === 0) { relatorio.vazias.push(b.sap); continue; }

    const assinatura = b.tintas.map((t) => `${t.base}:${t.pct}`).sort().join("|");
    const anterior = vistos.get(b.sap);
    if (anterior) {
      // Mesmo código reaproveitado (ex.: STA0090 pra dois clientes; ou linha repetida idêntica).
      if (anterior.tintas === assinatura && !b.cliente) continue;
      const cor = await prisma.cor.findUnique({ where: { codigo: b.sap } });
      if (cor) {
        const junta = (velho: string | null, novo: string) => (!novo || (velho ?? "").includes(novo) ? velho : velho ? `${velho} / ${novo}` : novo);
        await prisma.cor.update({ where: { id: cor.id }, data: { cliente: junta(cor.cliente, b.cliente), codigoProduto: junta(cor.codigoProduto, b.produto) } });
        relatorio.mescladas.push(`${b.sap}: + cliente "${b.cliente}" produto "${b.produto}"${b.lab ? ` (LAB próprio ${b.lab.join(" / ")} não guardado — só 1 LAB por cor)` : ""}`);
      }
      continue;
    }

    if (await prisma.cor.findUnique({ where: { codigo: b.sap } })) { relatorio.jaExistiam++; continue; }

    for (const t of b.tintas) {
      if (!bases.has(t.base)) {
        const nova = await prisma.base.create({ data: { codigo: t.base, nome: `${t.base[0]}${t.base.slice(1).toLowerCase()} (CMYK)`, sistema: "CMYK" } });
        bases.set(t.base, nova.id);
        relatorio.baseNova.push(t.base);
      }
    }

    const soma = b.tintas.reduce((s, t) => s + t.pct, 0);
    if (Math.abs(soma - 100) > 0.5) relatorio.somaFora.push(`${b.sap} = ${soma.toFixed(2)}%`);
    if (!b.cliente && /^\d+$/.test(b.sap)) relatorio.estoque++;

    const status = statusDe(b);
    const cor = await prisma.cor.create({
      data: {
        codigo: b.sap,
        cliente: b.cliente || null,
        codigoProduto: b.produto || null,
        referenciaDeclarada: b.desc || null,
        status,
        rodadas: {
          create: {
            numero: 1,
            origem: "IMPORTADO",
            aprovada: status === "APROVADO",
            composicoes: { create: b.tintas.map((t) => ({ baseId: bases.get(t.base)!, percentual: t.pct })) },
            ...(b.lab ? { leituras: { create: { contexto: "FINAL", vencedora: true, l: b.lab[0], a: b.lab[1], b: b.lab[2] } } } : {}),
          },
        },
      },
    });
    vistos.set(b.sap, { id: cor.id, tintas: assinatura });
    relatorio.criadas++;
  }

  console.log(`Blocos lidos: ${blocos.length}`);
  console.log(`Cores criadas: ${relatorio.criadas} (${relatorio.estoque} de estoque, importadas como APROVADO)`);
  console.log(`Já existiam (puladas): ${relatorio.jaExistiam}`);
  console.log(`Blocos vazios ignorados (${relatorio.vazias.length}): ${relatorio.vazias.join(", ") || "-"}`);
  console.log(`Códigos repetidos mesclados (${relatorio.mescladas.length}):`);
  relatorio.mescladas.forEach((m) => console.log(`  - ${m}`));
  console.log(`Soma de % fora de 100 (${relatorio.somaFora.length}): ${relatorio.somaFora.join("; ") || "-"}`);
  console.log(`Bases novas criadas: ${relatorio.baseNova.join(", ") || "-"}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
