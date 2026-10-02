"use server";

import { del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { ehAdmin } from "@/lib/permissions";
import { MODULOS_COM_TREINAMENTO } from "@/lib/treinamentos/apresentacao";
import { validarQuiz } from "@/lib/treinamentos/quiz";

// O vídeo e as legendas já foram enviados direto para o Blob pelo navegador (ver api/treinamentos/upload); aqui chega
// só o endereço deles, junto com o resto do cadastro.
export type ArquivoBlob = { url: string; pathname: string };

export type DadosTreinamento = {
  id?: string; // sem id = novo
  titulo: string;
  modulo: string;
  descricao: string;
  perfilIds: string[];
  notaMinima: number;
  ordem: number;
  ativo: boolean;
  duracaoSeg: number | null;
  video?: ArquivoBlob; // novo vídeo (no cadastro é obrigatório; na edição, só se for trocar)
  legendas?: ArquivoBlob;
  removerLegendas?: boolean;
  quizTexto?: string; // conteúdo do quiz.json (no cadastro é obrigatório; na edição, só se for trocar)
};

export type ResultadoSalvar = { erro: string } | { ok: true; id: string; aviso?: string };

async function apagarDoBlob(pathname: string | null | undefined) {
  if (!pathname) return;
  // Arquivo que já sumiu do Blob não pode travar o cadastro.
  await del(pathname).catch(() => {});
}

// Cadastro e edição de treinamento, só para administrador (conferido de novo aqui, não só escondido na tela).
// Trocar o vídeo ou o quiz SOBE a versão: quem foi aprovado na versão antiga passa a ver "Atualizado, refazer".
export async function salvarTreinamento(dados: DadosTreinamento): Promise<ResultadoSalvar> {
  if (!(await ehAdmin())) return { erro: "Só administrador cadastra treinamentos." };

  const titulo = dados.titulo.trim();
  if (!titulo) return { erro: "Dê um título ao treinamento." };
  if (!MODULOS_COM_TREINAMENTO.some((m) => m.key === dados.modulo)) return { erro: "Escolha o módulo do treinamento." };
  if (dados.perfilIds.length === 0) return { erro: "Marque pelo menos um perfil: só quem tem o perfil vê o treinamento." };
  if (!Number.isInteger(dados.notaMinima) || dados.notaMinima < 1 || dados.notaMinima > 100) return { erro: "A nota mínima precisa ser de 1 a 100." };
  if (!Number.isInteger(dados.ordem)) return { erro: "A ordem precisa ser um número inteiro." };

  const perfisValidos = await prisma.perfil.count({ where: { id: { in: dados.perfilIds } } });
  if (perfisValidos !== dados.perfilIds.length) return { erro: "Algum perfil marcado não existe mais. Recarregue a página." };

  let quiz: Prisma.InputJsonObject | undefined;
  if (dados.quizTexto?.trim()) {
    let bruto: unknown;
    try {
      bruto = JSON.parse(dados.quizTexto);
    } catch {
      return { erro: "O quiz não é um JSON válido." };
    }
    const r = validarQuiz(bruto);
    if (!r.ok) return { erro: r.erro };
    quiz = r.quiz as unknown as Prisma.InputJsonObject; // { perguntas: [...] } já validado acima
  }

  const comum = {
    titulo,
    modulo: dados.modulo,
    descricao: dados.descricao.trim() || null,
    notaMinima: dados.notaMinima,
    ordem: dados.ordem,
    ativo: dados.ativo,
  };

  // ---------- novo ----------
  if (!dados.id) {
    if (!dados.video) return { erro: "Envie o vídeo." };
    if (!quiz) return { erro: "Importe o quiz (o quiz.json do módulo)." };
    const criado = await prisma.treinamento.create({
      data: {
        ...comum,
        videoUrl: dados.video.url,
        videoPathname: dados.video.pathname,
        legendasUrl: dados.legendas?.url ?? null,
        legendasPathname: dados.legendas?.pathname ?? null,
        duracaoSeg: dados.duracaoSeg,
        quiz,
        perfis: { create: dados.perfilIds.map((perfilId) => ({ perfilId })) },
      },
    });
    revalidatePath("/treinamentos", "layout");
    return { ok: true, id: criado.id };
  }

  // ---------- edição ----------
  const atual = await prisma.treinamento.findUnique({ where: { id: dados.id } });
  if (!atual) return { erro: "Treinamento não encontrado." };

  const trocouVideo = !!dados.video;
  const trocouQuiz = !!quiz;
  const sobeVersao = trocouVideo || trocouQuiz;

  await prisma.$transaction([
    prisma.treinamentoPerfil.deleteMany({ where: { treinamentoId: atual.id } }),
    prisma.treinamento.update({
      where: { id: atual.id },
      data: {
        ...comum,
        ...(sobeVersao ? { versao: { increment: 1 } } : {}),
        ...(trocouVideo ? { videoUrl: dados.video!.url, videoPathname: dados.video!.pathname, duracaoSeg: dados.duracaoSeg ?? atual.duracaoSeg } : {}),
        ...(dados.legendas
          ? { legendasUrl: dados.legendas.url, legendasPathname: dados.legendas.pathname }
          : dados.removerLegendas
            ? { legendasUrl: null, legendasPathname: null }
            : {}),
        ...(trocouQuiz ? { quiz } : {}),
        perfis: { create: dados.perfilIds.map((perfilId) => ({ perfilId })) },
      },
    }),
  ]);

  // Só depois de gravar é que os arquivos antigos saem do Blob.
  if (trocouVideo) await apagarDoBlob(atual.videoPathname);
  if (dados.legendas || dados.removerLegendas) await apagarDoBlob(atual.legendasPathname);

  let aviso: string | undefined;
  if (sobeVersao) {
    const aprovados = await prisma.tentativaTreinamento.groupBy({
      by: ["usuarioId"],
      where: { treinamentoId: atual.id, versaoTreinamento: atual.versao, aprovado: true },
    });
    aviso = `A versão subiu para ${atual.versao + 1}. ${aprovados.length} ${aprovados.length === 1 ? "pessoa precisa" : "pessoas precisam"} refazer.`;
  }

  revalidatePath("/treinamentos", "layout");
  return { ok: true, id: atual.id, aviso };
}
