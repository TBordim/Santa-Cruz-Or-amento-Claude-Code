import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlanilhaPcp } from "@/components/aceite/PlanilhaPcp";
import { Kpis, type Kpi } from "@/components/painel-setor/Kpis";
import { PrecisaDeVoce, type Tarefa } from "@/components/painel-setor/PrecisaDeVoce";
import { AgendaAceites, LegendaAgenda } from "@/components/aceite/AgendaAceites";
import { listarAceites, type AceiteLinha } from "@/lib/aceite/dados";
import { FILAS } from "@/lib/aceite/filas";
import { chegadaDoPapel, temAlertaPendente, fmtDia, fmtQuantidade } from "@/lib/aceite/constantes";
import { hojeBrasil, lerPeriodo, fimDoPeriodo, PERIODOS, PERIODO_PADRAO, type Periodo } from "@/lib/aceite/agenda";
import { linhasPorLote, hrefDaLinha, rotuloLote, type LinhaLote } from "@/lib/aceite/lotes";
import { Input } from "@/components/ui/input";
import { lerItens, calcularMontagens } from "@/lib/aceite/montagem";

export const dynamic = "force-dynamic";

const FILTROS = ["data", "negociacao", "alertas", "entregar", "chegando", "semana"] as const;
type Filtro = (typeof FILTROS)[number];

