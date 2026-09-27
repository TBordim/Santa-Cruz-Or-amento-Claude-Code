"use client";

import { useState } from "react";
import { NovaRodadaForm } from "./NovaRodadaForm";
import { Button } from "@/components/ui/button";
import { labToCssColor } from "@/lib/cor/lab-to-rgb";
import { num } from "@/lib/cor/formato";

type Lab = { l: number; a: number; b: number };
type Base = { id: string; codigo: string; nome: string };
type Sugestao = {
  corId: string;
  codigo: string;
  cliente: string | null;
  de: number;
  lab: Lab;
  composicao: { baseId: string; percentual: number }[];
};

// "Sugestão 2": enquanto não há nenhuma rodada própria da cor, não existe ajuste pra calcular —
// mas dá pra sugerir um PONTO DE PARTIDA a partir de cores já aprovadas com LAB parecido
// (ΔE2000 < 2,5), poupando o "não sei nem com qual tinta começar" enquanto se espera o
// fornecedor responder. Escolher uma sugestão só pré-preenche a composição; a rodada só é
// salva de verdade quando o formulário abaixo é enviado.
export function PrimeiraFormula({ corId, bases, sugestoes }: { corId: string; bases: Base[]; sugestoes: Sugestao[] }) {
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const sugestaoEscolhida = sugestoes.find((s) => s.corId === escolhida);
  const composicaoEscolhida = sugestaoEscolhida?.composicao ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-1 text-sm font-semibold text-foreground">Como começar</div>
        {sugestoes.length === 0 ? (
          // Ausência explicada em vez de simplesmente sumir — sem isso parecia que a sugestão
          // tinha quebrado, quando na verdade é só "nada parecido no histórico ainda".
          <p className="text-sm text-muted-foreground">
            Nenhuma fórmula aprovada com LAB parecido (ΔE2000 &lt; 2,5) no histórico ainda. Comece pela fórmula do fornecedor
            ou do seu próprio julgamento no formulário abaixo.
          </p>
        ) : (
          <>
            <p className="mb-3 text-sm text-muted-foreground">
              Fórmulas já aprovadas com LAB parecido — escolha uma pra preencher a rodada 1, ou ignore e comece do zero.
            </p>
            <div className="flex flex-col gap-2">
              {sugestoes.map((s) => (
                <div key={s.corId} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-2.5">
                  <span
                    className="h-6 w-6 shrink-0 rounded-full border border-border"
                    style={{ background: labToCssColor(s.lab) }}
                    title="Apoio visual — não substitui a cabine de luz D50"
                  />
                  <div className="min-w-0 flex-1 text-sm">
                    <span className="font-medium">{s.codigo}</span>
                    {s.cliente && <span className="text-muted-foreground"> · {s.cliente}</span>}
                    <span className="ml-2 font-mono text-xs text-muted-foreground">ΔE {num(s.de, 2)}</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={escolhida === s.corId ? "default" : "outline"}
                    onClick={() => setEscolhida(s.corId)}
                  >
                    {escolhida === s.corId ? "Selecionada" : "Usar esta fórmula"}
                  </Button>
                </div>
              ))}
              {escolhida && (
                <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => setEscolhida(null)}>
                  Começar do zero
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Salvaguarda: se a rodada aprovada dessa cor não tiver composição registrada (não deveria
          acontecer, mas silenciosamente virar um form em branco parece um bug sem explicação) —
          avisa em vez de deixar a pessoa achar que a sugestão quebrou sem motivo. */}
      {escolhida && sugestaoEscolhida && composicaoEscolhida.length === 0 && (
        <div className="anexo-erro">
          A fórmula aprovada de {sugestaoEscolhida.codigo} não tem composição registrada — não deu pra preencher.
        </div>
      )}

      {/* key troca ao mudar a escolha: recria o formulário do zero pra composição pré-preenchida
          (Select não controlado de origem) refletir a sugestão certa, igual ao reset entre rodadas. */}
      <NovaRodadaForm
        key={escolhida ?? "vazio"}
        corId={corId}
        bases={bases}
        proximoNumero={1}
        composicaoAnterior={composicaoEscolhida}
        origemPadrao={escolhida ? "SUGESTAO_SISTEMA" : undefined}
      />
    </div>
  );
}
