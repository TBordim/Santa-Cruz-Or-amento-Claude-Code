import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { fmtDateTime, dataLimite } from "@/lib/orcamentos/constantes";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

function Kpi({ label, valor, cor }: { label: string; valor: number | string; cor?: string }) {
  return (
    <Card className="gap-2 py-4">
      <CardHeader className="px-4">
        <CardTitle className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="font-mono text-2xl font-semibold tabular-nums" style={cor ? { color: cor } : undefined}>
          {valor}
        </div>
      </CardContent>
    </Card>
  );
}

// Equivalente a viewResumo() — janela fixa de 7 dias para a atividade da Diretoria; conversão
// de ofertas é all-time (todas as ofertas enviadas, não só as dos últimos 7 dias).
export default async function ResumoPage() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");

  const cutoff = dataLimite(7);

  const [abertos, autoAprovados, pendentesAgora, decididosManual] = await Promise.all([
    prisma.orcamento.count({ where: { origem: "NOVO", criadoEm: { gte: cutoff } } }),
    prisma.orcamento.count({ where: { origem: "NOVO", statusDiretoria: "AUTO_APROVADO", atualizadoEm: { gte: cutoff } } }),
    prisma.orcamento.count({ where: { origem: "NOVO", etapa: "DIRETORIA", statusDiretoria: "PENDENTE" } }),
    prisma.orcamento.findMany({
      where: { origem: "NOVO", statusDiretoria: { in: ["APROVADO", "REVISAO"] }, atualizadoEm: { gte: cutoff } },
      orderBy: { atualizadoEm: "desc" },
    }),
  ]);

  const aprovadosManual = decididosManual.filter((d) => d.statusDiretoria === "APROVADO").length;
  const revisoes = decididosManual.filter((d) => d.statusDiretoria === "REVISAO").length;

  const finalizados = await prisma.orcamento.findMany({ where: { origem: "NOVO", etapa: "FINALIZADO" } });
  const ganhos = finalizados.filter((d) => d.desfecho === "POSITIVO").length;
  const perdidos = finalizados.filter((d) => d.desfecho === "NEGATIVO").length;
  const semRetorno = finalizados.filter((d) => d.desfecho === "SEM_RETORNO").length;
  const aguardando = finalizados.filter((d) => !d.desfecho || d.desfecho === "AGUARDANDO").length;
  const respondidos = ganhos + perdidos + semRetorno;
  const taxaConversao = respondidos > 0 ? Math.round((ganhos / respondidos) * 100) : null;

  return (
    <>
      <PageHeader title="Resumo semanal" description="Últimos 7 dias na Diretoria, mais a conversão de todas as ofertas já enviadas." />

      <h3 className="mb-3 text-sm font-semibold text-foreground">Atividade da Diretoria (últimos 7 dias)</h3>
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <Kpi label="Orçamentos abertos" valor={abertos} />
        <Kpi label="Aprovados automaticamente" valor={autoAprovados} cor="var(--color-good)" />
        <Kpi label="Aprovados pela Diretoria" valor={aprovadosManual} cor="var(--color-good)" />
        <Kpi label="Devolvidos p/ revisão" valor={revisoes} cor="var(--color-bad)" />
        <Kpi label="Pendentes agora" valor={pendentesAgora} cor="var(--color-warn)" />
      </div>

      {decididosManual.length > 0 && (
        <div className="mb-8 rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Decisão</TableHead>
                <TableHead>Quando</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {decididosManual.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.cliente}</TableCell>
                  <TableCell className="text-muted-foreground">{d.produtoDescricao}</TableCell>
                  <TableCell>
                    {d.statusDiretoria === "APROVADO" ? (
                      <Badge className="border-0 bg-good-soft text-good">Aprovado</Badge>
                    ) : (
                      <Badge className="border-0 bg-bad-soft text-bad">Revisão</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{fmtDateTime(d.atualizadoEm)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <h3 className="mb-3 text-sm font-semibold text-foreground">Conversão de ofertas enviadas</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <Kpi label="Ganhos" valor={ganhos} cor="var(--color-good)" />
        <Kpi label="Perdidos" valor={perdidos} cor="var(--color-bad)" />
        <Kpi label="Sem retorno" valor={semRetorno} />
        <Kpi label="Aguardando" valor={aguardando} />
        <Kpi label="Taxa de conversão" valor={taxaConversao !== null ? `${taxaConversao}%` : "—"} cor="var(--primary)" />
      </div>
    </>
  );
}
