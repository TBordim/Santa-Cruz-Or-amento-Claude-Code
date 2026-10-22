import Link from "next/link";
import { fmtQuantidade, fmtDia, etapaAceiteInfo } from "@/lib/aceite/constantes";
import { calcularMontagens } from "@/lib/aceite/montagem";
import { textoDatasCliente } from "@/lib/aceite/datas-cliente";
import { textoSuporte } from "@/lib/aceite/suportes";
import { producaoDoLote, rotuloLote, type LoteView } from "@/lib/aceite/lotes";

// Lotes do Aceite em leitura (Engenharia, PCP, Atendimento e Vendas depois de liberar): o que cada lote
// leva de cada modelo, as folhas dele pela montagem que a Engenharia definiu, o papel, as datas do
// cliente e onde o lote está. A Engenharia analisa o Aceite uma vez só; isto é só para ela enxergar a divisão.
export function ResumoLotes({ lotes, href }: { lotes: LoteView[]; href?: (l: LoteView) => string }) {
  if (!lotes.length || lotes[0].implicito) return null;
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr className="border-b border-border">
            <th className="px-3 py-2 text-left font-medium">Lote</th>
            <th className="px-3 py-2 text-left font-medium">Quantidades</th>
            <th className="px-3 py-2 text-right font-medium">Folhas</th>
            <th className="px-3 py-2 text-left font-medium">Papel</th>
            <th className="px-3 py-2 text-left font-medium">Datas do cliente</th>
            <th className="px-3 py-2 text-left font-medium">Etapa</th>
          </tr>
        </thead>
        <tbody>
          {lotes.map((l) => {
            const folhas = calcularMontagens(l.itens).reduce((s, m) => s + m.folhas, 0);
            const { doEstoque } = producaoDoLote(l);
            return (
              <tr key={l.id ?? l.numero} className="border-b border-border align-top last:border-0">
                <td className="whitespace-nowrap px-3 py-2 font-semibold text-foreground">
                  {href ? (
                    <Link href={href(l)} className="text-foreground underline-offset-2 hover:underline">
                      {rotuloLote(l)}
                    </Link>
                  ) : (
                    rotuloLote(l)
                  )}
                  {l.numeroOF && <span className="block font-mono text-xs font-normal text-muted-foreground">OF {l.numeroOF}</span>}
                </td>
                <td className="px-3 py-2">
                  {l.itens
                    .filter((i) => (i.quantidade ?? 0) > 0)
                    .map((i) => (
                      <span key={i.modeloId} className="block text-xs">
                        <span className="text-muted-foreground">{i.descricao || "Modelo"}: </span>
                        <b className="font-mono text-foreground">{fmtQuantidade(i.quantidade)}</b>
                        {(i.emEstoque ?? 0) > 0 && <span className="text-muted-foreground"> ({fmtQuantidade(i.emEstoque)} do estoque)</span>}
                      </span>
                    ))}
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Total {fmtQuantidade(l.total)}
                    {doEstoque > 0 ? ` · produzir ${fmtQuantidade(l.total - doEstoque)}` : ""}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-mono">{folhas ? fmtQuantidade(folhas) : "—"}</td>
                <td className="px-3 py-2 text-xs">{l.suportes.length ? l.suportes.map((s) => textoSuporte(s)).join(" + ") : "—"}</td>
                <td className="px-3 py-2 text-xs">
                  {l.datasCliente.length ? textoDatasCliente(l.datasCliente) : "—"}
                  {l.dataEntrega && <span className="block text-muted-foreground">acordada {fmtDia(l.dataEntrega)}</span>}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-xs">{l.etapa === "ENGENHARIA_MATERIAL" ? "Engenharia e material" : (etapaAceiteInfo(l.etapa)?.label.replace(/^\d+\.\s*/, "") ?? l.etapa)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
