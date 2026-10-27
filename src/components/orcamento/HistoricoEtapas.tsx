import { Clock } from "lucide-react";
import { ETAPAS, fmtDateTime } from "@/lib/orcamentos/constantes";
import { duracaoCurta, linhaDoTempo } from "@/lib/orcamentos/historico-etapas";

type Doc = Parameters<typeof linhaDoTempo>[0];

// Quando cada etapa recebeu o card e quanto tempo ele ficou nela. A etapa atual vem em destaque, com
// "desde quando" e "há quanto tempo". Fica recolhido para não pesar na gaveta.
export function HistoricoEtapas({ doc }: { doc: Doc }) {
  const passos = linhaDoTempo(doc);
  if (!passos.length) return null;
  const atual = passos.at(-1)!;
  const nome = (k: string) => ETAPAS.find((e) => e.key === k)?.label ?? k;
  return (
    <details className="rounded-lg border border-border">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm [&::-webkit-details-marker]:hidden">
        <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="font-semibold text-foreground">Nesta etapa desde {fmtDateTime(new Date(atual.em))}</span>
        <span className="text-muted-foreground">(há {duracaoCurta(atual.duracaoMs)})</span>
        <span className="ml-auto text-xs text-muted-foreground">histórico</span>
      </summary>
      <div className="flex flex-col divide-y divide-border border-t border-border">
        {passos.map((p, i) => (
          <div key={`${p.etapa}-${i}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-3 py-2 text-sm">
            <span className={`min-w-[9.5rem] font-medium ${p.saiuEm === null ? "text-foreground" : "text-muted-foreground"}`}>{nome(p.etapa)}</span>
            <span className="font-mono text-xs text-muted-foreground">recebido {fmtDateTime(new Date(p.em))}</span>
            {p.por && <span className="text-xs text-muted-foreground">por {p.por}</span>}
            <span className="ml-auto text-xs font-semibold text-foreground">
              {p.saiuEm === null ? `há ${duracaoCurta(p.duracaoMs)}` : `ficou ${duracaoCurta(p.duracaoMs)}`}
              {p.aproximado ? " *" : ""}
            </span>
          </div>
        ))}
        {passos.some((p) => p.aproximado) && (
          <div className="px-3 py-1.5 text-[11px] text-muted-foreground">* hora tirada de outro registro do card (anterior ao histórico de etapas).</div>
        )}
      </div>
    </details>
  );
}
