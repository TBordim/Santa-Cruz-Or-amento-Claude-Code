import { notFound, redirect } from "next/navigation";
import { sessaoAtual, exigirModulo, podeEditar } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { formatarCnpj } from "@/lib/clientes/cnpj";
import { PageHeader } from "@/components/page-header";
import { ClienteForm } from "./ClienteForm";

export const dynamic = "force-dynamic";

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  await exigirModulo("orcamento");
  // Sem a área "Clientes" não há o que fazer aqui: volta pra lista, que é só de consulta.
  if (!(await podeEditar("CLIENTES"))) redirect("/clientes");

  const { id } = await params;
  const c = await prisma.cliente.findUnique({ where: { id }, include: { cadastradoPor: { select: { nome: true } } } });
  if (!c) notFound();

  return (
    <>
      <PageHeader
        title={c.pendenteConferencia ? "Conferir cliente" : "Editar cliente"}
        description={
          c.origem === "REPRESENTANTE"
            ? `Cadastrado por ${c.cadastradoPor?.nome ?? "representante"} durante um Novo Orçamento. Confira os dados e marque como conferido.`
            : "Cliente da carteira importada da planilha."
        }
      />
      <ClienteForm
        cliente={{
          id: c.id,
          razaoSocial: c.razaoSocial,
          cnpj: formatarCnpj(c.cnpj),
          endereco: c.endereco ?? "",
          complemento: c.complemento ?? "",
          bairro: c.bairro ?? "",
          cep: c.cep ?? "",
          uf: c.uf ?? "",
          municipio: c.municipio ?? "",
          telefone: c.telefone ?? "",
          email: c.email ?? "",
          contato: c.contato ?? "",
          prazosPagamento: c.prazosPagamento.join("/"),
          ativo: c.ativo,
          pendente: c.pendenteConferencia,
        }}
      />
    </>
  );
}
