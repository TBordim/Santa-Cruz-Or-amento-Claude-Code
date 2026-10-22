import "server-only";
import { prisma } from "@/lib/db";
import type { SessaoAtual } from "@/lib/permissions";
import { contaComoPendente, situacaoDe } from "./situacao";

// Quem vê o painel de acompanhamento: administrador e perfis com a área TREINAMENTOS_ACOMPANHAMENTO (Diretoria).
export function podeAcompanhar(s: SessaoAtual): boolean {
  return s.admin || s.areas.includes("TREINAMENTOS_ACOMPANHAMENTO");
}

// Regra de acesso: cada pessoa vê só os treinamentos ativos ligados ao SEU perfil. O administrador vê todos.
// É um filtro de consulta (não só esconder botão): toda tela e toda action que mexe num treinamento passa por aqui.
export function filtroDeAcesso(s: SessaoAtual) {
  return { ativo: true, ...(s.admin ? {} : { perfis: { some: { perfilId: s.perfilId } } }) };
}

// Lista de "Meus treinamentos": os visíveis para a pessoa, com a situação dela em cada um.
export async function treinamentosDaPessoa(s: SessaoAtual) {
  const itens = await prisma.treinamento.findMany({
    where: filtroDeAcesso(s),
    orderBy: [{ modulo: "asc" }, { ordem: "asc" }, { titulo: "asc" }],
    select: {
      id: true,
      titulo: true,
      modulo: true,
      descricao: true,
      duracaoSeg: true,
      versao: true,
      notaMinima: true,
      tentativas: {
        where: { usuarioId: s.usuarioId },
        select: { versaoTreinamento: true, nota: true, aprovado: true, criadaEm: true },
      },
    },
  });
  return itens.map(({ tentativas, ...t }) => ({ ...t, situacao: situacaoDe(t.versao, tentativas) }));
}

// Selo de pendência do menu e da página de entrada. O administrador vê tudo mas não é cobrado de nada.
export async function contarPendentes(s: SessaoAtual): Promise<number> {
  if (s.admin) return 0;
  const itens = await treinamentosDaPessoa(s);
  return itens.filter((t) => contaComoPendente(t.situacao)).length;
}

export type FiltrosAcompanhamento = { perfilId?: string; treinamentoId?: string; soPendentes?: boolean };

// Painel de acompanhamento: uma linha por colaborador ativo, uma coluna por treinamento ativo. A célula só
// existe (`aplica`) quando o perfil da pessoa está ligado ao treinamento; as outras mostram "não se aplica".
// Uma linha entra na tabela se a pessoa tem pelo menos um treinamento aplicável (o administrador, sem
// treinamento de perfil, fica de fora).
export async function matrizAcompanhamento(f: FiltrosAcompanhamento) {
  const [treinamentos, usuarios] = await Promise.all([
    prisma.treinamento.findMany({
      where: { ativo: true, ...(f.treinamentoId ? { id: f.treinamentoId } : {}) },
      orderBy: [{ modulo: "asc" }, { ordem: "asc" }, { titulo: "asc" }],
      select: { id: true, titulo: true, modulo: true, versao: true, perfis: { select: { perfilId: true } } },
    }),
    prisma.usuario.findMany({
      where: { ativo: true, ...(f.perfilId ? { perfilId: f.perfilId } : {}) },
      orderBy: { nome: "asc" },
      select: {
        id: true,
        nome: true,
        perfil: { select: { id: true, nome: true } },
        tentativasTreinamento: { select: { treinamentoId: true, versaoTreinamento: true, nota: true, aprovado: true, criadaEm: true } },
      },
    }),
  ]);

  let linhas = usuarios
    .map((u) => ({
      id: u.id,
      nome: u.nome,
      perfilNome: u.perfil.nome,
      celulas: treinamentos.map((t) =>
        t.perfis.some((p) => p.perfilId === u.perfil.id)
          ? {
              aplica: true as const,
              situacao: situacaoDe(t.versao, u.tentativasTreinamento.filter((x) => x.treinamentoId === t.id)),
            }
          : { aplica: false as const },
      ),
    }))
    .filter((l) => l.celulas.some((c) => c.aplica));
  if (f.soPendentes) {
    linhas = linhas.filter((l) => l.celulas.some((c) => c.aplica && contaComoPendente(c.situacao)));
  }

  const resumo = treinamentos.map((t, i) => {
    const aplicaveis = linhas.flatMap((l) => (l.celulas[i].aplica ? [l.celulas[i].situacao] : []));
    return {
      treinamentoId: t.id,
      aplicaveis: aplicaveis.length,
      concluidos: aplicaveis.filter((s) => s.tipo === "CONCLUIDO").length,
      refazer: aplicaveis.filter((s) => s.tipo === "REFAZER" || s.tipo === "ATUALIZADO").length,
      pendentes: aplicaveis.filter((s) => s.tipo === "PENDENTE").length,
    };
  });

  return { treinamentos, linhas, resumo };
}
