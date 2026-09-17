import { NovoOrcamentoForm } from "./NovoOrcamentoForm";

export const dynamic = "force-dynamic";

export default function NovoOrcamentoPage() {
  return (
    <>
      <div className="view-header">
        <div>
          <h2>Novo Orçamento</h2>
          <p>Preencha os dados comerciais e técnicos básicos do pedido — a Santa Cruz segue o fluxo a partir daqui.</p>
        </div>
      </div>
      <NovoOrcamentoForm />
    </>
  );
}
