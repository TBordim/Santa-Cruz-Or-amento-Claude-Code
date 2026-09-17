import { redirect } from "next/navigation";
import Link from "next/link";
import { TrendingUp, Gavel, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { sessaoAtual } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { dataLimite } from "@/lib/orcamentos/constantes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

// Dashboard de entrada — antes disso, logar caía direto no /painel; agora tem uma tela de
// visão geral (KPIs), como um ERP de verdade costuma abrir. Reaproveita as mesmas contagens de
// /resumo.
export default async function InicioPage() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");

  const cutoff = dataLimite(7);
  const [pendentesDiretoria, aprovadosSemana, ativos, finalizados] = await Promise.all([
    prisma.orcamento.count({ where: { etapa: "DIRETORIA", statusDiretoria: "PENDENTE" } }),
    prisma.orcamento.count({ where: { origem: "NOVO", statusDiretoria: { in: ["AUTO_APROVADO", "APROVADO"] }, atualizadoEm: { gte: cutoff } } }),
    prisma.orcamento.count({ where: { origem: "NOVO", NOT: { etapa: "FINALIZADO" } } }),
    prisma.orcamento.findMany({ where: { origem: "NOVO", etapa: "FINALIZADO" }, select: { desfecho: true } }),
  ]);

  const respondidos = finalizados.filter((f) => f.desfecho && f.desfecho !== "AGUARDANDO");
  const ganhos = finalizados.filter((f) => f.desfecho === "POSITIVO").length;
  const taxaConversao = respondidos.length > 0 ? Math.round((ganhos / respondidos.length) * 100) : null;

  const kpis = [
    { label: "Pendentes na Diretoria", valor: pendentesDiretoria, icon: Gavel, cor: "var(--color-warn)", href: "/painel" },
    { label: "Aprovados esta semana", valor: aprovadosSemana, icon: CheckCircle2, cor: "var(--color-good)", href: "/diretoria" },
    { label: "Orçamentos em andamento", valor: ativos, icon: Clock, cor: "var(--primary)", href: "/painel" },
    { label: "Taxa de conversão", valor: taxaConversao !== null ? `${taxaConversao}%` : "—", icon: TrendingUp, cor: "var(--color-navy)", href: "/resumo" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
          Bem-vindo, {sessao.nome.split(" ")[0]}
        </h2>
        <p className="mt-1.5 max-w-[62ch] text-sm text-muted-foreground">
          Visão geral do fluxo de orçamentos da Santa Cruz — acompanhe o que precisa de atenção agora.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href}>
            <Card className="group h-full gap-3 py-5 transition-shadow hover:shadow-lg">
              <CardHeader className="flex-row items-center justify-between px-5">
                <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {k.label}
                </CardTitle>
                <k.icon className="h-4 w-4" style={{ color: k.cor }} />
              </CardHeader>
              <CardContent className="px-5">
                <div className="font-mono text-3xl font-semibold tabular-nums" style={{ color: k.cor }}>
                  {k.valor}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Próximo passo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Acompanhe o fluxo completo — das 6 etapas (Solicitação → Engenharia → Orçamento → Diretoria → Envio de Oferta → Finalizado) — no Painel.
          </p>
          <Button asChild className="w-fit gap-2">
            <Link href="/painel">
              Ir para o Painel <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
