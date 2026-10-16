import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

const comPMs = {
  pedidosMaterial: { orderBy: { numero: "asc" }, include: { eventos: { orderBy: { criadoEm: "desc" } } } },
} satisfies Prisma.AceiteInclude;

type PMBanco = Prisma.PedidoMaterialGetPayload<{ include: { eventos: true } }>;

// Decimal do Prisma não atravessa pra componente de cliente: vira número aqui.
export function pmParaTela(p: PMBanco) {
  return {
    ...p,
    quantidade: p.quantidade === null ? null : Number(p.quantidade),
    minimoFornecedor: p.minimoFornecedor === null ? null : Number(p.minimoFornecedor),
    sobraPrevista: p.sobraPrevista === null ? null : Number(p.sobraPrevista),
    pesoKg: p.pesoKg === null ? null : Number(p.pesoKg),
    quantidadeRecebida: p.quantidadeRecebida === null ? null : Number(p.quantidadeRecebida),
    sobraRecebida: p.sobraRecebida === null ? null : Number(p.sobraRecebida),
  };
}

export type PMTela = ReturnType<typeof pmParaTela>;

export async function carregarAceite(id: string) {
  const a = await prisma.aceite.findUnique({
    where: { id },
    include: { orcamento: { include: { anexos: { where: { tipo: "ORDEM_COMPRA" }, orderBy: { enviadoEm: "asc" } } } }, negociacoes: { orderBy: { abertaEm: "desc" } }, entregas: { orderBy: { criadoEm: "asc" } }, lotes: { orderBy: { numero: "asc" } }, ...comPMs },
  });
  if (!a) return null;
  const { orcamento, pedidosMaterial, ...resto } = a;
  return {
    ...resto,
    pedidosMaterial: pedidosMaterial.map(pmParaTela),
    orcamento: {
      ...orcamento,
      precoAnterior: orcamento.precoAnterior === null ? null : Number(orcamento.precoAnterior),
      precoAtual: orcamento.precoAtual === null ? null : Number(orcamento.precoAtual),
      custoPrimarioPct: orcamento.custoPrimarioPct === null ? null : Number(orcamento.custoPrimarioPct),
      margemP2Pct: orcamento.margemP2Pct === null ? null : Number(orcamento.margemP2Pct),
      quantidade: orcamento.quantidade === null ? null : Number(orcamento.quantidade),
    },
  };
}

export type AceiteTela = NonNullable<Awaited<ReturnType<typeof carregarAceite>>>;

const resumoLista = {
  entregas: { select: { quantidade: true } },
  orcamento: { select: { cliente: true, produtoDescricao: true, numeroOrcamento: true, modelos: true, codInterno: true, desfechoEm: true, classificacao: true, reqCliente: true } },
  pedidosMaterial: { select: { status: true, prazoPrevisto: true, alertaEm: true, alertaVistoEm: true, suporteRef: true } },
  // Negociação de data em andamento (no máximo uma), pra "Está com" e as pendências.
  negociacoes: { where: { status: { not: "ENCERRADA" } }, select: { id: true, status: true, dataPedida: true, abertaEm: true } },
} satisfies Prisma.AceiteInclude;

export type AceiteLinha = Prisma.AceiteGetPayload<{ include: typeof resumoLista }>;

// Linhas das listas de cada setor. As filas de cada tela ficam nas páginas, como `where`.
export async function listarAceites(where: Prisma.AceiteWhereInput, orderBy: Prisma.AceiteOrderByWithRelationInput = { atualizadoEm: "asc" }, take?: number) {
  return prisma.aceite.findMany({ where, orderBy, take, include: resumoLista });
}

// Aceites com PM que teve mudança do fornecedor depois da data de chegada definida e ninguém viu ainda.
// O banco não compara duas colunas da mesma linha pelo Prisma, então o filtro fino é aqui.
export async function listarAceitesComAlerta(where: Prisma.AceiteWhereInput = {}) {
  const candidatos = await listarAceites({ ...where, pedidosMaterial: { some: { alertaEm: { not: null }, status: { not: "CANCELADO" } } } });
  return candidatos.filter((a) =>
    a.pedidosMaterial.some((p) => p.status !== "CANCELADO" && p.alertaEm && (!p.alertaVistoEm || p.alertaVistoEm < p.alertaEm)),
  );
}
