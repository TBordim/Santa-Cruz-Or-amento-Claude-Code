import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/permissions";
import { PainelBoard } from "./PainelBoard";

export const dynamic = "force-dynamic";

export default async function PainelPage() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");

  return (
    <>
      <div className="view-header">
        <div>
          <h2>Painel</h2>
          <p>Fluxo completo do orçamento, do pedido à finalização. Clique em um card para ver detalhes, avançar, voltar ou excluir.</p>
        </div>
      </div>
      <PainelBoard />
    </>
  );
}
