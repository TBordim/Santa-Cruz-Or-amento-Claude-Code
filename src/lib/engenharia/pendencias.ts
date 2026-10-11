import "server-only";
import { prisma } from "@/lib/db";
import { podeEditar } from "@/lib/permissions";
import { listarAceites } from "@/lib/aceite/dados";
import { FILAS } from "@/lib/aceite/filas";

// Pendências da Engenharia, juntando os módulos que dependem dela (pedido do Thiago em
// 08/10/2026: a Engenharia recebe trabalho do Orçamento, do Aceite e do que vier, e precisa de um
// lugar só). Cada origem só aparece pra quem pode agir nela (administrador vê todas):
//  - Orçamento, etapa 2 (Engenharia): área ENGENHARIA;
//  - Orçamento, etapa 7 (Cadastro de Produto) sem Aceite: área CADASTRO_PRODUTO. Com Aceite, o
//    código é lançado pela conferência do Aceite, então não aparece duas vezes;
//  - Aceite de Pedido a conferir: área ACEITE_ENGENHARIA.
// Pra uma origem nova: uma entrada aqui e uma seção na tela /engenharia.

const orcamentoResumo = {
  id: true,
  cliente: true,
  produtoDescricao: true,
  preCadastro: true,
  numeroOrcamento: true,
  classificacao: true,
  atualizadoEm: true,
  desfechoEm: true,
} as const;

export async function origensDaPessoa() {
  const [orcamento, cadastro, aceite] = await Promise.all([podeEditar("ENGENHARIA"), podeEditar("CADASTRO_PRODUTO"), podeEditar("ACEITE_ENGENHARIA")]);
  return { orcamento, cadastro, aceite };
}

export async function listarPendenciasEngenharia() {
  const origens = await origensDaPessoa();
  const [aceites, orcamentos, cadastros] = await Promise.all([
    origens.aceite ? listarAceites(FILAS.engenharia.conferir) : Promise.resolve([]),
    origens.orcamento
      ? prisma.orcamento.findMany({ where: { origem: "NOVO", etapa: "ENGENHARIA" }, orderBy: { atualizadoEm: "asc" }, select: orcamentoResumo })
      : Promise.resolve([]),
    origens.cadastro
      ? prisma.orcamento.findMany({ where: { origem: "NOVO", etapa: "CADASTRO_PRODUTO", aceite: null }, orderBy: { desfechoEm: "asc" }, select: orcamentoResumo })
      : Promise.resolve([]),
  ]);
  return { origens, aceites, orcamentos, cadastros, total: aceites.length + orcamentos.length + cadastros.length };
}

export async function contarPendenciasEngenharia(): Promise<number> {
  const origens = await origensDaPessoa();
  const [a, o, c] = await Promise.all([
    origens.aceite ? prisma.aceite.count({ where: FILAS.engenharia.conferir }) : 0,
    origens.orcamento ? prisma.orcamento.count({ where: { origem: "NOVO", etapa: "ENGENHARIA" } }) : 0,
    origens.cadastro ? prisma.orcamento.count({ where: { origem: "NOVO", etapa: "CADASTRO_PRODUTO", aceite: null } }) : 0,
  ]);
  return a + o + c;
}
