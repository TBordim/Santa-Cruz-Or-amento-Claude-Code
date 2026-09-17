import { redirect } from "next/navigation";
import Link from "next/link";
import { sessaoAtual } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { fmtMoney, fmtDateTime } from "@/lib/orcamentos/constantes";
import type { PrecificacaoTier } from "@/lib/orcamentos/types";
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

  const decididos = await prisma.orcamento.findMany({
    where: { origem: "NOVO", statusDiretoria: { in: ["APROVADO", "AUTO_APROVADO"] } },
    orderBy: { atualizadoEm: "desc" },
  });

  return (
    <>
      <PageHeader
        title="Painel Diretoria"
        description={'Registro dos orçamentos já decididos: aprovados por você e os aprovados automaticamente. O que ainda aguarda decisão fica no Painel, coluna "4. Diretoria".'}
      />

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
                          <span className="text-muted-foreground">{t.quantidade}</span>
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
