import { PageHeader } from "@/components/page-header";
import { FormParametrosPcp } from "@/components/aceite/FormParametrosPcp";
import { carregarParametros } from "@/lib/pcp/parametros";
import { podeEditar } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function ParametrosPcpPage() {
  const [{ salvo, ...p }, pode] = await Promise.all([carregarParametros(), podeEditar("PCP_ENTREGA")]);
  return (
    <>
      <PageHeader title="Parâmetros do PCP" description="Prazos de produção que o sistema usa para sugerir a data de entrega dos pedidos." />
      <FormParametrosPcp p={p} salvo={salvo} podeEditar={pode} />
    </>
  );
}
