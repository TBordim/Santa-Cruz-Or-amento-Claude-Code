import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/permissions";
import { legadosDoCliente } from "@/lib/orcamentos/legado";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import { LegadoForm } from "./LegadoForm";
import { LegadoRow } from "./LegadoRow";

export const dynamic = "force-dynamic";

export default async function LegadoPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");

  const { q } = await searchParams;
  const legados = q ? await legadosDoCliente(q) : await prisma.orcamento.findMany({ where: { origem: "LEGADO" }, orderBy: { criadoEm: "desc" } });

  return (
    <>
      <PageHeader
        title="Arquivo legado"
        description="Registros antigos usados para comparar repetições — busca por cliente, não exige match perfeito de produto."
      />

      <LegadoForm />

      <form className="mb-3.5 flex flex-wrap gap-2">
        <Input name="q" defaultValue={q ?? ""} placeholder="Buscar por cliente…" className="max-w-[320px]" />
        <Button type="submit" variant="outline" className="gap-1.5">
          <Search className="h-3.5 w-3.5" /> Buscar
        </Button>
      </form>

      {legados.length === 0 ? (
        <div className="empty-state">Nenhum registro encontrado.</div>
      ) : (
        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {legados.map((l) => (
                <LegadoRow
                  key={l.id}
                  legado={{
                    id: l.id,
                    cliente: l.cliente,
                    produtoDescricao: l.produtoDescricao,
                    produtoCodigo: l.produtoCodigo,
                    precoAtual: l.precoAtual ? Number(l.precoAtual) : null,
                    custoPrimarioPct: l.custoPrimarioPct ? Number(l.custoPrimarioPct) : null,
                    margemP2Pct: l.margemP2Pct ? Number(l.margemP2Pct) : null,
                    quantidade: l.quantidade ? Number(l.quantidade) : null,
                    dataLegadoTexto: l.dataLegadoTexto,
                    obs: l.obs,
                    fotoUrl: l.fotoUrl,
                    fotoMime: l.fotoMime,
                    criadoEm: l.criadoEm,
                  }}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
