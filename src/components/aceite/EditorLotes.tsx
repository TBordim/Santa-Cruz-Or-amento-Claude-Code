"use client";

import { fmtQuantidade, lerQuantidade } from "@/lib/aceite/constantes";
import { aProduzir, type ItemAceite } from "@/lib/aceite/montagem";
import { dividirIgualmente } from "@/lib/aceite/lotes";
import type { SuporteAceite } from "@/lib/aceite/suportes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EditorDatasCliente, dataVazia, type DataForm } from "./EditorDatasCliente";
import { EditorPapeis } from "./EditorPapeis";

// Um lote do formulário de Vendas. `id` nulo = lote ainda não gravado. `comPM`: já há Pedido de
// Material ativo apontando para ele (não pode ser removido).
export type LoteForm = {
  id: string | null;
  itens: { modeloId: string; quantidade: string; emEstoque: string }[];
  datas: DataForm[];
  suportes: SuporteAceite[];
  comPM: boolean;
};

export type ModeloDoPedido = { modeloId: string; descricao: string; pedido: number; estoque: number };

// Cria N lotes repartindo igualmente cada modelo; o papel de cada lote nasce igual ao do Aceite.
export function lotesIguais(modelos: ModeloDoPedido[], n: number, suportesBase: SuporteAceite[]): LoteForm[] {
  const itensAceite: ItemAceite[] = modelos.map((m) => ({ modeloId: m.modeloId, descricao: m.descricao, codInterno: "", quantidade: m.pedido, emEstoque: m.estoque || null, montagem: null, posicoes: null }));
  return dividirIgualmente(itensAceite, n).map((itens) => ({
    id: null,
    itens: itens.map((i) => ({ modeloId: i.modeloId, quantidade: i.quantidade ? String(i.quantidade) : "", emEstoque: i.emEstoque ? String(i.emEstoque) : "" })),
    datas: [dataVazia()],
    suportes: suportesBase.map((s) => ({ ...s, situacao: "NAO_VERIFICADO", obs: "", folhas: null })),
    comPM: false,
  }));
}

const q = (v: string) => lerQuantidade(v) ?? 0;

// Quantidade a produzir de um lote (pedido do lote menos o que sai do estoque).
function produzirDoLote(l: LoteForm): number {
  return l.itens.reduce((s, i) => s + aProduzir({ quantidade: q(i.quantidade), emEstoque: q(i.emEstoque) || null }), 0);
}

