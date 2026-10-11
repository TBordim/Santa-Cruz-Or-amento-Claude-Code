import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type Tarefa = {
  key: string;
  titulo: React.ReactNode;
  contexto: string;
  selo: { texto: string; tom: "bad" | "good" | "pend" | "neutral" };
  acao: { texto: string; href: string; primaria?: boolean };
};

const SELO: Record<Tarefa["selo"]["tom"], string> = {
  pend: "bg-warn-soft text-warn",
  good: "bg-good-soft text-good",
  bad: "bg-bad-soft text-bad",
  neutral: "bg-secondary text-muted-foreground",
};

// Lista "Precisa de você" das telas de setor: o que fazer agora, já na ordem de urgência (quem
// monta a lista decide a ordem), com o botão da ação.
export function PrecisaDeVoce({ tarefas, vazio, titulo = "Precisa de você" }: { tarefas: Tarefa[]; vazio: string; titulo?: string }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-2.5">
        <h3 className="text-sm font-semibold text-foreground">{titulo}</h3>
        <span className="text-xs text-muted-foreground">mais urgente primeiro</span>
      </div>
      {tarefas.length === 0 ? (
        <p className="px-4 py-5 text-sm text-muted-foreground">{vazio}</p>
      ) : (
        <ul>
          {tarefas.map((t) => (
            <li key={t.key} className="grid grid-cols-[1fr_auto] items-center gap-3 border-t border-border px-4 py-2.5 first:border-t-0 sm:grid-cols-[1fr_auto_auto]">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground">{t.titulo}</div>
                <div className="text-xs text-muted-foreground">{t.contexto}</div>
              </div>
              <Badge className={`hidden gap-1 rounded-full border-0 font-mono text-[10.5px] font-bold sm:inline-flex ${SELO[t.selo.tom]}`}>
                {t.selo.tom === "bad" && <TriangleAlert className="h-3 w-3" />}
                {t.selo.texto}
              </Badge>
              <Button asChild size="sm" variant={t.acao.primaria === false ? "outline" : "default"}>
                <Link href={t.acao.href}>{t.acao.texto}</Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
