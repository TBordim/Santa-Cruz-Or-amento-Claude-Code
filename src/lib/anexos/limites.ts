// Limites dos anexos enviados junto com o Novo Orçamento. Sem imports de servidor, pra valer
// igual na tela e na action.
//
// Os arquivos viajam dentro da própria requisição do formulário (Server Action), e a Vercel
// recusa requisições acima de 4,5 MB — por isso o total é limitado a 3,5 MB (sobra espaço pros
// campos de texto e pro overhead do multipart). Imagens já saem do navegador comprimidas.
export const MAX_ARQUIVOS_NOVO = 5;
export const MAX_TOTAL_BYTES_NOVO = 3_500_000;

export function tipoAnexoAceito(mime: string): boolean {
  return mime.startsWith("image/") || mime === "application/pdf";
}
