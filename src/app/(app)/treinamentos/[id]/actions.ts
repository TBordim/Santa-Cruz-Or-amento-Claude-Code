"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { sessaoAtual } from "@/lib/permissions";
import { filtroDeAcesso } from "@/lib/treinamentos/dados";
import { corrigir, quizDoBanco, type ItemCorrecao } from "@/lib/treinamentos/quiz";

export type ResultadoEnvio =
  | { erro: string }
  | { ok: true; acertos: number; total: number; nota: number; aprovado: boolean; notaMinima: number; itens: ItemCorrecao[] };

// A nota é calculada AQUI, contra o quiz guardado no banco. O navegador só manda as alternativas escolhidas
// (perguntaId -> índice); não existe campo de nota para a pessoa preencher. O mesmo filtro de acesso da tela vale
// aqui: quem não tem o perfil do treinamento não consegue nem registrar tentativa.
export async function enviarRespostas(treinamentoId: string, respostas: Record<string, number>): Promise<ResultadoEnvio> {
  const sessao = await sessaoAtual();
  if (!sessao) return { erro: "Sessão expirada — entre novamente." };

  const t = await prisma.treinamento.findFirst({
    where: { id: treinamentoId, ...filtroDeAcesso(sessao) },
    select: { id: true, versao: true, notaMinima: true, quiz: true },
  });
  if (!t) return { erro: "Treinamento não encontrado." };

  // Já aprovada nesta versão: o quiz não abre de novo (a pessoa pode rever o vídeo quando quiser).
  const jaAprovada = await prisma.tentativaTreinamento.count({
    where: { treinamentoId: t.id, usuarioId: sessao.usuarioId, versaoTreinamento: t.versao, aprovado: true },
  });
  if (jaAprovada > 0) return { erro: "Você já foi aprovado neste treinamento." };

  const r = corrigir(quizDoBanco(t.quiz), respostas, t.notaMinima);
  if (!r.ok) return { erro: r.erro };
  const { acertos, total, nota, aprovado, itens } = r.correcao;

  await prisma.tentativaTreinamento.create({
    data: {
      treinamentoId: t.id,
      usuarioId: sessao.usuarioId,
      versaoTreinamento: t.versao,
      respostas: itens.map((i) => ({ perguntaId: i.perguntaId, escolhida: i.escolhida })),
      acertos,
      total,
      nota,
      aprovado,
    },
  });

  revalidatePath("/treinamentos");
  revalidatePath("/treinamentos/acompanhamento");
  return { ok: true, acertos, total, nota, aprovado, notaMinima: t.notaMinima, itens };
}
