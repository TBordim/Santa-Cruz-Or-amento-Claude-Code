import { formatarCodigoInterno } from "@/lib/orcamentos/codigo-interno";
import { calcularMontagens, type ItemAceite } from "@/lib/aceite/montagem";
import { fmtQuantidade } from "@/lib/aceite/constantes";

// Itens do Aceite em leitura: quantidade pedida por modelo e, depois da Engenharia, a montagem
// (como os números (1), (2)... do formulário de papel) com as folhas de cada uma.
export function ResumoItens({ itens, capacidade }: { itens: ItemAceite[]; capacidade: number | null }) {
  if (!itens.length) return null;
  const montagens = calcularMontagens(itens);
  const comMontagem = montagens.length > 0;
  const totalFolhas = montagens.reduce((s, m) => s + m.folhas, 0);
  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left font-medium">Modelo</th>
              <th className="px-3 py-2 text-right font-medium">Pedido</th>
              {comMontagem && <th className="px-3 py-2 text-center font-medium">Montagem</th>}
              {comMontagem && <th className="px-3 py-2 text-right font-medium">Posições</th>}
              {comMontagem && <th className="px-3 py-2 text-right font-medium">Sai</th>}
            </tr>
          </thead>
          <tbody>
            {itens.map((i) => {
              const calc = montagens.flatMap((m) => m.itens).find((x) => x.modeloId === i.modeloId);
              return (
                <tr key={i.modeloId} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">
                    <span className="block text-foreground">{i.descricao || "Modelo sem descrição"}</span>
                    {i.codInterno && <span className="font-mono text-xs text-muted-foreground">{formatarCodigoInterno(i.codInterno)}</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{fmtQuantidade(i.quantidade)}</td>
                  {comMontagem && <td className="px-3 py-2 text-center font-mono">{i.montagem ? `(${i.montagem})` : "—"}</td>}
                  {comMontagem && <td className="px-3 py-2 text-right font-mono">{i.posicoes ?? "—"}</td>}
                  {comMontagem && <td className="px-3 py-2 text-right font-mono">{calc ? fmtQuantidade(calc.produzido) : "—"}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {comMontagem && (
        <p className="text-xs text-muted-foreground">
          {montagens.map((m) => `Montagem ${m.grupo}: ${fmtQuantidade(m.folhas)} folhas (${m.posicoesUsadas}${capacidade ? ` de ${capacidade}` : ""} posições)`).join(" · ")}
          {" · "}Total {fmtQuantidade(totalFolhas)} folhas.
        </p>
      )}
    </div>
  );
}
