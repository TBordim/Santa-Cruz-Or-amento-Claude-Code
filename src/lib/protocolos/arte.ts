import "server-only";
import { prisma } from "@/lib/db";
import { modelosDoDoc } from "@/lib/orcamentos/modelos";
import { normalizarLink } from "@/lib/orcamentos/link";

// Registro das artes que chegam e a trava do Aceite. REGRA (correção do Thiago em 19/10/2026): a arte
// só é PROTOCOLADA quando o cliente confirma o pedido e ele vai pro Aceite. Durante o pedido de
// orçamento ela é só um arquivo que acompanha o orçamento — sem protocolo e sem trava. Por isso uma
// ArteEnviada só nasce quando o orçamento JÁ TEM Aceite (ou, ao abrir o Aceite, a partir das artes
// que já estavam anexadas — ver gerarPendenciasDeArte). Enquanto houver uma pendente, o Aceite não
// segue pra Engenharia. Orçamentos e Aceites que já existiam não têm ArteEnviada e nunca são bloqueados.

type Origem = "ORCAMENTO" | "ATENDIMENTO" | "ORDEM_DE_COMPRA";

// O pedido existe quando o cliente confirmou (desfecho positivo) e o Aceite foi aberto.
async function temAceite(orcamentoId: string): Promise<boolean> {
  return !!(await prisma.aceite.findUnique({ where: { orcamentoId }, select: { id: true } }));
}

// Arte em arquivo, já gravada como Anexo do orçamento. Antes do pedido (sem Aceite) não registra
// nada: a arte só acompanha o orçamento.
export async function registrarArteDeAnexo(d: {
  anexoId: string;
  orcamentoId: string;
  modeloId?: string | null;
  rotulo: string;
  origem: Origem;
  enviadoPor: string;
}) {
  if (!(await temAceite(d.orcamentoId))) return;
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
  if (!(await temAceite(orcamentoId))) return;
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

// Link de arte enviado fora do card (pelo Atendimento). Mesma regra: só vira pendência com pedido.
export async function registrarArteDeLinkAvulso(d: { orcamentoId: string; link: string; origem: Origem; enviadoPor: string }) {
  if (!(await temAceite(d.orcamentoId))) return false;
  const jaTem = await prisma.arteEnviada.findFirst({ where: { orcamentoId: d.orcamentoId, link: d.link }, select: { id: true } });
  if (jaTem) return true;
  const orc = await prisma.orcamento.findUnique({ where: { id: d.orcamentoId }, select: { cliente: true } });
  await prisma.arteEnviada.create({
    data: { orcamentoId: d.orcamentoId, link: d.link, clienteNome: orc?.cliente ?? null, rotulo: "Link da arte", origem: d.origem, enviadoPor: d.enviadoPor },
  });
  return true;
}

// Quando o pedido é confirmado e o Aceite abre, as artes que vinham junto do orçamento (arquivos de
// arte e o link) passam a precisar de protocolo. Idempotente: o que já está na fila não duplica.
export async function gerarPendenciasDeArte(orcamentoId: string, enviadoPor: string) {
  const orc = await prisma.orcamento.findUnique({ where: { id: orcamentoId }, include: { anexos: { where: { tipo: "ARTE" } } } });
  if (!orc) return;
  for (const a of orc.anexos) {
    const jaTem = await prisma.arteEnviada.findUnique({ where: { anexoId: a.id }, select: { id: true } });
    if (jaTem) continue;
    await prisma.arteEnviada.create({
      data: { orcamentoId, anexoId: a.id, modeloId: a.modeloId, clienteNome: orc.cliente, rotulo: a.nome, origem: "ORCAMENTO", enviadoPor },
    });
  }
  const link = normalizarLink((orc.reqCliente as { linkArte?: string } | null)?.linkArte) || "";
  if (link) await registrarArteDeLinkAvulso({ orcamentoId, link, origem: "ORCAMENTO", enviadoPor });
}

// Mensagem de bloqueio, ou null se pode avançar. Usada na liberação do Aceite pra Engenharia e na
// confirmação da Engenharia (aceite/actions.ts).
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
  return `Há ${pendentes.length === 1 ? "1 arte aguardando" : `${pendentes.length} artes aguardando`} o protocolo de Vendas: ${nomes.join("; ")}. O Aceite só segue para a Engenharia depois que forem protocoladas (Protocolos → Artes a protocolar). Se o arquivo não for arte (um e-mail, por exemplo), use "Não precisa de protocolo" no bloco "Protocolos da arte" do Aceite.`;
}

// Quantas artes de um orçamento estão pendentes (pro aviso no card).
export async function contarArtesPendentes(orcamentoId: string): Promise<number> {
  return prisma.arteEnviada.count({ where: { orcamentoId, estado: "PENDENTE" } });
}
