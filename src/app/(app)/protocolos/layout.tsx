import { exigirModulo } from "@/lib/permissions";

// Trava de entrada do módulo Protocolos, pra todas as telas dele de uma vez (ver exigirModulo).
export default async function ProtocolosLayout({ children }: { children: React.ReactNode }) {
  await exigirModulo("protocolos");
  return <>{children}</>;
}
