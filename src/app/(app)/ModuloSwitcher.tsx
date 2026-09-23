"use client";

import { useRouter, usePathname } from "next/navigation";
import { cn } from "cn";
import { MODULOS, moduloAtual } from "@/lib/modulos";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Usado nos dois cabeçalhos (Sidebar desktop/gaveta E o topo mobile — MobileNav) no lugar do
// <h1>/<span> fixo "Orçamentos" que existia antes: troca de módulo (Orçamento, Laboratório, o
// que vier depois) navegando pra home de cada um. Guiado pelo pathname, sem estado de cliente
// pra sincronizar — o módulo atual é sempre o que a URL diz que é.
export function ModuloSwitcher({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const atual = moduloAtual(pathname);

  return (
    <Select
      value={atual}
      onValueChange={(key) => {
        const modulo = MODULOS.find((m) => m.key === key);
        if (modulo) router.push(modulo.basePath);
      }}
    >
      <SelectTrigger
        className={cn(
          "h-auto w-full justify-start gap-1.5 border-none bg-transparent p-0 font-serif text-lg font-semibold tracking-tight text-foreground shadow-none hover:bg-transparent focus-visible:ring-0 data-[size=default]:h-auto [&_svg]:opacity-50",
          className
        )}
        aria-label="Trocar de módulo"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {MODULOS.map((m) => (
          <SelectItem key={m.key} value={m.key} className="font-serif text-sm">
            {m.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
