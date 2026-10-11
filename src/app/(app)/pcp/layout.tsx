import { exigirModulo } from "@/lib/permissions";

// Trava de entrada do módulo PCP, pra todas as telas dele de uma vez (ver exigirModulo).
export default async function PcpLayout({ children }: { children: React.ReactNode }) {
  await exigirModulo("pcp");
  return <>{children}</>;
}
