import { redirect } from "next/navigation";
import Link from "next/link";
import { Palette, Scale, FlaskConical } from "lucide-react";
import { sessaoAtual } from "@/lib/permissions";
import { PageHeader } from "@/components/page-header";

const CARDS = [
  {
    href: "/laboratorio/cor",
    icon: Palette,
    color: "#7A3B69",
    titulo: "Cor",
    descricao: "LAB alvo, fórmulas, rodadas de ajuste e leituras do Quick Peek — a bancada de desenvolvimento de tinta.",
  },
  {
    href: "/laboratorio/producao",
    icon: Scale,
    color: "#3D6B6B",
    titulo: "Produção",
    descricao: "Busque uma cor aprovada pelo código e calcule a quantidade de cada tinta pra um lote em kg.",
  },
];

const CARD_BASES = {
  href: "/laboratorio/bases",
  icon: FlaskConical,
  color: "#8C5A21",
  titulo: "Bases",
  descricao: "Catálogo de tintas usadas nas fórmulas — administrador, exclusão pede o PIN de novo.",
};

// Tela de entrada própria do módulo Laboratório — não é o Painel de orçamentos. Por enquanto só
// tem uma área (Cor); o espaço já existe pra outras ferramentas do laboratório crescerem aqui
// depois, sem precisar amontoar tudo numa tela só.
export default async function LaboratorioPage() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");

  const cards = sessao.admin ? [...CARDS, CARD_BASES] : CARDS;

  return (
    <>
      <PageHeader title="Laboratório" description="Ferramentas do laboratório — hoje, formulação e registro de cor." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.href}
              href={c.href}
              className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 no-underline transition-colors hover:bg-[color-mix(in_srgb,var(--card-color)_4%,var(--card))]"
              style={{ "--card-color": c.color } as React.CSSProperties}
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{
                  background:
                    "linear-gradient(155deg, color-mix(in srgb, var(--card-color) 26%, var(--card)), color-mix(in srgb, var(--card-color) 9%, var(--card)))",
                }}
              >
                <Icon className="h-5 w-5" style={{ color: c.color }} />
              </span>
              <div>
                <div className="font-semibold text-foreground">{c.titulo}</div>
                <p className="mt-1 text-sm text-muted-foreground">{c.descricao}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
