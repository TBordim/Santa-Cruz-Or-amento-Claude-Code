import { exigirModulo } from "@/lib/permissions";

// Trava de entrada do módulo Compras, pra todas as telas dele de uma vez (ver exigirModulo).
export default async function ComprasLayout({ children }: { children: React.ReactNode }) {
  await exigirModulo("compras");
  return <>{children}</>;
}
