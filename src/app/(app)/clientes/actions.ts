"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { podeEditar } from "@/lib/permissions";
import { textoBusca } from "@/lib/clientes/busca";
import { cnpjValido, somenteDigitos } from "@/lib/clientes/cnpj";

export type FormState = { erro?: string } | undefined;

function texto(fd: FormData, nome: string): string {
  return String(fd.get(nome) ?? "").trim();
}

// "28/35/42" (ou "28 35 42", "28, 35") -> [28, 35, 42]. Até 5 parcelas, de 1 a 365 dias.
function lerPrazos(s: string): number[] | null {
  const partes = s.split(/[^0-9]+/).filter(Boolean).map(Number);
  if (partes.length > 5 || partes.some((n) => n < 1 || n > 365)) return null;
  return partes;
}

function formatarCep(s: string): string | null {
  const d = somenteDigitos(s);
  if (!d) return null;
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : s;
}

// Conferir/editar o cadastro é do escritório: área CLIENTES (ou administrador). A ação confere de
// novo por conta própria — uma server action pode ser chamada direto, sem passar pela tela.
export async function salvarCliente(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!(await podeEditar("CLIENTES"))) return { erro: "Sem permissão para editar clientes." };

  const id = texto(fd, "id");
  const razaoSocial = texto(fd, "razaoSocial");
  const cnpj = somenteDigitos(texto(fd, "cnpj"));
  const uf = texto(fd, "uf").toUpperCase();
  const email = texto(fd, "email").toLowerCase();
  const prazos = lerPrazos(texto(fd, "prazosPagamento"));

  if (!id) return { erro: "Cliente não identificado." };
  if (!razaoSocial) return { erro: "Informe a razão social." };
  if (!cnpjValido(cnpj)) return { erro: "CNPJ inválido — confira os números." };
  if (uf && !/^[A-Z]{2}$/.test(uf)) return { erro: "UF precisa ter 2 letras (ex.: RJ)." };
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return { erro: "E-mail inválido." };
  if (!prazos) return { erro: "Prazos de pagamento: até 5 números de 1 a 365, separados por barra (ex.: 28/35/42)." };

  const outro = await prisma.cliente.findFirst({ where: { cnpj, NOT: { id } }, select: { razaoSocial: true } });
  if (outro) return { erro: `Já existe outro cliente com esse CNPJ: ${outro.razaoSocial}.` };

  await prisma.cliente.update({
    where: { id },
    data: {
      razaoSocial,
      busca: textoBusca(razaoSocial),
      cnpj,
      endereco: texto(fd, "endereco") || null,
      complemento: texto(fd, "complemento") || null,
      bairro: texto(fd, "bairro") || null,
      cep: formatarCep(texto(fd, "cep")),
      uf: uf || null,
      municipio: texto(fd, "municipio") || null,
      telefone: texto(fd, "telefone") || null,
      email: email || null,
      contato: texto(fd, "contato") || null,
      prazosPagamento: prazos,
      ativo: fd.get("ativo") === "on",
      // Conferido: tira da fila de pendentes. Desmarcado, o cadastro continua pendente.
      pendenteConferencia: fd.get("conferido") !== "on",
    },
  });
  redirect("/clientes");
}
