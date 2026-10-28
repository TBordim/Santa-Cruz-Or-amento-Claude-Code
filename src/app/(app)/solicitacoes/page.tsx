import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { exigirModulo } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { chave } from "@/lib/orcamentos/chave";
import { modelosDoDoc } from "@/lib/orcamentos/modelos";
import { desfechoInfo, etapaInfo } from "@/lib/orcamentos/constantes";
import type { ReqCliente } from "@/lib/orcamentos/types";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Repeat2, Search } from "lucide-react";

export const dynamic = "force-dynamic";

const LIMITE = 50;

function dia(d: Date): string {
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

// Cada palavra digitada tem de aparecer em algum dos campos (cliente, produto, nº do orçamento, SO,
// código interno, representante, Nº do Aceite). Assim "doces uva" acha "Doces da Vovó ... Uva".
function filtroDaBusca(q: string): Prisma.OrcamentoWhereInput {
  const palavras = q.split(/\s+/).filter(Boolean).slice(0, 6);
  if (!palavras.length) return {};
  return {
    AND: palavras.map((p) => ({
      OR: [
        { clienteChave: { contains: chave(p) } },
        { produtoDescricao: { contains: p, mode: "insensitive" as const } },
        { numeroOrcamento: { contains: p, mode: "insensitive" as const } },
        { numeroSequencial: { contains: p, mode: "insensitive" as const } },
        ...(p.replace(/\D/g, "") ? [{ codInterno: { contains: p.replace(/\D/g, "") } }] : []),
        { representante: { contains: p, mode: "insensitive" as const } },
        { aceite: { is: { numero: { contains: p, mode: "insensitive" as const } } } },
      ],
    })),
  };
}

// Como a solicitação terminou (ou onde está), em poucas palavras, pra quem procura saber se vale
// repetir: cancelada, perdida, vencida, ou virou pedido.
function situacao(o: {
  origem: string;
  etapa: string | null;
  desfecho: string | null;
  aceite: { etapa: string; numero: string | null } | null;
}): { texto: string; ruim: boolean } {
  if (o.origem === "LEGADO") return { texto: "Arquivo legado", ruim: false };
  if (o.aceite?.etapa === "CANCELADO") return { texto: `Pedido cancelado${o.aceite.numero ? ` (Aceite ${o.aceite.numero})` : ""}`, ruim: true };
  if (o.aceite) return { texto: `Virou pedido${o.aceite.numero ? ` (Aceite ${o.aceite.numero})` : ""}`, ruim: false };
  const d = o.desfecho ?? "AGUARDANDO";
  if (d === "NEGATIVO") return { texto: "Perdido (negativo)", ruim: true };
  if (d === "SEM_RETORNO") return { texto: "Cancelado por vencimento do prazo", ruim: true };
  if (d === "POSITIVO") return { texto: desfechoInfo(d).label, ruim: false };
  return { texto: o.etapa ? `Em andamento — ${etapaInfo(o.etapa)?.label ?? o.etapa}` : "Em andamento", ruim: false };
}

// Solicitações anteriores: o orçamentista acha uma solicitação já feita (de qualquer pessoa, em
// qualquer situação: cancelada, vencida, perdida, ou que já virou pedido) e abre uma nova com os
// mesmos dados, mudando só o que for preciso. Pedido do Thiago em 20/10/2026. O "Repetir" é o mesmo
// do representante (abre o Novo Orçamento preenchido), só que aqui vale para qualquer solicitação.
export default async function SolicitacoesAnterioresPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await exigirModulo("orcamento");
  const q = (await searchParams).q?.trim() ?? "";

  const docs = await prisma.orcamento.findMany({
    where: filtroDaBusca(q),
    include: { aceite: { select: { etapa: true, numero: true } } },
    orderBy: { criadoEm: "desc" },
    take: LIMITE,
  });

  return (
    <>
      <PageHeader
        title="Solicitações anteriores"
        description="Ache uma solicitação que já foi feita e abra uma nova com os mesmos dados, mudando só o que for preciso. Vale para qualquer solicitação, mesmo cancelada, vencida ou que já virou pedido."
      />

      <form className="mb-5 flex flex-wrap gap-2">
        <Input
          name="q"
          defaultValue={q}
          autoFocus
          placeholder="Cliente, produto, nº do orçamento, SO, código ou representante…"
          className="w-full sm:max-w-[460px]"
        />
        <Button type="submit" variant="outline" className="gap-1.5">
          <Search className="h-3.5 w-3.5" /> Buscar
        </Button>
      </form>

      {docs.length === 0 ? (
        <div className="empty-state">{q ? "Nenhuma solicitação encontrada. Tente menos palavras." : "Ainda não há solicitações."}</div>
      ) : (
        <div className="flex max-w-[960px] flex-col gap-2.5">
          {docs.map((s) => {
            const modelos = modelosDoDoc(s);
            const quantidades = ((s.reqCliente as ReqCliente | null)?.quantidadesLista ?? []).join(", ");
            const sit = situacao(s);
            const numeros = [s.numeroOrcamento && `Orçamento ${s.numeroOrcamento}`, s.numeroSequencial && `SO ${s.numeroSequencial}`].filter(Boolean).join(" · ");
            return (
              <div key={s.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold text-foreground">{s.cliente || "Cliente sem nome"}</span>
                    <Badge variant={sit.ruim ? "destructive" : "secondary"} className="border-0">{sit.texto}</Badge>
                  </div>
                  <div className="truncate text-sm text-muted-foreground">
                    {modelos.length > 1 ? `${modelos.length} modelos: ${s.produtoDescricao ?? ""}` : (s.produtoDescricao ?? "")}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Solicitada em {dia(s.criadoEm)}
                    {numeros && ` · ${numeros}`}
                    {quantidades && ` · Quantidades: ${quantidades}`}
                    {s.representante && ` · ${s.representante}`}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/painel/${s.id}`}>Ver</Link>
                  </Button>
                  <Button asChild size="sm" className="gap-1.5">
                    <Link href={`/novo?repetir=${s.id}`}>
                      <Repeat2 className="h-3.5 w-3.5" /> Repetir
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
          {docs.length === LIMITE && (
            <p className="text-xs text-muted-foreground">Mostrando as {LIMITE} mais recentes. Digite mais palavras para achar uma mais antiga.</p>
          )}
        </div>
      )}
    </>
  );
}
