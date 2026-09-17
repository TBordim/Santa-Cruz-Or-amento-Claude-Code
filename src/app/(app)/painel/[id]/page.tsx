import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/permissions";
import { PainelBoard } from "../PainelBoard";
import { Drawer } from "./Drawer";

export const dynamic = "force-dynamic";

export default async function PainelCardPage({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  const { id } = await params;

  return (
    <>
      <div className="view-header">
        <div>
          <h2>Painel</h2>
          <p>Fluxo completo do orçamento, do pedido à finalização. Clique em um card para ver detalhes, avançar, voltar ou excluir.</p>
        </div>
      </div>
      <PainelBoard />
      <Drawer id={id} />
    </>
  );
}
