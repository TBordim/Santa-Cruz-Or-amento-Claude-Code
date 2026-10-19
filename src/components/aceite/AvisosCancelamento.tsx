import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtDateTime } from "@/lib/orcamentos/constantes";
import { darCienteCancelamento } from "@/app/(app)/aceite/actions";
import type { listarAvisosCancelamento } from "@/lib/aceite/avisos";

type Aviso = Awaited<ReturnType<typeof listarAvisosCancelamento>>[number];

// Pedidos cancelados por Vendas que o setor já tinha trabalhado: PCP, Compras e Engenharia veem o aviso no
// topo da própria tela e dão ciência. O sistema não cancela PM nem programação sozinho: o setor decide.
export function AvisosCancelamento({ avisos }: { avisos: Aviso[] }) {
  if (!avisos.length) return null;
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-bad/30 bg-bad-soft/40 p-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-bad">
        <TriangleAlert className="h-4 w-4" /> Pedido{avisos.length > 1 ? "s" : ""} cancelado{avisos.length > 1 ? "s" : ""} ({avisos.length})
      </h3>
      {avisos.map((a) => (
        <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <div className="min-w-0 flex-1">
            <div className="font-medium text-foreground">
              <span className="font-mono">{a.aceite.numero ? `Aceite ${a.aceite.numero}` : "Aceite sem nº"}</span> · {a.aceite.orcamento.cliente}
              <span className="font-normal text-muted-foreground"> — {a.aceite.orcamento.produtoDescricao}</span>
            </div>
            <div className="text-xs text-foreground">{a.texto}</div>
            <div className="text-xs text-muted-foreground">
              Motivo: {a.aceite.canceladoMotivo ?? "—"} · cancelado por {a.aceite.canceladoPor ?? "—"}
              {a.aceite.canceladoEm ? `, ${fmtDateTime(a.aceite.canceladoEm)}` : ""}
            </div>
          </div>
          <form action={darCienteCancelamento}>
            <input type="hidden" name="avisoId" value={a.id} />
            <Button type="submit" size="sm" variant="outline">
              Ciente
            </Button>
          </form>
        </div>
      ))}
    </section>
  );
}
