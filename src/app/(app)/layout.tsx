import { sessaoAtual } from "@/lib/permissions";
import { Sidebar, MobileNav } from "./Sidebar";
import { CommandPalette } from "@/components/command-palette";

// Não redireciona mais pra /login incondicionalmente — /novo (Novo Orçamento) é pública
// (representante sem login, ver auth.config.ts). Cada página protegida (painel, diretoria,
// administração, legado, histórico, resumo) faz seu próprio
// `if (!sessao) redirect("/login")` no topo — mesmo padrão já usado em administracao/page.tsx.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sessao = await sessaoAtual();

  return (
    <div className="relative flex min-h-screen flex-col md:flex-row">
      <MobileNav
        nome={sessao?.nome ?? null}
        perfilNome={sessao?.perfilNome ?? null}
        admin={sessao?.admin ?? false}
      />
      <Sidebar
        nome={sessao?.nome ?? null}
        perfilNome={sessao?.perfilNome ?? null}
        admin={sessao?.admin ?? false}
      />
      <main className="min-w-0 flex-1 px-4 pb-16 pt-5 sm:px-6 md:px-9 md:pt-7">{children}</main>
      {sessao && <CommandPalette admin={sessao.admin ?? false} />}
    </div>
  );
}
