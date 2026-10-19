import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { Kpis, type Kpi } from "@/components/painel-setor/Kpis";
import { ListaAceites } from "@/components/aceite/ListaAceites";
import { listarAceites, type AceiteLinha } from "@/lib/aceite/dados";
import { fmtDia, temAlertaPendente } from "@/lib/aceite/constantes";

export const dynamic = "force-dynamic";

const FILTROS = ["vendas", "engenharia", "lotes", "pcp", "pedido", "atendimento", "entrega", "risco", "concluidos", "cancelados"] as const;
type Filtro = (typeof FILTROS)[number];

// Acompanhamento no formato "painel" (08/10/2026), só leitura: quantos pedidos estão em cada etapa
// (clicar filtra) e a tabela de todos. Sem "precisa de você": aqui ninguém age.
export default async function AcompanhamentoPage({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  const { filtro: f } = await searchParams;
  const filtro = (FILTROS as readonly string[]).includes(f ?? "") ? (f as Filtro) : null;

  const [andamento, concluidos, cancelados, nCancelados] = await Promise.all([
    listarAceites({ etapa: { notIn: ["CONCLUIDO", "CANCELADO"] } }, { criadoEm: "asc" }),
    filtro === "concluidos" ? listarAceites({ etapa: "CONCLUIDO" }, { atualizadoEm: "desc" }, 200) : Promise.resolve([]),
    filtro === "cancelados" ? listarAceites({ etapa: "CANCELADO" }, { canceladoEm: "desc" }, 200) : Promise.resolve([]),
    prisma.aceite.count({ where: { etapa: "CANCELADO" } }),
  ]);
  const porEtapa = (e: string) => andamento.filter((a) => a.etapa === e);
  const grupos: Record<Exclude<Filtro, "concluidos" | "cancelados">, AceiteLinha[]> = {
    vendas: porEtapa("VENDAS"),
    engenharia: porEtapa("ENGENHARIA_MATERIAL"),
    lotes: porEtapa("EM_LOTES"),
    pcp: porEtapa("PCP"),
    pedido: porEtapa("PEDIDO"),
    atendimento: porEtapa("ATENDIMENTO"),
    entrega: porEtapa("ENTREGA"),
    risco: andamento.filter((a) => temAlertaPendente(a.pedidosMaterial)),
  };

  const kpis: Kpi[] = [
    { key: "vendas", n: grupos.vendas.length, label: "Em Vendas", tom: "modulo" },
    { key: "engenharia", n: grupos.engenharia.length, label: "Engenharia e papel", tom: "modulo" },
    { key: "lotes", n: grupos.lotes.length, label: "Em lotes (cada lote no seu passo)", tom: "modulo" },
    { key: "pcp", n: grupos.pcp.length, label: "No PCP", tom: "modulo" },
    { key: "pedido", n: grupos.pedido.length, label: "Cadastro do pedido (Vendas)", tom: "modulo" },
    { key: "atendimento", n: grupos.atendimento.length, label: "Informar o cliente (Atendimento)", tom: "modulo" },
    { key: "entrega", n: grupos.entrega.length, label: "Entrega ao cliente (PCP)", tom: "modulo" },
    { key: "risco", n: grupos.risco.length, label: "Fornecedor mudou o prazo", tom: "bad" },
  ];

  return (
    <>
      <PageHeader
        title="Acompanhamento"
        description="Todos os Aceites em andamento e com quem está cada um. Só leitura; cada setor trabalha no próprio ambiente."
        action={
          <div className="flex gap-1.5">
            <Button asChild variant={filtro === "concluidos" ? "default" : "outline"} size="sm">
              <Link href={filtro === "concluidos" ? "/aceite/acompanhamento" : "/aceite/acompanhamento?filtro=concluidos"}>
                {filtro === "concluidos" ? "Voltar ao painel" : "Ver concluídos"}
              </Link>
            </Button>
            <Button asChild variant={filtro === "cancelados" ? "default" : "outline"} size="sm">
              <Link href={filtro === "cancelados" ? "/aceite/acompanhamento" : "/aceite/acompanhamento?filtro=cancelados"}>
                {filtro === "cancelados" ? "Voltar ao painel" : `Ver cancelados (${nCancelados})`}
              </Link>
            </Button>
          </div>
        }
      />
      {filtro === "cancelados" ? (
        <ListaAceites
          aceites={cancelados}
          hrefBase="/aceite/acompanhamento"
          extra={{ titulo: "Motivo", valor: (a) => <span className="text-xs">{a.canceladoMotivo ?? "—"}</span> }}
          vazio="Nenhum pedido cancelado."
        />
      ) : filtro === "concluidos" ? (
        <ListaAceites
          aceites={concluidos}
          hrefBase="/aceite/acompanhamento"
          extra={{ titulo: "Entrega", valor: (a) => fmtDia(a.dataEntrega) }}
          vazio="Nenhum Aceite concluído ainda."
        />
      ) : (
        <div className="flex flex-col gap-6">
          <Kpis itens={kpis} base="/aceite/acompanhamento" ativo={filtro} corModulo="#2E6B4F" />
          <ListaAceites
            aceites={filtro ? grupos[filtro as Exclude<Filtro, "concluidos" | "cancelados">] : andamento}
            hrefBase="/aceite/acompanhamento"
            extra={{ titulo: "Entrega", valor: (a) => fmtDia(a.dataEntrega) }}
            vazio="Nenhum Aceite em andamento."
          />
        </div>
      )}
    </>
  );
}
