import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { sessaoAtual } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { SeloModulo } from "@/components/treinamentos/badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatarDuracao } from "@/lib/treinamentos/apresentacao";

// Cadastro de treinamentos: só administrador (como a tela Bases). A tela de cadastro e a action conferem de novo.
export default async function GerenciarPage() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  if (!sessao.admin) redirect("/treinamentos");

  const itens = await prisma.treinamento.findMany({
    orderBy: [{ modulo: "asc" }, { ordem: "asc" }, { titulo: "asc" }],
    include: { perfis: { include: { perfil: { select: { nome: true } } } }, _count: { select: { tentativas: true } } },
  });

  return (
    <>
      <PageHeader
        title="Gerenciar treinamentos"
        description="Cadastre o vídeo, as legendas e o quiz, e marque os perfis que veem cada treinamento."
        action={
          <Button asChild className="gap-2">
            <Link href="/treinamentos/gerenciar/novo">
              <Plus className="h-4 w-4" /> Novo treinamento
            </Link>
          </Button>
        }
      />

      {itens.length === 0 ? (
        <div className="empty-state">Nenhum treinamento cadastrado ainda.</div>
      ) : (
        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Treinamento</TableHead>
                <TableHead>Perfis</TableHead>
                <TableHead className="text-right">Versão</TableHead>
                <TableHead className="text-right">Tentativas</TableHead>
                <TableHead>Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Link href={`/treinamentos/gerenciar/${t.id}`} className="font-medium hover:underline">
                      {t.titulo}
                    </Link>
                    <div className="mt-1 flex items-center gap-2">
                      <SeloModulo modulo={t.modulo} />
                      {formatarDuracao(t.duracaoSeg) && <span className="font-mono text-[11px] text-muted-foreground">{formatarDuracao(t.duracaoSeg)}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-normal! text-sm text-muted-foreground">{t.perfis.map((p) => p.perfil.nome).join(", ") || "—"}</TableCell>
                  <TableCell className="text-right font-mono text-xs">v{t.versao}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{t._count.tentativas}</TableCell>
                  <TableCell>
                    <Badge className={`border-0 ${t.ativo ? "bg-good-soft text-good" : "bg-secondary text-secondary-foreground"}`}>
                      {t.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
