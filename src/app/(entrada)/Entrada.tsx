import Link from "next/link";
import { KanbanSquare, FlaskConical, GraduationCap, Settings2, Lock, LogOut, ArrowRight } from "lucide-react";
import { MODULOS, type ModuloKey } from "@/lib/modulos";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { sair } from "@/app/(app)/actions";

const VISUAL: Record<ModuloKey, { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; cor: string }> = {
  orcamento: { icon: KanbanSquare, cor: "#26405C" },
  laboratorio: { icon: FlaskConical, cor: "#7A3B69" },
  treinamentos: { icon: GraduationCap, cor: "#2F6B5E" },
  administracao: { icon: Settings2, cor: "#233248" },
};

// Página de entrada: aparece sempre depois do login, com um cartão por módulo (modelo A,
// escolhido pelo Thiago em 27/09/2026). Todos os módulos aparecem; os que o perfil não abre
// ficam bloqueados, com cadeado, em vez de sumir. A busca da sessão fica em page.tsx; aqui é só
// o visual, pra dar pra conferir sem login.
export function Entrada({
  sessao,
  acessiveis,
  pendentes = 0,
}: {
  sessao: { nome: string; admin: boolean; perfilNome: string };
  acessiveis: ModuloKey[];
  // Treinamentos do perfil ainda sem aprovação: vira um selo no cartão do módulo Treinamentos.
  pendentes?: number;
}) {
  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-3 border-b border-border bg-sidebar px-4 py-3 sm:px-6">
        {/* eslint-disable-next-line @next/next/no-img-element -- mesmo motivo do logo da Sidebar */}
        <img src="/logo-santa-cruz.png" alt="Santa Cruz" width={28} height={28} />
        <span className="min-w-0 flex-1 truncate font-serif text-lg font-semibold tracking-tight text-foreground">App Sta Cruz</span>
        <span className="hidden text-sm text-muted-foreground sm:inline">Olá, {sessao.nome}</span>
        <ThemeToggle />
        <form action={sair}>
          <Button type="submit" variant="outline" size="sm" className="gap-1.5">
            <LogOut className="h-3.5 w-3.5" /> Sair
          </Button>
        </form>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 md:py-12">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground md:text-[31px]">Para onde você vai hoje?</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {sessao.nome} · {sessao.admin ? "Administrador" : sessao.perfilNome}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODULOS.map((m) => {
            const { icon: Icon, cor } = VISUAL[m.key];
            const estilo = { "--mod": cor } as React.CSSProperties;

            if (!acessiveis.includes(m.key)) {
              return (
                <div
                  key={m.key}
                  aria-disabled="true"
                  className="flex cursor-not-allowed flex-col gap-3 rounded-xl border border-dashed border-line-strong bg-muted/60 p-5"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background">
                      <Icon className="h-5 w-5 text-ink-faint" />
                    </span>
                    <span className="font-serif text-xl font-semibold text-muted-foreground">{m.label}</span>
                  </div>
                  <p className="text-sm text-ink-faint">{m.descricao}</p>
                  <span className="mt-auto flex items-center gap-1.5 text-[13px] text-muted-foreground">
                    <Lock className="h-3.5 w-3.5 shrink-0" /> Sem acesso no seu perfil. Fale com o administrador.
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={m.key}
                href={m.basePath}
                style={estilo}
                className="group flex flex-col gap-3 rounded-xl border border-[color-mix(in_srgb,var(--mod)_22%,var(--border))] bg-card p-5 no-underline shadow-sm transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--mod)_45%,var(--border))] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--mod)_14%,var(--card))]">
                    <Icon className="h-5 w-5" style={{ color: cor }} />
                  </span>
                  <span className="font-serif text-xl font-semibold text-foreground">{m.label}</span>
                </div>
                <p className="text-sm text-muted-foreground">{m.descricao}</p>
                <div className="mt-auto flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
                    Entrar <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                  {m.key === "treinamentos" && pendentes > 0 && (
                    <span className="rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold whitespace-nowrap text-white" style={{ background: cor }}>
                      {pendentes} {pendentes === 1 ? "pendente" : "pendentes"}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
