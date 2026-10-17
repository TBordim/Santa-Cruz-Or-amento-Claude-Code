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
        title="Enviar arte para Vendas"
        description="Toda arte do cliente é propriedade intelectual dele e precisa de protocolo. Envie aqui; Vendas protocola, e o card do orçamento só avança depois."
      />
      <EnviarArteForm
        orcamentos={orcs.map((o) => ({ id: o.id, rotulo: `${o.cliente ?? "Sem cliente"} — ${o.produtoDescricao ?? "sem produto"} (${fmtDate(o.criadoEm)})` }))}
      />
    </>
  );
}
