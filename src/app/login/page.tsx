import { prisma } from "@/lib/db";
import { LoginForm } from "./LoginForm";
import { PrimeiroAdminForm } from "./PrimeiroAdminForm";

// Sem isto o Next pré-renderiza esta página como estática no build (não usa cookies/headers,
// só consulta o banco) e congelaria para sempre a contagem de usuários e a lista do dropdown no
// estado do momento do build — exatamente o tipo de bug sutil que essa migração deveria evitar.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const totalUsuarios = await prisma.usuario.count();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      {totalUsuarios === 0 ? (
        <PrimeiroAdminForm />
      ) : (
        <LoginForm
          usuarios={await prisma.usuario.findMany({
            where: { ativo: true },
            orderBy: { nome: "asc" },
            select: { id: true, nome: true },
          })}
        />
      )}
    </div>
  );
}
