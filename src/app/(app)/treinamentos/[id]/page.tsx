import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { sessaoAtual } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { SeloModulo, SelosSituacao } from "@/components/treinamentos/badges";
import { filtroDeAcesso } from "@/lib/treinamentos/dados";
import { formatarDuracao } from "@/lib/treinamentos/apresentacao";
import { perguntasPublicas, quizDoBanco } from "@/lib/treinamentos/quiz";
import { situacaoDe } from "@/lib/treinamentos/situacao";
import { PlayerQuiz } from "./PlayerQuiz";

// Assistir e responder. O filtro de acesso é o mesmo da lista: treinamento de outro perfil (ou inativo) dá "não
// encontrado", mesmo digitando o endereço direto. A resposta certa e a explicação NÃO vão para o navegador agora:
// só voltam depois do envio, na resposta da action.
export default async function TreinamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");

  const { id } = await params;
  const t = await prisma.treinamento.findFirst({
    where: { id, ...filtroDeAcesso(sessao) },
    include: { tentativas: { where: { usuarioId: sessao.usuarioId }, select: { versaoTreinamento: true, nota: true, aprovado: true, criadaEm: true } } },
  });
  if (!t) notFound();

  const situacao = situacaoDe(t.versao, t.tentativas);
  const duracao = formatarDuracao(t.duracaoSeg);

  return (
    <>
      <Link href="/treinamentos" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Meus treinamentos
      </Link>
      <PageHeader title={t.titulo} description={t.descricao ?? undefined} />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <SeloModulo modulo={t.modulo} />
        {duracao && <span className="font-mono text-xs text-muted-foreground">{duracao}</span>}
        <SelosSituacao situacao={situacao} />
      </div>

      <PlayerQuiz
        treinamentoId={t.id}
        videoUrl={t.videoUrl}
        temLegendas={!!t.legendasUrl}
        perguntas={perguntasPublicas(quizDoBanco(t.quiz))}
        notaMinima={t.notaMinima}
        jaAprovado={situacao.tipo === "CONCLUIDO"}
      />
    </>
  );
}
