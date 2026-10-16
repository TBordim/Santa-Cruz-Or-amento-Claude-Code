import { PaginaAceite } from "@/components/aceite/PaginaAceite";

export const dynamic = "force-dynamic";

export default async function PcpAceitePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lote?: string }> }) {
  const { id } = await params;
  const { lote } = await searchParams;
  return <PaginaAceite id={id} ambiente="pcp" loteId={lote} />;
}
