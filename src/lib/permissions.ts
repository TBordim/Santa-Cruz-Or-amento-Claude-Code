import { cache } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import type { AreaKey } from "@/lib/areas";

// Equivalente a sessaoAtual()/ehAdmin()/podeEditar() do santa-cruz-orcamentos.html (linhas
// 709-722), mas de verdade no servidor — o middleware só confirma que existe uma sessão
// assinada (checagem rápida de perímetro); estas funções sempre confirmam admin/perfil/ativo
// direto no banco a cada chamada, para que desativar um usuário ou trocar o perfil dele valha
// imediatamente, sem esperar o token JWT expirar. É a decisão da seção 8 da especificação
// ("login/permissão real no servidor").
export type SessaoAtual = {
  usuarioId: string;
  nome: string;
  admin: boolean;
  areas: AreaKey[];
  perfilId: string;
  perfilNome: string;
};

// cache() deduplica dentro da mesma requisição — o layout autenticado e a página que ele
// envolve podem chamar sessaoAtual() sem duplicar a consulta ao banco.
export const sessaoAtual = cache(async (): Promise<SessaoAtual | null> => {
  const session = await auth();
  const usuarioId = session?.user?.id;
  if (!usuarioId) return null;

  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    include: { perfil: true },
  });
  if (!usuario || !usuario.ativo) return null;

  return {
    usuarioId: usuario.id,
    nome: usuario.nome,
    admin: usuario.perfil.admin,
    areas: usuario.perfil.areas as AreaKey[],
    perfilId: usuario.perfilId,
    perfilNome: usuario.perfil.nome,
  };
});

export async function ehAdmin(): Promise<boolean> {
  const s = await sessaoAtual();
  return !!s?.admin;
}

export async function podeEditar(area: AreaKey): Promise<boolean> {
  const s = await sessaoAtual();
  if (!s) return area === "NOVO"; // representante sem login (chega na Fase 2)
  if (s.admin) return true;
  return s.areas.includes(area);
}
