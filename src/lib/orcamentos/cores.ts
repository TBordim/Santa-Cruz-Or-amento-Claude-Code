// Número de cores de impressão de um modelo, no formato Frente/Verso: "3/0" = três cores na
// frente e nenhuma no verso; "2/1" = duas na frente e uma no verso. Sem acesso ao banco: serve
// tanto às Server Actions quanto aos componentes de cliente.
import type { Modelo } from "./types";

const FORMATO = /^(\d{1,2})\s*\/\s*(\d{1,2})$/;

// "3 / 0" -> "3/0". Vazio -> "" (campo é opcional). Formato errado -> null.
export function normalizarCores(bruto: string | null | undefined): string | null {
  const s = (bruto ?? "").trim();
  if (!s) return "";
  const m = FORMATO.exec(s);
  return m ? `${Number(m[1])}/${Number(m[2])}` : null;
}

// Primeiro modelo com número de cores em formato inválido, como mensagem pronta pra tela.
export function erroNosCores(modelos: Pick<Modelo, "descricao" | "cores">[]): string | null {
  for (const [i, m] of modelos.entries()) {
    if (normalizarCores(m.cores) === null) {
      const quem = modelos.length > 1 ? `do modelo ${i + 1} (${m.descricao || "sem descrição"})` : "do produto";
      return `Número de cores ${quem} inválido: use Frente/Verso, por exemplo 3/0 ou 2/1.`;
    }
  }
  return null;
}
