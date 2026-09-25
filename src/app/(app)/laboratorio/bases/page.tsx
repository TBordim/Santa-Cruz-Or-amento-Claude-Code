import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ExcluirBaseButton } from "./ExcluirBaseButton";

const SISTEMA_LABEL: Record<string, string> = {
  IRO: "IRO",
  METALICO: "Metálico",
  CMYK: "CMYK",
};

// Catálogo de tintas-base (o que entra na composição de uma fórmula) — só consulta hoje: as
// bases nascem por migration/import. A única ação daqui é excluir, e é por isso que a tela é
// restrita a administrador e pede o PIN de novo, mesmo com a sessão já logada como admin.
export default async function BasesPage() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  if (!sessao.admin) redirect("/laboratorio");

  const [bases, emUsoPorBase] = await Promise.all([
    prisma.base.findMany({ orderBy: { codigo: "asc" } }),
    prisma.composicao.groupBy({ by: ["baseId"], _count: true }),
  ]);
  const usoMap = new Map(emUsoPorBase.map((c) => [c.baseId, c._count]));

  return (
    <>
      <PageHeader
        title="Bases"
        description="Catálogo de tintas usadas nas fórmulas. Excluir é definitivo e pede seu PIN de administrador — recusa se a tinta ainda estiver em alguma fórmula."
      />

      <div className="rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Sistema</TableHead>
              <TableHead className="text-right">Em uso</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bases.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.codigo}</TableCell>
                <TableCell className="text-muted-foreground">{b.nome}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{SISTEMA_LABEL[b.sistema] ?? b.sistema}</Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-muted-foreground">{usoMap.get(b.id) ?? 0}</TableCell>
                <TableCell className="text-right">
                  <ExcluirBaseButton id={b.id} codigo={b.codigo} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
