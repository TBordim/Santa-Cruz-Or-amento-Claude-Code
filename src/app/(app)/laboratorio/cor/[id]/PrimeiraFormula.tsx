"use client";

import { useState } from "react";
import { NovaRodadaForm } from "./NovaRodadaForm";
import { Button } from "@/components/ui/button";
import { labToCssColor } from "@/lib/cor/lab-to-rgb";
import { num } from "@/lib/cor/formato";

type Lab = { l: number; a: number; b: number };
type Base = { id: string; codigo: string; nome: string };
type SugestaoHistorico = {
  corId: string;
  codigo: string;
  cliente: string | null;
  de: number;
  lab: Lab;
  composicao: { baseId: string; percentual: number }[];
};
type SugestaoPantone = {
  codigoPantone: string;
  de: number;
  lab: Lab;
  composicao: { baseId: string; percentual: number }[];
};

// "Sugestão 2": enquanto não há nenhuma rodada própria da cor, não existe ajuste pra calcular —
// mas dá pra sugerir um PONTO DE PARTIDA de duas formas: (1) uma cor já aprovada com LAB parecido
// no nosso histórico, ou (2) o Pantone mais próximo do Formula Guide físico, convertido pra bases
// IRO com a equivalência confirmada pelo fornecedor ("Sugestão 1"). Escolher uma só pré-preenche a
// composição; a rodada só é salva de verdade quando o formulário abaixo é enviado.
export function PrimeiraFormula({
  corId,
  bases,
  sugestoes,
  sugestaoPantone,
}: {
  corId: string;
  bases: Base[];
  sugestoes: SugestaoHistorico[];
  sugestaoPantone: SugestaoPantone | null;
}) {
  // "h:<corId>" pras sugestões de histórico, "p" pra sugestão Pantone — só uma escolhida por vez.
  const [escolhida, setEscolhida] = useState<string | null>(null);

  const historicoEscolhida = sugestoes.find((s) => `h:${s.corId}` === escolhida);
  const pantoneEscolhida = escolhida === "p" ? sugestaoPantone : null;
  const composicaoEscolhida = historicoEscolhida?.composicao ?? pantoneEscolhida?.composicao ?? [];
  const origemPadrao = historicoEscolhida ? "SUGESTAO_SISTEMA" : pantoneEscolhida ? "SUGESTAO_PANTONE" : undefined;

  const semSugestao = sugestoes.length === 0 && !sugestaoPantone;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-1 text-sm font-semibold text-foreground">Como começar</div>
        {semSugestao ? (
          // Ausência explicada em vez de simplesmente sumir — sem isso parecia que a sugestão
          // tinha quebrado, quando na verdade é só "nada parecido no histórico nem no Pantone ainda".
          <p className="text-sm text-muted-foreground">
            Nenhuma fórmula aprovada com LAB parecido (ΔE2000 &lt; 2,5) no histórico, nem Pantone
            conversível perto o bastante. Comece pela fórmula do fornecedor ou do seu próprio
            julgamento no formulário abaixo.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {sugestaoPantone && (
              <div>
                <p className="mb-2 text-sm text-muted-foreground">
                  Pantone mais próximo do LAB, convertido pra bases IRO pela equivalência confirmada pelo fornecedor:
                </p>
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-2.5">
                  <span
                    className="h-6 w-6 shrink-0 rounded-full border border-border"
                    style={{ background: labToCssColor(sugestaoPantone.lab) }}
                    title="Apoio visual — não substitui a cabine de luz D50"
                  />
                  <div className="min-w-0 flex-1 text-sm">
                    <span className="font-medium">Pantone {sugestaoPantone.codigoPantone}</span>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">ΔE {num(sugestaoPantone.de, 2)}</span>
                  </div>
                  <Button type="button" size="sm" variant={escolhida === "p" ? "default" : "outline"} onClick={() => setEscolhida("p")}>
                    {escolhida === "p" ? "Selecionada" : "Usar esta fórmula"}
                  </Button>
                </div>
              </div>
            )}

            {sugestoes.length > 0 && (
              <div>
                <p className="mb-2 text-sm text-muted-foreground">Fórmulas já aprovadas com LAB parecido no nosso histórico:</p>
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
                        variant={escolhida === `h:${s.corId}` ? "default" : "outline"}
                        onClick={() => setEscolhida(`h:${s.corId}`)}
                      >
                        {escolhida === `h:${s.corId}` ? "Selecionada" : "Usar esta fórmula"}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {escolhida && (
              <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => setEscolhida(null)}>
                Começar do zero
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Salvaguarda: se a sugestão escolhida não tiver composição resolvida (não deveria acontecer,
          mas silenciosamente virar um form em branco parece um bug sem explicação) — avisa em vez de
          deixar a pessoa achar que a sugestão quebrou sem motivo. */}
      {escolhida && composicaoEscolhida.length === 0 && (
        <div className="anexo-erro">A fórmula escolhida não tem composição resolvida — não deu pra preencher.</div>
      )}

      {/* key troca ao mudar a escolha: recria o formulário do zero pra composição pré-preenchida
          (Select não controlado de origem) refletir a sugestão certa, igual ao reset entre rodadas. */}
      <NovaRodadaForm
        key={escolhida ?? "vazio"}
        corId={corId}
        bases={bases}
        proximoNumero={1}
        composicaoAnterior={composicaoEscolhida}
        origemPadrao={origemPadrao}
      />
    </div>
  );
}
