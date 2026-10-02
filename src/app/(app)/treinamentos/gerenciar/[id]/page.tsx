import { notFound, redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { quizDoBanco } from "@/lib/treinamentos/quiz";
import { TreinamentoForm } from "../TreinamentoForm";

export default async function EditarTreinamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  if (!sessao.admin) redirect("/treinamentos");

  const { id } = await params;
  const [t, perfis] = await Promise.all([
    prisma.treinamento.findUnique({ where: { id }, include: { perfis: { select: { perfilId: true } } } }),
    prisma.perfil.findMany({ where: { admin: false }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);
  if (!t) notFound();

  return (
    <>
      <PageHeader title={t.titulo} description={`Versão ${t.versao}. Trocar o vídeo ou o quiz sobe a versão e pede que quem já foi aprovado refaça.`} />
      <TreinamentoForm
        perfis={perfis}
        inicial={{
          id: t.id,
          titulo: t.titulo,
          modulo: t.modulo,
          descricao: t.descricao ?? "",
          perfilIds: t.perfis.map((p) => p.perfilId),
          notaMinima: t.notaMinima,
          ordem: t.ordem,
          ativo: t.ativo,
          versao: t.versao,
          temLegendas: !!t.legendasUrl,
          videoUrl: t.videoUrl,
          nPerguntas: quizDoBanco(t.quiz).perguntas.length,
        }}
      />
    </>
  );
}
