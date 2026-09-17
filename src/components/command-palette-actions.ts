"use server";

import { prisma } from "@/lib/db";
import { sessaoAtual } from "@/lib/permissions";
import { etapaInfo } from "@/lib/orcamentos/constantes";

export type ResultadoBusca = { id: string; cliente: string; produtoDescricao: string; etapaLabel: string };

// Busca rápida da paleta de comandos (Cmd+K) — só orçamentos do fluxo ativo (não Legado, não
// Finalizado), por cliente ou produto, limitada a 8 resultados.
export async function buscarOrcamentosPalette(query: string): Promise<ResultadoBusca[]> {
  const sessao = await sessaoAtual();
  if (!sessao) return [];
  const q = query.trim();
  if (q.length < 2) return [];

  const docs = await prisma.orcamento.findMany({
    where: {
      origem: "NOVO",
      NOT: { etapa: "FINALIZADO" },
      OR: [
        { clienteChave: { contains: q.toUpperCase() } },
        { produtoDescricao: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: { atualizadoEm: "desc" },
    take: 8,
    select: { id: true, cliente: true, produtoDescricao: true, etapa: true },
  });

  return docs.map((d) => ({
    id: d.id,
    cliente: d.cliente ?? "—",
    produtoDescricao: d.produtoDescricao ?? "—",
    etapaLabel: etapaInfo(d.etapa ?? "")?.label ?? d.etapa ?? "",
  }));
}
