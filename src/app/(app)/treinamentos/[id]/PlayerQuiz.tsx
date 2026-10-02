"use client";

import { useRef, useState, useTransition } from "react";
import { CheckCircle2, Lock, RotateCcw, XCircle } from "lucide-react";
import { enviarRespostas, type ResultadoEnvio } from "./actions";
import { Button } from "@/components/ui/button";
import type { PerguntaPublica } from "@/lib/treinamentos/quiz";

type Props = {
  treinamentoId: string;
  videoUrl: string;
  temLegendas: boolean;
  perguntas: PerguntaPublica[];
  notaMinima: number;
  // Já aprovada nesta versão: pode rever o vídeo, mas o quiz não abre de novo.
  jaAprovado: boolean;
};

// Vídeo + quiz. O quiz só abre quando o vídeo termina (evento `ended` do <video>): é o que dá para saber de
// verdade sobre "assistiu" — nada prova que a pessoa prestou atenção, por isso o que vale é a nota. A correção
// acontece no servidor (ver actions.ts); aqui só se mandam as alternativas escolhidas.
export function PlayerQuiz({ treinamentoId, videoUrl, temLegendas, perguntas, notaMinima, jaAprovado }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [terminou, setTerminou] = useState(false);
  const [respostas, setRespostas] = useState<Record<string, number>>({});
  const [resultado, setResultado] = useState<Extract<ResultadoEnvio, { ok: true }> | null>(null);
  const [erro, setErro] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  const respondidas = perguntas.filter((p) => respostas[p.id] !== undefined).length;
  const completo = respondidas === perguntas.length;

  function enviar() {
    setErro(undefined);
    startTransition(async () => {
      const r = await enviarRespostas(treinamentoId, respostas);
      if ("erro" in r) setErro(r.erro);
      else setResultado(r);
    });
  }

  // Nova tentativa: o vídeo precisa terminar de novo (volta ao começo) antes de o quiz reabrir.
  function refazer() {
    setResultado(null);
    setRespostas({});
    setErro(undefined);
    setTerminou(false);
    const v = videoRef.current;
    if (v) {
      v.currentTime = 0;
      v.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <video
        ref={videoRef}
        controls
        playsInline
        preload="metadata"
        onEnded={() => setTerminou(true)}
        className="aspect-video w-full rounded-xl border border-border bg-black"
      >
        <source src={videoUrl} type="video/mp4" />
        {temLegendas && (
          <track kind="subtitles" src={`/treinamentos/${treinamentoId}/legendas`} srcLang="pt-BR" label="Português" default />
        )}
        Seu navegador não consegue tocar este vídeo.
      </video>

      {jaAprovado && !resultado ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-good" />
          Você já foi aprovado neste treinamento. Pode rever o vídeo quando quiser.
        </div>
      ) : resultado ? (
        <Resultado resultado={resultado} perguntas={perguntas} onRefazer={refazer} />
      ) : !terminou ? (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          <Lock className="h-4 w-4 shrink-0" />
          Assista ao vídeo até o fim para liberar o quiz. Para passar, você precisa de {notaMinima}% de acertos, e pode tentar de novo quantas
          vezes precisar.
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <h3 className="font-serif text-xl font-semibold tracking-tight">Quiz</h3>
          {perguntas.map((p, i) => (
            <fieldset key={p.id} className="rounded-xl border border-border bg-card p-4">
              <legend className="px-1 text-sm font-semibold text-foreground">
                {i + 1}. {p.pergunta}
              </legend>
              <div className="mt-2 flex flex-col gap-2">
                {p.alternativas.map((alt, k) => {
                  const marcada = respostas[p.id] === k;
                  return (
                    <label
                      key={k}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 text-sm transition-colors ${
                        marcada ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                      }`}
                    >
                      <input
                        type="radio"
                        name={p.id}
                        checked={marcada}
                        onChange={() => setRespostas((r) => ({ ...r, [p.id]: k }))}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary)]"
                      />
                      <span>{alt}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
          {erro && <div className="anexo-erro">{erro}</div>}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={enviar} disabled={!completo || pending}>
              {pending ? "Enviando…" : "Enviar respostas"}
            </Button>
            <span className="font-mono text-xs text-muted-foreground">
              {respondidas} de {perguntas.length} respondidas
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function Resultado({
  resultado,
  perguntas,
  onRefazer,
}: {
  resultado: Extract<ResultadoEnvio, { ok: true }>;
  perguntas: PerguntaPublica[];
  onRefazer: () => void;
}) {
  const { acertos, total, nota, aprovado, notaMinima, itens } = resultado;
  return (
    <div className="flex flex-col gap-4">
      <div className={`rounded-xl p-4 ${aprovado ? "bg-good-soft text-good" : "bg-warn-soft text-warn"}`}>
        <div className="font-serif text-xl font-semibold">
          {acertos} de {total} · {nota}% · {aprovado ? "Aprovado" : "Abaixo da nota mínima"}
        </div>
        <p className="mt-1 text-sm">
          {aprovado
            ? "Treinamento concluído. Sua nota ficou registrada."
            : `Você precisa de ${notaMinima}% para passar. Reveja o vídeo e tente de novo, quantas vezes precisar.`}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {itens.map((item, i) => {
          const p = perguntas.find((q) => q.id === item.perguntaId);
          if (!p) return null;
          return (
            <div key={item.perguntaId} className="rounded-xl border border-border bg-card p-4 text-sm">
              <div className="flex items-start gap-2 font-semibold text-foreground">
                {item.acertou ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-good" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
                <span>
                  {i + 1}. {p.pergunta}
                </span>
              </div>
              {!item.acertou && (
                <p className="mt-2 text-muted-foreground">
                  Você marcou: <span className="text-foreground">{p.alternativas[item.escolhida]}</span>
                </p>
              )}
              <p className="mt-1 text-muted-foreground">
                Resposta certa: <span className="text-foreground">{p.alternativas[item.correta]}</span>
              </p>
              <p className="mt-1 text-muted-foreground">{item.explicacao}</p>
            </div>
          );
        })}
      </div>

      {!aprovado && (
        <div>
          <Button type="button" variant="outline" className="gap-2" onClick={onRefazer}>
            <RotateCcw className="h-3.5 w-3.5" /> Rever o vídeo e refazer
          </Button>
        </div>
      )}
    </div>
  );
}
