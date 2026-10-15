import { exigirModulo } from "@/lib/permissions";

// Trava de entrada do módulo Aceite de Pedido, pra todas as telas dele de uma vez (ver exigirModulo).
export default async function AceiteLayout({ children }: { children: React.ReactNode }) {
  await exigirModulo("aceite");
  return <>{children}</>;
}
