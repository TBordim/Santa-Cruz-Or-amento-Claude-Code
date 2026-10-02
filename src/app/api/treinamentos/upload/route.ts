import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { ehAdmin } from "@/lib/permissions";

const TIPOS_PERMITIDOS = ["video/mp4", "video/webm", "text/vtt"];
const TAMANHO_MAXIMO = 500 * 1024 * 1024; // 500 MB: um vídeo de 6 min em HD tem de 30 a 60 MB

// Checagem prévia (o formulário chama antes de enviar o vídeo): diz se este ambiente tem o armazenamento de vídeos
// (Vercel Blob) configurado, para mostrar um motivo claro em vez da mensagem genérica do SDK.
export async function GET() {
  if (!(await ehAdmin())) return Response.json({ pronto: false, motivo: "Sem permissão." }, { status: 403 });
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return Response.json({ pronto: false, motivo: "O armazenamento de vídeos (Vercel Blob) não está configurado neste ambiente." });
  }
  // O SDK tira o código do armazenamento de dentro do token: vercel_blob_rw_<código>_<segredo>. Um valor fora desse formato
  // (colado errado, de outro serviço…) faz o SDK recusar com "Invalid `token` parameter". Só descrevemos a forma, nunca o valor.
  const partes = token.trim().split("_");
  if (!(partes.length >= 4 && partes[0] === "vercel" && partes[1] === "blob" && partes[2] === "rw" && partes[3])) {
    return Response.json({
      pronto: false,
      motivo: `O BLOB_READ_WRITE_TOKEN deste ambiente não tem o formato esperado (vercel_blob_rw_<código>_<segredo>): o valor atual tem ${token.length} caracteres e ${partes.length} parte(s) separadas por "_". Recadastre a variável na Vercel (Settings › Environment Variables) copiando o token da aba .env.local do armazenamento Blob.`,
    });
  }
  return Response.json({ pronto: true });
}

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
