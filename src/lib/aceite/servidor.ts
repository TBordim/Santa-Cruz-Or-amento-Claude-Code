import "server-only";
import { revalidatePath } from "next/cache";
import { sessaoAtual, podeEditar } from "@/lib/permissions";
import type { AreaKey } from "@/lib/areas";

// Peças de servidor que o Aceite, o módulo Compras e o módulo PCP usam juntos.

export type FormState = { erro?: string; ok?: string } | undefined;

// Toda ação confere a permissão no servidor (a tela só esconde o botão). Devolve o nome de quem
// fez, gravado junto de cada visto, como no resto do app.
export async function exigirArea(...areas: AreaKey[]): Promise<string> {
  const sessao = await sessaoAtual();
  if (!sessao) throw new Error("Sessão expirada. Entre de novo.");
  for (const a of areas) if (await podeEditar(a)) return sessao.nome;
  throw new Error("Sem permissão para esta ação.");
}

export async function nomeSePode(...areas: AreaKey[]): Promise<string | null> {
  try {
    return await exigirArea(...areas);
  } catch {
    return null;
  }
}

// Aceite, Engenharia, Compras e PCP leem os mesmos Aceites e PMs: qualquer mudança atualiza todos.
export function revalidarAceite() {
  revalidatePath("/aceite", "layout");
  revalidatePath("/compras", "layout");
  revalidatePath("/pcp", "layout");
  revalidatePath("/engenharia", "layout");
  revalidatePath("/atendimento", "layout");
}

// Engenharia e material correm em paralelo; quando os dois ficam prontos o Aceite avança sozinho (ver alvo.ts).
export { avancarSePronto } from "./alvo";
