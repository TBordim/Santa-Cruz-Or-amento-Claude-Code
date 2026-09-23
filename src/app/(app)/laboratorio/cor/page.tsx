import { redirect } from "next/navigation";
import Link from "next/link";
import { sessaoAtual, podeEditar } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { NovaCorForm } from "./NovaCorForm";
import { labToCssColor } from "@/lib/cor/lab-to-rgb";

const STATUS_LABEL: Record<string, string> = {
  EM_DESENVOLVIMENTO: "Em desenvolvimento",
  APROVADO: "Aprovado",
  ALTERNATIVA: "Alternativa",
  AGUARDANDO_APROVACAO_CLIENTE: "Aguardando cliente",
  CANCELADO: "Cancelado",
};

// Lista em tabela de propósito — não em cards, dinâmica diferente do painel de orçamentos
// (decisão explícita: bancada única por cor, não visualização por cards).
export default async function CorPage() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");

  const podeRegistrar = (await podeEditar("COR_LABORATORIO")) || (await podeEditar("COR_ENGENHARIA"));

  const cores = await prisma.cor.findMany({ orderBy: { atualizadaEm: "desc" }, take: 200 });

  return (
    <>
      <PageHeader
        title="Cor"
        description="Formulação de tinta — cada cor tem uma bancada própria: LAB alvo, fórmulas testadas e leituras."
      />

      {podeRegistrar && <NovaCorForm />}

      <div className="mt-6">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Cores cadastradas</h3>
        {cores.length === 0 ? (
          <div className="empty-state">Nenhuma cor cadastrada ainda.</div>
        ) : (
          <div className="rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Referência</TableHead>
                  <TableHead>LAB alvo</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cores.map((c) => {
                  const temLab = c.labAlvoL != null && c.labAlvoA != null && c.labAlvoB != null;
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        {temLab && (
                          <span
                            className="inline-block h-5 w-5 rounded-full border border-border"
                            style={{
                              background: labToCssColor({
                                l: Number(c.labAlvoL),
                                a: Number(c.labAlvoA),
                                b: Number(c.labAlvoB),
                              }),
                            }}
                            title="Apoio visual — não substitui a cabine de luz D50"
                          />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link href={`/laboratorio/cor/${c.id}`} className="hover:underline">
                          {c.codigo}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{c.cliente ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{c.referenciaDeclarada ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {temLab ? `${c.labAlvoL} / ${c.labAlvoA} / ${c.labAlvoB}` : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{STATUS_LABEL[c.status] ?? c.status}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  );
}
