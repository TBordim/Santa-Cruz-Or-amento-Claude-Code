import { PainelAtendimento } from "../../PainelAtendimento";
import { DrawerRetorno } from "./DrawerRetorno";

export const dynamic = "force-dynamic";

// O painel do Atendimento com a gaveta do orçamento aberta por cima, pra registrar o retorno do cliente.
export default async function RetornoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <PainelAtendimento />
      <DrawerRetorno id={id} />
    </>
  );
}
