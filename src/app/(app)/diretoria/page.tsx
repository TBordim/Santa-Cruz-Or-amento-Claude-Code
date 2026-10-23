import { redirect } from "next/navigation";
import Link from "next/link";
import { sessaoAtual, exigirModulo } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { fmtMoney, fmtDateTime } from "@/lib/orcamentos/constantes";
import type { PrecificacaoTier } from "@/lib/orcamentos/types";
import { rotuloSO } from "@/lib/orcamentos/modelos";
import { textoItemDiscrepancia } from "@/lib/orcamentos/discrepancia";
import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

// Equivalente a viewDiretoria() — registro dos já decididos (aprovados, automático ou manual).
// Os pendentes de decisão aparecem só no Painel, coluna "4. Diretoria".
export default async function DiretoriaPage() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  await exigirModulo("diretoria");

  const [pendentes, decididos] = await Promise.all([
    prisma.orcamento.findMany({
      where: { origem: "NOVO", etapa: "DIRETORIA", statusDiretoria: "PENDENTE" },
      orderBy: { atualizadoEm: "asc" },
    }),
    prisma.orcamento.findMany({
    where: { origem: "NOVO", statusDiretoria: { in: ["APROVADO", "AUTO_APROVADO"] } },
    orderBy: { atualizadoEm: "desc" },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Diretoria"
        description="Orçamentos esperando a decisão da Diretoria e o registro dos já decididos (aprovados por você e automáticos)."
      />

      <section className="mb-6 flex flex-col gap-2.5">
        <h3 className="text-sm font-semibold text-foreground">Aguardando decisão ({pendentes.length})</h3>
        {pendentes.length === 0 ? (
          <div className="empty-state">Nada esperando a Diretoria agora.</div>
        ) : (
          pendentes.map((d) => {
            const tiers = (d.precificacao as unknown as PrecificacaoTier[] | null) ?? [];
            return (
              <Card key={d.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground">
                      {d.cliente} — <span className="font-normal text-muted-foreground">{d.produtoDescricao}</span>
                    </div>
                    {tiers.filter((t) => t.discrepancia?.itens?.length).map((t, k) => (
                      <div key={k} className="mt-1.5 rounded-md border-2 border-bad bg-bad/10 px-2.5 py-1.5 text-sm">
                        <div className="flex items-center gap-1.5 font-bold text-bad">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          Discrepância acima de 2,5%{t.numeroSequencial ? ` · SO ${t.numeroSequencial}` : ""}: {t.discrepancia!.itens.map(textoItemDiscrepancia).join("; ")}
                        </div>
                        <div className="mt-0.5 font-semibold text-foreground">
                          {t.discrepancia!.justificativa ? `Motivo: “${t.discrepancia!.justificativa}”${t.discrepancia!.justificadaPor ? ` — ${t.discrepancia!.justificadaPor}` : ""}` : "Nenhum motivo informado."}
                        </div>
                      </div>
                    ))}
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Enviado em {fmtDateTime(d.atualizadoEm)}
                      {tiers[0]?.precoFinal != null ? ` · ${fmtMoney(tiers[0].precoFinal)}` : ""}
                      {tiers.length > 1 ? ` (${tiers.length} opções)` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="border-0 bg-warn-soft text-warn">Aguarda diretoria</Badge>
                    <Button asChild size="sm">
                      <Link href={`/painel/${d.id}`}>Decidir</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </section>

      <h3 className="mb-2.5 text-sm font-semibold text-foreground">Já decididos</h3>

      {decididos.length === 0 ? (
        <div className="empty-state">Nenhum orçamento aprovado ainda.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {decididos.map((d) => {
            const tiers = (d.precificacao as unknown as PrecificacaoTier[] | null) ?? [];
            return (
              <Card key={d.id}>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">{d.cliente} — <span className="font-normal text-muted-foreground">{d.produtoDescricao}</span></div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {d.statusDiretoria === "AUTO_APROVADO" ? "Auto-aprovado" : "Aprovado"}
                        {tiers[0]?.decididoEm ? ` em ${fmtDateTime(new Date(tiers[0].decididoEm))}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="border-0 bg-good-soft text-good">
                        {d.statusDiretoria === "AUTO_APROVADO" ? "Auto-aprovado" : "Aprovado por você"}
                      </Badge>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/painel/${d.id}`}>Ver</Link>
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted/30 p-3">
                    {tiers.length > 1 ? (
                      tiers.map((t, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {t.numeroSequencial ? `SO ${t.numeroSequencial} · ` : ""}
                            {rotuloSO(t)}
                          </span>
                          <span className="font-mono font-semibold">{fmtMoney(t.precoFinal)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Preço final</span>
                        <span className="font-mono font-semibold">{fmtMoney(tiers[0]?.precoFinal)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
