import { redirect } from "next/navigation";
import Link from "next/link";
import { sessaoAtual, podeEditar } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NovaCorForm } from "./NovaCorForm";
import { labToCssColor } from "@/lib/cor/lab-to-rgb";
import { deltaE2000 } from "@/lib/cor/deltae";

const STATUS_LABEL: Record<string, string> = {
  EM_DESENVOLVIMENTO: "Em desenvolvimento",
  APROVADO: "Aprovado",
  ALTERNATIVA: "Alternativa",
  AGUARDANDO_APROVACAO_CLIENTE: "Aguardando cliente",
  CANCELADO: "Cancelado",
};

type Lab = { l: number; a: number; b: number };

// O globals.css dá padding largo a todo th/td (fora de @layer, então vence utilitário comum); aqui
// o "!" compacta as colunas pra a lista caber no painel sem rolagem lateral.
const TH = "px-2! py-2! sm:px-2.5!";
const TD = "px-2! py-2! sm:px-2.5!";
// Estreito (celular/tablet com a barra lateral aberta): LAB alvo e ΔE só a partir de lg, e o status sai da
// própria coluna (SO_SM) e vai pra baixo do código. Tudo continua na bancada da cor.
const SO_MD = "hidden lg:table-cell";
const SO_SM = "hidden sm:table-cell";

// Amostra + valores; a amostra é só apoio visual (tela ≠ cabine de luz D50). Os valores podem
// quebrar de linha em telas estreitas em vez de forçar rolagem lateral.
function CelulaLab({ lab }: { lab: Lab | null }) {
  if (!lab) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block h-4 w-4 shrink-0 rounded-full border border-border"
        style={{ background: labToCssColor(lab) }}
        title="Apoio visual — não substitui a cabine de luz D50"
      />
      <span className="flex flex-wrap gap-x-1 font-mono text-[11px] leading-tight text-muted-foreground">
        <span className="whitespace-nowrap">{lab.l} /</span>
        <span className="whitespace-nowrap">{lab.a} /</span>
        <span className="whitespace-nowrap">{lab.b}</span>
      </span>
    </span>
  );
}

