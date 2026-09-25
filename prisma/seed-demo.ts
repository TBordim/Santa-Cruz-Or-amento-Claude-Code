// Seed do AMBIENTE DE DEMONSTRAÇÃO (gravação dos vídeos de treinamento) — só dados fictícios.
//
//   npx dotenv -e .env.demo -- npx tsx prisma/seed-demo.ts
//
// APAGA todos os usuários, perfis, orçamentos e cores do banco apontado por DATABASE_URL e recria
// tudo do zero — é o que permite regravar uma cena sempre a partir do mesmo estado. O catálogo de
// bases (cor_bases) fica: nasce pela migration e é informação pública do fornecedor.
//
// Trava de segurança: só roda se o NOME DO BANCO contiver "demo" (ex.: santacruz_demo). Pra testar
// num Postgres local com outro nome, é preciso confirmar o alvo exato:
//   SEED_DEMO_CONFIRMO="localhost:51224/template1"
// Assim é impossível apagar a produção por engano.
//
// Estado que o roteiro do Laboratório espera (docs/treinamento/laboratorio/gravacao.md):
//   - Ana Laboratório (PIN 1111) com a permissão Laboratório;
//   - cores STA0001–STA0004 e nenhum outro código STA → a cor criada ao vivo sai STA0005.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type OrigemRodada, type StatusCor, type TipoReferencia } from "../src/generated/prisma/client";
import { BCRYPT_ROUNDS } from "../src/lib/validation";
import { deltaE2000, type Lab } from "../src/lib/cor/deltae";

