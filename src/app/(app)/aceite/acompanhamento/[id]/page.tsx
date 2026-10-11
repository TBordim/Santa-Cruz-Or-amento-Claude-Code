import { PaginaAceite } from "@/components/aceite/PaginaAceite";

export const dynamic = "force-dynamic";

export default async function AcompanhamentoAceitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PaginaAceite id={id} ambiente="acompanhamento" />;
}
