import { exigirModulo } from "@/lib/permissions";

// Trava de entrada do módulo Laboratório, pra todas as telas dele de uma vez (ver exigirModulo).
export default async function LaboratorioLayout({ children }: { children: React.ReactNode }) {
  await exigirModulo("laboratorio");
  return <>{children}</>;
}
