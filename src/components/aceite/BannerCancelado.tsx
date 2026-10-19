import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtDateTime } from "@/lib/orcamentos/constantes";
import { SETOR_AVISO, type SetorAviso } from "@/lib/aceite/cancelamento";
import { etapaAceiteInfo } from "@/lib/aceite/constantes";
import { concluirCancelamentoErp } from "@/app/(app)/aceite/actions";

type AvisoVisto = { id: string; setor: string; texto: string; vistoEm: Date | null; vistoPor: string | null };

// Pedido cancelado: quando, quem, em que etapa estava, o motivo, o que falta no ERP (Vendas) e a ciência
// de cada setor avisado. Somente leitura: o cancelamento é definitivo.
export function BannerCancelado({
  aceite,
  podeVendas,
}: {
  aceite: {
    id: string;
    canceladoEm: Date | null;
    canceladoPor: string | null;
    canceladoMotivo: string | null;
    canceladoNaEtapa: string | null;
    canceladoErpPendente: boolean;
    canceladoAvisarPreImpressao: boolean;
    avisosCancelamento: AvisoVisto[];
  };
  podeVendas: boolean;
}) {
  const etapa = aceite.canceladoNaEtapa ? (etapaAceiteInfo(aceite.canceladoNaEtapa)?.label.replace(/^\d+\.\s*/, "") ?? aceite.canceladoNaEtapa) : null;
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-bad/40 bg-bad-soft/40 p-3 text-sm">
      <div className="flex items-center gap-2 font-semibold text-bad">
        <Ban className="h-4 w-4" /> Pedido cancelado
      </div>
      <p className="text-foreground">
        <b>Motivo:</b> {aceite.canceladoMotivo ?? "—"}
      </p>
      <p className="text-xs text-muted-foreground">
        Cancelado por {aceite.canceladoPor ?? "—"}
        {aceite.canceladoEm ? ` em ${fmtDateTime(aceite.canceladoEm)}` : ""}
        {etapa ? ` · o pedido estava em: ${etapa}` : ""}. O cancelamento é definitivo; se o cliente voltar, abre-se outro Aceite.
      </p>
      {aceite.canceladoErpPendente && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-warn/40 bg-warn-soft/40 px-3 py-2">
          <span className="text-xs font-medium text-warn">Falta concluir no ERP: cancelar pedido/OF e passar o envelope da OF à Qualidade.</span>
          {podeVendas && (
            <form action={concluirCancelamentoErp}>
              <input type="hidden" name="id" value={aceite.id} />
              <Button type="submit" size="sm" variant="outline">
                Marcar como feito
              </Button>
            </form>
          )}
        </div>
      )}
      {aceite.canceladoAvisarPreImpressao && <p className="text-xs text-muted-foreground">A OF já estava aberta: avise a Pré-impressão (por fora do sistema).</p>}
      {aceite.avisosCancelamento.length > 0 && (
        <ul className="flex flex-col gap-0.5 text-xs">
          {aceite.avisosCancelamento.map((a) => (
            <li key={a.id} className="text-muted-foreground">
              <b className="text-foreground">{SETOR_AVISO[a.setor as SetorAviso]?.rotulo ?? a.setor}:</b> {a.vistoEm ? `ciente (${a.vistoPor ?? "—"}, ${fmtDateTime(a.vistoEm)})` : "ainda não deu ciência"}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
