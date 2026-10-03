import { redirect } from "next/navigation";
import Link from "next/link";
import { sessaoAtual, exigirModulo, podeEditar } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { textoBusca } from "@/lib/clientes/busca";
import { formatarCnpj, somenteDigitos } from "@/lib/clientes/cnpj";
import { fmtDate } from "@/lib/orcamentos/constantes";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export const dynamic = "force-dynamic";

type SP = { aba?: string; q?: string };

const LIMITE = 200;

// Cadastro de clientes. Todo mundo que entra no módulo Orçamento vê a lista; só quem tem a área
// "Clientes" (ou é administrador) edita. Cliente cadastrado por representante entra como
// "pendente de conferência" até o escritório conferir os dados aqui.
export default async function ClientesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  await exigirModulo("orcamento");
  const pode = await podeEditar("CLIENTES");

  const sp = await searchParams;
  const aba = sp.aba === "todos" ? "todos" : "pendentes";
  const q = sp.q?.trim() ?? "";
  const palavras = textoBusca(q).split(" ").filter(Boolean);
  const digitos = somenteDigitos(q);

  const [pendentes, clientes] = await Promise.all([
    prisma.cliente.count({ where: { pendenteConferencia: true, ativo: true } }),
    prisma.cliente.findMany({
      where: {
        ...(aba === "pendentes" ? { pendenteConferencia: true, ativo: true } : {}),
        ...(q
          ? {
              OR: [
                ...(palavras.length ? [{ AND: palavras.map((p) => ({ busca: { contains: p } })) }] : []),
                ...(digitos.length >= 3 ? [{ cnpj: { contains: digitos } }] : []),
              ],
            }
          : {}),
      },
      orderBy: aba === "pendentes" ? { criadoEm: "desc" } : { razaoSocial: "asc" },
      take: LIMITE,
      include: { cadastradoPor: { select: { nome: true } } },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Cadastro de clientes usado no Novo Orçamento. Clientes cadastrados por representantes ficam pendentes até o escritório conferir os dados."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Button asChild variant={aba === "pendentes" ? "default" : "outline"} size="sm">
          <Link href="/clientes?aba=pendentes">Pendentes de conferência ({pendentes})</Link>
        </Button>
        <Button asChild variant={aba === "todos" ? "default" : "outline"} size="sm">
          <Link href="/clientes?aba=todos">Todos</Link>
        </Button>
      </div>

      <form className="mb-6 flex flex-wrap gap-2">
        <input type="hidden" name="aba" value={aba} />
        <Input name="q" defaultValue={q} placeholder="Buscar por nome ou CNPJ…" className="w-full sm:max-w-[320px]" />
        <Button type="submit" variant="outline" className="gap-1.5">
          <Search className="h-3.5 w-3.5" /> Buscar
        </Button>
      </form>

      {clientes.length === 0 ? (
        <div className="empty-state">
          {aba === "pendentes" && !q ? "Nenhum cliente pendente de conferência." : "Nenhum cliente encontrado."}
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {c.razaoSocial}
                      {!c.ativo && <Badge variant="secondary" className="ml-2 border-0">Inativo</Badge>}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{formatarCnpj(c.cnpj)}</TableCell>
                    <TableCell className="text-muted-foreground">{[c.municipio, c.uf].filter(Boolean).join("/") || "—"}</TableCell>
                    <TableCell>
                      {c.pendenteConferencia ? (
                        <Badge className="border-0 bg-secondary text-muted-foreground">Pendente</Badge>
                      ) : (
                        <Badge variant="secondary" className="border-0">{c.origem === "IMPORTADO" ? "Importado" : "Conferido"}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {fmtDate(c.criadoEm)}
                      {c.cadastradoPor && <span className="block text-xs">por {c.cadastradoPor.nome}</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        {pode && (
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/clientes/${c.id}`}>{c.pendenteConferencia ? "Conferir" : "Editar"}</Link>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {clientes.length === LIMITE && (
            <p className="mt-2 text-xs text-muted-foreground">Mostrando os primeiros {LIMITE}. Use a busca para achar um cliente específico.</p>
          )}
        </>
      )}
    </>
  );
}
