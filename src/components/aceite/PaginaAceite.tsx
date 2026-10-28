import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CornerUpLeft, TriangleAlert } from "lucide-react";
import { podeEditar, ehAdmin } from "@/lib/permissions";
import { carregarAceite } from "@/lib/aceite/dados";
import type { SetorAceite } from "@/lib/aceite/setores";
import { chegadaDoPapel, temAlertaPendente, situacaoPapelLabel, fmtDia, fmtQuantidade } from "@/lib/aceite/constantes";
import { fmtMoney, fmtDateTime, classificacaoLabel } from "@/lib/orcamentos/constantes";
import { parseQuantidade } from "@/lib/orcamentos/motor";
import { lerItens, quantidadeTotal, calcularMontagens } from "@/lib/aceite/montagem";
import { lerDatasCliente, textoDatasCliente } from "@/lib/aceite/datas-cliente";
import { lerSuportes, suportesSemPM, textoSuporte, SITUACOES_SUPORTE, type SuporteAceite } from "@/lib/aceite/suportes";
import { lerItensLote, lotesDoAceite, comoAceite, loteGarantido } from "@/lib/aceite/lotes";
import type { LoteForm } from "./EditorLotes";
import { acabamentosEspeciais } from "@/lib/aceite/acabamento";
import type { ReqCliente, ReqTecnicos } from "@/lib/orcamentos/types";
import { ProtocolosDoAceite } from "./ProtocolosDoAceite";
import { MarcarComoArte } from "./MarcarComoArte";
import { prisma } from "@/lib/db";
import { doOrcamento } from "@/lib/aceite/do-orcamento";
import { montagensDoPedido } from "@/lib/orcamentos/conjugacao";
import { modelosDoDoc, rotuloSO, valorSO } from "@/lib/orcamentos/modelos";
import { formatarCodigoInterno } from "@/lib/orcamentos/codigo-interno";
import type { PrecificacaoTier } from "@/lib/orcamentos/types";
import { ResumoBox, FormSection } from "@/components/form-section";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { voltarEtapaAceite, voltarEtapaLote, voltarAceiteParaOrcamento, marcarAlertasVistos } from "@/app/(app)/aceite/actions";
import { Andamento } from "./Andamento";
import { FormVendas } from "./FormVendas";
import { AdminAceite } from "./AdminAceite";
import { AnexoUpload } from "@/components/anexos/AnexoUpload";
import { PedidosMaterial } from "./PedidosMaterial";
import { FormEngenharia } from "./FormEngenharia";
import { FormPcp } from "./FormPcp";
import { carregarParametros } from "@/lib/pcp/parametros";
import { sugerirData } from "@/lib/pcp/sugestao";
import { hojeBrasil } from "@/lib/aceite/agenda";
import { FormPedido, FormNumeroOF, FormPedidoInterno } from "./FormPedido";
import { FormEntrega } from "./FormEntrega";
import { FormInformarCliente } from "./FormInformarCliente";
import { BlocoNegociacao } from "./BlocoNegociacao";
import { ResumoItens } from "./ResumoItens";
import { ResumoLotes } from "./ResumoLotes";
import { EscolherLote } from "./EscolherLote";
import { FormCancelarPedido } from "./FormCancelarPedido";
import { BannerCancelado } from "./BannerCancelado";
import { avaliarCancelamento } from "@/lib/aceite/cancelamento";

// "engenharia", "pcp" e "atendimento" são as telas dos módulos Engenharia, PCP e Atendimento ao
// Cliente, que abrem o mesmo Aceite.
type Ambiente = SetorAceite | "engenharia" | "pcp" | "atendimento" | "acompanhamento";

const AMBIENTES: Record<Ambiente, { voltar: string; nome: string }> = {
  vendas: { voltar: "/aceite/vendas", nome: "Vendas" },
  acompanhamento: { voltar: "/aceite/acompanhamento", nome: "Acompanhamento" },
  engenharia: { voltar: "/engenharia", nome: "Pendências da Engenharia" },
  pcp: { voltar: "/pcp", nome: "PCP" },
  atendimento: { voltar: "/atendimento", nome: "Atendimento ao Cliente" },
};

