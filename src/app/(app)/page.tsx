import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/permissions";

export default async function HomePage() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  redirect("/painel");
}
