import { PageHeader } from "@/components/page-header";
import { sessaoAtual } from "@/lib/permissions";
import { NovoOrcamentoForm } from "./NovoOrcamentoForm";

export const dynamic = "force-dynamic";

// Quem é representante tem o nome preenchido no campo Representante.
export default async function NovoOrcamentoPage() {
  const sessao = await sessaoAtual();
  return (
    <>
      <PageHeader
        title="Novo Orçamento"
        description="Preencha os dados comerciais e técnicos básicos do pedido — a Santa Cruz segue o fluxo a partir daqui."
      />
      <NovoOrcamentoForm representante={sessao?.nome ?? ""} />
    </>
  );
}
