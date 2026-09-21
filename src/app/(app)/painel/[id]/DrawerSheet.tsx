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
      {/* h-dvh (não 100vh): no celular a barra de endereço do navegador tira parte do 100vh e o
          rodapé da gaveta ficava escondido. .drawer-body (globals.css) cuida do teclado. */}
      <SheetContent className="drawer-body h-dvh! w-full! gap-0 overflow-y-auto p-0 sm:max-w-[760px]!">
        {/* pr-12: o botão X da gaveta é absoluto no canto e cobria o fim do título */}
        <SheetHeader className="gap-1.5 border-b border-border px-4 py-4 pr-14 sm:px-6 sm:py-5">
          <SheetTitle className="text-[17px] leading-snug sm:text-[19px]">{titulo}</SheetTitle>
          <SheetDescription asChild>
            <div className="text-xs text-muted-foreground">{descricao}</div>
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
