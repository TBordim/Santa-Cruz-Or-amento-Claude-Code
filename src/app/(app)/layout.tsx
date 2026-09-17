import { sessaoAtual } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { Sidebar } from "./Sidebar";

// Não redireciona mais pra /login incondicionalmente — /novo (Novo Orçamento) é pública
// (representante sem login, ver auth.config.ts). Cada página protegida (painel, diretoria,
// administração, legado, histórico, resumo) faz seu próprio
// `if (!sessao) redirect("/login")` no topo — mesmo padrão já usado em administracao/page.tsx.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sessao = await sessaoAtual();

  const pendentesDiretoria = sessao
    ? await prisma.orcamento.count({ where: { etapa: "DIRETORIA", statusDiretoria: "PENDENTE" } })
    : 0;

  return (
    <div id="app">
      <Sidebar
        nome={sessao?.nome ?? null}
        perfilNome={sessao?.perfilNome ?? null}
        admin={sessao?.admin ?? false}
        pendentesDiretoria={pendentesDiretoria}
      />
      <main>{children}</main>
    </div>
  );
}