// Módulo PCP no formato "painel + agenda" (08/10/2026). Por enquanto define a data de entrega e
// acompanha prazos de material; capacidade, programação e painéis vêm com o módulo PCP próprio.
export default async function PcpPage({ searchParams }: { searchParams: Promise<{ filtro?: string; visao?: string; periodo?: string; de?: string; ate?: string }> }) {
  const q = await searchParams;
  const { filtro: f, visao } = q;
  const planilha = visao === "planilha";
  const filtro = (FILTROS as readonly string[]).includes(f ?? "") ? (f as Filtro) : null;
  const hoje = hojeBrasil(new Date());
  const em7dias = new Date(hoje.getTime() + 7 * 86400000);
  const periodo = lerPeriodo(q, hoje);
  const fimPeriodo = fimDoPeriodo(periodo);
  // Parâmetros do período que os filtros e o seletor precisam carregar.
  const qPeriodo =
    periodo.key === "datas" ? `de=${q.de}&ate=${q.ate}` : periodo.key === PERIODO_PADRAO ? "" : `periodo=${periodo.key}`;

  // Visão "Planilha": as colunas da planilha Aceites e Previsão de entrega, com tudo em andamento e
  // os concluídos com entrega a partir do mês corrente.
  if (planilha) {
    const inicioMes = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1));
    const todosPlanilha = linhasPorLote(
      await listarAceites({ OR: [{ etapa: { not: "CONCLUIDO" } }, { dataEntrega: { gte: inicioMes } }, { lotes: { some: { dataEntrega: { gte: inicioMes } } } }] }, { dataEntrega: "asc" }),
    );
    return (
      <>
        <PageHeader title="PCP" description="Aceites e previsão de entrega, nas colunas da planilha do PCP." action={<TrocaVisao planilha />} />
        <PlanilhaPcp aceites={todosPlanilha} hoje={hoje} />
      </>
    );
  }

  const [dataB, negociacaoB, chegandoB, carteiraB, carteiraPeriodoB, entregarB] = await Promise.all([
    listarAceites(FILAS.pcp.data),
    // Cliente não aceitou a data e o Atendimento pediu reanálise.
    listarAceites({ negociacoes: { some: { status: "AGUARDANDO_PCP" } } }),
    listarAceites(FILAS.pcp.chegando),
    listarAceites({ OR: [{ etapa: { in: ["PEDIDO", "ATENDIMENTO", "ENTREGA", "CONCLUIDO"] }, dataEntrega: { gte: hoje } }, { etapa: "EM_LOTES" }] }, { dataEntrega: "asc" }),
    // Na agenda, as entregas com data dentro do período escolhido (pode começar antes de hoje).
    listarAceites(
      { OR: [{ etapa: { in: ["PEDIDO", "ATENDIMENTO", "ENTREGA", "CONCLUIDO"] }, dataEntrega: { gte: periodo.inicio, lte: fimPeriodo } }, { etapa: "EM_LOTES" }] },
      { dataEntrega: "asc" },
    ),
    listarAceites(FILAS.pcp.entregar, { dataEntrega: "asc" }),
  ]);
  // Uma linha por lote (Aceite sem divisão: uma linha só). Cada fila é decidida pela etapa DA LINHA.
  const ETAPAS_CARTEIRA = ["PEDIDO", "ATENDIMENTO", "ENTREGA", "CONCLUIDO"];
  const data = linhasPorLote(dataB).filter((a) => a.etapa === "PCP");
  const negociacao = linhasPorLote(negociacaoB).filter((a) => a.negociacoes.some((n) => n.status === "AGUARDANDO_PCP"));
  const chegando = linhasPorLote(chegandoB).filter((a) => a.etapa === "ENGENHARIA_MATERIAL");
  const carteira = linhasPorLote(carteiraB).filter((a) => ETAPAS_CARTEIRA.includes(a.etapa) && !!a.dataEntrega && a.dataEntrega >= hoje);
  const carteiraPeriodo = linhasPorLote(carteiraPeriodoB).filter((a) => ETAPAS_CARTEIRA.includes(a.etapa) && !!a.dataEntrega && a.dataEntrega >= periodo.inicio && a.dataEntrega <= fimPeriodo);
  const entregar = linhasPorLote(entregarB).filter((a) => a.etapa === "ENTREGA");
  // Entregas a confirmar: cliente avisado e a data acordada já chegou (ou passou).
  const vencidas = entregar.filter((a) => a.dataEntrega && a.dataEntrega <= hoje);
  const todos = unicos([...data, ...chegando, ...carteiraPeriodo, ...negociacao, ...vencidas]);
  // Sem data de entrega ainda, o pedido aparece em qualquer período; com data, só se ela cai nele.
  // Entrega atrasada sem confirmação aparece sempre, até o PCP confirmar.
  const noPeriodo = (a: Linha) =>
    !a.dataEntrega || (a.dataEntrega >= periodo.inicio && a.dataEntrega <= fimPeriodo) || (a.etapa === "ENTREGA" && a.dataEntrega < hoje);
  const alertas = [...data, ...carteira].filter((a) => temAlertaPendente(a.pedidosMaterial));
  const semana = carteira.filter((a) => !a.entregueEm && a.dataEntrega && a.dataEntrega < em7dias);
  const doFiltro: Record<Filtro, Linha[]> = { data, negociacao, alertas, entregar: vencidas, chegando, semana };

  const kpis: Kpi[] = [
    { key: "data", n: data.length, label: "Aceites para definir data", tom: "modulo" },
    { key: "negociacao", n: negociacao.length, label: "Cliente pediu outra data", tom: "bad" },
    { key: "alertas", n: alertas.length, label: "Fornecedor mudou o prazo", tom: "bad" },
    { key: "entregar", n: vencidas.length, label: "Entregas a confirmar", tom: "modulo" },
    { key: "chegando", n: chegando.length, label: "Chegando (Engenharia ou papel)", tom: "neutro" },
    { key: "semana", n: semana.length, label: "Entregas nos próximos 7 dias", tom: "neutro" },
  ];

  // Negociação de data e mudança do fornecedor primeiro; depois os Aceites esperando data.
  const tarefas: Tarefa[] = [
    ...negociacao.map((a) => {
      const n = a.negociacoes[0];
      return {
        key: `neg-${a.linha}`,
        titulo: titulo(a),
        contexto: `O cliente não aceitou ${fmtDia(a.dataEntrega)}${n?.dataPedida ? ` e pediu ${fmtDia(n.dataPedida)}` : ""} · reanalise e responda ao Atendimento`,
        selo: { texto: "Outra data", tom: "bad" as const },
        acao: { texto: "Reanalisar", href: hrefDaLinha("/pcp", a) },
      };
    }),
    ...alertas.map((a) => ({
      key: `alerta-${a.linha}`,
      titulo: titulo(a),
      contexto: `O fornecedor mudou o papel${chegadaDoPapel(a.pedidosMaterial) ? `: agora chega ${fmtDia(chegadaDoPapel(a.pedidosMaterial))}` : ""}${a.dataEntrega ? ` · entrega prometida ${fmtDia(a.dataEntrega)}` : ""}`,
      selo: { texto: "Fornecedor mudou", tom: "bad" as const },
      acao: { texto: "Rever", href: hrefDaLinha("/pcp", a), primaria: false },
    })),
    ...vencidas.map((a) => {
      const atraso = Math.round((hoje.getTime() - a.dataEntrega!.getTime()) / 86400000);
      return {
        key: `ent-${a.linha}`,
        titulo: titulo(a),
        contexto: `Entrega acordada ${atraso > 0 ? `em ${fmtDia(a.dataEntrega)}, ${atraso} dia${atraso > 1 ? "s" : ""} atrás` : "para hoje"} · confirme quando o pedido for entregue`,
        selo: atraso > 0 ? { texto: "Atrasada", tom: "bad" as const } : { texto: "Hoje", tom: "good" as const },
        acao: { texto: "Confirmar entrega", href: hrefDaLinha("/pcp", a) },
      };
    }),
    ...data
      .filter((a) => !alertas.includes(a))
      .map((a) => ({
        key: `data-${a.linha}`,
        titulo: titulo(a),
        contexto: contextoData(a),
        selo: { texto: "Pronto", tom: "good" as const },
        acao: { texto: "Definir data", href: hrefDaLinha("/pcp", a) },
      })),
  ].filter((t) => !filtro || doFiltro[filtro].some((a) => t.key.endsWith(a.linha)));

  return (
    <>
      <PageHeader
        title="PCP"
        description="Datas de entrega dos Aceites com cadastro e papel garantidos, as mudanças de prazo do fornecedor e a confirmação da entrega ao cliente."
        action={<TrocaVisao planilha={false} />}
      />
      <div className="flex flex-col gap-6">
        <Kpis itens={kpis} base="/pcp" ativo={filtro} corModulo="#2C7A8C" manter={qPeriodo} />
        <PrecisaDeVoce tarefas={tarefas} vazio="Nada esperando o PCP agora." />
        <section className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Entregas e chegadas</h3>
              <p className="text-xs text-muted-foreground">
                {fmtDia(periodo.inicio)} a {fmtDia(fimPeriodo)} ({periodo.dias} dias). Clique numa linha para abrir o Aceite.
              </p>
            </div>
            <LegendaAgenda />
          </div>
          <SeletorPeriodo periodo={periodo} fim={fimPeriodo} filtro={filtro} />
          <AgendaAceites
            aceites={(filtro ? doFiltro[filtro] : todos).filter(noPeriodo)}
            hrefBase="/pcp"
            hoje={hoje}
            periodo={periodo}
            vazio="Nenhum pedido neste período."
          />
        </section>
      </div>
    </>
  );
}

