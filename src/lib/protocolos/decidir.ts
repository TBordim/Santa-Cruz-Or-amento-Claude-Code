import "server-only";
import { prisma } from "@/lib/db";
import { chave } from "@/lib/orcamentos/chave";
import { modelosDoDoc } from "@/lib/orcamentos/modelos";
import type { Modelo } from "@/lib/orcamentos/types";
import { guardarArquivoDeProtocolo, lerArquivoGuardado } from "@/lib/anexos/storage";

// As três decisões de Vendas sobre uma arte pendente (17/10/2026):
//  - NOVO: cria o protocolo (número livre; sabores do mesmo produto usam 2101/1, 2101/2...), com a data;
//  - ALTERADO: reprotocola com o MESMO número e a data nova (Karen, 19/10/2026), guardando o registro
//    anterior como histórico (o contador `revisao` é interno, não aparece nas telas);
//  - JÁ PROTOCOLADO: a arte que chegou é desconsiderada e o modelo aponta pro protocolo existente.
// Cada uma amarra o modelo (sabor) do orçamento ao protocolo e à revisão em uso. Revisão nunca é
// apagada nem sobrescrita: é propriedade intelectual do cliente.

export class ErroProtocolo extends Error {}

type Entrada = {
  arteId: string;
  por: string;
  // Modelo (sabor) a que a arte pertence, quando a arte chegou sem saber (ex.: enviada pelo Atendimento).
  modeloId?: string | null;
  // Cópia carimbada/digitalizada (opcional): o link é aberto, impresso, carimbado e protocolado.
  copia?: File | null;
  // Data do protocolo (padrão: hoje); Vendas pode corrigir.
  data?: Date;
};

async function carregarArte(arteId: string) {
  const arte = await prisma.arteEnviada.findUnique({ where: { id: arteId }, include: { anexo: true } });
  if (!arte) throw new ErroProtocolo("Arte não encontrada.");
  if (arte.estado !== "PENDENTE") throw new ErroProtocolo("Esta arte já foi decidida por Vendas.");
  return arte;
}

// Guarda o arquivo da arte (copiando o anexo do orçamento) e a cópia carimbada, se houver.
async function arquivosDaRevisao(protocoloId: string, arte: Awaited<ReturnType<typeof carregarArte>>, copia?: File | null) {
  const d: {
    arquivoNome?: string; arquivoMime?: string; arquivoUrl?: string; arquivoPathname?: string;
    link?: string; copiaNome?: string; copiaUrl?: string; copiaPathname?: string;
  } = {};
  if (arte.anexo) {
    const bytes = await lerArquivoGuardado(arte.anexo.url, arte.anexo.pathname);
    const salvo = await guardarArquivoDeProtocolo(protocoloId, arte.anexo.nome, bytes, arte.anexo.mime);
    d.arquivoNome = arte.anexo.nome;
    d.arquivoMime = arte.anexo.mime;
    d.arquivoUrl = salvo.url;
    d.arquivoPathname = salvo.pathname;
  }
  if (arte.link) d.link = arte.link;
  if (copia && copia.size > 0) {
    const salvo = await guardarArquivoDeProtocolo(protocoloId, copia.name, Buffer.from(await copia.arrayBuffer()), copia.type);
    d.copiaNome = copia.name;
    d.copiaUrl = salvo.url;
    d.copiaPathname = salvo.pathname;
  }
  return d;
}

// Aponta o modelo do orçamento pro protocolo/revisão. Sem orçamento (arte do Atendimento sem
// pedido) não há modelo a atualizar.
async function ligarModelo(orcamentoId: string | null, modeloId: string | null, ref: { id: string; numero: string; revisao: number; data: Date }) {
  if (!orcamentoId) return;
  const orc = await prisma.orcamento.findUnique({ where: { id: orcamentoId } });
  if (!orc) return;
  const modelos = modelosDoDoc(orc);
  const alvo = modeloId ?? (modelos.length === 1 ? modelos[0].id : null);
  if (!alvo) return;
  // Só grava em orçamento que já tem a lista `modelos` (os antigos, de produto único, ainda não têm).
  if (!Array.isArray(orc.modelos)) return;
  const novos: Modelo[] = modelos.map((m) =>
    m.id === alvo ? { ...m, protocoloId: ref.id, protocoloNumero: ref.numero, protocoloRevisao: ref.revisao, protocoloData: ref.data.toISOString() } : m,
  );
  await prisma.orcamento.update({ where: { id: orcamentoId }, data: { modelos: JSON.parse(JSON.stringify(novos)) } });
}

async function exigirModelo(orcamentoId: string | null, modeloId: string | null) {
  if (!orcamentoId || modeloId) return;
  const orc = await prisma.orcamento.findUnique({ where: { id: orcamentoId } });
  if (orc && Array.isArray(orc.modelos) && modelosDoDoc(orc).length > 1) {
    throw new ErroProtocolo("Escolha a qual modelo (sabor) esta arte pertence.");
  }
}

