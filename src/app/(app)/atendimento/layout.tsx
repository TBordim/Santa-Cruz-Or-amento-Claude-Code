import { exigirModulo } from "@/lib/permissions";

// Trava de entrada do módulo Atendimento ao Cliente, pra todas as telas dele de uma vez (ver exigirModulo).
export default async function AtendimentoLayout({ children }: { children: React.ReactNode }) {
  await exigirModulo("atendimento");
  return <>{children}</>;
}