type Linha = LinhaLote<AceiteLinha>;

function titulo(a: Linha) {
  return (
    <>
      <span className="font-mono">{a.numero ?? "Aceite sem nº"}</span>
      {a.lote && <b className="font-semibold"> · {rotuloLote({ ...a.lote, implicito: false })}</b>} · {a.orcamento.cliente}
    </>
  );
}

function contextoData(a: Linha): string {
  const chegada = chegadaDoPapel(a.pedidosMaterial);
  const folhas = calcularMontagens(lerItens(a.itens)).reduce((s, m) => s + m.folhas, 0);
  const partes = [
    chegada ? `papel chega ${fmtDia(chegada)}` : "papel em estoque",
    folhas ? `${fmtQuantidade(folhas)} folhas` : null,
    a.facaNova ? "faca nova" : null,
    a.clicheNovo ? "clichê novo" : null,
  ];
  return partes.filter(Boolean).join(" · ");
}

// Alterna entre a agenda (padrão) e a planilha.
function TrocaVisao({ planilha }: { planilha: boolean }) {
  return (
    <div className="flex gap-1.5">
      <Button asChild size="sm" variant={planilha ? "outline" : "default"}>
        <Link href="/pcp">Agenda</Link>
      </Button>
      <Button asChild size="sm" variant={planilha ? "default" : "outline"}>
        <Link href="/pcp?visao=planilha">Planilha</Link>
      </Button>
    </div>
  );
}

// Escolha do período da agenda: atalhos (links) ou as datas de/até (formulário GET, sem JavaScript).
// O filtro dos indicadores continua valendo ao trocar o período.
function SeletorPeriodo({ periodo, fim, filtro }: { periodo: Periodo; fim: Date; filtro: string | null }) {
  const comFiltro = (extra: string) => {
    const partes = [filtro ? `filtro=${filtro}` : "", extra].filter(Boolean);
    return partes.length ? `/pcp?${partes.join("&")}` : "/pcp";
  };
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
      <div className="flex flex-wrap gap-1.5">
        {PERIODOS.map((p) => (
          <Button key={p.key} asChild size="sm" variant={periodo.key === p.key ? "default" : "outline"}>
            <Link href={comFiltro(p.key === PERIODO_PADRAO ? "" : `periodo=${p.key}`)}>{p.label}</Link>
          </Button>
        ))}
      </div>
      <form action="/pcp" className="flex flex-wrap items-end gap-1.5">
        {filtro && <input type="hidden" name="filtro" value={filtro} />}
        <label className="flex flex-col text-xs text-muted-foreground">
          De
          <Input type="date" name="de" defaultValue={iso(periodo.inicio)} className="h-8 w-[150px]" required />
        </label>
        <label className="flex flex-col text-xs text-muted-foreground">
          Até
          <Input type="date" name="ate" defaultValue={iso(fim)} className="h-8 w-[150px]" required />
        </label>
        <Button type="submit" size="sm" variant={periodo.key === "datas" ? "default" : "outline"}>
          Ver período
        </Button>
      </form>
    </div>
  );
}

// Uma linha (lote ou Aceite) pode estar em mais de uma lista (ex.: negociação e carteira): fica a primeira ocorrência.
function unicos(lista: Linha[]): Linha[] {
  const vistos = new Set<string>();
  return lista.filter((a) => (vistos.has(a.linha) ? false : (vistos.add(a.linha), true)));
}
