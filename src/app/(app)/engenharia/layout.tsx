import { exigirModulo } from "@/lib/permissions";

// Trava de entrada do módulo Engenharia, pra todas as telas dele de uma vez (ver exigirModulo).
export default async function EngenhariaLayout({ children }: { children: React.ReactNode }) {
  await exigirModulo("engenharia");
  return <>{children}</>;
}
