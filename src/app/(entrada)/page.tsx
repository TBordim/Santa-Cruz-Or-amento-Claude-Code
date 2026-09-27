import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/permissions";
import { modulosAcessiveis } from "@/lib/modulos";
import { Entrada } from "./Entrada";

export const dynamic = "force-dynamic";

// "/" — página de entrada, escolha de módulo (ver Entrada.tsx). Fica fora do layout (app) de
// propósito: é a tela de escolha, ainda sem menu de módulo.
export default async function EntradaPage() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  return <Entrada sessao={sessao} acessiveis={modulosAcessiveis(sessao.admin, sessao.areas)} />;
}