export function EditorLotes({
  modelos,
  lotes,
  onChange,
  comEstoque,
  semPM,
  suportesBase,
}: {
  modelos: ModeloDoPedido[];
  lotes: LoteForm[];
  onChange: (l: LoteForm[]) => void;
  // Vendas marcou que há produto acabado em estoque: o lote também reparte o estoque.
  comEstoque: boolean;
  // Papéis (por id) de cada lote que ainda precisam de PM, pelo id do lote.
  semPM: Record<string, string[]>;
  suportesBase: SuporteAceite[];
}) {
  const atualiza = (i: number, parte: Partial<LoteForm>) => onChange(lotes.map((l, n) => (n === i ? { ...l, ...parte } : l)));
  const mudaItem = (i: number, modeloId: string, campo: "quantidade" | "emEstoque", v: string) =>
    atualiza(i, { itens: lotes[i].itens.map((it) => (it.modeloId === modeloId ? { ...it, [campo]: v } : it)) });
  const adicionar = () =>
    onChange([
      ...lotes,
      {
        id: null,
        itens: modelos.map((m) => ({ modeloId: m.modeloId, quantidade: "", emEstoque: "" })),
        datas: [dataVazia()],
        suportes: suportesBase.map((s) => ({ ...s, situacao: "NAO_VERIFICADO", obs: "", folhas: null })),
        comPM: false,
      },
    ]);

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left font-medium">Modelo</th>
              <th className="px-3 py-2 text-right font-medium">Pedido</th>
              <th className="px-3 py-2 text-right font-medium">Nos lotes</th>
              <th className="px-3 py-2 text-left font-medium">Confere?</th>
            </tr>
          </thead>
          <tbody>
            {modelos.map((m) => {
              const soma = lotes.reduce((s, l) => s + q(l.itens.find((i) => i.modeloId === m.modeloId)?.quantidade ?? ""), 0);
              const dif = soma - m.pedido;
              const somaEstoque = lotes.reduce((s, l) => s + q(l.itens.find((i) => i.modeloId === m.modeloId)?.emEstoque ?? ""), 0);
              const difEstoque = comEstoque ? somaEstoque - m.estoque : 0;
              return (
                <tr key={m.modeloId} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 text-foreground">{m.descricao || "Modelo sem descrição"}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmtQuantidade(m.pedido)}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmtQuantidade(soma)}</td>
                  <td className="px-3 py-2 text-xs font-medium">
                    {dif === 0 && difEstoque === 0 ? (
                      <span className="text-good">fecha</span>
                    ) : (
                      <span className="text-bad">
                        {dif !== 0 && (dif < 0 ? `faltam ${fmtQuantidade(-dif)}` : `passa ${fmtQuantidade(dif)}`)}
                        {dif !== 0 && difEstoque !== 0 && " · "}
                        {difEstoque !== 0 && `estoque ${difEstoque < 0 ? `falta ${fmtQuantidade(-difEstoque)}` : `passa ${fmtQuantidade(difEstoque)}`}`}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {lotes.map((l, i) => {
        const total = l.itens.reduce((s, it) => s + q(it.quantidade), 0);
        return (
          <div key={l.id ?? `novo-${i}`} className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-foreground">
                Lote {i + 1} de {lotes.length}
                <span className="ml-2 text-xs font-normal text-muted-foreground">{fmtQuantidade(total)} un.</span>
                {l.comPM && <span className="ml-2 text-xs font-normal text-warn">tem Pedido de Material (se remover o lote, o PM fica sem lote e você o liga a outro)</span>}
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-bad"
                disabled={lotes.length <= 2}
                title={lotes.length <= 2 ? "A divisão precisa de ao menos 2 lotes (para voltar a um lote só, use Desfazer a divisão)" : undefined}
                onClick={() => onChange(lotes.filter((_, n) => n !== i))}
              >
                Remover lote
              </Button>
            </div>

            <div className={`grid grid-cols-1 gap-1.5 ${modelos.length > 1 ? "md:grid-cols-2" : ""}`}>
              {modelos.map((m) => {
                const it = l.itens.find((x) => x.modeloId === m.modeloId);
                return (
                  <div key={m.modeloId} className="grid grid-cols-[1fr_6.5rem] items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5">
                    <span className="min-w-0 truncate text-sm text-foreground">{m.descricao || "Modelo sem descrição"}</span>
                    <Input
                      value={it?.quantidade ?? ""}
                      inputMode="numeric"
                      placeholder="Quantidade"
                      aria-label={`Lote ${i + 1}: quantidade de ${m.descricao}`}
                      onChange={(e) => mudaItem(i, m.modeloId, "quantidade", e.target.value)}
                    />
                    {comEstoque && (
                      <>
                        <span className="text-xs text-muted-foreground">do estoque de produto acabado</span>
                        <Input
                          value={it?.emEstoque ?? ""}
                          inputMode="numeric"
                          placeholder="Do estoque"
                          aria-label={`Lote ${i + 1}: do estoque de ${m.descricao}`}
                          onChange={(e) => mudaItem(i, m.modeloId, "emEstoque", e.target.value)}
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <EditorDatasCliente datas={l.datas} onChange={(datas) => atualiza(i, { datas })} titulo={`Datas do cliente para o lote ${i + 1}`} />

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-foreground">Papel a ser utilizado no lote {i + 1}</span>
              <EditorPapeis suportes={l.suportes} onChange={(suportes) => atualiza(i, { suportes })} produzir={produzirDoLote(l)} semPM={l.id ? (semPM[l.id] ?? []) : []} />
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={adicionar}>
          + Adicionar lote
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          title="Reparte as quantidades igualmente; mantém as datas, o papel e os Pedidos de Material de cada lote"
          onClick={() =>
            onChange(
              lotesIguais(modelos, lotes.length, suportesBase).map((novo, i) => ({
                ...novo,
                id: lotes[i]?.id ?? null,
                comPM: lotes[i]?.comPM ?? false,
                datas: lotes[i]?.datas ?? novo.datas,
                suportes: lotes[i]?.suportes ?? novo.suportes,
              })),
            )
          }
        >
          Redistribuir igualmente
        </Button>
      </div>
    </div>
  );
}
