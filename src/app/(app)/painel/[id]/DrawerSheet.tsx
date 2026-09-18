"use client";

import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

// Wrapper cliente do Sheet do shadcn — a gaveta "abre" simplesmente por estarmos na rota
// /painel/[id]; fechar (Esc, clique fora, botão X) navega de volta pra /painel. O Drawer.tsx
// (Server Component) busca os dados e monta o conteúdo; este componente só cuida da mecânica
// de abrir/fechar.
export function DrawerSheet({
  titulo,
  descricao,
  children,
}: {
  titulo: React.ReactNode;
  descricao: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <Sheet open onOpenChange={(open) => { if (!open) router.push("/painel"); }}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-[760px]!">
        <SheetHeader className="gap-1.5 border-b border-border px-6 py-5">
          <SheetTitle className="text-[19px]">{titulo}</SheetTitle>
          <SheetDescription asChild>
            <div className="text-xs text-muted-foreground">{descricao}</div>
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-6 py-5">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
