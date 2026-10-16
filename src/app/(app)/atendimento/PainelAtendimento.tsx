import { Search } from "lucide-react";
import { prisma } from "@/lib/db";
import { podeEditar } from "@/lib/permissions";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Kpis, type Kpi } from "@/components/painel-setor/Kpis";
import { PrecisaDeVoce, type Tarefa } from "@/components/painel-setor/PrecisaDeVoce";
import { ListaAceites } from "@/components/aceite/ListaAceites";
import { listarAceites, type AceiteLinha } from "@/lib/aceite/dados";
import { FILA_ATENDIMENTO, esperandoAtendimento } from "@/lib/aceite/filas";
import { linhasPorLote, hrefDaLinha, rotuloLote, type LinhaLote } from "@/lib/aceite/lotes";
import { fmtDia } from "@/lib/aceite/constantes";
import { hojeBrasil } from "@/lib/aceite/agenda";
import { fmtDateTime } from "@/lib/orcamentos/constantes";

const FILTROS = ["informar", "negociacao", "retornos", "pedidos", "semana"] as const;
type Filtro = (typeof FILTROS)[number];

// Módulo Atendimento ao Cliente (nome provisório, 08/10/2026), no formato "painel". Quem atende o
// cliente: registra o retorno do orçamento (no Orçamento, etapa 6), envia a data prevista do pedido ao
// cliente e/ou representante e acompanha os pedidos para responder quando o cliente pergunta.
// O painel em si; a rota do retorno de orçamento (retorno/[id]) mostra o mesmo painel com a gaveta
// do orçamento aberta por cima.
export async function PainelAtendimento({ filtro: f, q: qBruto }: { filtro?: string; q?: string }) {
  const filtro = (FILTROS as readonly string[]).includes(f ?? "") ? (f as Filtro) : null;
  const q = (qBruto ?? "").trim();
  const hoje = hojeBrasil(new Date());
  const em7dias = new Date(hoje.getTime() + 7 * 86400000);
  const umaSemanaAtras = new Date(hoje.getTime() - 7 * 86400000);

  const [podeAtender, podeRetorno] = await Promise.all([podeEditar("ATENDIMENTO_CLIENTE"), podeEditar("FINALIZADO")]);
  const [informarB, respondidasB, retornos, pedidos, busca] = await Promise.all([
    listarAceites(FILA_ATENDIMENTO),
    // Negociação de data que o PCP já respondeu: falta informar o cliente.
    listarAceites({ negociacoes: { some: { status: "AGUARDANDO_ATENDIMENTO" } } }),
    podeRetorno
      ? prisma.orcamento.findMany({
          where: { origem: "NOVO", etapa: "FINALIZADO", desfecho: "AGUARDANDO" },
          orderBy: { finalizadoEm: "asc" },
          select: { id: true, cliente: true, produtoDescricao: true, numeroOrcamento: true, finalizadoEm: true, representante: true },
        })
      : Promise.resolve([]),
    // Pedidos em acompanhamento (só consulta): os Aceites em andamento e os que o PCP confirmou como
    // entregues na última semana. Quem conclui é o PCP, ao confirmar a entrega (11/10/2026).
    listarAceites({ OR: [{ etapa: { not: "CONCLUIDO" } }, { entregueEm: { gte: umaSemanaAtras } }] }, { dataEntrega: "asc" }),
    q
      ? listarAceites(
          {
            OR: [
              { numero: { contains: q, mode: "insensitive" } },
              { numeroOF: { contains: q, mode: "insensitive" } },
              { numeroPedido: { contains: q, mode: "insensitive" } },
              { orcamento: { cliente: { contains: q, mode: "insensitive" } } },
              { orcamento: { produtoDescricao: { contains: q, mode: "insensitive" } } },
            ],
          },
          { atualizadoEm: "desc" },
          50,
        )
      : Promise.resolve(null),
  ]);
  // Aviso da data e resposta do PCP são por lote (Aceite sem divisão: uma linha só).
  const informar = linhasPorLote(informarB).filter(esperandoAtendimento);
  const respondidas = linhasPorLote(respondidasB).filter((a) => a.negociacoes.some((n) => n.status === "AGUARDANDO_ATENDIMENTO"));
  // Entregas da semana: o Aceite entra na tabela se algum lote dele entrega nos próximos 7 dias.
  const semana = pedidos.filter((a) => linhasPorLote([a]).some((l) => !l.entregueEm && l.etapa !== "CONCLUIDO" && l.dataEntrega && l.dataEntrega >= hoje && l.dataEntrega < em7dias));

  const kpis: Kpi[] = [
    ...(podeAtender || !podeRetorno ? [{ key: "informar", n: informar.length, label: "Datas para enviar ao cliente", tom: "modulo" as const }] : []),
    ...(podeAtender || !podeRetorno ? [{ key: "negociacao", n: respondidas.length, label: "Respostas do PCP para informar", tom: "modulo" as const }] : []),
    ...(podeRetorno ? [{ key: "retornos", n: retornos.length, label: "Orçamentos aguardando retorno do cliente", tom: "modulo" as const }] : []),
    { key: "pedidos", n: pedidos.length, label: "Pedidos em acompanhamento", tom: "neutro" },
    { key: "semana", n: semana.length, label: "Entregas nos próximos 7 dias", tom: "neutro" },
  ];

  const tarefas: Tarefa[] = [
    ...(!filtro || filtro === "negociacao"
      ? respondidas.map((a) => ({
          key: `neg-${a.linha}`,
          titulo: tituloLinha(a),
          contexto: `O PCP respondeu à negociação de data · data agora: ${fmtDia(a.dataEntrega)} · informe o cliente`,
          selo: { texto: "PCP respondeu", tom: "good" as const },
          acao: { texto: "Informar", href: hrefDaLinha("/atendimento/aceite", a) },
        }))
      : []),
    ...(!filtro || filtro === "informar"
      ? informar.map((a) => ({
          key: `inf-${a.linha}`,
          titulo: tituloLinha(a),
          contexto: `Enviar ao cliente e/ou representante a data prevista: ${fmtDia(a.dataEntrega)}${a.dataCliente && a.dataEntrega && a.dataEntrega > a.dataCliente ? ` (o cliente pediu ${fmtDia(a.dataCliente)})` : ""}`,
          selo: { texto: "Data definida", tom: "good" as const },
          acao: { texto: "Enviar data", href: hrefDaLinha("/atendimento/aceite", a) },
        }))
      : []),
    ...(!filtro || filtro === "retornos"
      ? retornos.map((o) => ({
          key: `ret-${o.id}`,
          titulo: o.cliente ?? "Orçamento",
          contexto: `Oferta enviada em ${fmtDateTime(o.finalizadoEm)}${o.numeroOrcamento ? ` · Orçamento ${o.numeroOrcamento}` : ""} · ${o.produtoDescricao ?? ""}`,
          selo: { texto: "Aguardando retorno", tom: "pend" as const },
          acao: { texto: "Registrar retorno", href: `/atendimento/retorno/${o.id}`, primaria: false },
        }))
      : []),
  ];

  // Situação da entrega como o PCP registrou: entregue, atrasada (passou da data sem confirmação) ou prevista.
  const colunaEntrega = {
    titulo: "Entrega",
    valor: (a: AceiteLinha) =>
      a.lotes.length > 0 && a.etapa !== "CONCLUIDO" ? (
        <ResumoEntregaLotes a={a} hoje={hoje} />
      ) : (
      <span className="text-xs">
        {a.entregueEm ? (
          <span className="font-semibold text-good">entregue {fmtDia(a.entregueEm)}</span>
        ) : (
          <>
            <span className="font-mono">{fmtDia(a.dataEntrega)}</span>
            {a.dataEntrega && a.dataEntrega < hoje && <span className="ml-1 font-semibold text-bad">atrasada</span>}
            {a.entregas.length > 0 && <span className="block text-warn">entrega parcial · saldo previsto</span>}
          </>
        )}
        {a.dataCliente && <span className="block text-muted-foreground">cliente pediu {fmtDia(a.dataCliente)}</span>}
      </span>
      ),
  };
  const naTabela = busca ?? (filtro === "semana" ? semana : pedidos);
  const mostrarTarefas = !busca && filtro !== "pedidos" && filtro !== "semana";

  return (
    <>
      <PageHeader
        title="Atendimento ao Cliente"
        description="Retorno dos orçamentos, data prevista dos pedidos para o cliente e o acompanhamento de cada pedido."
      />
      <div className="flex flex-col gap-6">
        <Kpis itens={kpis} base="/atendimento" ativo={filtro} corModulo="#3E6E9E" />
        {mostrarTarefas && <PrecisaDeVoce tarefas={tarefas} vazio="Nada esperando o Atendimento agora." />}
        <section className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{busca ? `Busca: "${q}"` : "Acompanhamento de pedidos"}</h3>
              <p className="text-xs text-muted-foreground">Só para consulta, quando o cliente perguntar: com quem está o pedido e a entrega. O pedido conclui quando o PCP confirma a entrega.</p>
            </div>
            <form className="flex w-full gap-2 sm:w-auto" action="/atendimento">
              <Input name="q" defaultValue={q} placeholder="Cliente, produto, nº do Aceite, OF ou pedido" className="sm:w-80" aria-label="Buscar pedido" />
              <Button type="submit" variant="outline" className="gap-1.5">
                <Search className="h-3.5 w-3.5" /> Buscar
              </Button>
            </form>
          </div>
          <ListaAceites
            aceites={naTabela}
            hrefBase="/atendimento/aceite"
            extra={colunaEntrega}
            vazio={busca ? "Nenhum pedido encontrado." : "Nenhum pedido em acompanhamento."}
          />
        </section>
      </div>
    </>
  );
}

