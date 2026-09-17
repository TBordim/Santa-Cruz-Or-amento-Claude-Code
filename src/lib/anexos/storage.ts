import "server-only";
import { put, del } from "@vercel/blob";

// Só roda no servidor — o token BLOB_READ_WRITE_TOKEN nunca deve chegar no navegador.
export async function salvarAnexoNoBlob(orcamentoId: string, file: File) {
  const pathname = `orcamentos/${orcamentoId}/${Date.now()}-${file.name}`;
  const resultado = await put(pathname, file, { access: "public" });
  return { url: resultado.url, pathname: resultado.pathname };
}

export async function excluirAnexoDoBlob(pathname: string) {
  await del(pathname).catch(() => {
    // Anexo já pode ter sido removido do Blob por fora (ex.: limpeza manual) — não bloqueia a
    // exclusão do registro no banco por causa disso.
  });
}
