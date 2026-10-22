import { prisma } from "@/lib/db";
import { sessaoAtual } from "@/lib/permissions";
import { gerarPdfSolicitacao } from "@/lib/pdf/solicitacao";

export const dynamic = "force-dynamic";

// Nome de arquivo só com letras, números e hífen (o cabeçalho Content-Disposition não deve levar acento).
function pedaco(s: string | null): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

// PDF da solicitação enviada. O representante só baixa as PRÓPRIAS solicitações; quem é da
// equipe (qualquer perfil que não seja só "Novo Orçamento") baixa qualquer uma, que já enxerga
// no Painel de qualquer jeito.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const sessao = await sessaoAtual();
  if (!sessao) return new Response("Entre no sistema para baixar o PDF.", { status: 401 });

  const { id } = await ctx.params;
  const doc = await prisma.orcamento.findFirst({
    where: { id, origem: "NOVO", ...(sessao.soNovo ? { criadoPorId: sessao.usuarioId } : {}) },
    include: { anexos: { select: { nome: true } } },
  });
  if (!doc) return new Response("Solicitação não encontrada.", { status: 404 });

  const bytes = await gerarPdfSolicitacao(doc);
  const data = doc.criadoEm.toISOString().slice(0, 10).replaceAll("-", "");
  const nome = `Solicitacao-${pedaco(doc.cliente) || "orcamento"}-${data}.pdf`;
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nome}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
