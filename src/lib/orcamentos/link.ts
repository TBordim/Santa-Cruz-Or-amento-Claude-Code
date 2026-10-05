// Link da arte do cliente (Google Drive, WeTransfer, Dropbox...). Quando o cliente tem muitos
// tipos de produto, ele costuma mandar um link só em vez de um arquivo por tipo. Sem acesso ao
// banco: serve às Server Actions e aos componentes de cliente.

// "drive.google.com/x" -> "https://drive.google.com/x". Vazio -> "" (campo opcional). Texto que
// não é um endereço (ex.: "link no e-mail") -> null.
export function normalizarLink(bruto: string | null | undefined): string | null {
  const s = (bruto ?? "").trim();
  if (!s) return "";
  const comEsquema = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(comEsquema);
    return u.hostname.includes(".") && !/\s/.test(s) ? u.toString() : null;
  } catch {
    return null;
  }
}

export function erroNoLink(bruto: string | null | undefined): string | null {
  return normalizarLink(bruto) === null ? 'Link da arte inválido: cole o endereço completo, por exemplo "https://drive.google.com/...".' : null;
}
