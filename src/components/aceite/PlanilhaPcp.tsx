import Link from "next/link";
import { fmtMoney, classificacaoLabel } from "@/lib/orcamentos/constantes";
import { parseQuantidade } from "@/lib/orcamentos/motor";
import type { PrecificacaoTier, ReqCliente } from "@/lib/orcamentos/types";
import type { AceiteLinha } from "@/lib/aceite/dados";
import { chegadaDoPapel, fmtDia, fmtQuantidade, temAlertaPendente } from "@/lib/aceite/constantes";
import { lerItens, quantidadeTotal, calcularMontagens } from "@/lib/aceite/montagem";
import { lerSuportes } from "@/lib/aceite/suportes";
import { acabamentosEspeciais } from "@/lib/aceite/acabamento";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function unicos(lista: string[]): string {
  const u = [...new Set(lista.filter(Boolean))];
  return u.length ? u.join(" / ") : "—";
}

// Uma linha por Aceite, nas colunas da planilha "Aceites e Previsão de entrega" que o PCP usa hoje
// (PDF enviado pelo Thiago em 08/10/2026), tudo vindo do que o app já registra.
function linha(a: AceiteLinha) {
  const so = a.soEscolhida as unknown as PrecificacaoTier | null;
  const itens = lerItens(a.itens);
  const tiragem = quantidadeTotal(itens) || (so ? parseQuantidade(so.quantidade) : null) || 0;
  const milheiro = so ? (so.precoFinal ?? so.precoFinalSugerido ?? so.precoProjetado ?? null) : null;
  const fat = milheiro !== null && tiragem ? (milheiro * tiragem) / 1000 : null;
  const suportes = lerSuportes(a);
  const folhasMontagem = calcularMontagens(itens).reduce((s, m) => s + m.folhas, 0);
  const folhas = folhasMontagem || suportes.reduce((s, x) => s + (x.folhas ?? 0), 0) || null;
  const chegada = chegadaDoPapel(a.pedidosMaterial);
  const todoEmEstoque = suportes.length > 0 && suportes.every((x) => x.situacao === "RESERVADO_TOTAL");
  const especiais = acabamentosEspeciais(a.orcamento.reqCliente as ReqCliente | null);
  return {
    tiragem,
    milheiro,
    fat,
    folhas,
    especiais,
    papel: unicos(suportes.map((x) => x.descricao)),
    codigo: unicos(suportes.map((x) => x.codigo)),
    gramatura: unicos(suportes.map((x) => x.gramatura)),
    formato: unicos(suportes.map((x) => x.formato)),
    chegadaTexto: todoEmEstoque ? "Estoque" : chegada ? fmtDia(chegada) : suportes.some((x) => x.situacao !== "RESERVADO_TOTAL") ? "sem data" : "—",
    atrasoCliente: !!(a.dataEntrega && a.dataCliente && a.dataEntrega > a.dataCliente),
    alerta: temAlertaPendente(a.pedidosMaterial),
  };
}

