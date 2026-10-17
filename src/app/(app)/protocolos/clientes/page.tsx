import Link from "next/link";
import { prisma } from "@/lib/db";
import { chave } from "@/lib/orcamentos/chave";
import { rotuloRevisao } from "@/lib/protocolos/comum";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { RevisoesProtocolo } from "../RevisoesProtocolo";

export const dynamic = "force-dynamic";

// Rastreabilidade por cliente: todos os protocolos e TODAS as versões (revisões) da arte de um
// cliente. Pedido do Thiago em 17/10/2026.
export default async function ProtocolosPorClientePage({ searchParams }: { searchParams: Promise<{ q?: string; cliente?: string }> }) {
  const { q, cliente } = await searchParams;
  const busca = chave(q);

  const todos = await prisma.protocolo.findMany({
    include: { revisoes: { orderBy: { revisao: "desc" } } },
    orderBy: { criadoEm: "desc" },
    take: 2000,
  });

  // Agrupa pelo nome do cliente (sem diferenciar caixa), que é o que o protocolo guarda.
  const porCliente = new Map<string, { nome: string; protocolos: typeof todos }>();
  for (const p of todos) {
    const k = chave(p.clienteNome);
    const g = porCliente.get(k) ?? { nome: p.clienteNome, protocolos: [] };
    g.protocolos.push(p);
    porCliente.set(k, g);
  }
  const lista = [...porCliente.values()]
    .filter((g) => !busca || chave(g.nome).includes(busca) || g.protocolos.some((p) => chave(p.numero).includes(busca)))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const escolhido = cliente ? porCliente.get(chave(cliente)) ?? null : null;

  return (
    <>
      <PageHeader
        title="Protocolos por cliente"
        description="Todas as artes protocoladas de cada cliente, com todas as revisões. Nada é apagado: a arte é propriedade do cliente."
      />

      {escolhido ? (
        <div className="flex max-w-[860px] flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-foreground">{escolhido.nome}</h3>
            <Button asChild variant="outline" size="sm">
              <Link href="/protocolos/clientes">Voltar à lista</Link>
            </Button>
          </div>
          {escolhido.protocolos.map((p) => (
            <section key={p.id} className="flex flex-col gap-2 rounded-xl border border-border p-3.5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <Link href={`/protocolos/${p.id}`} className="font-mono text-sm font-semibold text-foreground underline underline-offset-2">
                  {p.numero}
                </Link>
                <span className="text-xs text-muted-foreground">{p.revisoes.length} revisão(ões), em uso {p.revisoes[0] ? rotuloRevisao(p.revisoes[0].revisao) : "—"}</span>
              </div>
              <div className="text-sm text-muted-foreground">{p.descricao}</div>
              <RevisoesProtocolo revisoes={p.revisoes} />
            </section>
          ))}
        </div>
      ) : (
        <>
          <form className="mb-5 flex flex-wrap gap-2">
            <Input name="q" defaultValue={q ?? ""} placeholder="Buscar por cliente ou número do protocolo…" className="w-full sm:max-w-[360px]" />
            <Button type="submit" variant="outline" className="gap-1.5">
              <Search className="h-3.5 w-3.5" /> Buscar
            </Button>
          </form>
          {lista.length === 0 ? (
            <div className="empty-state">{todos.length === 0 ? "Nenhum protocolo cadastrado ainda." : "Nenhum cliente encontrado."}</div>
          ) : (
            <div className="flex max-w-[860px] flex-col gap-2">
              {lista.map((g) => (
                <Link
                  key={g.nome}
                  href={`/protocolos/clientes?cliente=${encodeURIComponent(g.nome)}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 no-underline transition-colors hover:bg-muted/40"
                >
                  <span className="min-w-0 break-words text-sm font-medium text-foreground">{g.nome}</span>
                  <span className="text-xs text-muted-foreground">
                    {g.protocolos.length} protocolo(s) · {g.protocolos.reduce((s, p) => s + p.revisoes.length, 0)} revisão(ões)
                  </span>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
