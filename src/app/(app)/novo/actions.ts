"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { sessaoAtual, podeEditar } from "@/lib/permissions";
import { lerCamposComerciais } from "@/lib/orcamentos/leitura";

export type FormState = { erro?: string; sucesso?: boolean } | undefined;

// Equivalente a criarOrcamento() (santa-cruz-orcamentos.html, linhas 1986-2010). Funciona sem
// login (representante externo) — podeEditar("NOVO") já devolve true nesse caso (ver
// src/lib/permissions.ts).
export async function criarOrcamento(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await podeEditar("NOVO"))) return { erro: "Sem permissão para abrir um novo orçamento." };

  const campos = lerCamposComerciais(formData);
  if (!campos.cliente || !campos.produtoDescricao) {
    return { erro: "Preencha ao menos o cliente e a descrição do produto." };
  }

  const sessao = await sessaoAtual();
  const orcamento = await prisma.orcamento.create({
    data: {
      ...campos,
      origem: "NOVO",
      etapa: "ABERTO",
      statusDiretoria: null,
      criadoPorId: sessao?.usuarioId ?? null,
    },
  });

  // Representante sem login não tem como ver o Painel — fica na própria tela com uma
  // confirmação, em vez de tentar abrir uma gaveta que ele não teria como enxergar.
  if (sessao) redirect(`/painel/${orcamento.id}`);
  return { sucesso: true };
}
