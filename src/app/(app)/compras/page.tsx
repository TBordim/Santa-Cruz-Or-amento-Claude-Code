import Link from "next/link";
import { prisma } from "@/lib/db";
import { podeEditar } from "@/lib/permissions";
import { pmParaTela } from "@/lib/aceite/dados";
import { FILAS_PM } from "@/lib/aceite/filas";
import { hojeBrasil } from "@/lib/aceite/agenda";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Kpis, type Kpi } from "@/components/painel-setor/Kpis";
import { CartaoPM } from "@/components/aceite/PedidosMaterial";

export const dynamic = "force-dynamic";

const FILTROS = ["prazo", "confirmados", "atrasados", "sobras", "encerrados"] as const;
type Filtro = (typeof FILTROS)[number];

const ROTULO: Record<Filtro, string> = {
  prazo: "Aguardando data do fornecedor",
  confirmados: "Com data de chegada",
  atrasados: "Data passou sem receber",
  sobras: "Sobras no fornecedor",
  encerrados: "Recebidos e cancelados",
};

// Módulo Compras no formato "painel" (08/10/2026). Os Pedidos de Material não têm página própria:
// Compras atualiza cada um no próprio cartão, então a lista do que fazer mostra os cartões. Os PMs
// ficam numa tabela própria (com origem): outros módulos podem pedir material sem mexer nesta tela.
export default async function ComprasPage({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  const { filtro: f } = await searchParams;
  const filtro = (FILTROS as readonly string[]).includes(f ?? "") ? (f as Filtro) : null;
  const hoje = hojeBrasil(new Date());
  const atrasadosOnde = { status: { in: ["SOLICITADO", "EM_COMPRA", "PRAZO_CONFIRMADO"] as ("SOLICITADO" | "EM_COMPRA" | "PRAZO_CONFIRMADO")[] }, prazoPrevisto: { lt: hoje } };
  // "Com data de chegada" só conta o que ainda vai chegar; o que venceu sem receber tem número próprio.
  const onde = { ...FILAS_PM, confirmados: { ...FILAS_PM.confirmados, prazoPrevisto: { gte: hoje } }, atrasados: atrasadosOnde };

  const incluir = {
    eventos: { orderBy: { criadoEm: "desc" as const } },
    aceite: { select: { id: true, numero: true, orcamento: { select: { cliente: true, produtoDescricao: true } }, _count: { select: { lotes: true } } } },
    lote: { select: { numero: true } },
  };
  const [totais, ativos, doFiltro, podeCompras] = await Promise.all([
    Promise.all((["prazo", "confirmados", "atrasados", "sobras"] as const).map((k) => prisma.pedidoMaterial.count({ where: onde[k] }))),
    // Agenda e "precisa de você" sem filtro: todos os PMs em aberto.
    prisma.pedidoMaterial.findMany({ where: { status: { in: ["SOLICITADO", "EM_COMPRA", "PRAZO_CONFIRMADO"] } }, orderBy: { numero: "asc" }, include: incluir }),
    filtro
      ? prisma.pedidoMaterial.findMany({
          where: onde[filtro],
          orderBy: filtro === "encerrados" ? { atualizadoEm: "desc" } : { numero: "asc" },
          take: filtro === "encerrados" ? 100 : undefined,
          include: incluir,
        })
      : Promise.resolve(null),
    podeEditar("COMPRAS_PM"),
  ]);
  const [nPrazo, nConfirmados, nAtrasados, nSobras] = totais;

  const kpis: Kpi[] = [
    { key: "prazo", n: nPrazo, label: ROTULO.prazo, tom: "modulo" },
    { key: "atrasados", n: nAtrasados, label: ROTULO.atrasados, tom: "bad" },
    { key: "confirmados", n: nConfirmados, label: ROTULO.confirmados, tom: "neutro" },
    { key: "sobras", n: nSobras, label: ROTULO.sobras, tom: "neutro" },
  ];

  const atrasado = (p: (typeof ativos)[number]) => !!p.prazoPrevisto && p.prazoPrevisto < hoje;
  // Sem filtro, "precisa de você" = sem data (o mais antigo primeiro) e com a data vencida sem receber.
  const cartoes = doFiltro ?? [...ativos.filter(atrasado), ...ativos.filter((p) => !p.prazoPrevisto)];
  const cabecalho = (p: (typeof ativos)[number]) =>
    p.aceite ? (
      <div className="mb-1.5 truncate text-xs text-muted-foreground">
        {p.aceite.numero ? `Aceite ${p.aceite.numero}` : "Aceite sem nº"}
        {p.lote ? <b className="text-foreground"> · Lote {p.lote.numero}/{p.aceite._count.lotes}</b> : ""}: <b className="text-foreground">{p.aceite.orcamento.cliente}</b> — {p.aceite.orcamento.produtoDescricao}
      </div>
    ) : null;

  return (
    <>
      <PageHeader
        title="Compras"
        description="Pedidos de Material dos outros módulos (hoje, do Aceite de Pedido). Com a data de chegada lançada, o Aceite pode seguir para o PCP; mudanças depois disso alertam Vendas e o PCP."
        action={
          <Button asChild variant={filtro === "encerrados" ? "default" : "outline"} size="sm">
            <Link href={filtro === "encerrados" ? "/compras" : "/compras?filtro=encerrados"}>
              {filtro === "encerrados" ? "Voltar ao painel" : "Ver recebidos e cancelados"}
            </Link>
          </Button>
        }
      />
      <div className="flex flex-col gap-6">
        {filtro !== "encerrados" && <Kpis itens={kpis} base="/compras" ativo={filtro} corModulo="#8C5A21" />}

        <section className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">{filtro ? ROTULO[filtro] : "Precisa de você"}</h3>
            {!filtro && <span className="text-xs text-muted-foreground">data vencida primeiro, depois os sem data</span>}
          </div>
          {filtro === "sobras" && (
            <p className="max-w-3xl text-xs text-muted-foreground">
              Material que ficou no fornecedor por causa do pedido mínimo. Registre cada retirada em &quot;Receber sobra&quot; (toda ou parte); o PM sai daqui quando não sobra nada no fornecedor.
            </p>
          )}
          {cartoes.length === 0 ? (
            <div className="empty-state">{filtro ? "Nenhum Pedido de Material aqui." : "Nada esperando Compras agora."}</div>
          ) : (
            <div className="flex max-w-4xl flex-col gap-3">
              {cartoes.map(({ aceite, ...p }) => (
                <div key={p.id} id={`pm-${p.id}`} className="scroll-mt-28">
                  <CartaoPM pm={pmParaTela(p)} podeCompras={podeCompras} podeCancelar={podeCompras} cabecalho={cabecalho({ aceite, ...p })} />
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </>
  );
}