export async function protocolarNovo(e: Entrada & { numero: string; descricao: string; codInterno?: string | null }) {
  const numero = e.numero.trim();
  const descricao = e.descricao.trim();
  if (!numero) throw new ErroProtocolo("Informe o número do protocolo.");
  if (!descricao) throw new ErroProtocolo("Descreva o produto desta arte.");
  const arte = await carregarArte(e.arteId);
  const modeloId = e.modeloId ?? arte.modeloId;
  await exigirModelo(arte.orcamentoId, modeloId);
  if (await prisma.protocolo.findUnique({ where: { numero }, select: { id: true } })) {
    throw new ErroProtocolo(`O protocolo ${numero} já existe. Se a arte é uma versão alterada, use "Reprotocolar (arte alterada)".`);
  }

  const orc = arte.orcamentoId ? await prisma.orcamento.findUnique({ where: { id: arte.orcamentoId } }) : null;
  const protocolo = await prisma.protocolo.create({
    data: {
      numero,
      descricao,
      codInterno: (e.codInterno ?? "").replace(/\D/g, "") || null,
      clienteId: orc?.clienteId ?? null,
      clienteNome: orc?.cliente ?? arte.clienteNome ?? "Cliente sem nome",
      criadoPor: e.por,
    },
  });
  const arquivos = await arquivosDaRevisao(protocolo.id, arte, e.copia);
  const revisao = await prisma.protocoloRevisao.create({
    data: { protocoloId: protocolo.id, revisao: 0, origem: arte.origem, criadoPor: e.por, dataProtocolo: e.data ?? new Date(), ...arquivos },
  });
  await prisma.arteEnviada.update({
    where: { id: arte.id },
    data: { estado: "PROTOCOLADA", revisaoId: revisao.id, modeloId, decididaPor: e.por, decididaEm: new Date() },
  });
  await ligarModelo(arte.orcamentoId, modeloId, { id: protocolo.id, numero, revisao: 0, data: revisao.dataProtocolo });
  return { protocoloId: protocolo.id };
}

export async function protocolarAlterado(e: Entrada & { protocoloId: string; mudou: string }) {
  const arte = await carregarArte(e.arteId);
  const modeloId = e.modeloId ?? arte.modeloId;
  await exigirModelo(arte.orcamentoId, modeloId);
  const protocolo = await prisma.protocolo.findUnique({
    where: { id: e.protocoloId },
    include: { revisoes: { orderBy: { revisao: "desc" }, take: 1 } },
  });
  if (!protocolo) throw new ErroProtocolo("Protocolo não encontrado.");
  const anterior = protocolo.revisoes[0];
  const proxima = (anterior?.revisao ?? -1) + 1;

  const arquivos = await arquivosDaRevisao(protocolo.id, arte, e.copia);
  const revisao = await prisma.protocoloRevisao.create({
    data: {
      protocoloId: protocolo.id,
      revisao: proxima,
      mudou: e.mudou.trim() || null,
      deRevisaoId: anterior?.id ?? null,
      origem: arte.origem,
      criadoPor: e.por,
      dataProtocolo: e.data ?? new Date(),
      ...arquivos,
    },
  });
  await prisma.arteEnviada.update({
    where: { id: arte.id },
    data: { estado: "PROTOCOLADA", revisaoId: revisao.id, modeloId, decididaPor: e.por, decididaEm: new Date() },
  });
  await ligarModelo(arte.orcamentoId, modeloId, { id: protocolo.id, numero: protocolo.numero, revisao: proxima, data: revisao.dataProtocolo });
  return { protocoloId: protocolo.id, revisao: proxima };
}

// A arte que chegou é a mesma já protocolada: ela é desconsiderada e o modelo aponta pro protocolo
// existente, na revisão mais recente.
export async function protocolarJaExistente(e: Entrada & { protocoloId: string }) {
  const arte = await carregarArte(e.arteId);
  const modeloId = e.modeloId ?? arte.modeloId;
  await exigirModelo(arte.orcamentoId, modeloId);
  const protocolo = await prisma.protocolo.findUnique({
    where: { id: e.protocoloId },
    include: { revisoes: { orderBy: { revisao: "desc" }, take: 1 } },
  });
  if (!protocolo) throw new ErroProtocolo("Protocolo não encontrado.");
  const revisao = protocolo.revisoes[0]?.revisao ?? 0;
  const data = protocolo.revisoes[0]?.dataProtocolo ?? protocolo.criadoEm;
  await prisma.arteEnviada.update({
    where: { id: arte.id },
    data: { estado: "DESCARTADA", protocoloExistenteId: protocolo.id, modeloId, decididaPor: e.por, decididaEm: new Date() },
  });
  await ligarModelo(arte.orcamentoId, modeloId, { id: protocolo.id, numero: protocolo.numero, revisao, data });
  return { protocoloId: protocolo.id, revisao };
}

// Protocolos do cliente da arte, como candidatos à sugestão (mesmo cadastro ou nome parecido).
export async function candidatosDoCliente(clienteId: string | null, clienteNome: string | null) {
  const nome = chave(clienteNome);
  const todos = await prisma.protocolo.findMany({
    where: clienteId || nome.length >= 5 ? undefined : { id: "nenhum" },
    include: { revisoes: { orderBy: { revisao: "desc" }, take: 1, select: { dataProtocolo: true } } },
    orderBy: { criadoEm: "desc" },
    take: 500,
  });
  return todos
    .filter((p) => (clienteId && p.clienteId === clienteId) || (nome.length >= 5 && (chave(p.clienteNome).includes(nome) || nome.includes(chave(p.clienteNome)))))
    .map((p) => ({
      id: p.id,
      numero: p.numero,
      clienteNome: p.clienteNome,
      descricao: p.descricao,
      codInterno: p.codInterno,
      ultimaData: (p.revisoes[0]?.dataProtocolo ?? p.criadoEm).toISOString(),
    }));
}
