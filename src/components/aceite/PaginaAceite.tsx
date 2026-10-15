import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CornerUpLeft, TriangleAlert } from "lucide-react";
import { podeEditar } from "@/lib/permissions";
import { carregarAceite } from "@/lib/aceite/dados";
import type { SetorAceite } from "@/lib/aceite/setores";
import { chegadaDoPapel, temAlertaPendente, situacaoPapelLabel, fmtDia, fmtQuantidade } from "@/lib/aceite/constantes";
import { fmtMoney, fmtDateTime, classificacaoLabel } from "@/lib/orcamentos/constantes";
import { parseQuantidade } from "@/lib/orcamentos/motor";
import { lerItens, quantidadeTotal } from "@/lib/aceite/montagem";
import { lerDatasCliente, textoDatasCliente } from "@/lib/aceite/datas-cliente";
import { lerSuportes, suportesSemPM, textoSuporte, SITUACOES_SUPORTE } from "@/lib/aceite/suportes";
import { acabamentosEspeciais } from "@/lib/aceite/acabamento";
import type { ReqCliente } from "@/lib/orcamentos/types";
import { modelosDoDoc, rotuloSO, valorSO } from "@/lib/orcamentos/modelos";
import { formatarCodigoInterno } from "@/lib/orcamentos/codigo-interno";
import type { PrecificacaoTier } from "@/lib/orcamentos/types";
import { ResumoBox, FormSection } from "@/components/form-section";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { voltarEtapaAceite, marcarAlertasVistos } from "@/app/(app)/aceite/actions";
import { Andamento } from "./Andamento";
import { FormVendas } from "./FormVendas";
import { AnexoUpload } from "@/components/anexos/AnexoUpload";
import { PedidosMaterial } from "./PedidosMaterial";
import { FormEngenharia } from "./FormEngenharia";
import { FormPcp } from "./FormPcp";
import { FormPedido, FormNumeroOF, FormPedidoInterno } from "./FormPedido";
import { FormEntrega } from "./FormEntrega";
import { FormInformarCliente } from "./FormInformarCliente";
import { BlocoNegociacao } from "./BlocoNegociacao";
import { ResumoItens } from "./ResumoItens";

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

function visto(quem: string | null | undefined, quando: Date | null | undefined) {
  return quando ? `${quem ?? "—"} · ${fmtDateTime(quando)}` : "—";
}

