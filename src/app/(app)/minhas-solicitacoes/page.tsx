import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { chave } from "@/lib/orcamentos/chave";
import { modelosDoDoc } from "@/lib/orcamentos/modelos";
import type { ReqCliente } from "@/lib/orcamentos/types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Repeat2, Search } from "lucide-react";

export const dynamic = "force-dynamic";

const LIMITE = 100;

function dataHora(d: Date): string {
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Minhas Solicitações: o registro, pra cada pessoa, do que ela mesma enviou pelo Novo Orçamento.
// O representante só vê as próprias (e é só isso que ele consegue abrir além do Novo Orçamento).
// Cada solicitação tem o PDF pra guardar e o "Repetir", que abre o Novo Orçamento já preenchido.
// Pedido do Thiago em 05/10/2026.
export default async function MinhasSolicitacoesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");

  const q = (await searchParams).q?.trim() ?? "";
  const solicitacoes = await prisma.orcamento.findMany({
    where: {
      origem: "NOVO",
      criadoPorId: sessao.usuarioId,
      ...(q
        ? {
            OR: [
              { clienteChave: { contains: chave(q) } },
              { produtoDescricao: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { criadoEm: "desc" },
    take: LIMITE,
  });

  return (
    <>
      <PageHeader
        title="Minhas Solicitações"
        description="O que você já enviou à Santa Cruz. Baixe o PDF para guardar ou use Repetir para abrir uma nova solicitação já preenchida."
      />

      <form className="mb-5 flex flex-wrap gap-2">
        <Input name="q" defaultValue={q} placeholder="Buscar por cliente ou produto…" className="w-full sm:max-w-[320px]" />
        <Button type="submit" variant="outline" className="gap-1.5">
          <Search className="h-3.5 w-3.5" /> Buscar
        </Button>
      </form>

      {solicitacoes.length === 0 ? (
        <div className="empty-state">
          {q ? "Nenhuma solicitação encontrada." : "Você ainda não enviou nenhuma solicitação por aqui."}
        </div>
      ) : (
        <div className="flex max-w-[860px] flex-col gap-2.5">
          {solicitacoes.map((s) => {
            const modelos = modelosDoDoc(s);
            const quantidades = ((s.reqCliente as ReqCliente | null)?.quantidadesLista ?? []).join(", ");
            return (
              <div key={s.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">{s.cliente || "Cliente sem nome"}</div>
                  <div className="truncate text-sm text-muted-foreground">
                    {modelos.length > 1 ? `${modelos.length} modelos: ${s.produtoDescricao ?? ""}` : (s.produtoDescricao ?? "")}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Enviada em {dataHora(s.criadoEm)}
                    {quantidades && ` · Quantidades: ${quantidades}`}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button asChild variant="outline" size="sm" className="gap-1.5">
                    <a href={`/minhas-solicitacoes/${s.id}/pdf`} download>
                      <Download className="h-3.5 w-3.5" /> PDF
                    </a>
                  </Button>
                  <Button asChild size="sm" className="gap-1.5">
                    <a href={`/novo?repetir=${s.id}`}>
                      <Repeat2 className="h-3.5 w-3.5" /> Repetir
                    </a>
                  </Button>
                </div>
              </div>
            );
          })}
          {solicitacoes.length === LIMITE && (
            <p className="text-xs text-muted-foreground">Mostrando as {LIMITE} mais recentes. Use a busca para achar uma solicitação mais antiga.</p>
          )}
        </div>
      )}
    </>
  );
}
