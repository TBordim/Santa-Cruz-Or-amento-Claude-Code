import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { chave } from "@/lib/orcamentos/chave";
import { modelosDoDoc } from "@/lib/orcamentos/modelos";
import { fmtDateTime } from "@/lib/orcamentos/constantes";
import { fmtDataProtocolo, origemLabel } from "@/lib/protocolos/comum";
import { PageHeader } from "@/components/page-header";
import { ResumoBox } from "@/components/form-section";
import { Button } from "@/components/ui/button";
import { RevisoesProtocolo } from "../RevisoesProtocolo";

export const dynamic = "force-dynamic";

// Um protocolo: as revisões da arte, os orçamentos/modelos que usam esse protocolo e as artes que
// chegaram depois e foram descartadas por já existir este protocolo.
export default async function ProtocoloPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await prisma.protocolo.findUnique({
    where: { id },
    include: {
      revisoes: { orderBy: { revisao: "desc" } },
      descartes: { include: { orcamento: { select: { id: true, cliente: true } } }, orderBy: { enviadoEm: "desc" } },
    },
  });
  if (!p) notFound();

  // Orçamentos do cliente cujos modelos apontam pra este protocolo (o vínculo mora no JSON dos modelos).
  const doCliente = await prisma.orcamento.findMany({
    where: p.clienteId ? { clienteId: p.clienteId } : { clienteChave: { contains: chave(p.clienteNome) } },
    orderBy: { criadoEm: "desc" },
    take: 1000,
  });
  const usos = doCliente.flatMap((o) =>
    (Array.isArray(o.modelos) ? modelosDoDoc(o) : [])
      .filter((m) => m.protocoloId === p.id)
      .map((m) => ({ orcamentoId: o.id, criadoEm: o.criadoEm, modelo: m.descricao, data: m.protocoloData ?? null })),
  );

  return (
    <>
      <PageHeader
        title={`Protocolo ${p.numero}`}
        description={`${p.clienteNome} — ${p.descricao}`}
        action={
          <Button asChild variant="outline" size="sm">
            <Link href={`/protocolos/clientes?cliente=${encodeURIComponent(p.clienteNome)}`}>Todos os protocolos do cliente</Link>
          </Button>
        }
      />

      <div className="flex max-w-[860px] flex-col gap-6">
        <ResumoBox
          rows={[
            { label: "Cliente", value: p.clienteNome },
            { label: "Código interno", value: p.codInterno || "—" },
            { label: "Data do protocolo", value: p.revisoes[0] ? fmtDataProtocolo(p.revisoes[0].dataProtocolo) : "—" },
            { label: "Criado por", value: `${p.criadoPor} · ${fmtDateTime(p.criadoEm)}` },
          ]}
        />

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-foreground">Histórico de datas e artes</h3>
          <RevisoesProtocolo revisoes={p.revisoes} />
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-foreground">Orçamentos que usam este protocolo</h3>
          {usos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum orçamento ligado a este protocolo ainda.</p>
          ) : (
            usos.map((u, i) => (
              <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 break-words">{u.modelo || "Modelo sem descrição"}</span>
                <span className="font-mono text-xs text-muted-foreground">{fmtDataProtocolo(u.data)}</span>
                <span className="text-xs text-muted-foreground">{fmtDateTime(u.criadoEm)}</span>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/painel/${u.orcamentoId}`}>Ver</Link>
                </Button>
              </div>
            ))
          )}
        </section>

        {p.descartes.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-foreground">Artes repetidas, desconsideradas</h3>
            {p.descartes.map((d) => (
              <div key={d.id} className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
                {d.rotulo} — {origemLabel(d.origem)}, {d.decididaPor ?? "—"} em {d.decididaEm ? fmtDateTime(d.decididaEm) : "—"}
                {d.orcamento?.cliente ? ` (orçamento de ${d.orcamento.cliente})` : ""}
              </div>
            ))}
          </section>
        )}
      </div>
    </>
  );
}