type Linha = LinhaLote<AceiteLinha>;

function tituloLinha(a: Linha) {
  return (
    <>
      <span className="font-mono">{a.numero ?? "Aceite sem nº"}</span>
      {a.lote && <b className="font-semibold"> · {rotuloLote({ ...a.lote, implicito: false })}</b>} · {a.orcamento.cliente}
    </>
  );
}

// Aceite dividido: quantos lotes já foram entregues e a próxima entrega pela data acordada de cada lote.
function ResumoEntregaLotes({ a, hoje }: { a: AceiteLinha; hoje: Date }) {
  const lotes = linhasPorLote([a]);
  const entregues = lotes.filter((l) => l.etapa === "CONCLUIDO").length;
  const proxima = lotes
    .filter((l) => l.etapa !== "CONCLUIDO" && l.dataEntrega)
    .map((l) => l.dataEntrega as Date)
    .sort((x, y) => x.getTime() - y.getTime())[0];
  return (
    <span className="text-xs">
      <span className="font-semibold">{entregues} de {lotes.length} lotes entregues</span>
      {proxima && (
        <span className="block text-muted-foreground">
          próxima {fmtDia(proxima)}
          {proxima < hoje && <b className="ml-1 text-bad">atrasada</b>}
        </span>
      )}
    </span>
  );
}
