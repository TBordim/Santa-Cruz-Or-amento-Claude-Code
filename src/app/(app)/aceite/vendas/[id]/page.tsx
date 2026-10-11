import { PaginaAceite } from "@/components/aceite/PaginaAceite";

export const dynamic = "force-dynamic";

export default async function VendasAceitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PaginaAceite id={id} ambiente="vendas" />;
}
