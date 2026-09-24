"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  KanbanSquare,
  FilePlus2,
  Gavel,
  History,
  Archive,
  BarChart3,
  Settings2,
  LogOut,
  Search,
  Menu,
  Palette,
  LayoutGrid,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { sair } from "./actions";
import { ModuloSwitcher } from "./ModuloSwitcher";
import { MODULOS, moduloAtual } from "@/lib/modulos";

type Props = {
  nome: string | null;
  perfilNome: string | null;
  admin: boolean;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string; // hex — vira --nav-color, tingindo fundo/hover/ícone desse item
};

// Versão com identidade visual de ERP moderno da sidebarHtml() original (linhas 2980-3063):
// cada item tem ícone + cor própria, com um leve "vidro tingido" no hover/ativo — reconstrói o
// efeito --nav-color do HTML original, agora com Tailwind + CSS custom properties por item.
// ⌘ só existe no teclado do Mac — no Windows/Linux o atalho é Ctrl+K (o command-palette já
// aceita os dois) e o glifo ⌘ aparecia quebrado. useSyncExternalStore (como o ThemeToggle) dá
// "Ctrl K" no servidor e na hidratação e troca pra ⌘K só no cliente Mac, sem mismatch.
const semSubscricao = () => () => {};
function useAtalhoBusca(): string {
  return useSyncExternalStore(
    semSubscricao,
    () => (/Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent) ? "⌘K" : "Ctrl K"),
    () => "Ctrl K",
  );
}

function SidebarContent({
  nome,
  perfilNome,
  admin,
  mobile = false,
  onNavigate,
}: Props & { mobile?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const atalhoBusca = useAtalhoBusca();
  const logado = !!nome;
  const modulo = moduloAtual(pathname);

  // Cada módulo tem sua própria navegação — trocar de módulo (ModuloSwitcher, acima) troca essa
  // lista inteira, não só adiciona um item. "Administração" fica sempre no módulo Orçamento por
  // enquanto (é onde o cadastro de usuários/perfis já vive).
  const itemsOrcamento: NavItem[] = [
    { href: "/painel", label: "Painel", icon: KanbanSquare, color: "#26405C" },
    { href: "/novo", label: "Novo orçamento", icon: FilePlus2, color: "#3D6B49" },
    { href: "/diretoria", label: "Diretoria", icon: Gavel, color: "#946522" },
    { href: "/historico", label: "Histórico", icon: History, color: "#5B6270" },
    { href: "/legado", label: "Arquivo legado", icon: Archive, color: "#8C3B21" },
    { href: "/resumo", label: "Resumo semanal", icon: BarChart3, color: "#2C6E8C" },
    ...(admin ? [{ href: "/administracao", label: "Administração", icon: Settings2, color: "#233248" }] : []),
  ];

  const itemsLaboratorio: NavItem[] = [
    { href: "/laboratorio", label: "Início", icon: LayoutGrid, color: "#5C3D75" },
    { href: "/laboratorio/cor", label: "Cor", icon: Palette, color: "#7A3B69" },
    { href: "/laboratorio/producao", label: "Produção", icon: Scale, color: "#3D6B6B" },
  ];

  const items: NavItem[] = !logado
    ? [{ href: "/novo", label: "Novo orçamento", icon: FilePlus2, color: "#3D6B49" }]
    : modulo === "laboratorio"
      ? itemsLaboratorio
      : itemsOrcamento;

  return (
    <>
      <div className="flex flex-col gap-1 border-b border-dashed border-border pb-3.5 px-1.5 max-md:pr-9">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border border-border bg-gradient-to-br from-secondary to-card p-1 shadow-[0_0_0_3px_var(--accent)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo pequeno e fixo; o
                otimizador do next/image rejeita este PNG específico ("not a valid image") */}
            <img src="/logo-santa-cruz.png" alt="Santa Cruz" width={28} height={28} />
          </span>
          <h1 className="min-w-0 flex-1 truncate font-serif text-lg font-semibold tracking-tight text-foreground">App Sta Cruz</h1>
          {!mobile && <ThemeToggle />}
        </div>
        <div className="font-mono text-[10px] tracking-widest text-muted-foreground">SANTA CRUZ IND. GRÁFICA</div>
        {logado && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Módulo</span>
            <ModuloSwitcher className="text-sm! font-sans! font-semibold!" />
          </div>
        )}
      </div>

      {logado && (
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            window.dispatchEvent(new Event("abrir-busca-rapida"));
          }}
          className="flex items-center gap-2 rounded-[10px] border border-border bg-muted/40 px-2.5 py-2.5 md:py-2 text-left text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">Buscar…</span>
          <kbd className="max-md:hidden rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">{atalhoBusca}</kbd>
        </button>
      )}

      <nav className="flex flex-col gap-1.5 pr-0.5">
        {items.map((it, i) => {
          const active = pathname === it.href;
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              onClick={onNavigate}
              style={{ "--nav-color": it.color, animationDelay: `${i * 45}ms` } as React.CSSProperties}
              className={[
                "group relative isolate flex animate-in fade-in slide-in-from-left-1 items-center gap-2.5 rounded-[10px] border px-2.5 py-2.5 md:py-2 text-[13.5px] font-medium no-underline duration-300 fill-mode-backwards",
                "border-[color-mix(in_srgb,var(--nav-color)_20%,var(--border))] bg-[color-mix(in_srgb,var(--nav-color)_4%,var(--sidebar))] text-muted-foreground",
                "transition-[background-color,border-color,color,transform] hover:translate-x-0.5 hover:text-foreground hover:border-[color-mix(in_srgb,var(--nav-color)_40%,var(--border))]",
                active
                  ? "border-[color-mix(in_srgb,var(--nav-color)_55%,var(--border))] bg-[color-mix(in_srgb,var(--nav-color)_12%,var(--sidebar))] font-semibold text-foreground shadow-sm"
                  : "",
              ].join(" ")}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                style={{
                  background:
                    "linear-gradient(155deg, color-mix(in srgb, var(--nav-color) 26%, var(--sidebar)), color-mix(in srgb, var(--nav-color) 9%, var(--sidebar)))",
                }}
              >
                <Icon className="h-4 w-4" style={{ color: it.color }} />
              </span>
              <span className="flex-1">{it.label}</span>
              {/* fio aceso — mesma linguagem visual do original (linha 193-198 do CSS antigo) */}
              <span
                className="absolute -right-[3px] top-[15%] bottom-[15%] w-[2.5px] rounded-full opacity-60 transition-opacity group-hover:opacity-90"
                style={{ background: it.color, boxShadow: `0 0 7px 1px color-mix(in srgb, ${it.color} 70%, transparent)` }}
              />
            </Link>
          );
        })}
      </nav>

      {logado ? (
        <div className="mt-auto flex flex-col gap-2 border-t border-dashed border-border pt-3.5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Conectado como</span>
          <div className="font-serif text-base font-semibold text-foreground">{nome}</div>
          <div className="text-xs text-muted-foreground">{perfilNome}{admin ? " · Administrador" : ""}</div>
          <form action={sair}>
            <Button type="submit" variant="outline" size="sm" className="mt-1 w-full gap-2">
              <LogOut className="h-3.5 w-3.5" /> Sair
            </Button>
          </form>
        </div>
      ) : (
        <div className="mt-auto pt-3.5">
          <Button asChild variant="outline" className="w-full">
            <Link href="/login" onClick={onNavigate}>Sou colaborador · Entrar</Link>
          </Button>
        </div>
      )}
    </>
  );
}

