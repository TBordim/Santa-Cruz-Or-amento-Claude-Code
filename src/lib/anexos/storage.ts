import "server-only";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { put, del } from "@vercel/blob";

// Só roda no servidor — o token BLOB_READ_WRITE_TOKEN nunca deve chegar no navegador.
//
// Em DESENVOLVIMENTO sem o token (ambiente de teste local), os anexos ficam em public/_anexos-dev,
// só na máquina de quem está testando (a pasta está no .gitignore). Em produção e nos deploys da
// Vercel (NODE_ENV = production) isto nunca é usado: lá o armazenamento é sempre o Vercel Blob.
const GUARDAR_LOCAL = process.env.NODE_ENV !== "production" && !process.env.BLOB_READ_WRITE_TOKEN;
const PASTA_LOCAL = path.join(process.cwd(), "public", "_anexos-dev");

const nomeSeguro = (s: string) => s.replace(/[^a-zA-Z0-9._ ()-]/g, "_");

export async function salvarAnexoNoBlob(orcamentoId: string, file: File) {
  if (GUARDAR_LOCAL) {
    const pathname = `orcamentos/${nomeSeguro(orcamentoId)}/${Date.now()}-${nomeSeguro(path.basename(file.name))}`;
    const destino = path.join(PASTA_LOCAL, pathname);
    await mkdir(path.dirname(destino), { recursive: true });
    await writeFile(destino, Buffer.from(await file.arrayBuffer()));
    return { url: `/_anexos-dev/${pathname.split("/").map(encodeURIComponent).join("/")}`, pathname };
  }
  const pathname = `orcamentos/${orcamentoId}/${Date.now()}-${file.name}`;
  const resultado = await put(pathname, file, { access: "public" });
  return { url: resultado.url, pathname: resultado.pathname };
}

export async function excluirAnexoDoBlob(pathname: string) {
  if (GUARDAR_LOCAL) {
    const alvo = path.resolve(PASTA_LOCAL, pathname);
    if (alvo.startsWith(PASTA_LOCAL + path.sep)) await rm(alvo, { force: true }).catch(() => {});
    return;
  }
  await del(pathname).catch(() => {
    // Anexo já pode ter sido removido do Blob por fora (ex.: limpeza manual) — não bloqueia a
    // exclusão do registro no banco por causa disso.
  });
}
