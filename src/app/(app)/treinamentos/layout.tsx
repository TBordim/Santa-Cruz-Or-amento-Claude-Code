import { exigirModulo } from "@/lib/permissions";

// Trava de entrada do módulo Treinamentos. Aberto a qualquer colaborador logado (ver modulosAcessiveis); o que
// cada um vê lá é filtrado pelo perfil em cada tela e em cada action (ver filtroDeAcesso).
export default async function TreinamentosLayout({ children }: { children: React.ReactNode }) {
  await exigirModulo("treinamentos");
  return <>{children}</>;
}
