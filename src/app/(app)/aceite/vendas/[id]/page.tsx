import { PaginaAceite } from "@/components/aceite/PaginaAceite";

export const dynamic = "force-dynamic";

export default async function VendasAceitePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lote?: string }> }) {
  const { id } = await params;
  const { lote } = await searchParams;
  return <PaginaAceite id={id} ambiente="vendas" loteId={lote} />;
}
