"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  KanbanSquare,
  FilePlus2,
  Gavel,
  History,
  Archive,
  BarChart3,
  Settings2,
  FileSearch,
} from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { buscarOrcamentosPalette, type ResultadoBusca } from "./command-palette-actions";

const NAV = [
  { href: "/", label: "Início", icon: LayoutDashboard },
  { href: "/painel", label: "Painel", icon: KanbanSquare },
  { href: "/novo", label: "Novo orçamento", icon: FilePlus2 },
  { href: "/diretoria", label: "Diretoria", icon: Gavel },
  { href: "/historico", label: "Histórico", icon: History },
  { href: "/legado", label: "Arquivo legado", icon: Archive },
  { href: "/resumo", label: "Resumo semanal", icon: BarChart3 },
];

export function CommandPalette({ admin }: { admin: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const [, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    function onCustomOpen() {
      setOpen(true);
    }
    window.addEventListener("abrir-busca-rapida", onCustomOpen);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("abrir-busca-rapida", onCustomOpen);
    };
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const timer = setTimeout(() => {
      startTransition(async () => {
        setResultados(await buscarOrcamentosPalette(query));
      });
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const resultadosExibidos = query.trim().length < 2 ? [] : resultados;

  function ir(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  const items = admin ? [...NAV, { href: "/administracao", label: "Administração", icon: Settings2 }] : NAV;

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Busca rápida" description="Navegue ou busque um orçamento por cliente/produto">
      <Command shouldFilter={false}>
        <CommandInput placeholder="Buscar orçamento por cliente/produto ou ir para uma tela…" value={query} onValueChange={setQuery} />
        <CommandList>
          <CommandEmpty>Nenhum resultado.</CommandEmpty>

          {resultadosExibidos.length > 0 && (
            <>
              <CommandGroup heading="Orçamentos">
                {resultadosExibidos.map((r) => (
                  <CommandItem key={r.id} value={`orc-${r.id}`} onSelect={() => ir(`/painel/${r.id}`)}>
                    <FileSearch />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate">{r.cliente} — {r.produtoDescricao}</span>
                      <span className="text-xs text-muted-foreground">{r.etapaLabel}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          <CommandGroup heading="Navegação">
            {items.map((it) => (
              <CommandItem key={it.href} value={it.label} onSelect={() => ir(it.href)}>
                <it.icon />
                <span>{it.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
