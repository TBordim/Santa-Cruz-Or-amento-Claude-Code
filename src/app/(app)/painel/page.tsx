import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/permissions";
import { PageHeader } from "@/components/page-header";
import { PainelBoard } from "./PainelBoard";

export const dynamic = "force-dynamic";

export default async function PainelPage() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");

  return (
    <>
      <PageHeader
        title="Painel"
        description="Fluxo completo do orçamento, do pedido à finalização. Clique em um card para ver detalhes, avançar, voltar ou excluir."
      />
      <PainelBoard />
    </>
  );
}
