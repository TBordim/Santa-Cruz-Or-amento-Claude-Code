import Link from "next/link";
import { prisma } from "@/lib/db";
import { podeEditar } from "@/lib/permissions";
import { modelosDoDoc } from "@/lib/orcamentos/modelos";
import { fmtDateTime } from "@/lib/orcamentos/constantes";
import { candidatosDoCliente } from "@/lib/protocolos/decidir";
import { origemLabel, sugerirProtocolos } from "@/lib/protocolos/comum";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText } from "lucide-react";
import { DecisaoArte } from "./DecisaoArte";

export const dynamic = "force-dynamic";

// Fila de Vendas: a arte de um PEDIDO CONFIRMADO (o cliente aprovou e o Aceite foi aberto) que ainda
// não tem protocolo. Antes do pedido a arte é só um arquivo do orçamento e não entra aqui. Enquanto
// estiver na fila, o Aceite não segue para a Engenharia. Decisões do Thiago em 17/10 e 19/10/2026.
export default async function ArtesAProtocolarPage() {
  const pode = await podeEditar("PROTOCOLOS_VENDAS");
  const artes = await prisma.arteEnviada.findMany({
    // Só pedido confirmado (com Aceite); arte de orçamento ainda sem pedido não é protocolada.
    where: { estado: "PENDENTE", orcamento: { aceite: { isNot: null } } },
    include: { anexo: true, orcamento: true },
    orderBy: { enviadoEm: "asc" },
  });

  const itens = await Promise.all(
    artes.map(async (a) => {
      const modelos = a.orcamento ? (Array.isArray(a.orcamento.modelos) ? modelosDoDoc(a.orcamento) : []) : [];
      const modelo = modelos.find((m) => m.id === a.modeloId) ?? (modelos.length === 1 ? modelos[0] : null);
      const candidatos = await candidatosDoCliente(a.orcamento?.clienteId ?? null, a.orcamento?.cliente ?? a.clienteNome);
      const sugestoes = sugerirProtocolos(candidatos, {
        rotulo: a.rotulo,
        modeloDescricao: modelo?.descricao ?? null,
        codInterno: modelo?.codInterno ?? null,
      });
      return { a, modelos, modelo, sugestoes };
    }),
  );

  return (
    <>
      <PageHeader
        title="Artes a protocolar"
        description="Quando o cliente confirma o pedido, a arte dele (propriedade intelectual) recebe um número de protocolo. O Aceite só segue para a Engenharia depois que Vendas protocola."
      />

      {itens.length === 0 ? (
        <div className="empty-state">Nenhuma arte de pedido confirmado esperando protocolo.</div>
      ) : (
        <div className="flex max-w-[900px] flex-col gap-4">
          {itens.map(({ a, modelos, modelo, sugestoes }) => (
            <div key={a.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="break-words text-sm font-semibold text-foreground">{a.orcamento?.cliente ?? a.clienteNome ?? "Cliente sem nome"}</div>
                  <div className="break-words text-sm text-muted-foreground">
                    {modelo?.descricao || a.orcamento?.produtoDescricao || "Produto não informado"}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {origemLabel(a.origem)} · enviada por {a.enviadoPor} em {fmtDateTime(a.enviadoEm)}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="border-0">{a.link ? "Link" : "Arquivo"}</Badge>
                  {a.orcamento && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/painel/${a.orcamento.id}`}>Ver orçamento</Link>
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-2.5 text-sm">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 break-all">{a.link ?? a.anexo?.nome ?? a.rotulo}</span>
                {(a.link || a.anexo?.url) && (
                  <Button asChild variant="outline" size="sm" className="gap-1.5">
                    <a href={a.link ?? a.anexo!.url} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" /> Abrir a arte
                    </a>
                  </Button>
                )}
              </div>

              {pode ? (
                <DecisaoArte
                  arteId={a.id}
                  sugestoes={sugestoes}
                  modelos={modelos.map((m) => ({ id: m.id, descricao: m.descricao }))}
                  modeloFixo={a.modeloId ?? (modelos.length === 1 ? modelos[0].id : null)}
                  descricaoInicial={modelo?.descricao ?? a.orcamento?.produtoDescricao ?? ""}
                  codInternoInicial={modelo?.codInterno ?? ""}
                />
              ) : (
                <p className="text-xs text-muted-foreground">Só Vendas (área Protocolos) pode protocolar. Você pode acompanhar por aqui.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
