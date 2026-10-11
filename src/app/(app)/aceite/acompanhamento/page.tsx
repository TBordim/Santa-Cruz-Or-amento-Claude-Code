import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Kpis, type Kpi } from "@/components/painel-setor/Kpis";
import { ListaAceites } from "@/components/aceite/ListaAceites";
import { listarAceites, type AceiteLinha } from "@/lib/aceite/dados";
import { fmtDia, temAlertaPendente } from "@/lib/aceite/constantes";

export const dynamic = "force-dynamic";

const FILTROS = ["vendas", "engenharia", "pcp", "pedido", "atendimento", "entrega", "risco", "concluidos"] as const;
type Filtro = (typeof FILTROS)[number];

// Acompanhamento no formato "painel" (08/10/2026), só leitura: quantos pedidos estão em cada etapa
// (clicar filtra) e a tabela de todos. Sem "precisa de você": aqui ninguém age.
export default async function AcompanhamentoPage({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  const { filtro: f } = await searchParams;
  const filtro = (FILTROS as readonly string[]).includes(f ?? "") ? (f as Filtro) : null;

  const [andamento, concluidos] = await Promise.all([
    listarAceites({ etapa: { not: "CONCLUIDO" } }, { criadoEm: "asc" }),
    filtro === "concluidos" ? listarAceites({ etapa: "CONCLUIDO" }, { atualizadoEm: "desc" }, 200) : Promise.resolve([]),
  ]);
  const porEtapa = (e: string) => andamento.filter((a) => a.etapa === e);
  const grupos: Record<Exclude<Filtro, "concluidos">, AceiteLinha[]> = {
    vendas: porEtapa("VENDAS"),
    engenharia: porEtapa("ENGENHARIA_MATERIAL"),
    pcp: porEtapa("PCP"),
    pedido: porEtapa("PEDIDO"),
    atendimento: porEtapa("ATENDIMENTO"),
    entrega: porEtapa("ENTREGA"),
    risco: andamento.filter((a) => temAlertaPendente(a.pedidosMaterial)),
  };

  const kpis: Kpi[] = [
    { key: "vendas", n: grupos.vendas.length, label: "Em Vendas", tom: "modulo" },
    { key: "engenharia", n: grupos.engenharia.length, label: "Engenharia e papel", tom: "modulo" },
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
          <Button asChild variant={filtro === "concluidos" ? "default" : "outline"} size="sm">
            <Link href={filtro === "concluidos" ? "/aceite/acompanhamento" : "/aceite/acompanhamento?filtro=concluidos"}>
              {filtro === "concluidos" ? "Voltar ao painel" : "Ver concluídos"}
            </Link>
          </Button>
        }
      />
      {filtro === "concluidos" ? (
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
            aceites={filtro ? grupos[filtro] : andamento}
            hrefBase="/aceite/acompanhamento"
            extra={{ titulo: "Entrega", valor: (a) => fmtDia(a.dataEntrega) }}
            vazio="Nenhum Aceite em andamento."
          />
        </div>
      )}
    </>
  );
}
