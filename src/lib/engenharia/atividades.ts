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
  // Tudo que dá para pesquisar nesta atividade (já sem acento e em minúsculas); só a busca usa.
  busca: string;
};

// Tira acento e põe em minúsculas, para a busca achar "Pré-cadastro" digitando "pre cadastro".
export function normalizarBusca(t: string): string {
  return t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Texto pesquisável: junta os campos e, para códigos, a forma pontuada (0.666.013) e a só com dígitos.
function palheiro(partes: (string | null | undefined)[], codigos: (string | null | undefined)[] = []): string {
  const cod = codigos.filter(Boolean).flatMap((c) => [c as string, formatarCodigoInterno(c as string), String(c).replace(/\D/g, "")]);
  return normalizarBusca([...partes, ...cod].filter(Boolean).join(" | "));
}

// Todas as palavras digitadas têm que aparecer (em qualquer campo); "pré cadastro 12" acha o 12 de qualquer lugar.
export function bateComBusca(busca: string, q: string): boolean {
  const palavras = normalizarBusca(q).split(" ").filter(Boolean);
  return palavras.every((p) => busca.includes(p));
}

// `q`: busca por código (de cadastro, do cliente, da faca), cliente, produto, pré-cadastro, Nº do Aceite,
// do orçamento, da OF ou do pedido, quem fez e qualquer palavra da atividade. Com busca, a lista deixa de
// ser só as mais recentes e olha todo o registro (até 2.000 por origem).
export async function listarAtividadesEngenharia(origens: { aceite: boolean; orcamento: boolean }, opcoes: { q?: string; limite?: number } = {}): Promise<Atividade[]> {
  const q = (opcoes.q ?? "").trim();
  const limite = q ? 2000 : (opcoes.limite ?? 60);
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
            codigosCliche: true,
            codigoFaca: true,
            numeroOF: true,
            numeroPedido: true,
            pedidoInterno: true,
            lotes: { select: { numeroOF: true } },
            orcamento: { select: { cliente: true, produtoDescricao: true, codInterno: true, codigoCliente: true, numeroOrcamento: true, numeroSequencial: true, preCadastro: true, modelos: true } },
          },
        })
      : Promise.resolve([]),
    origens.orcamento
      ? prisma.orcamento.findMany({
          where: { origem: "NOVO", vistoEngenhariaEm: { not: null } },
          orderBy: { vistoEngenhariaEm: "desc" },
          take: limite,
          select: {
            id: true,
            cliente: true,
            produtoDescricao: true,
            preCadastro: true,
            codInterno: true,
            codigoCliente: true,
            numeroOrcamento: true,
            numeroSequencial: true,
            modelos: true,
            vistoEngenhariaEm: true,
            vistoEngenhariaPor: true,
          },
        })
      : Promise.resolve([]),
  ]);

  // Os modelos do orçamento (descrição e código de cada um) entram na busca como texto.
  const textoModelos = (m: unknown) => (Array.isArray(m) ? (m as { descricao?: string; codInterno?: string; codigoCliente?: string }[]).map((x) => `${x.descricao ?? ""} ${x.codigoCliente ?? ""}`).join(" ") : "");
  const codigosModelos = (m: unknown) => (Array.isArray(m) ? (m as { codInterno?: string }[]).map((x) => x.codInterno) : []);

  const lista: Atividade[] = [
    ...aceites.map((a) => {
      const atividade = [
        `Aceite ${a.numero ?? "sem nº"} conferido`,
        a.cadastroSituacao === "CRIADO" ? `produto novo cadastrado${a.orcamento.codInterno ? ` (${formatarCodigoInterno(a.orcamento.codInterno)})` : ""}` : null,
        a.facaNova ? `faca nova${a.codigoFaca ? ` ${a.codigoFaca}` : ""}` : null,
        a.clicheNovo ? `clichê novo${a.codigosCliche.length ? ` ${a.codigosCliche.join(", ")}` : ""}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      return {
        id: `ace-${a.id}`,
        quando: a.engenhariaEm as Date,
        modulo: "Aceite de Pedido" as const,
        atividade,
        cliente: a.orcamento.cliente ?? "",
        produto: a.orcamento.produtoDescricao ?? "",
        por: a.engenhariaPor ?? "",
        href: `/engenharia/aceite/${a.id}`,
        busca: palheiro(
          [
            "aceite de pedido",
            atividade,
            a.numero,
            a.numeroOF,
            ...a.lotes.map((l) => l.numeroOF),
            a.numeroPedido,
            a.pedidoInterno,
            a.codigoFaca,
            a.engenhariaPor,
            a.orcamento.cliente,
            a.orcamento.produtoDescricao,
            a.orcamento.codigoCliente,
            a.orcamento.numeroOrcamento,
            a.orcamento.numeroSequencial ? `SO ${a.orcamento.numeroSequencial}` : null,
            a.orcamento.preCadastro ? `pre cadastro ${a.orcamento.preCadastro}` : null,
            textoModelos(a.orcamento.modelos),
          ],
          [a.orcamento.codInterno, ...codigosModelos(a.orcamento.modelos)],
        ),
      };
    }),
    ...orcamentos.map((o) => {
      const atividade = `Requisitos técnicos liberados para o Orçamento${o.preCadastro ? ` · pré cadastro ${o.preCadastro}` : ""}`;
      return {
        id: `orc-${o.id}`,
        quando: o.vistoEngenhariaEm as Date,
        modulo: "Orçamento" as const,
        atividade,
        cliente: o.cliente ?? "",
        produto: o.produtoDescricao ?? "",
        por: o.vistoEngenhariaPor ?? "",
        href: `/painel/${o.id}`,
        busca: palheiro(
          [
            "orcamento",
            atividade,
            o.preCadastro,
            o.numeroOrcamento,
            o.numeroSequencial ? `SO ${o.numeroSequencial}` : null,
            o.codigoCliente,
            o.vistoEngenhariaPor,
            o.cliente,
            o.produtoDescricao,
            textoModelos(o.modelos),
          ],
          [o.codInterno, ...codigosModelos(o.modelos)],
        ),
      };
    }),
  ];
  const filtrada = q ? lista.filter((x) => bateComBusca(x.busca, q)) : lista;
  return filtrada.sort((x, y) => y.quando.getTime() - x.quando.getTime()).slice(0, q ? 300 : limite);
}
