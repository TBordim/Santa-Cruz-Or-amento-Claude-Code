"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODULOS, moduloAtual, type ModuloKey } from "@/lib/modulos";
import { VISUAL_MODULO } from "@/lib/modulos-visual";

// Abas de módulo no topo da página, no lugar do seletor em lista que ficava na barra lateral: com
// oito módulos, a lista ficava apertada e cobria a barra (pedido do Thiago em 08/10/2026). Mostra só
// os módulos que a pessoa abre; os outros aparecem na página de entrada, com o aviso de acesso. Uma
// linha fina separa os grupos (Comercial, Engenharia e produção, Pessoas e sistema), e o título
// "Módulos", centralizado e em tamanho de título, fica numa linha acima. Guiado pelo
// pathname, como o seletor: o módulo atual é sempre o que a URL diz.
export function ModuloTabs({ acessiveis }: { acessiveis: ModuloKey[] }) {
  const pathname = usePathname();
  const atual = moduloAtual(pathname);
  // Treinamentos e Administração ficam só na página de entrada (pedido do Thiago em 11/10/2026):
  // são o grupo "Pessoas e sistema", que não faz parte do trabalho do dia a dia entre módulos.
  const modulos = MODULOS.filter((m) => acessiveis.includes(m.key) && m.grupo !== "pessoas");

  return (
    <div className="sticky top-14 z-30 border-b border-line-strong bg-sidebar shadow-[0_1px_0_0_var(--border)] md:top-0">
      {/* Título acima das abas: dá respiro no topo da página e diz o que a faixa é. */}
      <h2 id="titulo-modulos" className="px-3 pt-3.5 text-center font-serif text-xl font-semibold tracking-tight text-foreground md:text-[22px]">
        Módulos
      </h2>
      {/* justify-center-safe: centraliza quando cabe; quando não cabe (celular), rola de lado a partir
          da primeira aba em vez de cortar o começo. */}
      <nav
        aria-labelledby="titulo-modulos"
        className="flex items-center justify-center-safe gap-1.5 overflow-x-auto px-2 pt-2 pb-3 [scrollbar-width:none] sm:px-4 md:px-7 [&::-webkit-scrollbar]:hidden"
      >
        {modulos.map((m, i) => {
          const { icon: Icon, cor } = VISUAL_MODULO[m.key];
          const ativo = m.key === atual;
          const novoGrupo = i > 0 && modulos[i - 1].grupo !== m.grupo;
          return (
            <Fragment key={m.key}>
              {novoGrupo && <span aria-hidden className="mx-1.5 h-6 w-[1.5px] shrink-0 rounded-full bg-line-strong" />}
              <Link
                href={m.basePath}
                aria-current={ativo ? "page" : undefined}
                style={{ "--mod": cor } as React.CSSProperties}
                className={[
                  // Mesma linguagem dos itens da barra lateral: contorno e fundo tingidos na cor do módulo.
                  "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border px-3 py-1.5 text-[13.5px] no-underline transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  ativo
                    ? "border-[color-mix(in_srgb,var(--mod)_60%,var(--border))] bg-[color-mix(in_srgb,var(--mod)_14%,var(--card))] font-semibold text-foreground shadow-sm"
                    : "border-[color-mix(in_srgb,var(--mod)_25%,var(--border))] bg-card font-medium text-foreground/80 hover:border-[color-mix(in_srgb,var(--mod)_50%,var(--border))] hover:bg-[color-mix(in_srgb,var(--mod)_7%,var(--card))] hover:text-foreground",
                ].join(" ")}
              >
                <Icon className="h-4 w-4 shrink-0" style={{ color: cor }} />
                {m.label}
              </Link>
            </Fragment>
          );
        })}
      </nav>
    </div>
  );
}