// Endereço da tela do Aceite em cada ambiente (sem o id), para os links do seletor de lotes.
const ROTA_ACEITE: Record<Ambiente, string> = {
  vendas: "/aceite/vendas",
  acompanhamento: "/aceite/acompanhamento",
  engenharia: "/engenharia/aceite",
  pcp: "/pcp",
  atendimento: "/atendimento/aceite",
};

function visto(quem: string | null | undefined, quando: Date | null | undefined) {
  return quando ? `${quem ?? "—"} · ${fmtDateTime(quando)}` : "—";
}

function Aviso({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">{children}</div>;
}

// Um Aceite visto de dentro do ambiente de um setor. Todos veem o mesmo resumo e o andamento; só o
// setor dono da etapa vê o formulário dela. Em "acompanhamento" tudo é só leitura.
export async function PaginaAceite({ id, ambiente, loteId }: { id: string; ambiente: Ambiente; loteId?: string }) {
  const base = await carregarAceite(id);
  if (!base) notFound();

  const [podeVendasArea, podeEngArea, podeComprasArea, podePcpArea, podeAtendArea] = await Promise.all([
    podeEditar("ACEITE_VENDAS"),
    podeEditar("ACEITE_ENGENHARIA"),
    podeEditar("COMPRAS_PM"),
    podeEditar("PCP_ENTREGA"),
    podeEditar("ATENDIMENTO_CLIENTE"),
  ]);
  // Cada ambiente age só pelo próprio setor, mesmo que a pessoa (ex.: administrador) tenha outras áreas.
  const admin = await ehAdmin();
  const podeVendas = ambiente === "vendas" && podeVendasArea;
  const podeEngenharia = ambiente === "engenharia" && podeEngArea;
  const podePcp = ambiente === "pcp" && podePcpArea;
  const podeAtendimento = ambiente === "atendimento" && podeAtendArea;

  const voltarLista = AMBIENTES[ambiente].voltar;
  const nomeAmbiente = AMBIENTES[ambiente].nome;

  // Cancelar o pedido: só Vendas, com o Aceite aberto e sem entrega confirmada (19/10/2026).
  const cancelamento = avaliarCancelamento(base as never);
  const podeCancelar = podeVendas && !["CONCLUIDO", "CANCELADO"].includes(base.etapa) && base.entregas.length === 0;
  const cancelar = podeCancelar ? (
    <FormCancelarPedido aceiteId={base.id} avisos={cancelamento.avisos} avisarPreImpressao={cancelamento.avisarPreImpressao} temOF={cancelamento.temOF} />
  ) : null;

  // Aceite dividido, depois da Engenharia: sem lote escolhido, lista os lotes; com um lote, a página
  // inteira passa a ser DAQUELE lote (os dados do lote no lugar dos do Aceite). Vendas e Engenharia, antes
  // disso, veem o Aceite todo.
  const emLotes = base.lotes.length > 0 && (base.etapa === "EM_LOTES" || base.etapa === "CONCLUIDO");
  const visaoLote = emLotes ? lotesDoAceite(base).find((v) => v.id === loteId) : undefined;
  if (emLotes && !visaoLote) {
    return (
      <EscolherLote
        aceite={base}
        voltarLista={voltarLista}
        nomeAmbiente={nomeAmbiente}
        rotaBase={ROTA_ACEITE[ambiente]}
        podeVoltar={(podeVendas || podeEngenharia || podePcp) && base.etapa === "EM_LOTES"}
        admin={admin}
        cancelar={cancelar}
      />
    );
  }
  const a = visaoLote ? comoAceite(base, visaoLote) : { ...base, linha: base.id, lote: null };

  const doc = a.orcamento;
  const modelos = modelosDoDoc(doc);
  const so = a.soEscolhida as unknown as PrecificacaoTier | null;
  const pms = a.pedidosMaterial;
  const itens = lerItens(a.itens);
  const suportes = lerSuportes(a);
  const capacidade = suportes[0]?.qtdFolha ?? null;
  const especiais = acabamentosEspeciais(doc.reqCliente as ReqCliente | null);
  const situacaoLabel = (k: string) => SITUACOES_SUPORTE.find((o) => o.key === k)?.label ?? "Estoque não verificado";
  const preco = so ? (so.precoFinal ?? so.precoFinalSugerido ?? so.precoProjetado) : null;
  // "Preço mantido / atualizado" do formulário: compara com o último fornecimento, quando há.
  const situacaoPreco =
    so?.precoAnterior == null || preco == null ? null : Math.abs(preco - so.precoAnterior) < 0.005 ? "mantido" : "atualizado";
  const chegada = chegadaDoPapel(pms);
  const datasCliente = lerDatasCliente(a);
  // Lotes gravados, no formato do formulário de Vendas (quantidades como texto, datas editáveis).
  const lotesForm: LoteForm[] = a.lotes.map((l) => ({
    id: l.id,
    itens: lerItensLote(l.itens).map((i) => ({ modeloId: i.modeloId, quantidade: i.quantidade ? i.quantidade.toLocaleString("pt-BR") : "", emEstoque: i.emEstoque ? i.emEstoque.toLocaleString("pt-BR") : "" })),
    datas: (lerDatasCliente(l).length ? lerDatasCliente(l) : [{ data: "", quantidade: null, obs: "" }]).map((d) => ({ data: d.data, quantidade: d.quantidade ? d.quantidade.toLocaleString("pt-BR") : "", obs: d.obs })),
    suportes: Array.isArray(l.suportes) ? (l.suportes as SuporteAceite[]) : [],
    comPM: pms.some((p) => p.loteId === l.id && p.status !== "CANCELADO"),
  }));
  const doOrc = doOrcamento(doc, doc.reqCliente as ReqCliente | null, doc.reqTecnicos as unknown as ReqTecnicos | null, so);
  const alerta = temAlertaPendente(pms);
  // Em um lote só voltam as etapas do cadastro do pedido em diante; o resto é pelo Aceite.
  const podeVoltar = a.lote
    ? (podeVendas && ["PEDIDO", "ATENDIMENTO", "ENTREGA", "CONCLUIDO"].includes(a.etapa)) ||
      (podeAtendimento && ["ATENDIMENTO", "ENTREGA"].includes(a.etapa)) ||
      (podePcp && ["PEDIDO", "CONCLUIDO"].includes(a.etapa))
    : (podeVendas && (a.etapa !== "VENDAS" || pms.length === 0) && ["VENDAS", "ENGENHARIA_MATERIAL", "EM_LOTES", "PCP", "PEDIDO", "ATENDIMENTO", "ENTREGA", "CONCLUIDO"].includes(a.etapa)) ||
      (podeAtendimento && ["ATENDIMENTO", "ENTREGA"].includes(a.etapa)) ||
      (podeEngenharia && ["ENGENHARIA_MATERIAL", "EM_LOTES", "PCP"].includes(a.etapa)) ||
      (podePcp && ["PCP", "PEDIDO", "CONCLUIDO"].includes(a.etapa));
  // Saldo a entregar: pedido do cliente menos as entregas já confirmadas (desconhecido sem quantidade).
  const totalPedido = quantidadeTotal(itens) || null;
  const jaEntregue = a.entregas.reduce((s, e) => s + Number(e.quantidade ?? 0), 0);
  const saldoEntrega = totalPedido === null ? null : Math.max(0, totalPedido - jaEntregue);
  // Sugestão de data de entrega do PCP: só calculada quando o Aceite está esperando o PCP.
  const sugestaoPcp = await (async () => {
    if (a.etapa !== "PCP") return undefined;
    const { salvo, ...parametros } = await carregarParametros();
    const folhas = calcularMontagens(itens).reduce((s, m) => s + m.folhas, 0);
    const s = sugerirData({ hoje: hojeBrasil(new Date()), chegadaPapel: chegada, folhas, facaNova: a.facaNova, clicheNovo: a.clicheNovo, acabamentoEspecial: especiais.length > 0 }, parametros);
    return { data: s.data.toISOString().slice(0, 10), passos: s.passos, ajustada: salvo };
  })();
  const temPMs = pms.length > 0 || a.situacaoPapel === "RESERVADO_PARCIAL" || a.situacaoPapel === "SEM_ESTOQUE";
  const emitirPM = podeVendas && ["VENDAS", "ENGENHARIA_MATERIAL", "EM_LOTES", "PCP"].includes(a.etapa);

  return (
    <>
      <Link href={a.lote ? `${ROTA_ACEITE[ambiente]}/${a.id}` : voltarLista} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> {a.lote ? `Lotes do Aceite ${a.numero ?? ""}` : nomeAmbiente}
      </Link>
      <PageHeader
        title={`${a.numero ? `Aceite ${a.numero}` : "Aceite sem nº"}${a.lote ? ` · Lote ${a.lote.numero}/${a.lote.de}` : ""} · ${doc.cliente ?? ""}`}
        description={
          modelos.length > 1
            ? `${modelos.length} modelos na mesma faca: ${modelos.map((m) => m.descricao).filter(Boolean).join(" / ")}`
            : `${doc.produtoDescricao ?? ""}${doc.codInterno ? ` · SC:${formatarCodigoInterno(doc.codInterno)}` : ""}`
        }
        action={
          podeVoltar || admin ? (
            <div className="flex flex-wrap items-center gap-2">
              {podeVoltar && (
                <form action={a.lote ? voltarEtapaLote : a.etapa === "VENDAS" ? voltarAceiteParaOrcamento : voltarEtapaAceite}>
                  <input type="hidden" name="id" value={a.id} />
                  {a.lote && <input type="hidden" name="loteId" value={a.lote.id} />}
                  <input type="hidden" name="voltarPara" value={voltarLista} />
                  <Button type="submit" variant="outline" size="sm" className="gap-1.5">
                    <CornerUpLeft className="h-3.5 w-3.5" /> {!a.lote && a.etapa === "VENDAS" ? "Voltar ao orçamento" : `Voltar etapa${a.lote ? " do lote" : ""}`}
                  </Button>
                </form>
              )}
              {admin && <AdminAceite aceiteId={a.id} />}
            </div>
          ) : undefined
        }
      />

      {/* Tudo dentro de um cartão branco, como o formulário do Novo Orçamento: solto sobre o fundo
          creme, os campos pareciam texto fixo (pedido do Thiago em 11/10/2026). */}
      <div className="flex max-w-4xl flex-col gap-5 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-6">
        {base.etapa === "CANCELADO" && <BannerCancelado aceite={base} podeVendas={podeVendas} />}
        {cancelar}
        {base.etapa !== "CANCELADO" && <Andamento a={a} papelOkLotes={base.lotes.length > 0 && !a.lote ? lotesDoAceite(base).every((l) => loteGarantido(l, base.pedidosMaterial)) : undefined} />}

        <FichaResumo
          rows={[
            { label: "SO fechada", value: so ? `${so.numeroSequencial ? `SO ${so.numeroSequencial} — ` : ""}${rotuloSO(so)} · ${fmtMoney(valorSO(so))}` : "—" },
            {
              label: "Preço (milheiro)",
              value: preco == null ? "—" : `${fmtMoney(preco)}${situacaoPreco ? ` · ${situacaoPreco}` : ""}${so?.precoAnterior != null && situacaoPreco === "atualizado" ? ` (antes ${fmtMoney(so.precoAnterior)})` : ""}`,
            },
            { label: "Classificação", value: classificacaoLabel(doc.classificacao) },
            { label: "FSC", value: `${doc.fsc || "—"}${doc.usaSelo ? " · usa logo FSC" : ""}` },
            { label: "Representante", value: `${doc.representante || "—"}${doc.comissaoCev ? ` · comissão ${doc.comissaoCev}` : ""}` },
            { label: "Prazo de pagamento", value: doc.condPagamento || "—" },
            { label: "Acabamento especial", value: especiais.length ? `Sim · ${especiais.join(", ")}` : "Não" },
            ...(datasCliente.length ? [{ label: datasCliente.length > 1 ? "Datas do cliente" : "Data do cliente", value: textoDatasCliente(datasCliente) }] : []),
            { label: "Nº de Orçamento", value: doc.numeroOrcamento || "—" },
            { label: "Nº de Pré Cadastro", value: doc.preCadastro || "—" },
            ...(so?.pedidoCliente ? [{ label: "Pedido do cliente (OC)", value: so.pedidoCliente }] : []),
            ...(a.pedidoInterno ? [{ label: "Pedido interno", value: a.pedidoInterno }] : []),
            ...(a.numeroOF ? [{ label: "Nº da OF", value: a.numeroOF }] : []),
            { label: "Cliente aprovou em", value: fmtDateTime(doc.desfechoEm) },
          ]}
        />

        {/* Já definido no orçamento (lotes, entregas, acerto e montagem): aparece aqui para ninguém depender do papel físico. */}
        <FormSection title="Do orçamento">
          <ResumoBox
            rows={[
              // O papel especificado no orçamento fica visível em toda etapa, mesmo depois de Vendas definir outro a utilizar.
              ...suportes
                .filter((x) => x.doOrcamento)
                .map((x, n, l) => ({
                  label: l.length > 1 ? `Papel especificado ${n + 1}` : "Papel especificado",
                  value: `${textoSuporte(x.doOrcamento!)} · código ${x.doOrcamento!.codigo || "—"}`,
                })),
              // Conjugação definida pela Engenharia no orçamento: o que sai junto e o que sai sozinho (só com mais de um modelo).
              ...(modelos.length > 1
                ? [
                    {
                      label: "Conjugação (Engenharia)",
                      value: modelos.some((m) => m.conjugacao === undefined || m.conjugacao === null)
                        ? "não informada neste orçamento"
                        : modelos.every((m) => m.conjugacao === 0)
                          ? "Sem conjugação (cada modelo é uma montagem)"
                          : (montagensDoPedido(modelos) ?? []).map((g) => `Montagem ${g.numero}: ${g.modelos.join(" + ")}`).join(" · "),
                    },
                  ]
                : []),
              { label: "Lotes orçados", value: doOrc.lotes ?? "—" },
              { label: "Entregas", value: doOrc.entregas ? `${doOrc.entregas}${doOrc.datasEntrega ? ` · ${doOrc.datasEntrega}` : ""}${doOrc.localEntrega ? ` · ${doOrc.localEntrega}` : ""}` : "—" },
              ...doOrc.materiais.flatMap((m, n) => [
                { label: doOrc.materiais.length > 1 ? `Folhas de acerto · ${m.papel}` : "Folhas de acerto", value: m.folhasAcerto != null ? fmtQuantidade(m.folhasAcerto) : "não informado" },
                ...(m.montagem
                  ? [{ label: doOrc.materiais.length > 1 ? `Montagem · ${m.papel}` : "Montagem", value: `folha ${m.montagem.formatoFolha} · ${m.montagem.pecasPorFolha} peça(s) por folha · aproveitamento ${m.montagem.aproveitamento.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% · ${fmtQuantidade(m.montagem.folhas)} folhas de produção` }]
                  : n === 0
                    ? [{ label: "Montagem", value: "sem pré-montagem aprovada no orçamento" }]
                    : []),
              ]),
            ]}
          />
        </FormSection>

        {alerta && (
          <div className="flex flex-col gap-2 rounded-lg border border-bad/30 bg-bad-soft p-3 text-sm text-bad">
            <div className="flex items-center gap-2 font-semibold">
              <TriangleAlert className="h-4 w-4" /> O fornecedor mudou um Pedido de Material
            </div>
            <p>Veja o histórico do PM abaixo. A data de entrega pode precisar ser revista.</p>
            {(podePcp || podeVendas || podeAtendimento) && (
              <form action={marcarAlertasVistos}>
                <input type="hidden" name="aceiteId" value={a.id} />
                <Button type="submit" size="sm" variant="outline">Marcar como visto</Button>
              </form>
            )}
          </div>
        )}

        <ProtocolosDoAceite orcamentoId={doc.id} />
        {(podeVendas || podeAtendimento) && doc.anexos.length > 0 && <ArtesDaOrdemDeCompra anexos={doc.anexos} />}

        {/* E-mails e documentos do cliente que comprovam a ordem de compra: anexados no desfecho (Retorno do Cliente), aqui só leitura. */}
        {doc.anexos.length > 0 && (
          <AnexoUpload
            orcamentoId={doc.id}
            tipo="ORDEM_COMPRA"
            titulo="Ordem de compra do cliente: e-mails e documentos"
            somenteLeitura
            compacto
            anexos={doc.anexos.map((x) => ({ id: x.id, nome: x.nome, url: x.url, mime: x.mime, tamanho: x.tamanho }))}
          />
        )}

        {/* ---------- Vendas ---------- */}
        {a.etapa === "VENDAS" ? (
          podeVendas ? (
            <FormVendas
              aceite={{ ...a, itens, suportes, lotes: lotesForm }}
              papeisSemPM={suportesSemPM(suportes, pms).map((x) => x.id)}
              papeisSemPMPorLote={Object.fromEntries(a.lotes.map((l) => [l.id, suportesSemPM(Array.isArray(l.suportes) ? (l.suportes as SuporteAceite[]) : [], pms.filter((p) => p.loteId === l.id)).map((x) => x.id)]))}
              qtdSO={so ? parseQuantidade(so.quantidade) : null}
            />
          ) : (
            <Aviso>Aguardando Vendas preencher o Aceite.</Aviso>
          )
        ) : (
          <FormSection title="Vendas">
            {podeVendas && ["ENGENHARIA_MATERIAL", "EM_LOTES"].includes(base.etapa) && (
              <p className="rounded-md border border-border bg-muted/40 p-2.5 text-xs text-muted-foreground">
                Este Aceite já foi liberado para a Engenharia, por isso Vendas não edita mais aqui. Para mudar quantidades, lotes ou papel, use
                <b className="text-foreground"> {base.etapa === "EM_LOTES" ? "Voltar o Aceite (refazer a divisão)" : "Voltar etapa"}</b>:
                ele volta a Vendas, onde tudo é editável de novo.
              </p>
            )}
            <ResumoBox
              rows={[
                ...suportes.map((x, n) => ({
                  label: suportes.length > 1 ? `Papel ${n + 1}` : "Papel",
                  value: `${textoSuporte(x)} · código ${x.codigo || "—"} · ${x.folhas ? `${x.folhas.toLocaleString("pt-BR")} folhas` : "folhas ?"} · ${situacaoLabel(x.situacao)}${x.obs ? ` (${x.obs})` : ""}`,
                })),
                {
                  label: "Produto acabado em estoque",
                  value:
                    a.temProdutoAcabado === true
                      ? `Há sobra na expedição · versão conferida: ${visto(a.versaoVerificadaPor, a.versaoVerificadaEm)}`
                      : a.temProdutoAcabado === false
                        ? `Não há · ${visto(a.estoqueVerificadoPor, a.estoqueVerificadoEm)}`
                        : visto(a.estoqueVerificadoPor, a.estoqueVerificadoEm),
                },
                { label: "Papel", value: situacaoPapelLabel(a.situacaoPapel) + (a.papelObs ? ` (${a.papelObs})` : "") },
                { label: "Liberado por", value: visto(a.vendasLiberadoPor, a.vendasLiberadoEm) },
              ]}
            />
          </FormSection>
        )}
        {a.etapa !== "VENDAS" && (
          <FormSection title={a.engenhariaEm ? "Itens e montagem" : "Itens do pedido"}>
            <ResumoItens itens={itens} capacidade={capacidade} />
          </FormSection>
        )}
        {/* Aceite dividido: a Engenharia analisa uma vez só e enxerga aqui como o pedido foi dividido. */}
        {base.etapa !== "VENDAS" && a.lotes.length > 0 && (
          <FormSection title={`Lotes (${a.lotes.length})`}>
            <ResumoLotes lotes={lotesDoAceite(base)} />
          </FormSection>
        )}

        {/* ---------- Pedidos de Material ---------- */}
        {(temPMs || emitirPM) && (
          <PedidosMaterial
            aceiteId={a.id}
            pms={pms}
            podeEmitir={emitirPM}
            podeCompras={false}
            podeCancelar={podeVendas}
            nota={podeComprasArea ? "Fornecedor e prazo são lançados no módulo Compras." : undefined}
            papeis={suportes.map((x) => ({ id: x.id, codigo: x.codigo, descricao: textoSuporte(x), folhas: x.folhas, formato: x.formato, gramatura: x.gramatura }))}
            lotes={a.lotes.map((l) => {
              const sup = Array.isArray(l.suportes) ? (l.suportes as SuporteAceite[]) : [];
              return {
                id: l.id,
                rotulo: `Lote ${l.numero}/${a.lotes.length}`,
                folhas: sup[0]?.folhas ?? null,
                papeis: sup.map((x) => ({ id: x.id, codigo: x.codigo, descricao: textoSuporte(x), folhas: x.folhas, formato: x.formato, gramatura: x.gramatura })),
              };
            })}
          />
        )}

        {/* ---------- Engenharia ---------- */}
        {a.engenhariaEm ? (
          <FormSection title="Engenharia">
            <ResumoBox
              rows={[
                { label: "Cadastro", value: a.cadastroSituacao === "CRIADO" ? "Produto novo: cadastro e código criados" : "Produto já cadastrado" },
                { label: "Faca", value: a.codigoFaca ? `${a.codigoFaca}${a.facaNova ? " (nova)" : ""}` : a.facaNova ? "Faca nova, código a definir" : "Sem faca" },
                { label: "Clichê", value: a.clicheNovo ? "Clichê novo" : "Sem clichê novo" },
                ...modelos
                  .filter((m) => m.codInterno)
                  .map((m) => ({ label: `Nº de Cadastro${modelos.length > 1 ? ` — ${m.descricao}` : ""}`, value: formatarCodigoInterno(m.codInterno) })),
                { label: "Confirmado por", value: visto(a.engenhariaPor, a.engenhariaEm) },
                ...(a.engenhariaObs ? [{ label: "Observação", value: a.engenhariaObs }] : []),
              ]}
            />
          </FormSection>
        ) : a.etapa === "ENGENHARIA_MATERIAL" ? (
          podeEngenharia ? (
            <FormEngenharia aceiteId={a.id} modelos={modelos} itens={itens} capacidade={capacidade} />
          ) : (
            <Aviso>Aguardando a Engenharia conferir o cadastro de produto.</Aviso>
          )
        ) : null}

        {/* ---------- PCP ---------- */}
        {a.etapa === "PCP" &&
          (podePcp ? (
            <FormPcp aceiteId={a.id} loteId={a.lote?.id} chegadaPapel={chegada ? chegada.toISOString().slice(0, 10) : null} dataCliente={datasCliente.length ? textoDatasCliente(datasCliente) : null} sugestao={sugestaoPcp} />
          ) : (
            <Aviso>Aguardando o PCP definir a data de entrega.</Aviso>
          ))}
        {a.dataEntrega && (
          <FormSection title="PCP">
            <ResumoBox
              rows={[
                { label: "Data de entrega", value: fmtDia(a.dataEntrega) },
                { label: "Definida por", value: visto(a.pcpPor, a.pcpEm) },
                ...(a.pcpObs ? [{ label: "Observação", value: a.pcpObs }] : []),
              ]}
            />
          </FormSection>
        )}

        {/* Pedido interno: pendência de Vendas depois da Engenharia (no cadastro do pedido ele é pedido ali). */}
        {podeVendas && a.engenhariaEm && !a.pedidoInterno && a.etapa !== "VENDAS" && a.etapa !== "PEDIDO" && a.etapa !== "CONCLUIDO" && <FormPedidoInterno aceiteId={a.id} />}

        {/* ---------- Pedido ---------- */}
        {a.etapa === "PEDIDO" &&
          (podeVendas ? (
            <FormPedido aceiteId={a.id} loteId={a.lote?.id} numero={a.numero} dataEntrega={fmtDia(a.dataEntrega)} pedidoInterno={a.pedidoInterno} />
          ) : (
            <Aviso>Aguardando Vendas cadastrar o pedido no sistema informatizado.</Aviso>
          ))}
        {["ATENDIMENTO", "ENTREGA", "CONCLUIDO"].includes(a.etapa) && (
          <FormSection title="Pedido">
            <ResumoBox
              rows={[
                { label: "Nº do pedido", value: a.numeroPedido || a.numero || "—" },
                { label: "Cadastrado por", value: visto(a.pedidoCadastradoPor, a.pedidoCadastradoEm) },
                ...(a.clienteInformadoEm ? [{ label: "Data enviada por", value: visto(a.clienteInformadoPor, a.clienteInformadoEm) }] : []),
              ]}
            />
            {podeVendas ? (
              <FormNumeroOF aceiteId={a.id} loteId={a.lote?.id} atual={a.numeroOF} />
            ) : (
              <p className="text-xs text-muted-foreground">{a.numeroOF ? `OF ${a.numeroOF}.` : "OF ainda não registrada (pendência de Vendas)."}</p>
            )}
          </FormSection>
        )}
        {(a.negociacoes.length > 0 || (podeAtendimento && (a.etapa === "ATENDIMENTO" || a.etapa === "ENTREGA"))) && (
          <BlocoNegociacao aceiteId={a.id} loteId={a.lote?.id} etapa={a.etapa} negociacoes={a.negociacoes} podeAtendimento={podeAtendimento} podePcp={podePcp} />
        )}
        {a.etapa === "ATENDIMENTO" &&
          (podeAtendimento ? (
            <FormInformarCliente aceiteId={a.id} loteId={a.lote?.id} dataEntrega={fmtDia(a.dataEntrega)} representante={doc.representante} />
          ) : (
            <Aviso>Aguardando o Atendimento ao Cliente enviar a data ao cliente e/ou representante.</Aviso>
          ))}

        {/* ---------- Entrega ao cliente (PCP) ---------- */}
        {a.etapa === "ENTREGA" &&
          (podePcp ? (
            <FormEntrega aceiteId={a.id} loteId={a.lote?.id} dataEntrega={fmtDia(a.dataEntrega)} saldo={saldoEntrega} />
          ) : (
            <Aviso>Pedido em produção, entrega prevista para {fmtDia(a.dataEntrega)}. O PCP confirma quando a entrega ao cliente for feita.</Aviso>
          ))}
        {(a.entregueEm || a.entregas.length > 0) && (
          <FormSection title="Entrega ao cliente">
            {a.entregas.length > 0 && (
              <ol className="flex flex-col gap-1 text-sm">
                {a.entregas.map((e) => (
                  <li key={e.id} className="flex flex-wrap gap-x-2 text-muted-foreground">
                    <span className="font-mono">{fmtDia(e.entregueEm)}</span>
                    <b className="text-foreground">{e.quantidade === null ? "entrega" : `${fmtQuantidade(Number(e.quantidade))} un.`}</b>
                    {e.obs && <span>· {e.obs}</span>}
                    <span className="text-xs">— {e.porNome}</span>
                  </li>
                ))}
              </ol>
            )}
            {a.etapa === "ENTREGA" && saldoEntrega !== null && jaEntregue > 0 && (
              <p className="text-sm text-warn">Saldo a entregar: {fmtQuantidade(saldoEntrega)} un. (pedido de {fmtQuantidade(totalPedido!)})</p>
            )}
            {a.entregueEm && (
              <ResumoBox
                rows={[
                  { label: "Concluída em", value: fmtDia(a.entregueEm) },
                  { label: "Confirmada por", value: visto(a.entregaConfirmadaPor, a.entregaConfirmadaEm) },
                  ...(a.entregaCancelamentoMotivo
                    ? [{ label: "Saldo cancelado", value: `${a.entregaSaldoCancelado === null ? "" : `${fmtQuantidade(Number(a.entregaSaldoCancelado))} un. · `}${a.entregaCancelamentoMotivo}` }]
                    : []),
                  ...(a.entregaObs ? [{ label: "Observação", value: a.entregaObs }] : []),
                ]}
              />
            )}
          </FormSection>
        )}
      </div>
    </>
  );
}

// Resumo do topo em grade (rótulo em cima, valor embaixo), em vez de uma linha por informação:
// ocupa bem menos altura e deixa o formulário da etapa mais perto do topo (11/10/2026).
function FichaResumo({ rows }: { rows: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-5 gap-y-2.5 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-3 lg:grid-cols-4">
      {rows.map((r) => (
        <div key={r.label} className="min-w-0">
          <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{r.label}</dt>
          <dd className="m-0 break-words text-sm font-medium text-foreground">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

// Só os arquivos da ordem de compra que ainda não foram mandados para o protocolo.
async function ArtesDaOrdemDeCompra({ anexos }: { anexos: { id: string; nome: string }[] }) {
  const ja = await prisma.arteEnviada.findMany({ where: { anexoId: { in: anexos.map((x) => x.id) } }, select: { anexoId: true } });
  const feitos = new Set(ja.map((x) => x.anexoId));
  return <MarcarComoArte anexos={anexos.filter((x) => !feitos.has(x.id)).map((x) => ({ id: x.id, nome: x.nome }))} />;
}
