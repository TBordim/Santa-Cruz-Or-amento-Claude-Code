import { redirect } from "next/navigation";
import { list } from "@vercel/blob";
import { sessaoAtual } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

const TIPOS: Record<string, string> = { ARTE: "Arte do cliente", ENGENHARIA: "Anexos da Engenharia", ORDEM_COMPRA: "E-mails e documentos do cliente" };

function fmt(bytes: number): string {
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + " GB";
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + " MB";
  return Math.round(bytes / 1e3) + " KB";
}

// Tudo que está guardado no Vercel Blob, somado por pasta. Só o administrador chega aqui.
async function usoDoBlob() {
  const pastas = new Map<string, { arquivos: number; bytes: number }>();
  const maiores: { pathname: string; size: number }[] = [];
  let cursor: string | undefined;
  let paginas = 0;
  do {
    const r = await list({ cursor, limit: 1000 });
    for (const b of r.blobs) {
      const pasta = b.pathname.split("/")[0] || "(raiz)";
      const p = pastas.get(pasta) ?? { arquivos: 0, bytes: 0 };
      p.arquivos += 1;
      p.bytes += b.size;
      pastas.set(pasta, p);
      maiores.push({ pathname: b.pathname, size: b.size });
    }
    maiores.sort((a, b) => b.size - a.size).splice(10);
    cursor = r.hasMore ? r.cursor : undefined;
    paginas += 1;
  } while (cursor && paginas < 50);
  return { pastas: [...pastas.entries()].sort((a, b) => b[1].bytes - a[1].bytes), maiores, completo: !cursor };
}

// Uso de armazenamento de arquivos (anexos dos orçamentos e cópias dos protocolos), pra saber o
// quanto o sistema guarda e o ritmo de crescimento. Pedido do Thiago em 23/10/2026, depois de subir
// o limite de anexo para 30 MB.
export default async function ArmazenamentoPage() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  if (!sessao.admin) redirect("/");

  const [porTipo, todos, copiasProtocolo] = await Promise.all([
    prisma.anexo.groupBy({ by: ["tipo"], _count: true, _sum: { tamanho: true }, _max: { tamanho: true } }),
    prisma.anexo.findMany({ select: { tamanho: true, enviadoEm: true } }),
    prisma.protocoloRevisao.count({ where: { OR: [{ arquivoUrl: { not: null } }, { copiaUrl: { not: null } }] } }),
  ]);

  const total = todos.reduce((s, a) => s + a.tamanho, 0);
  const porMes = new Map<string, { n: number; bytes: number }>();
  for (const a of todos) {
    const m = a.enviadoEm.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", month: "2-digit", year: "numeric" });
    const x = porMes.get(m) ?? { n: 0, bytes: 0 };
    x.n += 1;
    x.bytes += a.tamanho;
    porMes.set(m, x);
  }
  const meses = [...porMes.entries()].reverse().slice(0, 12);

  let blob: Awaited<ReturnType<typeof usoDoBlob>> | null = null;
  let erroBlob = "";
  try {
    blob = await usoDoBlob();
  } catch (e) {
    erroBlob = e instanceof Error ? e.message : "Não foi possível ler o armazenamento.";
  }
  const totalBlob = blob?.pastas.reduce((s, [, p]) => s + p.bytes, 0) ?? 0;

  return (
    <>
      <PageHeader
        title="Armazenamento de arquivos"
        description="Quanto o sistema guarda de anexos e cópias de protocolo. Compare o total com o limite do plano na Vercel (Storage → Blob)."
      />

      <div className="flex max-w-[860px] flex-col gap-7">
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-foreground">Total guardado no armazenamento (Blob)</h3>
          {blob ? (
            <>
              <div className="rounded-xl border border-border bg-card p-4 text-2xl font-semibold text-foreground">
                {fmt(totalBlob)}
                {!blob.completo && <span className="ml-2 text-sm font-normal text-muted-foreground">(contagem parcial)</span>}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pasta</TableHead>
                    <TableHead className="text-right">Arquivos</TableHead>
                    <TableHead className="text-right">Espaço</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blob.pastas.map(([nome, p]) => (
                    <TableRow key={nome}>
                      <TableCell>
                        {nome === "orcamentos" ? "orcamentos (anexos dos orçamentos)" : nome === "protocolos" ? "protocolos (cópias da arte protocolada)" : nome}
                      </TableCell>
                      <TableCell className="text-right">{p.arquivos}</TableCell>
                      <TableCell className="text-right">{fmt(p.bytes)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <h4 className="mt-3 text-sm font-semibold text-foreground">Os 10 maiores arquivos</h4>
              <Table>
                <TableBody>
                  {blob.maiores.map((m) => (
                    <TableRow key={m.pathname}>
                      <TableCell className="break-all">{m.pathname}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{fmt(m.size)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Não foi possível ler o armazenamento aqui ({erroBlob}). Em desenvolvimento isso é normal.</p>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-foreground">Anexos registrados nos orçamentos</h3>
          <p className="text-sm text-muted-foreground">
            {todos.length} arquivos, {fmt(total)} no total. Cópias de arte guardadas em protocolos: {copiasProtocolo}.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Arquivos</TableHead>
                <TableHead className="text-right">Espaço</TableHead>
                <TableHead className="text-right">Maior</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {porTipo.map((t) => (
                <TableRow key={t.tipo}>
                  <TableCell>{TIPOS[t.tipo] ?? t.tipo}</TableCell>
                  <TableCell className="text-right">{t._count}</TableCell>
                  <TableCell className="text-right">{fmt(t._sum.tamanho ?? 0)}</TableCell>
                  <TableCell className="text-right">{fmt(t._max.tamanho ?? 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-foreground">Crescimento por mês (anexos novos)</h3>
          {meses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum anexo ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-right">Arquivos</TableHead>
                  <TableHead className="text-right">Espaço</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meses.map(([m, x]) => (
                  <TableRow key={m}>
                    <TableCell>{m}</TableCell>
                    <TableCell className="text-right">{x.n}</TableCell>
                    <TableCell className="text-right">{fmt(x.bytes)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      </div>
    </>
  );
}
