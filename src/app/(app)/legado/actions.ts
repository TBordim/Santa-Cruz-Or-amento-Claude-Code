"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { podeEditar } from "@/lib/permissions";
import { chave } from "@/lib/orcamentos/legado";
import { normalizarCodigoInterno, codigoInternoValido } from "@/lib/orcamentos/codigo-interno";
import { salvarAnexoNoBlob, excluirAnexoDoBlob } from "@/lib/anexos/storage";
import { parseValorBR } from "@/lib/orcamentos/leitura";

export type FormState = { erro?: string } | undefined;

async function exigirLegado() {
  if (!(await podeEditar("LEGADO"))) throw new Error("Sem permissão para editar o Arquivo legado.");
}

export async function criarLegado(_prev: FormState, formData: FormData): Promise<FormState> {
  await exigirLegado();
  const cliente = String(formData.get("cliente") ?? "").trim();
  const produtoDescricao = String(formData.get("produtoDescricao") ?? "").trim();
  if (!cliente || !produtoDescricao) return { erro: "Preencha ao menos o cliente e a descrição do produto." };

  const codInterno = normalizarCodigoInterno(String(formData.get("codInterno") ?? ""));
  if (!codigoInternoValido(codInterno)) {
    return { erro: "Código interno (Santa Cruz) é obrigatório, no formato 0.000.000 (7 dígitos)." };
  }

  const precoAtual = parseValorBR(String(formData.get("precoAtual") ?? ""));
  const custoPrimarioPct = parseValorBR(String(formData.get("custoPrimarioPct") ?? ""));
  const margemP2Pct = parseValorBR(String(formData.get("margemP2Pct") ?? ""));
  const quantidade = parseValorBR(String(formData.get("quantidade") ?? ""));

  const orcamento = await prisma.orcamento.create({
    data: {
      origem: "LEGADO",
      cliente,
      clienteChave: chave(cliente),
      codInterno,
      produtoDescricao,
      produtoChave: chave(produtoDescricao),
      precoAtual: Number.isNaN(precoAtual) ? null : precoAtual,
      custoPrimarioPct: Number.isNaN(custoPrimarioPct) ? null : custoPrimarioPct,
      margemP2Pct: Number.isNaN(margemP2Pct) ? null : margemP2Pct,
      quantidade: Number.isNaN(quantidade) ? null : quantidade,
      dataLegadoTexto: String(formData.get("dataTexto") ?? "").trim(),
      obs: String(formData.get("obs") ?? "").trim(),
    },
  });

  const foto = formData.get("foto");
  if (foto instanceof File && foto.size > 0) {
    const { url, pathname } = await salvarAnexoNoBlob(orcamento.id, foto);
    await prisma.orcamento.update({ where: { id: orcamento.id }, data: { fotoUrl: url, fotoPathname: pathname, fotoMime: foto.type } });
  }

  revalidatePath("/legado");
  redirect("/legado");
}

// Equivalente ao "salvar-dados-legado" — os campos usados na comparação de discrepância são
// editáveis num registro já cadastrado (o resto é imutável). codInterno entrou aqui em
// 19/09/2026 pra deixar registros antigos (cadastrados antes desse campo existir) serem
// preenchidos aos poucos — sem código interno, um Arquivo legado não entra em nenhuma
// comparação da Diretoria.
export async function salvarDadosLegado(formData: FormData) {
  await exigirLegado();
  const id = String(formData.get("id") ?? "");
  const precoAtual = parseValorBR(String(formData.get("precoAtual") ?? ""));
  const custoPrimarioPct = parseValorBR(String(formData.get("custoPrimarioPct") ?? ""));
  const margemP2Pct = parseValorBR(String(formData.get("margemP2Pct") ?? ""));
  const quantidade = parseValorBR(String(formData.get("quantidade") ?? ""));
  const codInternoForm = normalizarCodigoInterno(String(formData.get("codInterno") ?? ""));
  if (codInternoForm && !codigoInternoValido(codInternoForm)) {
    throw new Error("Código interno (Santa Cruz) deve ter o formato 0.000.000 (7 dígitos).");
  }

  await prisma.orcamento.update({
    where: { id },
    data: {
      precoAtual: Number.isNaN(precoAtual) ? null : precoAtual,
      custoPrimarioPct: Number.isNaN(custoPrimarioPct) ? null : custoPrimarioPct,
      margemP2Pct: Number.isNaN(margemP2Pct) ? null : margemP2Pct,
      quantidade: Number.isNaN(quantidade) ? null : quantidade,
      ...(codInternoForm ? { codInterno: codInternoForm } : {}),
    },
  });
  revalidatePath("/legado");
}

export async function excluirLegado(formData: FormData) {
  await exigirLegado();
  const id = String(formData.get("id") ?? "");
  const doc = await prisma.orcamento.findUnique({ where: { id } });
  if (doc?.fotoPathname) await excluirAnexoDoBlob(doc.fotoPathname);
  await prisma.orcamento.delete({ where: { id } });
  revalidatePath("/legado");
}
