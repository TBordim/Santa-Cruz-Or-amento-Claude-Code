import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { ehAdmin } from "@/lib/permissions";

const TIPOS_PERMITIDOS = ["video/mp4", "video/webm", "text/vtt"];
const TAMANHO_MAXIMO = 500 * 1024 * 1024; // 500 MB: um vídeo de 6 min em HD tem de 30 a 60 MB

// Upload direto do navegador para o Vercel Blob (as funções do servidor têm limite de tamanho de requisição, e um MP4
// passa dele). Esta rota só autoriza: gera o token para quem é administrador, para arquivos de vídeo/legenda dentro
// de treinamentos/, e o nome ganha um sufixo aleatório (a URL fica pública, mas não dá para adivinhar).
export async function POST(request: Request) {
  if (!(await ehAdmin())) return Response.json({ error: "Sem permissão." }, { status: 403 });

  const body = (await request.json()) as HandleUploadBody;
  try {
    const resposta = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith("treinamentos/")) throw new Error("Caminho de arquivo inválido.");
        return { allowedContentTypes: TIPOS_PERMITIDOS, maximumSizeInBytes: TAMANHO_MAXIMO, addRandomSuffix: true };
      },
    });
    return Response.json(resposta);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Falha no upload." }, { status: 400 });
  }
}
