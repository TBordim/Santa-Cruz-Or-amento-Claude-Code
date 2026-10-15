"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CheckCircle2, Lock, PartyPopper, RotateCcw, XCircle } from "lucide-react";
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

const CORES_CONFETE = ["#F47216", "#FFA646", "#3D6B49", "#26405C", "#7A3B69", "#946522", "#2F6B5E"];

function reduzMovimento(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Confete que cai pela tela por alguns segundos e some sozinho. Só CSS (sem biblioteca) e desligado para quem pediu
// menos movimento no sistema.
function Confete({ quantidade }: { quantidade: number }) {
  const [pecas] = useState(() =>
    Array.from({ length: quantidade }, (_, i) => ({
      id: i,
      esquerda: Math.random() * 100,
      atraso: Math.random() * 1.2,
      duracao: 2.6 + Math.random() * 2,
      tamanho: 6 + Math.random() * 7,
      giro: 360 + Math.random() * 720,
      deriva: (Math.random() - 0.5) * 160,
      cor: CORES_CONFETE[i % CORES_CONFETE.length],
      redondo: i % 3 === 0,
    })),
  );
  const [visivel, setVisivel] = useState(true);
  useEffect(() => {
    const fim = setTimeout(() => setVisivel(false), 5200);
    return () => clearTimeout(fim);
  }, []);
  if (!visivel) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <style>{`@keyframes trein-confete{0%{transform:translate3d(0,-12vh,0) rotate(0);opacity:1}85%{opacity:1}100%{transform:translate3d(var(--deriva),108vh,0) rotate(var(--giro));opacity:0}}`}</style>
      {pecas.map((c) => (
        <span
          key={c.id}
          className="absolute top-0 block"
          style={
            {
              left: `${c.esquerda}%`,
              width: c.tamanho,
              height: c.redondo ? c.tamanho : c.tamanho * 0.45,
              borderRadius: c.redondo ? "50%" : 2,
              background: c.cor,
              "--deriva": `${c.deriva}px`,
              "--giro": `${c.giro}deg`,
              animation: `trein-confete ${c.duracao}s ${c.atraso}s cubic-bezier(.25,.6,.4,1) forwards`,
              opacity: 0,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

// A nota "sobe" de 0 até o valor final, em cerca de um segundo.
function NotaAnimada({ alvo }: { alvo: number }) {
  const [valor, setValor] = useState(() => (reduzMovimento() ? alvo : 0));
  useEffect(() => {
    if (reduzMovimento()) return;
    const duracao = 1100;
    const inicio = performance.now();
    let quadro = 0;
    const passo = (agora: number) => {
      const p = Math.min(1, (agora - inicio) / duracao);
      setValor(Math.round(alvo * (1 - Math.pow(1 - p, 3))));
      if (p < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [alvo]);
  return <>{valor}</>;
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
  const topoRef = useRef<HTMLDivElement>(null);

  // Ao enviar, a tela estava parada no fim do quiz: leva a pessoa para o início do resultado.
  useEffect(() => {
    topoRef.current?.scrollIntoView({ behavior: reduzMovimento() ? "auto" : "smooth", block: "start" });
  }, []);

  return (
    <div ref={topoRef} className="flex scroll-mt-4 flex-col gap-4">
      {aprovado && !reduzMovimento() && <Confete quantidade={nota === 100 ? 140 : 80} />}
      <h3 className="font-serif text-xl font-semibold tracking-tight">Resultado</h3>
      <div
        className={`animate-in fade-in zoom-in-95 flex items-center gap-4 rounded-xl p-5 duration-500 ${aprovado ? "bg-good-soft text-good" : "bg-warn-soft text-warn"}`}
        role="status"
      >
        <div className="min-w-0 flex-1">
        {aprovado && (
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
            <PartyPopper className="h-5 w-5" /> {nota === 100 ? "Gabaritou!" : "Parabéns!"}
          </div>
        )}
        <div className="font-serif text-3xl font-semibold">
          <NotaAnimada alvo={nota} />% <span className="text-lg font-normal">· {acertos} de {total} · {aprovado ? "Aprovado" : "Abaixo da nota mínima"}</span>
        </div>
        <p className="mt-2 text-sm">
          {aprovado
            ? "Treinamento concluído. Sua nota ficou registrada."
            : `Você precisa de ${notaMinima}% para passar. Reveja o vídeo e tente de novo, quantas vezes precisar.`}
        </p>
        </div>
        {aprovado && (
          <>
            <style>{`@keyframes trein-santinho{0%{transform:translateY(60px) scale(.4) rotate(-12deg);opacity:0}45%{transform:translateY(-14px) scale(1.12) rotate(5deg);opacity:1}62%{transform:translateY(0) scale(.97) rotate(-3deg)}78%{transform:translateY(-8px) rotate(4deg)}100%{transform:translateY(0) rotate(0)}}@keyframes trein-balanca{0%,100%{transform:rotate(0)}25%{transform:rotate(-6deg) translateY(-6px)}75%{transform:rotate(6deg) translateY(-6px)}}`}</style>
            {/* eslint-disable-next-line @next/next/no-img-element -- arte do mascote, fixa e pequena */}
            <img
              src="/santinho.svg"
              alt="Santinho comemorando"
              width={120}
              height={120}
              className="h-24 w-24 shrink-0 select-none sm:h-[120px] sm:w-[120px]"
              style={reduzMovimento() ? undefined : { animation: "trein-santinho 1.1s cubic-bezier(.3,1.3,.5,1) both, trein-balanca 1.4s ease-in-out 1.2s 3" }}
            />
          </>
        )}
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
