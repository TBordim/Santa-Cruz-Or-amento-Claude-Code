"use client";

import { fmtQuantidade } from "@/lib/aceite/constantes";
import { folhasEstimadas } from "@/lib/aceite/montagem";
import { SITUACOES_SUPORTE, textoSuporte, type SuporteAceite } from "@/lib/aceite/suportes";
import { Field } from "@/components/form-section";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Escolha } from "./Escolha";

const SITUACOES_COM_COR = SITUACOES_SUPORTE.map((o) => ({
  ...o,
  tom: (o.key === "RESERVADO_TOTAL" ? "good" : o.key === "RESERVADO_PARCIAL" ? "warn" : "bad") as "good" | "warn" | "bad",
}));

const numero = (v: string) => (v ? Number(v.replace(/[^0-9]/g, "")) || null : null);

// "Papel a ser utilizado": uma linha por papel e formato (estoque, ou o que for comprado). Serve ao
// Aceite sem divisão e a cada lote. `produzir` é a quantidade a produzir (do pedido ou do lote), que
// gera a sugestão de folhas do papel principal; `semPM` lista os papéis que ainda precisam de PM.
export function EditorPapeis({
  suportes,
  onChange,
  produzir,
  semPM,
}: {
  suportes: SuporteAceite[];
  onChange: (s: SuporteAceite[]) => void;
  produzir: number;
  semPM: string[];
}) {
  const muda = (id: string, campo: keyof SuporteAceite, valor: string | number | null) => onChange(suportes.map((x) => (x.id === id ? { ...x, [campo]: valor } : x)));
  const adicionar = () =>
    onChange([
      ...suportes,
      {
        id: `s${suportes.length + 1}-${Math.random().toString(36).slice(2, 6)}`,
        descricao: "",
        gramatura: "",
        codigo: "",
        formato: "",
        qtdFolha: null,
        folhas: null,
        situacao: "NAO_VERIFICADO",
        obs: "",
        doOrcamento: null,
      },
    ]);
  const remover = (id: string) => onChange(suportes.filter((x) => x.id !== id));

  return (
    <>
      {suportes.map((x, n) => {
        const sugestao = n === 0 ? folhasEstimadas(produzir || null, x.qtdFolha) : null;
        const d = x.doOrcamento;
        const trocou = !!d && (d.codigo !== x.codigo || d.descricao !== x.descricao || d.formato !== x.formato || d.gramatura !== x.gramatura);
        return (
          <div key={x.id} className="flex flex-col gap-2.5 rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-foreground">
                Papel {n + 1}
                <span className="ml-2 text-xs font-normal text-muted-foreground">{d ? "do orçamento" : "acrescentado por Vendas"}</span>
                {(!d || suportes.length > 1) && (
                  <Button type="button" size="sm" variant="ghost" className="ml-1 h-auto px-1.5 py-0.5 text-xs text-bad" onClick={() => remover(x.id)}>
                    Remover
                  </Button>
                )}
              </span>
              <Escolha rotulo={`Estoque do papel ${n + 1}`} valor={x.situacao} onChange={(k) => muda(x.id, "situacao", k)} opcoes={SITUACOES_COM_COR} />
            </div>
            {trocou && d && (
              <p className="rounded-md bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
                Especificado no orçamento: {textoSuporte(d)} · código {d.codigo || "—"}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
              <Field label="Tipo de papel">
                <Input value={x.descricao} onChange={(e) => muda(x.id, "descricao", e.target.value)} placeholder="Vitamax" />
              </Field>
              <Field label="Gramatura (g)">
                <Input value={x.gramatura} inputMode="numeric" onChange={(e) => muda(x.id, "gramatura", e.target.value)} />
              </Field>
              <Field label="Código no ERP">
                <Input value={x.codigo} onChange={(e) => muda(x.id, "codigo", e.target.value)} />
              </Field>
              <Field label="Formato">
                <Input value={x.formato} onChange={(e) => muda(x.id, "formato", e.target.value)} placeholder="96x66" />
              </Field>
              <Field label="Qtd por folha">
                <Input value={x.qtdFolha ?? ""} inputMode="numeric" onChange={(e) => muda(x.id, "qtdFolha", numero(e.target.value))} />
              </Field>
              <Field label={sugestao ? `Folhas (conta: ${fmtQuantidade(sugestao)})` : "Folhas"}>
                <Input value={x.folhas ?? ""} inputMode="numeric" placeholder={sugestao ? String(sugestao) : ""} onChange={(e) => muda(x.id, "folhas", numero(e.target.value))} />
              </Field>
            </div>
            <Input value={x.obs} onChange={(e) => muda(x.id, "obs", e.target.value)} placeholder="Observação sobre este papel (opcional). Ex.: reservei 800 folhas do saldo" aria-label={`Observação do papel ${n + 1}`} />
            {semPM.includes(x.id) && (x.situacao === "RESERVADO_PARCIAL" || x.situacao === "SEM_ESTOQUE") && (
              <p className="text-xs font-medium text-warn">Emita o Pedido de Material deste papel (bloco abaixo) antes de liberar.</p>
            )}
          </div>
        );
      })}
      <div>
        <Button type="button" size="sm" variant="outline" onClick={adicionar}>
          Adicionar papel
        </Button>
      </div>
    </>
  );
}