export function PlanilhaPcp({ aceites, hoje }: { aceites: AceiteLinha[]; hoje: Date }) {
  const linhas = aceites.map((a) => ({ a, l: linha(a) }));

  // Previsão de faturamento (TP de PCP 3.6): mês corrente e os dois seguintes, pela data acordada.
  const meses = [0, 1, 2].map((k) => {
    const d = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + k, 1));
    const total = linhas
      .filter(({ a }) => a.dataEntrega && a.dataEntrega.getUTCFullYear() === d.getUTCFullYear() && a.dataEntrega.getUTCMonth() === d.getUTCMonth())
      .reduce((s, { l }) => s + (l.fat ?? 0), 0);
    return { rotulo: `${MESES[d.getUTCMonth()]}/${String(d.getUTCFullYear()).slice(2)}`, total };
  });
  const semData = linhas.filter(({ a }) => !a.dataEntrega).reduce((s, { l }) => s + (l.fat ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {meses.map((m) => (
          <div key={m.rotulo} className="rounded-xl border border-border bg-card px-4 py-3">
            <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Faturamento previsto · {m.rotulo}</div>
            <div className="mt-0.5 font-serif text-xl font-semibold text-foreground">{fmtMoney(m.total)}</div>
          </div>
        ))}
        <div className="rounded-xl border border-dashed border-line-strong bg-card px-4 py-3">
          <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Ainda sem data</div>
          <div className="mt-0.5 font-serif text-xl font-semibold text-muted-foreground">{fmtMoney(semData)}</div>
        </div>
      </div>

      {linhas.length === 0 ? (
        <div className="empty-state">Nenhum Aceite para mostrar.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[1400px] text-[12.5px]">
            <thead>
              <tr className="border-b border-line-strong bg-muted/50 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {["Aceite", "OF", "Tiragem", "$ Milheiro", "Fat. previsto", "Cliente", "Tipo", "Acabamento", "Faca", "Tipo papel", "Cód. papel", "Gram.", "Formato", "Qtd folhas", "Prev. chegada papel", "Entrega acordada", "Entregue em", "1ª data do cliente"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-2.5 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map(({ a, l }) => (
                <tr key={a.id} className={`border-b border-border last:border-0 hover:bg-muted/30 ${l.alerta ? "shadow-[inset_3px_0_0_var(--bad)]" : ""}`}>
                  <td className="whitespace-nowrap px-2.5 py-1.5 font-mono">
                    <Link href={`/pcp/${a.id}`} className="font-semibold text-foreground underline-offset-2 hover:underline">
                      {a.numero ?? "s/ nº"}
                    </Link>
                  </td>
                  <td className="px-2.5 py-1.5 font-mono">{a.numeroOF ?? "—"}</td>
                  <td className="px-2.5 py-1.5 text-right font-mono">{fmtQuantidade(l.tiragem)}</td>
                  <td className="whitespace-nowrap px-2.5 py-1.5 text-right font-mono">{fmtMoney(l.milheiro)}</td>
                  <td className="whitespace-nowrap px-2.5 py-1.5 text-right font-mono">{fmtMoney(l.fat)}</td>
                  <td className="max-w-[180px] truncate px-2.5 py-1.5" title={a.orcamento.cliente ?? ""}>{a.orcamento.cliente}</td>
                  <td className="whitespace-nowrap px-2.5 py-1.5">{classificacaoLabel(a.orcamento.classificacao)}</td>
                  <td className="whitespace-nowrap px-2.5 py-1.5" title={l.especiais.join(", ")}>{l.especiais.length ? "Sim" : "Não"}</td>
                  <td className="whitespace-nowrap px-2.5 py-1.5 font-mono">{a.codigoFaca ?? (a.facaNova ? "nova" : "—")}</td>
                  <td className="px-2.5 py-1.5">{l.papel}</td>
                  <td className="px-2.5 py-1.5 font-mono">{l.codigo}</td>
                  <td className="px-2.5 py-1.5 font-mono">{l.gramatura}</td>
                  <td className="px-2.5 py-1.5 font-mono">{l.formato}</td>
                  <td className="px-2.5 py-1.5 text-right font-mono">{fmtQuantidade(l.folhas)}</td>
                  <td className={`whitespace-nowrap px-2.5 py-1.5 font-mono ${l.alerta ? "font-semibold text-bad" : ""}`}>{l.chegadaTexto}</td>
                  <td className={`whitespace-nowrap px-2.5 py-1.5 font-mono ${l.atrasoCliente ? "font-semibold text-warn" : ""}`} title={l.atrasoCliente ? "Depois da data que o cliente pediu" : undefined}>
                    {fmtDia(a.dataEntrega)}
                  </td>
                  <td className={`whitespace-nowrap px-2.5 py-1.5 font-mono ${a.entregueEm ? "font-semibold text-good" : ""}`}>{a.entregueEm ? fmtDia(a.entregueEm) : "—"}</td>
                  <td className="whitespace-nowrap px-2.5 py-1.5 font-mono">{fmtDia(a.dataCliente)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Entrega em amarelo: acordada depois da data que o cliente pediu. Linha com faixa vermelha: o fornecedor mudou o prazo do papel.
      </p>
    </div>
  );
}
