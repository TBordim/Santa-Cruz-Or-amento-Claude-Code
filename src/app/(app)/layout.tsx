import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/permissions";
import { Sidebar } from "./Sidebar";

// Segunda camada de proteção além do middleware (que só confirma que existe um cookie de
// sessão válido): aqui confirmamos de novo, contra o banco, que o usuário ainda existe e está
// ativo — se alguém for desativado com a sessão já aberta, cai fora na próxima navegação em vez
// de esperar o JWT (8h) expirar sozinho.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");

  return (
    <div id="app">
      <Sidebar nome={sessao.nome} perfilNome={sessao.perfilNome} admin={sessao.admin} />
      <main>{children}</main>
    </div>
  );
}
