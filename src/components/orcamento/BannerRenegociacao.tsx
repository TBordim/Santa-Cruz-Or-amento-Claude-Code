import { RefreshCw } from "lucide-react";
import { margemBruta } from "@/lib/orcamentos/margem";
import type { PrecificacaoTier, Renegociacao } from "@/lib/orcamentos/types";
import { compararComOfertaAnterior } from "@/lib/orcamentos/renegociacao";
import { fmtDateTime, fmtMoney } from "@/lib/orcamentos/constantes";
import { fmtPct } from "@/lib/orcamentos/motor";

// Faixa azul de "Renegociação": o cliente pediu ajuste de preço depois da oferta. Mostra o pedido, o que
// foi ofertado antes e o que está agora, lado a lado. Aparece no Orçamento, na Diretoria e no Envio de
// oferta. `modo`: "orcamento" e "diretoria" comparam com o preço projetado; "envio" com o final aprovado.
export function BannerRenegociacao({
  reneg,
  tiers,
  modo,
  comissaoEspecial,
  comissaoObs,
  total,
}: {
  reneg: Renegociacao;
  tiers: PrecificacaoTier[];
  modo: "orcamento" | "diretoria" | "envio";
  comissaoEspecial: boolean;
  comissaoObs: string | null;
  total: number;
}) {
  const linhas = compararComOfertaAnterior(tiers, reneg, modo === "envio");
  const comissaoAntes = reneg.comissaoEspecial ? reneg.comissaoObs?.trim() || "sim, sem observação" : "sem condição especial";
  const comissaoAgora = comissaoEspecial ? comissaoObs?.trim() || "sim, sem observação" : "sem condição especial";
  const titulos = {
    orcamento: "Refaça as condições (valor da faca, comissão, preço) e envie à Diretoria para reaprovar.",
    diretoria: "A Diretoria precisa reaprovar: não há aprovação automática numa renegociação.",
    envio: "Reaprovada pela Diretoria. Envie a oferta nova ao cliente.",
  } as const;
  return (
    <div className="overflow-hidden rounded-lg border-2 border-[#3E7FA6] bg-[#3E7FA6]/10">
      <div className="flex items-center gap-2 bg-[#3E7FA6] px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-white">
        <RefreshCw className="h-4 w-4 shrink-0" />
        Renegociação nº {reneg.n}{total > 1 ? ` (de ${total})` : ""} — o cliente pediu ajuste de preço
      </div>
      <div className="flex flex-col gap-2.5 px-3 py-2.5">
        <div className="rounded-md bg-card px-3 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            O que o cliente pediu · {reneg.por} · {fmtDateTime(new Date(reneg.em))}
          </div>
          <div className="mt-0.5 whitespace-pre-line text-base font-semibold leading-snug text-foreground">{reneg.pedido}</div>
        </div>
        <div className="overflow-x-auto rounded-md bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-1.5">SO</th>
                <th className="px-3 py-1.5 text-right">Ofertado antes</th>
                <th className="px-3 py-1.5 text-right">Agora</th>
                <th className="px-3 py-1.5 text-right">Variação</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.rotulo} className="border-b border-border last:border-0">
                  <td className="px-3 py-1.5 text-muted-foreground">{l.rotulo}</td>
                  <td className="px-3 py-1.5 text-right font-mono">
                    {l.antes ? fmtMoney(l.antes.precoFinal ?? l.antes.precoProjetado) : "—"}
                    {l.antes && <div className="text-[11px] text-muted-foreground">custo {fmtPct(l.antes.custoPrimarioPct)} · margem bruta {margemBruta(l.antes.margemP2Pct, l.antes.margemP1Pct).texto}</div>}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono font-semibold">
                    {l.agoraPreco !== null ? fmtMoney(l.agoraPreco) : "—"}
                    <div className="text-[11px] font-normal text-muted-foreground">custo {fmtPct(l.agoraCusto)} · margem bruta {margemBruta(l.agoraMargem, l.agoraP1).texto}</div>
                  </td>
                  <td className={`px-3 py-1.5 text-right font-mono font-semibold ${l.variacaoPct !== null && l.variacaoPct < 0 ? "text-bad" : ""}`}>
                    {l.variacaoPct === null ? "—" : `${l.variacaoPct > 0 ? "+" : "−"}${Math.abs(l.variacaoPct).toFixed(1).replace(".", ",")}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-sm text-foreground">
          <strong>Comissão / condição especial:</strong> antes, {comissaoAntes}; agora, {comissaoAgora}.
        </div>
        <div className="text-xs text-muted-foreground">{titulos[modo]} A oferta anterior fica guardada.</div>
      </div>
    </div>
  );
}
