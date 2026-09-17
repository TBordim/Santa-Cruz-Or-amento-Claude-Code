import { PageHeader } from "@/components/page-header";
import { NovoOrcamentoForm } from "./NovoOrcamentoForm";

export const dynamic = "force-dynamic";

export default function NovoOrcamentoPage() {
  return (
    <>
      <PageHeader
        title="Novo Orçamento"
        description="Preencha os dados comerciais e técnicos básicos do pedido — a Santa Cruz segue o fluxo a partir daqui."
      />
      <NovoOrcamentoForm />
    </>
  );
}
