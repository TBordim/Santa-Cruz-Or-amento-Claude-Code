import { issueSignedToken } from "@vercel/blob";
import { handleUploadPresigned, type HandleUploadPresignedBody } from "@vercel/blob/client";
import { ehAdmin } from "@/lib/permissions";

const TIPOS_PERMITIDOS = ["video/mp4", "video/webm", "text/vtt"];
const TAMANHO_MAXIMO = 500 * 1024 * 1024; // 500 MB: um vídeo de 6 min em HD tem de 30 a 60 MB
// O navegador monta o nome (com um sufixo aleatório, para a URL não ser adivinhável) e a rota só aceita este formato.
const NOME_VALIDO = /^treinamentos\/(videos|legendas)\/[a-z0-9._-]+$/;

// Credenciais do Blob neste ambiente. O fluxo usado aqui (upload "presigned") se autentica sozinho na Vercel por OIDC,
// como os anexos de orçamento, usando só o BLOB_STORE_ID: não depende do BLOB_READ_WRITE_TOKEN. Se um dia não houver
// OIDC (ex.: rodando local), cai no token de leitura e escrita, se ele tiver o formato certo.
function credenciais(req: Request): { oidc: boolean; storeId: boolean; tokenRw: "ausente" | "invalido" | "ok" } {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  const partes = token?.split("_") ?? [];
  const tokenOk = partes.length >= 4 && partes[0] === "vercel" && partes[1] === "blob" && partes[2] === "rw" && !!partes[3];
  return {
    oidc: !!(req.headers.get("x-vercel-oidc-token") || process.env.VERCEL_OIDC_TOKEN),
    storeId: !!process.env.BLOB_STORE_ID,
    tokenRw: !token ? "ausente" : tokenOk ? "ok" : "invalido",
  };
}

// Checagem prévia (o formulário chama antes de enviar o vídeo): diz se este ambiente consegue autorizar o envio, para
// mostrar um motivo claro em vez da mensagem genérica do SDK. Só descreve a situação; nunca devolve valores secretos.
export async function GET(req: Request) {
  if (!(await ehAdmin())) return Response.json({ pronto: false, motivo: "Sem permissão." }, { status: 403 });
  const c = credenciais(req);
  if ((c.oidc && c.storeId) || c.tokenRw === "ok") return Response.json({ pronto: true });
  return Response.json({
    pronto: false,
    motivo:
      `O armazenamento de vídeos (Vercel Blob) não está acessível neste ambiente: OIDC ${c.oidc ? "disponível" : "indisponível"}, ` +
      `BLOB_STORE_ID ${c.storeId ? "presente" : "ausente"}, BLOB_READ_WRITE_TOKEN ${c.tokenRw}. ` +
      `Precisa de OIDC + BLOB_STORE_ID, ou de um BLOB_READ_WRITE_TOKEN no formato vercel_blob_rw_<código>_<segredo>.`,
  });
}

// Upload direto do navegador para o Vercel Blob (as funções do servidor têm limite de tamanho de requisição, e um MP4
// passa dele). Esta rota só AUTORIZA: confere que quem pede é administrador e que o arquivo é um vídeo/legenda dentro de
// treinamentos/, e devolve uma URL assinada, válida para aquele nome e aquele tipo de arquivo.
export async function POST(request: Request) {
  if (!(await ehAdmin())) return Response.json({ error: "Sem permissão." }, { status: 403 });

  const body = (await request.json()) as HandleUploadPresignedBody;
  try {
    const resposta = await handleUploadPresigned({
      body,
      request,
      getSignedToken: async (pathname) => {
        if (!NOME_VALIDO.test(pathname)) throw new Error("Caminho de arquivo inválido.");
        const token = await issueSignedToken({
          pathname,
          operations: ["put"],
          allowedContentTypes: TIPOS_PERMITIDOS,
          maximumSizeInBytes: TAMANHO_MAXIMO,
        });
        return { token };
      },
    });
    return Response.json(resposta);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Falha no upload." }, { status: 400 });
  }
}
