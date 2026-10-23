import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { sessaoAtual } from "@/lib/permissions";
import { podeAnexar } from "@/components/anexos/permissao";
import { TAMANHO_MAXIMO_ANEXO } from "@/lib/anexos/compressao";

// Anexos grandes (PDF, e-mail, planilha) vão direto do navegador para o Vercel Blob. Pela Server
// Action o arquivo viaja na requisição e a Vercel recusa acima de 4,5 MB (o navegador mostrava
// "An unexpected response was received from the server" ao anexar o e-mail da ordem de compra).
// Esta rota só entrega o "ingresso" de envio, depois de conferir quem é a pessoa e se ela pode
// anexar naquele orçamento; o registro no banco é feito por registrarAnexoEnviado (actions.ts).
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ error: "Sessão expirada. Entre de novo." }, { status: 401 });

  try {
    const resposta = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const { orcamentoId, tipo } = JSON.parse(clientPayload ?? "{}") as { orcamentoId?: string; tipo?: string };
        if (!orcamentoId || !podeAnexar(sessao, tipo)) throw new Error("Sem permissão para anexar arquivo nesta etapa.");
        // O arquivo só pode ser gravado na pasta deste orçamento.
        if (!pathname.startsWith(`orcamentos/${orcamentoId}/`) || pathname.includes("..")) throw new Error("Caminho de arquivo inválido.");
        return { maximumSizeInBytes: TAMANHO_MAXIMO_ANEXO, addRandomSuffix: true };
      },
    });
    return NextResponse.json(resposta);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Falha ao preparar o envio." }, { status: 400 });
  }
}
