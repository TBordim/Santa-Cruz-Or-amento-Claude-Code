// Texto de busca: maiúsculo, sem acento, espaços e pontuação colapsados. Usado pra gravar
// Cliente.busca e pra normalizar o que a pessoa digita.
export function textoBusca(s: string | null | undefined): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}
