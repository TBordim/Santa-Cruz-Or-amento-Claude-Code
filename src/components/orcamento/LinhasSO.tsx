import type { PrecificacaoTier } from "@/lib/orcamentos/types";
import { fmtMoney } from "@/lib/orcamentos/constantes";
import { valorSO } from "@/lib/orcamentos/modelos";

// As SOs do orçamento como linhas da oferta ao cliente: uma linha por SO, com quantidade, papel
// (quando há mais de uma opção), preço por milheiro e total. Mesmo formato da proposta em papel
// (ex.: Orçamento 15552, uma linha por SO). `destacar` marca a SO que o cliente fechou.
export function LinhasSO({ tiers, destacar }: { tiers: PrecificacaoTier[]; destacar?: PrecificacaoTier | null }) {
  if (!tiers.length) return <div className="text-sm text-muted-foreground">Nenhuma SO lançada.</div>;
  return (
    <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
      {tiers.map((t, i) => {
        const escolhida = destacar === t;
        return (
          <div key={i} className={`flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-3 py-2 text-sm ${escolhida ? "bg-good-soft" : ""}`}>
            <div className="min-w-0">
              <span className="font-mono text-xs text-muted-foreground">{t.numeroSequencial ? `SO ${t.numeroSequencial}` : "SO sem número"}</span>
              <span className="ml-2 text-foreground">{t.quantidade}</span>
              {t.papel && <span className="ml-1.5 text-muted-foreground">· {t.papel}</span>}
              {escolhida && <span className="ml-1.5 text-xs font-semibold text-good">· fechada pelo cliente</span>}
            </div>
            <div className="text-right">
              <span className="font-mono font-semibold">{fmtMoney(t.precoFinal ?? t.precoFinalSugerido)}</span>
              <span className="ml-1 text-xs text-muted-foreground">/milh · total {fmtMoney(valorSO(t))}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
