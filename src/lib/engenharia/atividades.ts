import "server-only";
import { prisma } from "@/lib/db";
import { formatarCodigoInterno } from "@/lib/orcamentos/codigo-interno";

// Registro do que a Engenharia fez em cada módulo, mais recente primeiro (pedido do Thiago em
// 08/10/2026). Cada origem só entra pra quem trabalha nela, como nas pendências. Pra uma origem
// nova: uma consulta aqui que devolva Atividade.

export type Atividade = {
  id: string;
  quando: Date;
  modulo: "Aceite de Pedido" | "Orçamento";
  atividade: string;
  cliente: string;
  produto: string;
  por: string;
  href: string;
};

export async function listarAtividadesEngenharia(origens: { aceite: boolean; orcamento: boolean }, limite = 60): Promise<Atividade[]> {
  const [aceites, orcamentos] = await Promise.all([
    origens.aceite
      ? prisma.aceite.findMany({
          where: { engenhariaEm: { not: null } },
          orderBy: { engenhariaEm: "desc" },
          take: limite,
          select: {
            id: true,
            numero: true,
            engenhariaEm: true,
            engenhariaPor: true,
            cadastroSituacao: true,
            facaNova: true,
            clicheNovo: true,
            codigoFaca: true,
            orcamento: { select: { cliente: true, produtoDescricao: true, codInterno: true } },
          },
        })
      : Promise.resolve([]),
    origens.orcamento
      ? prisma.orcamento.findMany({
          where: { origem: "NOVO", vistoEngenhariaEm: { not: null } },
          orderBy: { vistoEngenhariaEm: "desc" },
          take: limite,
          select: { id: true, cliente: true, produtoDescricao: true, preCadastro: true, vistoEngenhariaEm: true, vistoEngenhariaPor: true },
        })
      : Promise.resolve([]),
  ]);

  const lista: Atividade[] = [
    ...aceites.map((a) => ({
      id: `ace-${a.id}`,
      quando: a.engenhariaEm as Date,
      modulo: "Aceite de Pedido" as const,
      atividade: [
        `Aceite ${a.numero ?? "sem nº"} conferido`,
        a.cadastroSituacao === "CRIADO" ? `produto novo cadastrado${a.orcamento.codInterno ? ` (${formatarCodigoInterno(a.orcamento.codInterno)})` : ""}` : null,
        a.facaNova ? `faca nova${a.codigoFaca ? ` ${a.codigoFaca}` : ""}` : null,
        a.clicheNovo ? "clichê novo" : null,
      ]
        .filter(Boolean)
        .join(" · "),
      cliente: a.orcamento.cliente ?? "",
      produto: a.orcamento.produtoDescricao ?? "",
      por: a.engenhariaPor ?? "",
      href: `/engenharia/aceite/${a.id}`,
    })),
    ...orcamentos.map((o) => ({
      id: `orc-${o.id}`,
      quando: o.vistoEngenhariaEm as Date,
      modulo: "Orçamento" as const,
      atividade: `Requisitos técnicos liberados para o Orçamento${o.preCadastro ? ` · pré cadastro ${o.preCadastro}` : ""}`,
      cliente: o.cliente ?? "",
      produto: o.produtoDescricao ?? "",
      por: o.vistoEngenhariaPor ?? "",
      href: `/painel/${o.id}`,
    })),
  ];
  return lista.sort((x, y) => y.quando.getTime() - x.quando.getTime()).slice(0, limite);
}
