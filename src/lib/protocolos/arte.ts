import "server-only";
import { prisma } from "@/lib/db";
import { modelosDoDoc } from "@/lib/orcamentos/modelos";
import { normalizarLink } from "@/lib/orcamentos/link";

// Registro das artes que chegam e a trava dos cards. Toda arte nova (arquivo anexado ou link) vira
// uma ArteEnviada PENDENTE; o card não avança enquanto houver uma pendente (decisão do Thiago em
// 17/10/2026). Orçamentos e Aceites que já existiam não têm ArteEnviada e nunca são bloqueados.

type Origem = "ORCAMENTO" | "ATENDIMENTO" | "ORDEM_DE_COMPRA";

// Arte em arquivo, já gravada como Anexo do orçamento.
export async function registrarArteDeAnexo(d: {
  anexoId: string;
  orcamentoId: string;
  modeloId?: string | null;
  rotulo: string;
  origem: Origem;
  enviadoPor: string;
}) {
  const orc = await prisma.orcamento.findUnique({ where: { id: d.orcamentoId }, select: { cliente: true } });
  await prisma.arteEnviada.create({
    data: {
      anexoId: d.anexoId,
      orcamentoId: d.orcamentoId,
      modeloId: d.modeloId ?? null,
      clienteNome: orc?.cliente ?? null,
      rotulo: d.rotulo,
      origem: d.origem,
      enviadoPor: d.enviadoPor,
    },
  });
}

// O link da arte que o cliente mandou (Drive, WeTransfer...) também precisa de protocolo: o link é
// aberto, impresso, carimbado e protocolado. Idempotente: salvar o orçamento de novo com o mesmo
// link não cria outra pendência; trocar o link (corrigir um erro de digitação) tira a pendência do
// link antigo, pra ela não travar o card pra sempre.
export async function sincronizarArteDeLink(orcamentoId: string, linkBruto: string | null | undefined, enviadoPor: string) {
  const link = normalizarLink(linkBruto) || "";
  await prisma.arteEnviada.deleteMany({
    // Só as do próprio card (origem ORCAMENTO): link que o Atendimento enviou não some quando o card é salvo.
    where: { orcamentoId, anexoId: null, estado: "PENDENTE", origem: "ORCAMENTO", link: { not: null }, ...(link ? { NOT: { link } } : {}) },
  });
  if (!link) return;
  const jaTem = await prisma.arteEnviada.findFirst({ where: { orcamentoId, link }, select: { id: true } });
  if (jaTem) return;
  const orc = await prisma.orcamento.findUnique({ where: { id: orcamentoId }, select: { cliente: true } });
  await prisma.arteEnviada.create({
    data: { orcamentoId, link, clienteNome: orc?.cliente ?? null, rotulo: "Link da arte", origem: "ORCAMENTO", enviadoPor },
  });
}

// Mensagem de bloqueio, ou null se pode avançar. Usada em todas as transições de etapa que vão
// pra frente (painel/actions.ts) e na liberação do Aceite (aceite/actions.ts).
export async function erroPorArtePendente(orcamentoId: string): Promise<string | null> {
  const pendentes = await prisma.arteEnviada.findMany({
    where: { orcamentoId, estado: "PENDENTE" },
    select: { rotulo: true, modeloId: true },
    orderBy: { enviadoEm: "asc" },
  });
  if (!pendentes.length) return null;
  const orc = await prisma.orcamento.findUnique({ where: { id: orcamentoId } });
  const modelos = orc ? modelosDoDoc(orc) : [];
  const nomes = pendentes.map((p) => {
    const m = modelos.find((x) => x.id === p.modeloId);
    return m?.descricao ? `${p.rotulo} (${m.descricao})` : p.rotulo;
  });
  return `Há ${pendentes.length === 1 ? "1 arte aguardando" : `${pendentes.length} artes aguardando`} o protocolo de Vendas: ${nomes.join("; ")}. O card só avança depois de protocolada.`;
}

// Quantas artes de um orçamento estão pendentes (pro aviso no card).
export async function contarArtesPendentes(orcamentoId: string): Promise<number> {
  return prisma.arteEnviada.count({ where: { orcamentoId, estado: "PENDENTE" } });
}
