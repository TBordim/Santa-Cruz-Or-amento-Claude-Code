import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/permissions";
import { setoresDaPessoa } from "@/lib/aceite/setores";

// Sem tela inicial própria (pedido do Thiago em 08/10/2026): o módulo abre direto no ambiente de
// Vendas pra quem é de Vendas, e no Acompanhamento pra quem só acompanha.
export default async function AceiteInicioPage() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  const meus = setoresDaPessoa(sessao.admin, sessao.areas);
  redirect(meus.length ? `/aceite/${meus[0]}` : "/aceite/acompanhamento");
}
