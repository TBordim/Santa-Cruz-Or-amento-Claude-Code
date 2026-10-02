import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { sessaoAtual } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { SeloModulo } from "@/components/treinamentos/badges";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { podeAcompanhar } from "@/lib/treinamentos/dados";

// Detalhe de uma pessoa: todas as tentativas dela, com data, versão e nota (inclusive as reprovadas).
export default async function PessoaPage({ params }: { params: Promise<{ usuarioId: string }> }) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  if (!podeAcompanhar(sessao)) redirect("/treinamentos");

  const { usuarioId } = await params;
  const u = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: {
      nome: true,
      perfil: { select: { nome: true } },
      tentativasTreinamento: {
        orderBy: { criadaEm: "desc" },
        select: {
          id: true,
          versaoTreinamento: true,
          acertos: true,
          total: true,
          nota: true,
          aprovado: true,
          criadaEm: true,
          treinamento: { select: { titulo: true, modulo: true } },
        },
      },
    },
  });
  if (!u) notFound();

  return (
    <>
      <Link href="/treinamentos/acompanhamento" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Acompanhamento
      </Link>
      <PageHeader title={u.nome} description={`${u.perfil.nome} · todas as tentativas, da mais recente para a mais antiga.`} />

      {u.tentativasTreinamento.length === 0 ? (
        <div className="empty-state">Essa pessoa ainda não respondeu nenhum quiz.</div>
      ) : (
        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Treinamento</TableHead>
                <TableHead className="text-right">Versão</TableHead>
                <TableHead className="text-right">Acertos</TableHead>
                <TableHead className="text-right">Nota</TableHead>
                <TableHead>Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {u.tentativasTreinamento.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="whitespace-nowrap font-mono text-xs">
                    {t.criadaEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{t.treinamento.titulo}</div>
                    <SeloModulo modulo={t.treinamento.modulo} />
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">v{t.versaoTreinamento}</TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {t.acertos}/{t.total}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">{t.nota}%</TableCell>
                  <TableCell>
                    <Badge className={`border-0 ${t.aprovado ? "bg-good-soft text-good" : "bg-warn-soft text-warn"}`}>
                      {t.aprovado ? "Aprovado" : "Reprovado"}
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