function Aviso({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">{children}</div>;
}

// Um Aceite visto de dentro do ambiente de um setor. Todos veem o mesmo resumo e o andamento; só o
// setor dono da etapa vê o formulário dela. Em "acompanhamento" tudo é só leitura.
export async function PaginaAceite({ id, ambiente }: { id: string; ambiente: Ambiente }) {
  const a = await carregarAceite(id);
  if (!a) notFound();

  const [podeVendasArea, podeEngArea, podeComprasArea, podePcpArea, podeAtendArea] = await Promise.all([
    podeEditar("ACEITE_VENDAS"),
    podeEditar("ACEITE_ENGENHARIA"),
    podeEditar("COMPRAS_PM"),
    podeEditar("PCP_ENTREGA"),
    podeEditar("ATENDIMENTO_CLIENTE"),
  ]);
  // Cada ambiente age só pelo próprio setor, mesmo que a pessoa (ex.: administrador) tenha outras áreas.
  const podeVendas = ambiente === "vendas" && podeVendasArea;
  const podeEngenharia = ambiente === "engenharia" && podeEngArea;
  const podePcp = ambiente === "pcp" && podePcpArea;
  const podeAtendimento = ambiente === "atendimento" && podeAtendArea;

  const voltarLista = AMBIENTES[ambiente].voltar;
  const nomeAmbiente = AMBIENTES[ambiente].nome;

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
  const alerta = temAlertaPendente(pms);
  const podeVoltar =
    (podeVendas && ["ENGENHARIA_MATERIAL", "PEDIDO", "ATENDIMENTO", "ENTREGA"].includes(a.etapa)) ||
    (podeAtendimento && ["ATENDIMENTO", "ENTREGA"].includes(a.etapa)) ||
    (podeEngenharia && a.etapa === "ENGENHARIA_MATERIAL") ||
    (podePcp && ["PCP", "PEDIDO", "CONCLUIDO"].includes(a.etapa));
  // Saldo a entregar: pedido do cliente menos as entregas já confirmadas (desconhecido sem quantidade).
  const totalPedido = quantidadeTotal(itens) || null;
  const jaEntregue = a.entregas.reduce((s, e) => s + Number(e.quantidade ?? 0), 0);
  const saldoEntrega = totalPedido === null ? null : Math.max(0, totalPedido - jaEntregue);
  const temPMs = pms.length > 0 || a.situacaoPapel === "RESERVADO_PARCIAL" || a.situacaoPapel === "SEM_ESTOQUE";
  const emitirPM = podeVendas && ["VENDAS", "ENGENHARIA_MATERIAL", "PCP"].includes(a.etapa);

  return (
    <>
      <Link href={voltarLista} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> {nomeAmbiente}
      </Link>
      <PageHeader
        title={`${a.numero ? `Aceite ${a.numero}` : "Aceite sem nº"} · ${doc.cliente ?? ""}`}
        description={
          modelos.length > 1
            ? `${modelos.length} modelos na mesma faca: ${modelos.map((m) => m.descricao).filter(Boolean).join(" / ")}`
            : `${doc.produtoDescricao ?? ""}${doc.codInterno ? ` · SC:${formatarCodigoInterno(doc.codInterno)}` : ""}`
        }
        action={
          podeVoltar ? (
            <form action={voltarEtapaAceite}>
              <input type="hidden" name="id" value={a.id} />
              <input type="hidden" name="voltarPara" value={voltarLista} />
              <Button type="submit" variant="outline" size="sm" className="gap-1.5">
                <CornerUpLeft className="h-3.5 w-3.5" /> Voltar etapa
              </Button>
            </form>
          ) : undefined
        }
      />

      {/* Tudo dentro de um cartão branco, como o formulário do Novo Orçamento: solto sobre o fundo
          creme, os campos pareciam texto fixo (pedido do Thiago em 11/10/2026). */}
      <div className="flex max-w-4xl flex-col gap-5 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-6">
        <Andamento a={a} />

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
              aceite={{ ...a, itens, suportes }}
              papeisSemPM={suportesSemPM(suportes, pms).map((x) => x.id)}
              qtdSO={so ? parseQuantidade(so.quantidade) : null}
            />
          ) : (
            <Aviso>Aguardando Vendas preencher o Aceite.</Aviso>
          )
        ) : (
          <FormSection title="Vendas">
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
            <FormPcp aceiteId={a.id} chegadaPapel={chegada ? chegada.toISOString().slice(0, 10) : null} dataCliente={datasCliente.length ? textoDatasCliente(datasCliente) : null} />
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
            <FormPedido aceiteId={a.id} numero={a.numero} dataEntrega={fmtDia(a.dataEntrega)} pedidoInterno={a.pedidoInterno} />
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
              <FormNumeroOF aceiteId={a.id} atual={a.numeroOF} />
            ) : (
              <p className="text-xs text-muted-foreground">{a.numeroOF ? `OF ${a.numeroOF}.` : "OF ainda não registrada (pendência de Vendas)."}</p>
            )}
          </FormSection>
        )}
        {(a.negociacoes.length > 0 || (podeAtendimento && (a.etapa === "ATENDIMENTO" || a.etapa === "ENTREGA"))) && (
          <BlocoNegociacao aceiteId={a.id} etapa={a.etapa} negociacoes={a.negociacoes} podeAtendimento={podeAtendimento} podePcp={podePcp} />
        )}
        {a.etapa === "ATENDIMENTO" &&
          (podeAtendimento ? (
            <FormInformarCliente aceiteId={a.id} dataEntrega={fmtDia(a.dataEntrega)} representante={doc.representante} />
          ) : (
            <Aviso>Aguardando o Atendimento ao Cliente enviar a data ao cliente e/ou representante.</Aviso>
          ))}

        {/* ---------- Entrega ao cliente (PCP) ---------- */}
        {a.etapa === "ENTREGA" &&
          (podePcp ? (
            <FormEntrega aceiteId={a.id} dataEntrega={fmtDia(a.dataEntrega)} saldo={saldoEntrega} />
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
