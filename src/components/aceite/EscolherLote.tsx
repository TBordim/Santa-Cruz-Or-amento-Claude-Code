import Link from "next/link";
import { ArrowLeft, CornerUpLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { voltarEtapaAceite } from "@/app/(app)/aceite/actions";
import type { AceiteTela } from "@/lib/aceite/dados";
import { lotesDoAceite } from "@/lib/aceite/lotes";
import { ResumoLotes } from "./ResumoLotes";
import { AdminAceite } from "./AdminAceite";

// Aceite dividido, depois da Engenharia: cada lote é uma produção separada (PCP, pedido no ERP, aviso ao
// cliente e entrega próprios). Esta tela lista os lotes; abrir um deles leva ao Aceite daquele lote.
export function EscolherLote({
  aceite,
  voltarLista,
  nomeAmbiente,
  rotaBase,
  podeVoltar,
  admin,
  cancelar,
}: {
  aceite: AceiteTela;
  voltarLista: string;
  nomeAmbiente: string;
  // Endereço da tela do Aceite neste ambiente, sem o id (ex.: "/pcp").
  rotaBase: string;
  podeVoltar: boolean;
  admin: boolean;
  // Formulário de cancelar o pedido (só Vendas), quando cabe.
  cancelar?: React.ReactNode;
}) {
  const lotes = lotesDoAceite(aceite);
  const concluidos = lotes.filter((l) => l.etapa === "CONCLUIDO").length;
  return (
    <>
      <Link href={voltarLista} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> {nomeAmbiente}
      </Link>
      <PageHeader
        title={`${aceite.numero ? `Aceite ${aceite.numero}` : "Aceite sem nº"} · ${aceite.orcamento.cliente ?? ""}`}
        description={`Aceite dividido em ${lotes.length} lotes (${concluidos} concluído${concluidos === 1 ? "" : "s"}). Cada lote é uma produção separada: abra o lote para trabalhar nele.`}
        action={
          podeVoltar || admin ? (
            <div className="flex flex-wrap items-center gap-2">
              {podeVoltar && aceite.etapa === "EM_LOTES" && (
                <form action={voltarEtapaAceite}>
                  <input type="hidden" name="id" value={aceite.id} />
                  <input type="hidden" name="voltarPara" value={voltarLista} />
                  <Button type="submit" variant="outline" size="sm" className="gap-1.5" title="Todos os lotes voltam para a Engenharia e o material; permite refazer a divisão">
                    <CornerUpLeft className="h-3.5 w-3.5" /> Voltar o Aceite (refazer a divisão)
                  </Button>
                </form>
              )}
              {admin && <AdminAceite aceiteId={aceite.id} />}
            </div>
          ) : undefined
        }
      />
      <div className="flex max-w-5xl flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-6">
        {cancelar}
        <ResumoLotes lotes={lotes} href={(l) => `${rotaBase}/${aceite.id}?lote=${l.id}`} />
      </div>
    </>
  );
}