// Desktop: barra lateral fixa de sempre. Escondida abaixo de md — no celular a navegação é o
// MobileNav (barra superior + gaveta), senão os 248px da lateral comem 2/3 da tela.
export function Sidebar(props: Props) {
  return (
    <div className="hidden h-screen w-[248px] shrink-0 flex-col gap-5 overflow-y-auto border-r border-border bg-sidebar px-3.5 py-5 md:flex">
      <SidebarContent {...props} />
    </div>
  );
}

export function MobileNav(props: Props) {
  const [aberto, setAberto] = useState(false);
  const pathname = usePathname();
  const logado = !!props.nome;
  const modulo = MODULOS.find((m) => m.key === moduloAtual(pathname));

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-sidebar/95 px-3 backdrop-blur md:hidden">
      <Button type="button" variant="ghost" size="icon-lg" aria-label="Abrir menu" onClick={() => setAberto(true)}>
        <Menu className="size-5" />
      </Button>
      <Link href={logado ? (modulo?.basePath ?? "/painel") : "/novo"} className="shrink-0 no-underline" aria-label="Início">
        {/* eslint-disable-next-line @next/next/no-img-element -- mesmo motivo do logo da Sidebar */}
        <img src="/logo-santa-cruz.png" alt="" width={26} height={26} />
      </Link>
      <div className="min-w-0 flex-1">
        <span className="block truncate font-serif text-base font-semibold leading-tight text-foreground">App Sta Cruz</span>
        {logado && <ModuloSwitcher className="text-xs! font-sans! font-medium! text-muted-foreground!" />}
      </div>
      {logado && (
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          aria-label="Buscar"
          onClick={() => window.dispatchEvent(new Event("abrir-busca-rapida"))}
        >
          <Search className="size-[18px]" />
        </Button>
      )}
      <ThemeToggle />

      <Sheet open={aberto} onOpenChange={setAberto}>
        <SheetContent side="left" className="w-[86vw]! max-w-[320px]! gap-5 overflow-y-auto px-3.5 py-5">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">Navegação do App Sta Cruz</SheetDescription>
          <SidebarContent {...props} mobile onNavigate={() => setAberto(false)} />
        </SheetContent>
      </Sheet>
    </header>
  );
}
