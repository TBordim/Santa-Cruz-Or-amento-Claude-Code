import { PageHeader } from "@/components/page-header";
import { sessaoAtual } from "@/lib/permissions";
import { NovoOrcamentoForm } from "./NovoOrcamentoForm";

export const dynamic = "force-dynamic";

// Representante logado: o próprio nome já vem no campo Representante. Colaborador da empresa
// abre com o campo em branco, porque quem pede nem sempre é um representante (venda direta da
// empresa, por exemplo).
export default async function NovoOrcamentoPage() {
  const sessao = await sessaoAtual();
  return (
    <>
      <PageHeader
        title="Novo Orçamento"
        description="Preencha os dados comerciais e técnicos básicos do pedido — a Santa Cruz segue o fluxo a partir daqui."
      />
      <NovoOrcamentoForm representante={sessao?.soNovo ? sessao.nome : ""} />
    </>
  );
}
