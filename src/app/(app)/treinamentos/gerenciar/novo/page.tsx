import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { TreinamentoForm } from "../TreinamentoForm";

export default async function NovoTreinamentoPage() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  if (!sessao.admin) redirect("/treinamentos");

  const perfis = await prisma.perfil.findMany({ where: { admin: false }, orderBy: { nome: "asc" }, select: { id: true, nome: true } });

  return (
    <>
      <PageHeader title="Novo treinamento" description="O vídeo vai direto do seu navegador para o armazenamento (Vercel Blob); pode demorar um pouco." />
      <TreinamentoForm perfis={perfis} />
    </>
  );
}
