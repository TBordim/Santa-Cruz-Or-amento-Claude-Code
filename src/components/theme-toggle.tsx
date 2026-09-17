"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

const semSubscricao = () => () => {};

// Evita o mismatch de hidratação do next-themes (resolvedTheme só existe no cliente) sem cair
// no padrão useEffect+setState, que o react-hooks/set-state-in-effect deste projeto rejeita.
function useMontadoNoCliente() {
  return useSyncExternalStore(semSubscricao, () => true, () => false);
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const montado = useMontadoNoCliente();

  if (!montado) return <Button variant="outline" size="icon-sm" disabled className="shrink-0" />;

  const escuro = resolvedTheme === "dark";
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      className="shrink-0"
      onClick={() => setTheme(escuro ? "light" : "dark")}
      aria-label={escuro ? "Mudar para tema claro" : "Mudar para tema escuro"}
    >
      {escuro ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
    </Button>
  );
}
