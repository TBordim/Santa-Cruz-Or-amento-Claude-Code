"use server";

import { prisma } from "@/lib/db";
import { podeEditar } from "@/lib/permissions";
import { textoBusca } from "@/lib/clientes/busca";
import { cnpjValido, somenteDigitos } from "@/lib/clientes/cnpj";
import { enderecoEmLinha, type ClienteSugestao } from "@/lib/clientes/tipos";
import { paraSugestao } from "@/lib/clientes/sugestao";

const MAX_RESULTADOS = 8;

// Busca por parte do nome ou do CNPJ. Exige 3+ caracteres e devolve no máximo 8, pra a carteira
// de clientes não poder ser listada de uma vez. Só pra quem pode abrir Novo Orçamento (login).
export async function buscarClientes(consulta: string): Promise<ClienteSugestao[]> {
  if (!(await podeEditar("NOVO"))) return [];
  const texto = textoBusca(consulta);
  const digitos = somenteDigitos(consulta);
  if (texto.length < 3 && digitos.length < 3) return [];

  const palavras = texto.split(" ").filter(Boolean);
  const clientes = await prisma.cliente.findMany({
    where: {
      ativo: true,
      OR: [
        ...(palavras.length ? [{ AND: palavras.map((p) => ({ busca: { contains: p } })) }] : []),
        ...(digitos.length >= 3 ? [{ cnpj: { contains: digitos } }] : []),
      ],
    },
    orderBy: { razaoSocial: "asc" },
    take: MAX_RESULTADOS,
  });
  return clientes.map(paraSugestao);
}

export type ConsultaCnpj =
  | { ok: true; cadastrado: ClienteSugestao }
  | { ok: true; cadastrado: null; razaoSocial: string; endereco: string; telefone: string; email: string }
  | { ok: false; erro: string };

// Cliente que não está no cadastro: valida o CNPJ e tenta trazer razão social e endereço da
// BrasilAPI (dados públicos da Receita). Se já existir no cadastro, devolve o cadastrado — evita
// duplicar. Se a consulta externa falhar, não trava: a pessoa preenche à mão.
export async function consultarCnpj(cnpjDigitado: string): Promise<ConsultaCnpj> {
  if (!(await podeEditar("NOVO"))) return { ok: false, erro: "Sem permissão." };
  const cnpj = somenteDigitos(cnpjDigitado);
  if (!cnpjValido(cnpj)) return { ok: false, erro: "CNPJ inválido — confira os números." };

  const existente = await prisma.cliente.findUnique({ where: { cnpj } });
  if (existente) return { ok: true, cadastrado: paraSugestao(existente) };

  try {
    const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    if (!resp.ok) return { ok: true, cadastrado: null, razaoSocial: "", endereco: "", telefone: "", email: "" };
    const d = (await resp.json()) as Record<string, string | number | null>;
    const rua = [d.descricao_tipo_de_logradouro, d.logradouro].filter(Boolean).join(" ");
    const cep = String(d.cep ?? "").padStart(8, "0");
    const endereco = enderecoEmLinha({
      endereco: [rua, d.numero].filter((x) => x && x !== "S/N").join(", ") || rua,
      complemento: (d.complemento as string) || null,
      bairro: (d.bairro as string) || null,
      municipio: (d.municipio as string) || null,
      uf: (d.uf as string) || null,
      cep: cep.length === 8 ? `${cep.slice(0, 5)}-${cep.slice(5)}` : null,
    });
    return {
      ok: true,
      cadastrado: null,
      razaoSocial: String(d.razao_social ?? ""),
      endereco,
      telefone: String(d.ddd_telefone_1 ?? ""),
      email: String(d.email ?? "").toLowerCase(),
    };
  } catch {
    return { ok: true, cadastrado: null, razaoSocial: "", endereco: "", telefone: "", email: "" };
  }
}
