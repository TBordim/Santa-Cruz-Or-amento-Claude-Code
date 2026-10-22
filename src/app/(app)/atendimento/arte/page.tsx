import { prisma } from "@/lib/db";
import { fmtDate } from "@/lib/orcamentos/constantes";
import { PageHeader } from "@/components/page-header";
import { EnviarArteForm } from "./EnviarArteForm";

export const dynamic = "force-dynamic";

// O Atendimento recebe arte do cliente e a envia para Vendas protocolar (17/10/2026).
export default async function EnviarArtePage() {
  const orcs = await prisma.orcamento.findMany({
    where: { origem: "NOVO" },
    select: { id: true, cliente: true, produtoDescricao: true, criadoEm: true },
    orderBy: { criadoEm: "desc" },
    take: 300,
  });
  return (
    <>
      <PageHeader
        title="Enviar arte do cliente"
        description="A arte do cliente é propriedade intelectual dele. Antes do pedido ela fica junto do orçamento; quando o cliente confirma o pedido, Vendas protocola e o Aceite só segue depois."
      />
      <EnviarArteForm
        orcamentos={orcs.map((o) => ({ id: o.id, rotulo: `${o.cliente ?? "Sem cliente"} — ${o.produtoDescricao ?? "sem produto"} (${fmtDate(o.criadoEm)})` }))}
      />
    </>
  );
}
