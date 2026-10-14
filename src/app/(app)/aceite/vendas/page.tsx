import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Kpis, type Kpi } from "@/components/painel-setor/Kpis";
import { PrecisaDeVoce, type Tarefa } from "@/components/painel-setor/PrecisaDeVoce";
import { ListaAceites } from "@/components/aceite/ListaAceites";
import { listarAceites, type AceiteLinha } from "@/lib/aceite/dados";
import { FILAS } from "@/lib/aceite/filas";
import { chegadaDoPapel, temAlertaPendente, fmtDia, fmtQuantidade } from "@/lib/aceite/constantes";
import { fmtDateTime } from "@/lib/orcamentos/constantes";
import { parseQuantidade } from "@/lib/orcamentos/motor";
import type { PrecificacaoTier } from "@/lib/orcamentos/types";

export const dynamic = "force-dynamic";

const FILTROS = ["preencher", "pedido", "interno", "of", "alertas", "andamento", "concluidos"] as const;
type Filtro = (typeof FILTROS)[number];

// Ambiente de Vendas no formato "painel" (proposta A, 08/10/2026): números do que espera Vendas no
// topo (clicar filtra), a lista do que fazer agora e a tabela dos pedidos em andamento. A agenda
// (proposta C) ficou só no PCP, que trabalha por data.
export default async function VendasPage({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  const { filtro: f } = await searchParams;
  const filtro = (FILTROS as readonly string[]).includes(f ?? "") ? (f as Filtro) : null;

  const [preencher, pedido, semInterno, semOF, andamento, concluidos] = await Promise.all([
    listarAceites(FILAS.vendas.preencher),
    listarAceites(FILAS.vendas.pedido),
    listarAceites(FILAS.vendas.interno, { engenhariaEm: "asc" }),
    listarAceites(FILAS.vendas.of, { pedidoCadastradoEm: "asc" }),
    listarAceites(FILAS.vendas.andamento),
    filtro === "concluidos" ? listarAceites(FILAS.vendas.concluidos, { atualizadoEm: "desc" }, 100) : Promise.resolve([]),
  ]);
  // Aceites que ainda não terminaram. O acompanhamento do pedido depois disso é do Atendimento ao Cliente.
  const todos = [...preencher, ...pedido, ...andamento];
  const alertas = todos.filter((a) => temAlertaPendente(a.pedidosMaterial));

  const doFiltro: Record<Exclude<Filtro, "concluidos">, AceiteLinha[]> = { preencher, pedido, interno: semInterno, of: semOF, alertas, andamento };
  const naLista = filtro && filtro !== "concluidos" ? doFiltro[filtro] : todos;

  // "Precisa de você": mudança do fornecedor primeiro, depois pedido para cadastrar, depois Aceite
  // para preencher (o mais antigo primeiro) e, por fim, as OFs que faltam registrar.
  const tarefasBrutas = [
    ...alertas.map((a) => ({ a, tipo: "alerta" as const })),
    ...pedido.filter((a) => !alertas.includes(a)).map((a) => ({ a, tipo: "pedido" as const })),
    ...preencher.filter((a) => !alertas.includes(a)).map((a) => ({ a, tipo: "preencher" as const })),
    ...semInterno.map((a) => ({ a, tipo: "interno" as const })),
    ...semOF.map((a) => ({ a, tipo: "of" as const })),
  ].filter((t) => !filtro || filtro === "concluidos" || doFiltro[filtro].includes(t.a));
  const tarefas: Tarefa[] = tarefasBrutas.map(({ a, tipo }) => ({
    key: `${tipo}-${a.id}`,
    titulo: (
      <>
        <span className="font-mono">{a.numero ?? "Aceite sem nº"}</span> · {a.orcamento.cliente}
      </>
    ),
    contexto: contexto(a, tipo),
    selo:
      tipo === "alerta"
        ? { texto: "Fornecedor mudou", tom: "bad" }
        : tipo === "pedido"
          ? { texto: "Data definida", tom: "good" }
          : tipo === "of"
            ? { texto: "Falta a OF", tom: "pend" }
            : tipo === "interno"
              ? { texto: "Falta o pedido interno", tom: "pend" }
            : { texto: "Novo", tom: "pend" },
    acao: {
      texto: tipo === "alerta" ? "Ver" : tipo === "pedido" ? "Cadastrar" : tipo === "of" ? "Registrar OF" : tipo === "interno" ? "Registrar" : "Preencher",
      href: `/aceite/vendas/${a.id}`,
      primaria: tipo !== "alerta",
    },
  }));

  const kpis: Kpi[] = [
    { key: "preencher", n: preencher.length, label: "Aceites para preencher", tom: "modulo" },
    { key: "pedido", n: pedido.length, label: "Pedidos para cadastrar no ERP", tom: "modulo" },
    { key: "interno", n: semInterno.length, label: "Pedido interno a informar", tom: "modulo" },
    { key: "of", n: semOF.length, label: "OF a registrar", tom: "modulo" },
    { key: "alertas", n: alertas.length, label: "Fornecedor mudou o prazo", tom: "bad" },
    { key: "andamento", n: andamento.length, label: "Com outros setores", tom: "neutro" },
  ];

  return (
    <>
      <PageHeader
        title="Vendas"
        description="O que espera Vendas no Aceite de Pedido e com quem está cada Aceite em andamento."
        action={
          <Button asChild variant={filtro === "concluidos" ? "default" : "outline"} size="sm">
            <Link href={filtro === "concluidos" ? "/aceite/vendas" : "/aceite/vendas?filtro=concluidos"}>
              {filtro === "concluidos" ? "Voltar ao painel" : "Ver concluídos"}
            </Link>
          </Button>
        }
      />

      {filtro === "concluidos" ? (
        <ListaAceites
          aceites={concluidos}
          hrefBase="/aceite/vendas"
          extra={{ titulo: "Entrega", valor: (a) => fmtDia(a.dataEntrega) }}
          vazio="Nenhum Aceite concluído ainda."
        />
      ) : (
        <div className="flex flex-col gap-6">
          <Kpis itens={kpis} base="/aceite/vendas" ativo={filtro} corModulo="#2E6B4F" />
          <PrecisaDeVoce tarefas={tarefas} vazio="Nada esperando por Vendas agora." />

          <section className="flex flex-col gap-2.5">
            <h3 className="text-sm font-semibold text-foreground">Aceites em andamento</h3>
            <ListaAceites
              aceites={naLista}
              hrefBase="/aceite/vendas"
              extra={{ titulo: "Entrega", valor: (a) => fmtDia(a.dataEntrega) }}
              vazio="Nenhum Aceite em andamento."
            />
          </section>
        </div>
      )}
    </>
  );
}

function contexto(a: AceiteLinha, tipo: "alerta" | "pedido" | "preencher" | "of" | "interno"): string {
  const so = a.soEscolhida as unknown as PrecificacaoTier | null;
  if (tipo === "alerta") {
    const chegada = chegadaDoPapel(a.pedidosMaterial);
    return `O fornecedor mudou um Pedido de Material${chegada ? `: o papel agora chega ${fmtDia(chegada)}` : ""}${a.dataEntrega ? `; entrega prometida ${fmtDia(a.dataEntrega)}` : ""}. Combine com o PCP; se a data mudar, o Atendimento avisa o cliente.`;
  }
  if (tipo === "interno") return `A Engenharia já confirmou o cadastro · informe o pedido interno deste Aceite (fica obrigatório para cadastrar o pedido)`;
  if (tipo === "of") return `Pedido ${a.numeroPedido ?? a.numero ?? ""} cadastrado em ${fmtDateTime(a.pedidoCadastradoEm)} · entrega ${fmtDia(a.dataEntrega)} · registre o Nº da OF quando abrir a Ordem de Fabricação`;
  if (tipo === "pedido") return `PCP definiu a entrega para ${fmtDia(a.dataEntrega)} · cadastre o pedido no ERP; o Atendimento avisa o cliente`;
  const qtd = so ? parseQuantidade(so.quantidade) : null;
  const oc = so?.pedidoCliente ? ` · OC do cliente ${so.pedidoCliente}` : "";
  return `Cliente aprovou em ${fmtDateTime(a.orcamento.desfechoEm)}${so?.numeroSequencial ? ` · SO ${so.numeroSequencial}` : ""}${qtd ? ` · ${fmtQuantidade(qtd)} un.` : ""}${oc}`;
}
