import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/permissions";
import { PageHeader } from "@/components/page-header";
import { PainelBoard } from "../PainelBoard";
import { Drawer } from "./Drawer";

export const dynamic = "force-dynamic";

export default async function PainelCardPage({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  const { id } = await params;

  return (
    <>
      <PageHeader
        title="Painel"
        description="Fluxo completo do orçamento, do pedido à finalização. Clique em um card para ver detalhes, avançar, voltar ou excluir."
      />
      <PainelBoard />
      <Drawer id={id} />
    </>
  );
}
