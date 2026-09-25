import "server-only";
import { prisma } from "@/lib/db";

// Código da cor é gerado pelo sistema: "STA" + 4 dígitos, sempre o maior número já usado + 1.
// Considera maiúsculas e minúsculas juntas (um "sta0193" antigo também conta), pra nunca existirem
// duas cores com a mesma numeração. Só entra na conta o padrão exato STA + 4 dígitos: códigos do
// histórico (91801663…) ou digitados fora do padrão (um teste "STA200") não empurram a numeração.
export async function proximoCodigoCor(): Promise<string> {
  const cores = await prisma.cor.findMany({
    where: { codigo: { startsWith: "STA", mode: "insensitive" } },
    select: { codigo: true },
  });
  const maior = cores.reduce((m, c) => {
    const n = /^STA(\d{4})$/i.exec(c.codigo.trim());
    return n ? Math.max(m, Number(n[1])) : m;
  }, 0);
  return `STA${String(maior + 1).padStart(4, "0")}`;
}
