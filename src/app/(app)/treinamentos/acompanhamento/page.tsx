import { redirect } from "next/navigation";
import Link from "next/link";
import { Download } from "lucide-react";
import { sessaoAtual } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { SeloModulo, formatarData } from "@/components/treinamentos/badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { matrizAcompanhamento, podeAcompanhar } from "@/lib/treinamentos/dados";
import { ROTULO_SITUACAO, type Situacao } from "@/lib/treinamentos/situacao";

const ESTILO: Record<Situacao["tipo"], string> = {
  CONCLUIDO: "bg-good-soft text-good",
  REFAZER: "bg-warn-soft text-warn",
  ATUALIZADO: "bg-warn-soft text-warn",
  PENDENTE: "bg-secondary text-secondary-foreground",
};

// Acompanhamento da diretoria: quem fez o quê. Vale só para quem tem a área TREINAMENTOS_ACOMPANHAMENTO (e o
// administrador). Cada célula mostra a situação, a melhor nota e a data; "não se aplica" quando o perfil da
// pessoa não está ligado ao treinamento.
export default async function AcompanhamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ perfil?: string; treinamento?: string; pendentes?: string }>;
}) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  if (!podeAcompanhar(sessao)) redirect("/treinamentos");

  const { perfil, treinamento, pendentes } = await searchParams;
  const perfilId = perfil && perfil !== "todos" ? perfil : undefined;
  const treinamentoId = treinamento && treinamento !== "todos" ? treinamento : undefined;
  const soPendentes = pendentes === "1";

  const [{ treinamentos, linhas, resumo }, perfis, todosTreinamentos] = await Promise.all([
    matrizAcompanhamento({ perfilId, treinamentoId, soPendentes }),
    prisma.perfil.findMany({ where: { admin: false }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    prisma.treinamento.findMany({ where: { ativo: true }, orderBy: [{ modulo: "asc" }, { titulo: "asc" }], select: { id: true, titulo: true } }),
  ]);

  const consulta = new URLSearchParams();
  if (perfilId) consulta.set("perfil", perfilId);
  if (treinamentoId) consulta.set("treinamento", treinamentoId);
  if (soPendentes) consulta.set("pendentes", "1");
  const filtroAtivo = !!(perfilId || treinamentoId || soPendentes);

  return (
    <>
      <PageHeader
        title="Acompanhamento"
        description="Quem já fez cada treinamento, com a melhor nota e a data. Só aparecem as pessoas cujo perfil é ligado ao treinamento."
        action={
          <Button asChild variant="outline" className="gap-2">
            <a href={`/treinamentos/acompanhamento/csv${consulta.size ? `?${consulta}` : ""}`}>
              <Download className="h-3.5 w-3.5" /> Exportar CSV
            </a>
          </Button>
        }
      />

      {treinamentos.length > 0 && (
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {treinamentos.map((t, i) => {
            const r = resumo[i];
            const pct = r.aplicaveis ? Math.round((r.concluidos / r.aplicaveis) * 100) : 0;
            return (
              <div key={t.id} className="rounded-xl border border-border bg-card p-4">
                <SeloModulo modulo={t.modulo} />
                <div className="mt-2 font-semibold text-foreground">{t.titulo}</div>
                <div className="mt-1 font-mono text-xs text-muted-foreground">
                  {pct}% concluído · {r.concluidos} de {r.aplicaveis}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {r.pendentes} {r.pendentes === 1 ? "pendente" : "pendentes"} · {r.refazer} para refazer
                </div>
              </div>
            );
          })}
        </div>
      )}

      <form action="/treinamentos/acompanhamento" className="mb-4 flex flex-wrap items-center gap-2">
        <Select name="perfil" defaultValue={perfilId ?? "todos"}>
          <SelectTrigger className="w-[200px]" aria-label="Filtrar por perfil">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os perfis</SelectItem>
            {perfis.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select name="treinamento" defaultValue={treinamentoId ?? "todos"}>
          <SelectTrigger className="w-[260px]" aria-label="Filtrar por treinamento">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os treinamentos</SelectItem>
            {todosTreinamentos.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.titulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" name="pendentes" value="1" defaultChecked={soPendentes} className="h-4 w-4 accent-[var(--primary)]" />
          Só com pendência
        </label>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
        {filtroAtivo && (
          <Button asChild variant="ghost">
            <Link href="/treinamentos/acompanhamento">Limpar</Link>
          </Button>
        )}
      </form>

      {linhas.length === 0 || treinamentos.length === 0 ? (
        <div className="empty-state">{filtroAtivo ? "Ninguém encontrado com esse filtro." : "Nenhum treinamento ativo ligado a perfis ainda."}</div>
      ) : (
        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                {treinamentos.map((t) => (
                  <TableHead key={t.id}>{t.titulo}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <Link href={`/treinamentos/acompanhamento/${l.id}`} className="font-medium hover:underline">
                      {l.nome}
                    </Link>
                    <div className="text-[11px] text-muted-foreground">{l.perfilNome}</div>
                  </TableCell>
                  {l.celulas.map((c, i) => (
                    <TableCell key={treinamentos[i].id}>
                      {c.aplica ? (
                        <>
                          <Badge className={`border-0 ${ESTILO[c.situacao.tipo]}`}>{ROTULO_SITUACAO[c.situacao.tipo]}</Badge>
                          {c.situacao.melhorNota != null && c.situacao.data && (
                            <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                              {c.situacao.melhorNota}% · {formatarData(c.situacao.data)}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">não se aplica</span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