function conferirAlvo(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL não definida.");
  const url = new URL(raw);
  const banco = url.pathname.replace(/^\//, "");
  const alvo = `${url.hostname}:${url.port || "5432"}/${banco}`;
  const confirmado = process.env.SEED_DEMO_CONFIRMO === alvo;
  if (!/demo/i.test(banco) && !confirmado) {
    throw new Error(
      `RECUSADO: o banco "${banco}" em ${url.hostname} não parece ser o de demonstração (o nome precisa conter "demo"). Nada foi apagado.`,
    );
  }
  return alvo;
}

const alvo = conferirAlvo();
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

type RodadaSeed = {
  origem: OrigemRodada;
  composicao: [codigoBase: string, percentual: number][];
  puxada?: Lab;
  aprovada?: boolean;
};

type CorSeed = {
  codigo: string;
  cliente: string;
  referenciaDeclarada: string;
  tipoReferencia: TipoReferencia;
  alvo: Lab;
  substrato: string;
  acabamento: string;
  status: StatusCor;
  rodadas: RodadaSeed[];
};

// Tudo inventado. Fórmulas somam 100,00; puxadas com ΔE plausível (as aprovadas abaixo de 1,00).
const CORES: CorSeed[] = [
  {
    codigo: "STA0001",
    cliente: "Pet Feliz Rações Ltda.",
    referenciaDeclarada: "VERDE P. 348",
    tipoReferencia: "AMOSTRA_CLIENTE",
    alvo: { l: 45, a: -48, b: 22 },
    substrato: "Papel kraft 120 g/m²",
    acabamento: "Sem verniz",
    status: "EM_DESENVOLVIMENTO",
    rodadas: [
      { origem: "FORNECEDOR", composicao: [["IRO71", 60], ["IRO12", 15], ["IRO48", 25]], puxada: { l: 43.8, a: -45.1, b: 25.3 } },
    ],
  },
  {
    codigo: "STA0002",
    cliente: "Café Vale do Sol",
    referenciaDeclarada: "MARROM CAFÉ",
    tipoReferencia: "PADRAO_INTERNO",
    alvo: { l: 32, a: 14, b: 20 },
    substrato: "Cartão duplex 250 g/m²",
    acabamento: "Verniz fosco",
    status: "APROVADO",
    rodadas: [
      { origem: "FORNECEDOR", composicao: [["IRO21", 30], ["IRO33", 20], ["IRO50", 10], ["IRO48", 40]], puxada: { l: 30.4, a: 16.2, b: 22.9 } },
      { origem: "AJUSTE_MANUAL", composicao: [["IRO21", 29], ["IRO33", 18], ["IRO50", 9], ["IRO48", 44]], puxada: { l: 31.7, a: 14.5, b: 20.6 }, aprovada: true },
    ],
  },
  {
    codigo: "STA0003",
    cliente: "Farmacêutica Boa Saúde",
    referenciaDeclarada: "AZUL P. 300",
    tipoReferencia: "AMOSTRA_CLIENTE",
    alvo: { l: 42, a: -8, b: -48 },
    substrato: "Cartão triplex 300 g/m²",
    acabamento: "Verniz UV brilho",
    status: "APROVADO",
    rodadas: [
      { origem: "FORNECEDOR", composicao: [["IRO17", 55], ["IRO53", 5], ["IRO48", 40]], puxada: { l: 42.3, a: -7.6, b: -47.2 }, aprovada: true },
    ],
  },
  {
    codigo: "STA0004",
    cliente: "Cosméticos Lírio do Campo",
    referenciaDeclarada: "ROSA P. 1767",
    tipoReferencia: "PLOTTER_PANTONE_DIGITAL",
    alvo: { l: 72, a: 30, b: 4 },
    substrato: "Cartão duplex 300 g/m²",
    acabamento: "Laminação soft touch",
    status: "EM_DESENVOLVIMENTO",
    rodadas: [],
  },
];

const PERFIS = [
  { chave: "lab", nome: "Laboratório", admin: false, areas: ["COR_LABORATORIO"] },
  { chave: "eng", nome: "Engenharia de cor", admin: false, areas: ["COR_ENGENHARIA"] },
  { chave: "consulta", nome: "Produção (consulta)", admin: false, areas: [] },
  { chave: "admin", nome: "Administrador", admin: true, areas: [] },
] as const;

const USUARIOS = [
  { nome: "Ana Laboratório", pin: "1111", perfil: "lab" },
  { nome: "Bruno Engenharia", pin: "2222", perfil: "eng" },
  { nome: "Carla Produção", pin: "3333", perfil: "consulta" },
  { nome: "Demo Admin", pin: "9999", perfil: "admin" },
] as const;

async function main() {
  console.log(`Alvo: ${alvo}`);

  // 1) Apaga tudo (menos o catálogo de bases). Ordem: filhos antes dos pais.
  await prisma.$transaction([
    prisma.interacaoFornecedor.deleteMany(),
    prisma.leituraLab.deleteMany(),
    prisma.composicao.deleteMany(),
    prisma.rodada.deleteMany(),
    prisma.cor.deleteMany(),
    prisma.anexo.deleteMany(),
    prisma.orcamento.deleteMany(),
    prisma.usuario.deleteMany(),
    prisma.perfil.deleteMany(),
  ]);

  // 2) Perfis e usuários.
  const perfilId: Record<string, string> = {};
  for (const p of PERFIS) {
    const criado = await prisma.perfil.create({ data: { nome: p.nome, admin: p.admin, areas: [...p.areas] } });
    perfilId[p.chave] = criado.id;
  }
  const usuarioId: Record<string, string> = {};
  for (const u of USUARIOS) {
    const criado = await prisma.usuario.create({
      data: { nome: u.nome, pinHash: await bcrypt.hash(u.pin, BCRYPT_ROUNDS), perfilId: perfilId[u.perfil] },
    });
    usuarioId[u.nome] = criado.id;
  }
  const ana = usuarioId["Ana Laboratório"];

  // 3) Cores, rodadas, composições e puxadas.
  const bases = await prisma.base.findMany({ select: { id: true, codigo: true } });
  const baseId = new Map(bases.map((b) => [b.codigo, b.id]));

  for (const c of CORES) {
    const cor = await prisma.cor.create({
      data: {
        codigo: c.codigo,
        cliente: c.cliente,
        referenciaDeclarada: c.referenciaDeclarada,
        tipoReferencia: c.tipoReferencia,
        labAlvoL: c.alvo.l,
        labAlvoA: c.alvo.a,
        labAlvoB: c.alvo.b,
        substrato: c.substrato,
        acabamento: c.acabamento,
        status: c.status,
        criadaPorId: ana,
      },
    });

    const resumo: string[] = [];
    for (const [i, r] of c.rodadas.entries()) {
      const soma = r.composicao.reduce((s, [, p]) => s + p, 0);
      if (Math.abs(soma - 100) > 0.005) throw new Error(`${c.codigo} R${i + 1}: soma ${soma}, não 100.`);
      await prisma.rodada.create({
        data: {
          corId: cor.id,
          numero: i + 1,
          origem: r.origem,
          aprovada: !!r.aprovada,
          registradaPorId: ana,
          composicoes: {
            create: r.composicao.map(([codigo, percentual]) => {
              const id = baseId.get(codigo);
              if (!id) throw new Error(`Base ${codigo} não existe — a migration das bases rodou?`);
              return { baseId: id, percentual };
            }),
          },
          leituras: r.puxada
            ? { create: { contexto: "PUXADA", ...r.puxada, deltaE2000: deltaE2000(c.alvo, r.puxada), lidaPorId: ana } }
            : undefined,
        },
      });
      if (r.puxada) resumo.push(`R${i + 1} ΔE ${deltaE2000(c.alvo, r.puxada).toFixed(2)}${r.aprovada ? " (aprovada)" : ""}`);
    }
    console.log(`  ${c.codigo} ${c.cliente} — ${c.status}${resumo.length ? " — " + resumo.join(", ") : ""}`);
  }

  console.log(`Pronto: ${USUARIOS.length} usuários, ${CORES.length} cores. Próxima cor criada no app: STA0005.`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
