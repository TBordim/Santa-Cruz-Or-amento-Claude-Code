import Link from "next/link";
import { Lock, LogOut } from "lucide-react";
import { MODULOS, GRUPOS_MODULO, type ModuloKey } from "@/lib/modulos";
import { VISUAL_MODULO } from "@/lib/modulos-visual";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { sair } from "@/app/(app)/actions";

// Página de entrada, depois do login. Com o número de módulos crescendo (Engenharia, Compras, PCP e
// Atendimento entraram em 08/10/2026), a grade única de cartões grandes ficou poluída: agora os
// módulos vêm agrupados por área da empresa, como ícones grandes com o número de pendências, e os
// módulos sem acesso ficam numa linha discreta no fim, em vez de cartões bloqueados. Pedido do
// Thiago em 08/10/2026. A busca da sessão e das contagens fica em page.tsx; aqui é só o visual.
export function Entrada({
  sessao,
  acessiveis,
  pendencias = {},
}: {
  sessao: { nome: string; admin: boolean; perfilNome: string };
  acessiveis: ModuloKey[];
  // Quanto espera pela pessoa em cada módulo (só os que ela abre). Ausente = não conta.
  pendencias?: Partial<Record<ModuloKey, number>>;
}) {
  const bloqueados = MODULOS.filter((m) => !acessiveis.includes(m.key));
  const grupos = GRUPOS_MODULO.map((g) => ({ ...g, modulos: MODULOS.filter((m) => m.grupo === g.key && acessiveis.includes(m.key)) })).filter(
    (g) => g.modulos.length > 0,
  );
  const comPendencia = MODULOS.filter((m) => acessiveis.includes(m.key) && (pendencias[m.key] ?? 0) > 0);
  const totalPendencias = comPendencia.reduce((s, m) => s + (pendencias[m.key] ?? 0), 0);

  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-3 border-b border-border bg-sidebar px-4 py-3 sm:px-6">
        {/* eslint-disable-next-line @next/next/no-img-element -- mesmo motivo do logo da Sidebar */}
        <img src="/logo-santa-cruz.png" alt="Santa Cruz" width={28} height={28} />
        <span className="min-w-0 flex-1 truncate font-serif text-lg font-semibold tracking-tight text-foreground">App Sta Cruz</span>
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {sessao.nome} · {sessao.admin ? "Administrador" : sessao.perfilNome}
        </span>
        <ThemeToggle />
        <form action={sair}>
          <Button type="submit" variant="outline" size="sm" className="gap-1.5">
            <LogOut className="h-3.5 w-3.5" /> Sair
          </Button>
        </form>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-7 px-4 py-8 sm:px-6 md:py-10">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground md:text-[28px]">Olá, {sessao.nome.split(" ")[0]}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalPendencias
              ? `Você tem ${totalPendencias} ${totalPendencias === 1 ? "pendência" : "pendências"} em ${comPendencia.length} ${comPendencia.length === 1 ? "módulo" : "módulos"}.`
              : "Nada pendente para você agora. Escolha um módulo."}
          </p>
        </div>

        {/* Modelo B (escolhido pelo Thiago em 08/10/2026): ícones grandes com o nome embaixo, em
            caixas por área, como a tela de aplicativos do celular. No computador as caixas ficam lado
            a lado, cada uma com largura proporcional aos módulos que tem; no celular, uma embaixo da
            outra. A pendência fica num selo no canto do ícone. */}
        <div
          className="grid grid-cols-1 gap-4 lg:[grid-template-columns:var(--cols)]"
          style={{ "--cols": grupos.map((g) => `${g.modulos.length}fr`).join(" ") } as React.CSSProperties}
        >
          {grupos.map((g) => (
            <section
              key={g.key}
              aria-labelledby={`grupo-${g.key}`}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 pb-5 pt-4"
            >
              <h2 id={`grupo-${g.key}`} className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {g.label}
              </h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-2">
                {g.modulos.map((m) => {
                  const { icon: Icon, cor } = VISUAL_MODULO[m.key];
                  const qtd = pendencias[m.key] ?? 0;
                  return (
                    <Link
                      key={m.key}
                      href={m.basePath}
                      title={m.descricao}
                      style={{ "--mod": cor } as React.CSSProperties}
                      className="group flex flex-col items-center gap-2.5 rounded-xl px-2 pb-3 pt-3.5 text-center no-underline transition-colors hover:bg-[color-mix(in_srgb,var(--mod)_6%,var(--card))] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
                    >
                      <span className="relative flex h-[68px] w-[68px] items-center justify-center rounded-[18px] bg-[color-mix(in_srgb,var(--mod)_14%,var(--card))] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--mod)_14%,transparent)] transition-transform group-hover:-translate-y-0.5 motion-reduce:transition-none">
                        <Icon className="h-[30px] w-[30px]" style={{ color: cor }} />
                        {qtd > 0 && (
                          <span
                            className="absolute -right-2 -top-2 min-w-6 rounded-full px-1.5 py-0.5 text-center font-mono text-[11.5px] font-semibold text-white shadow-[0_0_0_2.5px_var(--card)]"
                            style={{ background: cor }}
                            title={`${qtd} ${qtd === 1 ? "pendência" : "pendências"}`}
                          >
                            {qtd}
                          </span>
                        )}
                      </span>
                      <span className="text-[13.5px] font-semibold leading-tight text-foreground">{m.label}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {bloqueados.length > 0 && (
          <p className="flex items-start gap-2 border-t border-dashed border-border pt-4 text-xs text-muted-foreground">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Sem acesso no seu perfil: {bloqueados.map((m) => m.label).join(" · ")}. Para entrar, fale com o administrador.
            </span>
          </p>
        )}
      </main>
    </div>
  );
}