// Lista em tabela de propósito — não em cards, dinâmica diferente do painel de orçamentos
// (decisão explícita: bancada única por cor, não visualização por cards).
export default async function CorPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");

  const podeRegistrar = (await podeEditar("COR_LABORATORIO")) || (await podeEditar("COR_ENGENHARIA"));

  const { q } = await searchParams;
  const busca = q?.trim();
  const contem = (campo: string) => ({ [campo]: { contains: busca, mode: "insensitive" as const } });

  // Traz as leituras de cada rodada: dão o LAB aprovado (puxada ou, no histórico importado, o final da
  // planilha) e alimentam a coluna "Melhor ΔE".
  const cores = await prisma.cor.findMany({
    where: busca
      ? { OR: [contem("codigo"), contem("cliente"), contem("codigoProduto"), contem("referenciaDeclarada")] }
      : undefined,
    orderBy: [{ atualizadaEm: "desc" }, { codigo: "asc" }],
    take: 1000,
    include: {
      rodadas: {
        orderBy: { numero: "desc" },
        include: { leituras: { orderBy: { lidaEm: "desc" } } },
      },
    },
  });

  return (
    <>
      <PageHeader
        title="Cor"
        description="Formulação de tinta — cada cor tem uma bancada própria: LAB alvo, fórmulas testadas e leituras."
      />

      {podeRegistrar && <NovaCorForm />}

      <div className="mt-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">
            Cores cadastradas <span className="font-normal text-muted-foreground">({cores.length}{busca ? " encontradas" : ""})</span>
          </h3>
          <form action="/laboratorio/cor" className="flex gap-2">
            <Input name="q" defaultValue={busca ?? ""} placeholder="Buscar código, cliente, referência…" className="w-72" aria-label="Buscar cor" />
            <Button type="submit" variant="outline">Buscar</Button>
            {busca && (
              <Button asChild variant="ghost">
                <Link href="/laboratorio/cor">Limpar</Link>
              </Button>
            )}
          </form>
        </div>
        {cores.length === 0 ? (
          <div className="empty-state">{busca ? `Nenhuma cor encontrada para "${busca}".` : "Nenhuma cor cadastrada ainda."}</div>
        ) : (
          <div className="rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={TH}>Código</TableHead>
                  <TableHead className={TH}>
                    Cliente<span className="hidden sm:inline"> / referência</span>
                  </TableHead>
                  <TableHead className={`${TH} ${SO_MD}`}>LAB alvo</TableHead>
                  <TableHead className={TH}>LAB aprovado</TableHead>
                  <TableHead className={`${TH} ${SO_MD} text-right`}>ΔE</TableHead>
                  <TableHead className={`${TH} ${SO_SM}`}>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cores.map((c) => {
                  const temAlvo = c.labAlvoL != null && c.labAlvoA != null && c.labAlvoB != null;
                  const alvo: Lab | null = temAlvo ? { l: Number(c.labAlvoL), a: Number(c.labAlvoA), b: Number(c.labAlvoB) } : null;
                  // LAB aprovado = o da rodada aprovada: a puxada (fluxo novo) ou, no histórico importado
                  // da planilha, o LAB da fórmula final. Cor sem rodada aprovada fica sem esse valor.
                  const leiturasAprovada = c.rodadas.find((r) => r.aprovada)?.leituras ?? [];
                  const leituraAprovada = leiturasAprovada.find((l) => l.contexto === "PUXADA") ?? leiturasAprovada.find((l) => l.contexto === "FINAL");
                  const aprovado: Lab | null = leituraAprovada ? { l: Number(leituraAprovada.l), a: Number(leituraAprovada.a), b: Number(leituraAprovada.b) } : null;
                  const des = alvo
                    ? c.rodadas.flatMap((r) => r.leituras).filter((l) => l.contexto === "PUXADA").map((l) => deltaE2000(alvo, { l: Number(l.l), a: Number(l.a), b: Number(l.b) }))
                    : [];
                  const melhorDe = des.length > 0 ? Math.min(...des) : null;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className={TD}>
                        {/* prefetch off: com centenas de linhas, o prefetch automático dispara uma renderização
                            de servidor (com consultas ao banco) por cor visível de uma vez e esgota as conexões. */}
                        <Link href={`/laboratorio/cor/${c.id}`} prefetch={false} className="font-medium hover:underline">
                          {c.codigo}
                        </Link>
                        <div className="text-[11px] text-muted-foreground">
                          {c.rodadas.length} {c.rodadas.length === 1 ? "rodada" : "rodadas"}
                        </div>
                        <Badge variant="secondary" className="mt-1 h-auto whitespace-normal! px-1.5 py-0.5 text-[10px] sm:hidden">
                          {STATUS_LABEL[c.status] ?? c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className={`${TD} max-w-24 whitespace-normal! sm:max-w-36 lg:max-w-48`}>
                        <div className="truncate" title={c.cliente ?? undefined}>{c.cliente ?? "—"}</div>
                        {c.referenciaDeclarada && (
                          <div className="truncate text-[11px] text-muted-foreground" title={c.referenciaDeclarada}>
                            {c.referenciaDeclarada}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className={`${TD} ${SO_MD} whitespace-normal!`}>
                        <CelulaLab lab={alvo} />
                      </TableCell>
                      <TableCell className={`${TD} whitespace-normal!`}>
                        <CelulaLab lab={aprovado} />
                      </TableCell>
                      <TableCell className={`${TD} ${SO_MD} text-right font-mono text-xs`} title="Menor ΔE2000 entre as puxadas e o alvo">
                        {melhorDe != null ? melhorDe.toFixed(2) : "—"}
                      </TableCell>
                      <TableCell className={`${TD} ${SO_SM}`}>
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
