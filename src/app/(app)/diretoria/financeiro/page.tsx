import Link from "next/link";
import { ETAPAS } from "@/lib/orcamentos/constantes";
import { duracaoCurta } from "@/lib/orcamentos/historico-etapas";
import { redirect } from "next/navigation";
import { sessaoAtual, exigirModulo } from "@/lib/permissions";
import { fmtMoney } from "@/lib/orcamentos/constantes";
import {
  PERIODOS_FIN,
  lerPeriodoFin,
  orcamentosDoPeriodo,
  carteiraDeEntregas,
  previsaoDeFaturamento,
  previsaoDeRecebimento,
  realizadoNoPeriodo,
  canceladosNoPeriodo,
  renegociacoesDoPeriodo,
  tempoPorEtapa,
} from "@/lib/financeiro/dados";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

const pl = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
const pct = (n: number | null) => (n === null ? "—" : `${n}%`);
const pctDec = (n: number | null) => (n === null ? "—" : `${n.toFixed(1).replace(".", ",")}%`);

function Kpi({ label, valor, sub, tom }: { label: string; valor: string; sub?: string; tom?: "bom" | "ruim" | "atencao" }) {
  const cor = tom === "bom" ? "var(--color-good)" : tom === "ruim" ? "var(--color-bad)" : tom === "atencao" ? "var(--color-warn)" : undefined;
  return (
    <Card className="gap-1.5 py-4">
      <CardHeader className="px-4">
        <CardTitle className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="whitespace-nowrap font-mono text-xl font-semibold tabular-nums" style={cor ? { color: cor } : undefined}>
          {valor}
        </div>
        {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

// Barras simples (sem biblioteca): largura proporcional ao maior valor da lista.
function Barras({ itens, cor = "var(--color-good)" }: { itens: { label: string; valor: number; sub?: string }[]; cor?: string }) {
  const max = Math.max(1, ...itens.map((i) => i.valor));
  return (
    <div className="flex flex-col gap-1.5">
      {itens.map((i) => (
        <div key={i.label} className="grid grid-cols-[140px_1fr_auto] items-center gap-2 text-sm">
          <span className="truncate text-muted-foreground">{i.label}</span>
          <div className="h-5 overflow-hidden rounded bg-muted/50">
            <div className="h-full rounded" style={{ width: `${Math.max(i.valor > 0 ? 2 : 0, (i.valor / max) * 100)}%`, background: cor }} />
          </div>
          <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
            {fmtMoney(i.valor)}
            {i.sub && <span className="ml-1 font-normal text-muted-foreground">{i.sub}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

function Bloco({ titulo, descricao, children }: { titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <section className="mb-9">
      <h3 className="text-sm font-semibold text-foreground">{titulo}</h3>
      {descricao && <p className="mb-3 mt-0.5 text-xs text-muted-foreground">{descricao}</p>}
      {!descricao && <div className="mb-3" />}
      {children}
    </section>
  );
}

// Painel financeiro da Diretoria: o que foi fechado e perdido, o que está para entrar (faturamento e
// recebimento previstos), o que está em aberto e quem está vendendo. Pedido do Thiago em 23/10/2026.
export default async function PainelFinanceiroPage({ searchParams }: { searchParams: Promise<{ p?: string; de?: string; ate?: string }> }) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  await exigirModulo("diretoria");

  const sp = await searchParams;
  const periodo = lerPeriodoFin(sp);

  const [orc, carteira, cancelados, reneg, tempos] = await Promise.all([orcamentosDoPeriodo(periodo), carteiraDeEntregas(), canceladosNoPeriodo(periodo), renegociacoesDoPeriodo(periodo), tempoPorEtapa(periodo)]);
  const fat = previsaoDeFaturamento(carteira.entregas);
  const rec = previsaoDeRecebimento(carteira.entregas);
  const realizado = realizadoNoPeriodo(carteira.entregas, periodo);
  const perdidoN = orc.negativo.n + orc.semRetorno.n;
  const perdidoV = orc.negativo.valor + orc.semRetorno.valor;
  const carteiraAberta = carteira.entregas.filter((e) => !e.concluido).reduce((s, e) => s + e.valor, 0);

  return (
    <>
      <PageHeader title="Painel financeiro" description="Números para a Diretoria decidir: fechamento, o que vai entrar, o que está em aberto e quem está vendendo." />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {PERIODOS_FIN.map((p) => (
          <Button key={p.key} asChild size="sm" variant={periodo.key === p.key ? "default" : "outline"}>
            <Link href={`/diretoria/financeiro?p=${p.key}`}>{p.label}</Link>
          </Button>
        ))}
        <form className="flex flex-wrap items-center gap-1.5">
          <Input type="date" name="de" className="h-8 w-[140px]" required />
          <span className="text-xs text-muted-foreground">até</span>
          <Input type="date" name="ate" className="h-8 w-[140px]" required />
          <Button type="submit" size="sm" variant="outline">Aplicar</Button>
        </form>
        <span className="ml-auto text-xs font-medium text-muted-foreground">Período: {periodo.label}</span>
      </div>

      <Bloco titulo="Fechamento no período" descricao="Ofertas enviadas e respostas dos clientes registradas dentro do período escolhido.">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Kpi label="Ofertas enviadas" valor={fmtMoney(orc.enviadas.valor)} sub={pl(orc.enviadas.n, "orçamento", "orçamentos")} />
          <Kpi label="Fechado (pedidos)" valor={fmtMoney(orc.positivo.valor)} sub={pl(orc.positivo.n, "orçamento", "orçamentos")} tom="bom" />
          <Kpi label="Perdido" valor={fmtMoney(perdidoV)} sub={`${pl(perdidoN, "orçamento", "orçamentos")} (${orc.negativo.n} negativo(s), ${orc.semRetorno.n} sem retorno)`} tom="ruim" />
          <Kpi label="Taxa de fechamento" valor={pct(orc.taxaQtd)} sub={`por valor: ${pct(orc.taxaValor)}`} tom={orc.taxaQtd === null ? undefined : orc.taxaQtd >= 40 ? "bom" : "atencao"} />
          <Kpi label="Ticket médio fechado" valor={orc.ticketMedio === null ? "—" : fmtMoney(orc.ticketMedio)} />
          <Kpi label="Margem bruta média" valor={pctDec(orc.margemBruta.media)} sub={`P1 + P2 · conhecida em ${orc.margemBruta.conhecidos} de ${orc.margemBruta.total} fechados · P2 média ${pctDec(orc.margemP2)} · custo primário médio ${pctDec(orc.custoPrimario)} (fechados, ponderado por valor)`} />
        </div>
      </Bloco>

      <Bloco
        titulo="Quanto vai entrar: faturamento previsto"
        descricao="Pedidos e lotes ainda não entregues, pela data de entrega que o PCP prometeu. As faixas se sobrepõem (a semana está dentro da quinzena, que está dentro do mês)."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardContent className="flex flex-col gap-1">
              <Table>
                <TableBody>
                  {fat.faixas.map((f) => (
                    <TableRow key={f.key}>
                      <TableCell className="text-muted-foreground">{f.label}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">{pl(f.n, "entrega", "entregas")}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">{fmtMoney(f.valor)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className={fat.atrasado.n ? "bg-bad/10" : undefined}>
                    <TableCell className="font-medium text-bad">Atrasado (data passou e não foi entregue)</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{pl(fat.atrasado.n, "entrega", "entregas")}</TableCell>
                    <TableCell className="text-right font-mono font-semibold text-bad">{fmtMoney(fat.atrasado.valor)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-muted-foreground">Sem data de entrega ainda</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{pl(fat.semData.n, "entrega", "entregas")}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{fmtMoney(fat.semData.valor)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="mt-1 border-t border-border pt-2 text-sm">
                Carteira de pedidos a entregar: <strong className="font-mono">{fmtMoney(carteiraAberta)}</strong>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="px-4 pb-0">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Por semana (próximas 8)</CardTitle>
            </CardHeader>
            <CardContent>
              <Barras itens={fat.porSemana.map((s) => ({ label: `Sem. ${s.label}`, valor: s.valor }))} />
            </CardContent>
          </Card>
        </div>
      </Bloco>

      <Bloco
        titulo="Quanto vai receber: recebimento estimado"
        descricao="Estimativa: data da entrega mais o prazo da condição de pagamento do cliente (28/35/42 dias vira três parcelas iguais). O sistema ainda não sabe quem já pagou."
      >
        <Card>
          <CardContent>
            <Table>
              <TableBody>
                {rec.faixas.map((f) => (
                  <TableRow key={f.key}>
                    <TableCell className="text-muted-foreground">{f.label}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{pl(f.n, "parcela", "parcelas")}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{fmtMoney(f.valor)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell className="text-muted-foreground">Já vencido no cálculo (confirmar no financeiro)</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">{pl(rec.vencido.n, "parcela", "parcelas")}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{fmtMoney(rec.vencido.valor)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-muted-foreground">Prazo de pagamento não identificado</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">{pl(rec.semPrazo.n, "entrega", "entregas")}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{fmtMoney(rec.semPrazo.valor)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-muted-foreground">Sem data de entrega (não dá para estimar)</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">{pl(rec.semData.n, "entrega", "entregas")}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{fmtMoney(rec.semData.valor)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Bloco>

      <Bloco titulo="Em aberto agora" descricao="Onde está o dinheiro que ainda não virou pedido.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="px-4 pb-0">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Funil de orçamentos</CardTitle>
            </CardHeader>
            <CardContent>
              <Barras
                cor="#3E7FA6"
                itens={[
                  ...orc.funil.map((f) => ({ label: f.etapa, valor: f.valor, sub: `(${f.n})` })),
                  { label: "6. Aguardando cliente", valor: orc.aguardando.valor, sub: `(${orc.aguardando.n})` },
                ]}
              />
              <p className="mt-2 text-xs text-muted-foreground">Valor = o que o orçamento pode render (SO de maior valor). A etapa 1 ainda não tem preço.</p>
            </CardContent>
          </Card>
          <div className="grid grid-cols-2 gap-3 content-start">
            <Kpi label="Aguardando retorno do cliente" valor={fmtMoney(orc.aguardando.valor)} sub={`${pl(orc.aguardando.n, "oferta", "ofertas")} · média ${orc.aguardando.diasMedios ?? "—"} dias`} />
            <Kpi
              label="Esperando há 7 dias ou mais"
              valor={fmtMoney(orc.aguardando.maisDeSete.valor)}
              sub={`${pl(orc.aguardando.maisDeSete.n, "oferta", "ofertas")} · a mais antiga: ${orc.aguardando.maisAntigo ?? "—"} dias`}
              tom={orc.aguardando.maisDeSete.n ? "ruim" : undefined}
            />
            <Kpi
              label="Prazo de 15 dias vencido"
              valor={fmtMoney(orc.aguardando.prazoVencido.valor)}
              sub={`${pl(orc.aguardando.prazoVencido.n, "orçamento", "orçamentos")} a cancelar · ${orc.aguardando.prazoVencendo} vencendo em até 3 dias`}
              tom={orc.aguardando.prazoVencido.n ? "ruim" : orc.aguardando.prazoVencendo ? "atencao" : undefined}
            />
            <Kpi label="Esperando a Diretoria" valor={fmtMoney(orc.pendentesDiretoria.valor)} sub={pl(orc.pendentesDiretoria.n, "orçamento", "orçamentos")} tom={orc.pendentesDiretoria.n ? "atencao" : undefined} />
            <Kpi
              label="Com discrepância > 2,5%"
              valor={String(orc.pendentesDiretoria.comDiscrepancia)}
              sub={`aprovados automaticamente no período: ${orc.autoAprovadas}`}
              tom={orc.pendentesDiretoria.comDiscrepancia ? "ruim" : undefined}
            />
          </div>
        </div>
      </Bloco>

      <Bloco titulo="Realizado e perdas no período">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Entregue no período" valor={fmtMoney(realizado.valor)} sub={`${pl(realizado.n, "entrega confirmada", "entregas confirmadas")} pelo PCP`} tom="bom" />
          <Kpi label="Pedidos cancelados" valor={fmtMoney(cancelados.valor)} sub={pl(cancelados.n, "pedido", "pedidos")} tom={cancelados.n ? "ruim" : undefined} />
          <Kpi label="Orçamentos negativos" valor={fmtMoney(orc.negativo.valor)} sub={pl(orc.negativo.n, "orçamento", "orçamentos")} />
          <Kpi label="Cancelados por vencimento do prazo" valor={fmtMoney(orc.semRetorno.valor)} sub={pl(orc.semRetorno.n, "orçamento", "orçamentos")} />
        </div>
      </Bloco>

      <Bloco titulo="Tempo em cada etapa" descricao="Quanto tempo os cards levam em cada etapa do orçamento, das passagens que terminaram no período. Só entram cards com a hora de entrada registrada (a partir de 28/10/2026).">
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Etapa</TableHead>
                  <TableHead className="text-right">Tempo médio</TableHead>
                  <TableHead className="text-right">Maior</TableHead>
                  <TableHead className="text-right">Passagens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tempos.map((t) => (
                  <TableRow key={t.etapa}>
                    <TableCell>{ETAPAS.find((e) => e.key === t.etapa)?.label ?? t.etapa}</TableCell>
                    <TableCell className="text-right font-mono">{t.media === null ? "—" : duracaoCurta(t.media)}</TableCell>
                    <TableCell className="text-right font-mono">{t.maior === null ? "—" : duracaoCurta(t.maior)}</TableCell>
                    <TableCell className="text-right">{t.n}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Bloco>

      <Bloco titulo="Renegociações de preço" descricao="O cliente pediu ajuste de preço depois da oferta. O custo é a diferença entre o que foi ofertado e a oferta nova (rodadas já concluídas).">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Kpi label="Em renegociação agora" valor={String(reneg.abertas)} sub="voltaram ao Orçamento" tom={reneg.abertas ? "atencao" : undefined} />
          <Kpi label="Pedidas no período" valor={String(reneg.noPeriodo)} sub={pl(reneg.noPeriodo, "renegociação", "renegociações")} />
          <Kpi label="Desconto concedido" valor={fmtMoney(reneg.cedido)} sub="diferença entre a oferta anterior e a nova" tom={reneg.cedido > 0 ? "ruim" : undefined} />
        </div>
      </Bloco>

      <Bloco titulo="Quem está vendendo" descricao="Representantes e clientes no período (fechados e perdidos pela data da resposta do cliente).">
        <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
          <Card>
            <CardContent>
              {orc.reps.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nada no período.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Representante</TableHead>
                      <TableHead className="text-right">Ofertado</TableHead>
                      <TableHead className="text-right">Fechado</TableHead>
                      <TableHead className="text-right">Taxa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orc.reps.map((r) => (
                      <TableRow key={r.nome}>
                        <TableCell className="font-medium">{r.nome}</TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {fmtMoney(r.valorOfertado)} <span className="text-muted-foreground">({r.ofertas})</span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold">
                          {fmtMoney(r.valorFechado)} <span className="font-normal text-muted-foreground">({r.fechados})</span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">{pct(r.taxa)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="px-4 pb-0">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Maiores clientes fechados</CardTitle>
            </CardHeader>
            <CardContent>
              {orc.clientes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum pedido fechado no período.</p>
              ) : (
                <Barras cor="var(--color-good)" itens={orc.clientes.map((c) => ({ label: c.nome, valor: c.valor, sub: `(${c.n})` }))} />
              )}
            </CardContent>
          </Card>
        </div>
      </Bloco>

      <div className="mb-10 flex gap-2.5 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <strong className="text-foreground">Como ler estes números.</strong> Valor de um orçamento = preço final × milheiros da SO que o cliente fechou (nos
          que ainda não fecharam, a de maior valor). Faturamento previsto = valor do pedido na data de entrega do PCP; recebimento = entrega + prazo da
          condição de pagamento. O sistema ainda não recebe nota fiscal nem baixa de pagamento do ERP, então são estimativas para decidir, não o fechamento
          contábil.{carteira.semValor > 0 ? ` ${carteira.semValor} pedido(s) sem SO com valor ficaram de fora.` : ""}
        </div>
      </div>
    </>
  );
}
