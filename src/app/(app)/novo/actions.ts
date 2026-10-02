"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { sessaoAtual, podeEditar } from "@/lib/permissions";
import { lerCamposComerciais } from "@/lib/orcamentos/leitura";
import { cnpjValido, somenteDigitos } from "@/lib/clientes/cnpj";
import { textoBusca } from "@/lib/clientes/busca";

export type FormState = { erro?: string; sucesso?: boolean } | undefined;

// Equivalente a criarOrcamento() (santa-cruz-orcamentos.html, linhas 1986-2010). Exige login
// desde 02/10/2026 (representante tem perfil só com a área NOVO) — ver src/lib/permissions.ts.
export async function criarOrcamento(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await podeEditar("NOVO"))) return { erro: "Sem permissão para abrir um novo orçamento." };

  const campos = lerCamposComerciais(formData);
  if (!campos.cliente || !campos.produtoDescricao) {
    return { erro: "Preencha ao menos o cliente e a descrição do produto." };
  }

  if (!campos.qtdEntregas || !campos.entregaDatas) {
    return { erro: "Informe a quantidade de entregas e a data de entrega solicitada pelo cliente." };
  }

  // Sem quantidade não dá pra gerar as SOs — o campo também é obrigatório na tela, aqui é a trava
  // de verdade (a tela pode ser burlada).
  if (!campos.reqCliente.quantidadesLista.length) {
    return { erro: "Informe ao menos uma quantidade a orçar." };
  }

  const sessao = await sessaoAtual();
  const clienteId = await resolverCliente(formData, campos, sessao?.usuarioId ?? null);
  const orcamento = await prisma.orcamento.create({
    data: {
      ...campos,
      clienteId,
      origem: "NOVO",
      etapa: "ABERTO",
      statusDiretoria: null,
      criadoPorId: sessao?.usuarioId ?? null,
    },
  });

  // Representante só abre o Novo Orçamento — não tem como ver o Painel, então fica na própria
  // tela com uma confirmação.
  if (sessao && !sessao.soNovo) redirect(`/painel/${orcamento.id}`);
  return { sucesso: true };
}

// Liga o orçamento ao cadastro de clientes. Cliente escolhido na busca: confere que existe.
// Sem escolha mas com CNPJ válido: usa o cadastro desse CNPJ ou, se não houver, cadastra o
// cliente como novo, pendente de conferência pelo escritório. O texto digitado no orçamento
// (nome, endereço...) continua valendo como está — o cadastro só serve de ponto de partida.
async function resolverCliente(
  fd: FormData,
  campos: ReturnType<typeof lerCamposComerciais>,
  usuarioId: string | null,
): Promise<string | null> {
  const escolhido = String(fd.get("clienteId") ?? "").trim();
  if (escolhido) {
    const c = await prisma.cliente.findUnique({ where: { id: escolhido }, select: { id: true } });
    return c?.id ?? null;
  }

  const cnpj = somenteDigitos(campos.cnpj);
  if (!cnpjValido(cnpj) || !campos.cliente) return null;
  const existente = await prisma.cliente.findUnique({ where: { cnpj }, select: { id: true } });
  if (existente) return existente.id;

  const novo = await prisma.cliente.create({
    data: {
      cnpj,
      razaoSocial: campos.cliente,
      busca: textoBusca(campos.cliente),
      // O endereço do orçamento é um texto só; vai inteiro no campo `endereco` do cadastro.
      endereco: campos.endereco || null,
      telefone: campos.telefone || null,
      email: campos.email || null,
      contato: campos.contatoCompras || null,
      origem: "REPRESENTANTE",
      pendenteConferencia: true,
      cadastradoPorId: usuarioId,
    },
    select: { id: true },
  });
  return novo.id;
}
