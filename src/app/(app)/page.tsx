import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/permissions";

// A tela "Início" (dashboard de KPIs) foi removida a pedido do Thiago em 19/09/2026 — não é
// usada no dia a dia. "/" continua existindo só como redirecionamento (bookmarks antigos, o
// destino padrão do login), sem conteúdo próprio.
export default async function RaizPage() {
  const sessao = await sessaoAtual();
  redirect(sessao ? "/painel" : "/login");
}
