import "server-only";
import { prisma } from "@/lib/db";
import { modelosDoDoc, soEscolhida } from "@/lib/orcamentos/modelos";
import type { PrecificacaoTier, ReqCliente, ReqTecnicos } from "@/lib/orcamentos/types";
import { itensIniciais, folhasEstimadas, producaoTotal } from "./montagem";
import { suportesDoOrcamento } from "./suportes";

// Abre o Aceite de Pedido de um orçamento que o cliente aprovou, guardando a SO fechada, um item
// por modelo e o papel que o orçamento especificou (como o bloco "Suporte especificado" do
// formulário). Chamado por registrarDesfecho (painel/actions.ts) no desfecho positivo.
// Idempotente: registrar o positivo de novo atualiza só a SO, sem apagar o que já foi feito.
export async function abrirAceite(orcamentoId: string) {
  const doc = await prisma.orcamento.findUniqueOrThrow({ where: { id: orcamentoId } });
  const so = soEscolhida((doc.precificacao as PrecificacaoTier[] | null) ?? []);
  const soEscolhidaJson = so ? JSON.parse(JSON.stringify(so)) : undefined;
  const suportes = suportesDoOrcamento(doc.reqCliente as ReqCliente | null, doc.reqTecnicos as ReqTecnicos | null, so);
  const itens = itensIniciais(modelosDoDoc(doc), so, suportes[0]?.qtdFolha ?? null);
  // Folhas do papel principal pela conta do formulário (quantidade ÷ quantidade por folha).
  if (suportes[0]) suportes[0].folhas = folhasEstimadas(producaoTotal(itens) || null, suportes[0].qtdFolha);
  await prisma.aceite.upsert({
    where: { orcamentoId },
    create: {
      orcamentoId,
      soEscolhida: soEscolhidaJson,
      itens: JSON.parse(JSON.stringify(itens)),
      suportes: JSON.parse(JSON.stringify(suportes)),
    },
    update: { soEscolhida: soEscolhidaJson },
  });
}

// Voltar o card da etapa 7 pra 6 desfaz o desfecho positivo. O Aceite que ele abriu só some se
// ainda está em Vendas sem nenhum Pedido de Material; com trabalho feito, fica (alguém resolve à
// mão), pra não apagar registro de Compras ou de Vendas sem ninguém ver.
export async function desfazerAceiteSemAndamento(orcamentoId: string) {
  const aceite = await prisma.aceite.findUnique({
    where: { orcamentoId },
    select: { id: true, etapa: true, vendasLiberadoEm: true, _count: { select: { pedidosMaterial: true } } },
  });
  if (!aceite) return;
  if (aceite.etapa === "VENDAS" && !aceite.vendasLiberadoEm && aceite._count.pedidosMaterial === 0) {
    await prisma.aceite.delete({ where: { id: aceite.id } });
  }
}

// Remove o Aceite de um orçamento junto com os Pedidos de Material dele. Os PMs têm exclusão "solta"
// (onDelete SetNull, porque o PM é independente do módulo que o pediu), então apagar só o Aceite ou o
// orçamento deixaria PMs órfãos em Compras: aqui eles saem junto. Uso do administrador, para limpar
// cards de teste que não podem ficar como dados oficiais.
export async function removerAceite(orcamentoId: string) {
  const aceite = await prisma.aceite.findUnique({ where: { orcamentoId }, select: { id: true } });
  if (!aceite) return;
  await prisma.$transaction([
    prisma.pedidoMaterial.deleteMany({ where: { aceiteId: aceite.id } }),
    prisma.aceite.delete({ where: { id: aceite.id } }),
  ]);
}

// Desfaz a escolha do desfecho positivo na precificação: nenhuma SO fica marcada e o Nº do pedido do
// cliente sai (ele foi digitado junto com o desfecho).
export function limparEscolhaDoDesfecho(tiers: PrecificacaoTier[] | null): PrecificacaoTier[] {
  return (tiers ?? []).map((t) => {
    const limpa: PrecificacaoTier = { ...t, escolhidaPeloCliente: false };
    delete limpa.pedidoCliente;
    return limpa;
  });
}
