import { prisma } from "@/lib/db";
import { sessaoAtual } from "@/lib/permissions";
import { filtroDeAcesso } from "@/lib/treinamentos/dados";

// Legendas (.vtt) servidas pelo próprio app, no mesmo endereço do site: o <track> do <video> só aceita legenda de
// outra origem com CORS configurado, e assim não dependemos disso. Passa pelo mesmo filtro de acesso da tela.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const sessao = await sessaoAtual();
  if (!sessao) return new Response("Não autorizado", { status: 401 });

  const { id } = await ctx.params;
  const t = await prisma.treinamento.findFirst({
    where: { id, ...filtroDeAcesso(sessao) },
    select: { legendasUrl: true },
  });
  if (!t?.legendasUrl) return new Response("Sem legendas", { status: 404 });

  const resposta = await fetch(t.legendasUrl);
  if (!resposta.ok) return new Response("Legendas indisponíveis", { status: 502 });
  return new Response(await resposta.text(), {
    headers: { "Content-Type": "text/vtt; charset=utf-8", "Cache-Control": "private, max-age=300" },
  });
}
