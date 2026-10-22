import { Agenda, type LinhaDaTela } from "@/components/painel-setor/Agenda";
import { linhaDaAgenda, type LinhaAgenda, type Periodo } from "@/lib/aceite/agenda";
import type { AceiteLinha } from "@/lib/aceite/dados";
import { hrefDaLinha, rotuloLote, type LinhaLote } from "@/lib/aceite/lotes";
import { fmtDia, temAlertaPendente } from "@/lib/aceite/constantes";

export { LegendaAgenda } from "@/components/painel-setor/Agenda";

// Agenda de Aceites (Vendas, Engenharia, PCP e Acompanhamento): em risco primeiro, depois pela
// data de entrega; sem data de entrega por último. Clicar na linha abre o Aceite no ambiente de quem
// está vendo (hrefBase).
export function AgendaAceites({
  aceites,
  hrefBase,
  hoje,
  periodo,
  vazio = "Nenhum pedido em andamento.",
}: {
  aceites: LinhaLote<AceiteLinha>[];
  hrefBase: string;
  hoje: Date;
  periodo: Periodo;
  vazio?: string;
}) {
  const linhas: LinhaDaTela[] = aceites
    .map((a) => ({ a, l: linhaDaAgenda(a, hoje, periodo) }))
    .sort((x, y) => Number(y.l.risco) - Number(x.l.risco) || ordemEntrega(x.a) - ordemEntrega(y.a))
    .map(({ a, l }) => ({
      id: a.linha,
      href: hrefDaLinha(hrefBase, a),
      titulo: (
        <>
          <b className="font-mono font-semibold">{a.numero ?? "s/ nº"}</b>
          {a.lote && <b className="font-semibold"> · {rotuloLote({ ...a.lote, implicito: false })}</b>} {a.orcamento.cliente}
        </>
      ),
      sub: situacao(a, l),
      l,
    }));
  return <Agenda linhas={linhas} hoje={hoje} periodo={periodo} vazio={vazio} />;
}

function ordemEntrega(a: LinhaLote<AceiteLinha>): number {
  return a.dataEntrega ? new Date(a.dataEntrega).getTime() : Number.MAX_SAFE_INTEGER;
}

// Frase curta de onde o pedido está, embaixo do nome do cliente.
function situacao(a: LinhaLote<AceiteLinha>, l: LinhaAgenda): string {
  if (a.entregueEm) return `entregue em ${fmtDia(a.entregueEm)}`;
  if (l.risco && a.dataEntrega && a.etapa !== "PCP" && a.etapa !== "ENGENHARIA_MATERIAL" && !temAlertaPendente(a.pedidosMaterial)) return "passou da data: confirmar a entrega";
  if (l.risco) return "fornecedor mudou o prazo do papel";
  switch (a.etapa) {
    case "VENDAS":
      return "falta preencher o Aceite";
    case "ENGENHARIA_MATERIAL":
      return a.engenhariaEm ? "esperando a data do papel" : "esperando a Engenharia";
    case "PCP":
      return "esperando a data do PCP";
    case "PEDIDO":
      return "Vendas cadastra o pedido no ERP";
    case "ATENDIMENTO":
      return "Atendimento envia a data ao cliente";
    case "ENTREGA":
      return "em produção · PCP confirma a entrega";
    default:
      return a.clienteInformadoEm ? "pedido cadastrado · cliente avisado" : "concluído";
  }
}
