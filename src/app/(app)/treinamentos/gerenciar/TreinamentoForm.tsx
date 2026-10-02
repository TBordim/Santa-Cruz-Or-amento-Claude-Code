"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { salvarTreinamento, type ArquivoBlob, type DadosTreinamento } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MODULOS_COM_TREINAMENTO } from "@/lib/treinamentos/apresentacao";
import { validarQuiz } from "@/lib/treinamentos/quiz";

export type TreinamentoInicial = {
  id: string;
  titulo: string;
  modulo: string;
  descricao: string;
  perfilIds: string[];
  notaMinima: number;
  ordem: number;
  ativo: boolean;
  versao: number;
  temLegendas: boolean;
  videoUrl: string;
  nPerguntas: number;
};

function nomeSeguro(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .toLowerCase();
}

// Lê a duração do vídeo escolhido, no próprio navegador, sem enviar nada.
function duracaoDoVideo(arquivo: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(arquivo);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      const d = Number.isFinite(v.duration) ? Math.round(v.duration) : null;
      URL.revokeObjectURL(url);
      resolve(d);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    v.src = url;
  });
}

async function enviarParaBlob(arquivo: File, pasta: "videos" | "legendas", tipo: string, aoProgredir: (pct: number) => void): Promise<ArquivoBlob> {
  const r = await upload(`treinamentos/${pasta}/${nomeSeguro(arquivo.name)}`, arquivo, {
    access: "public",
    handleUploadUrl: "/api/treinamentos/upload",
    contentType: tipo,
    multipart: arquivo.size > 20 * 1024 * 1024,
    onUploadProgress: ({ percentage }) => aoProgredir(Math.round(percentage)),
  });
  return { url: r.url, pathname: r.pathname };
}

export function TreinamentoForm({ perfis, inicial }: { perfis: { id: string; nome: string }[]; inicial?: TreinamentoInicial }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState(inicial?.titulo ?? "");
  const [modulo, setModulo] = useState(inicial?.modulo ?? "");
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [perfilIds, setPerfilIds] = useState<string[]>(inicial?.perfilIds ?? []);
  const [notaMinima, setNotaMinima] = useState(String(inicial?.notaMinima ?? 75));
  const [ordem, setOrdem] = useState(String(inicial?.ordem ?? 0));
  const [ativo, setAtivo] = useState(inicial?.ativo ?? true);
  const [video, setVideo] = useState<File | null>(null);
  const [legendas, setLegendas] = useState<File | null>(null);
  const [removerLegendas, setRemoverLegendas] = useState(false);
  const [quizTexto, setQuizTexto] = useState("");
  const [quizInfo, setQuizInfo] = useState<{ ok: boolean; texto: string } | null>(null);
  const [etapa, setEtapa] = useState<string | undefined>();
  const [erro, setErro] = useState<string | undefined>();
  const [aviso, setAviso] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function lerQuiz(texto: string) {
    setQuizTexto(texto);
    if (!texto.trim()) return setQuizInfo(null);
    try {
      const r = validarQuiz(JSON.parse(texto));
      if (!r.ok) return setQuizInfo({ ok: false, texto: r.erro });
      setQuizInfo({ ok: true, texto: `Quiz lido: ${r.quiz.perguntas.length} perguntas.` });
      if (!inicial) {
        if (r.titulo && !titulo) setTitulo(r.titulo.replace(/^Quiz d[oa]s?\s+/i, "Treinamento: "));
        if (r.modulo && !modulo && MODULOS_COM_TREINAMENTO.some((m) => m.key === r.modulo)) setModulo(r.modulo);
      }
    } catch {
      setQuizInfo({ ok: false, texto: "Isso não é um JSON válido." });
    }
  }

  function alternarPerfil(id: string) {
    setPerfilIds((atual) => (atual.includes(id) ? atual.filter((p) => p !== id) : [...atual, id]));
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(undefined);
    setAviso(undefined);
    startTransition(async () => {
      try {
        let videoBlob: ArquivoBlob | undefined;
        let legendasBlob: ArquivoBlob | undefined;
        let duracaoSeg: number | null = null;
        if (video) {
          duracaoSeg = await duracaoDoVideo(video);
          setEtapa("Enviando o vídeo… 0%");
          videoBlob = await enviarParaBlob(video, "videos", video.type || "video/mp4", (p) => setEtapa(`Enviando o vídeo… ${p}%`));
        }
        if (legendas) {
          setEtapa("Enviando as legendas…");
          legendasBlob = await enviarParaBlob(legendas, "legendas", "text/vtt", () => {});
        }
        setEtapa("Salvando…");
        const dados: DadosTreinamento = {
          id: inicial?.id,
          titulo,
          modulo,
          descricao,
          perfilIds,
          notaMinima: Number(notaMinima),
          ordem: Number(ordem),
          ativo,
          duracaoSeg,
          video: videoBlob,
          legendas: legendasBlob,
          removerLegendas: removerLegendas && !legendas,
          quizTexto: quizTexto.trim() || undefined,
        };
        const r = await salvarTreinamento(dados);
        if ("erro" in r) {
          setErro(r.erro);
        } else if (inicial) {
          setAviso(r.aviso ?? "Salvo.");
          setVideo(null);
          setLegendas(null);
          setQuizTexto("");
          setQuizInfo(null);
          router.refresh();
        } else {
          router.push("/treinamentos/gerenciar");
        }
      } catch (e2) {
        setErro(e2 instanceof Error ? e2.message : "Não foi possível salvar. Tente de novo.");
      } finally {
        setEtapa(undefined);
      }
    });
  }

  return (
    <form onSubmit={enviar} className="flex max-w-3xl flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="titulo">Título</Label>
          <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Laboratório: formulação e registro de cor" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="modulo">Módulo</Label>
          <Select value={modulo} onValueChange={setModulo}>
            <SelectTrigger id="modulo" className="w-full">
              <SelectValue placeholder="Escolha…" />
            </SelectTrigger>
            <SelectContent>
              {MODULOS_COM_TREINAMENTO.map((m) => (
                <SelectItem key={m.key} value={m.key}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nota">Nota mínima (%)</Label>
            <Input id="nota" inputMode="numeric" value={notaMinima} onChange={(e) => setNotaMinima(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ordem">Ordem</Label>
            <Input id="ordem" inputMode="numeric" value={ordem} onChange={(e) => setOrdem(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="descricao">Descrição (opcional)</Label>
          <Textarea id="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
        </div>
      </div>

      <fieldset className="rounded-xl border border-border p-4">
        <legend className="px-1 text-sm font-semibold">Quem vê e faz este treinamento</legend>
        <p className="mb-2 text-xs text-muted-foreground">Só os perfis marcados enxergam o vídeo. Quem não tem o perfil não acessa.</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {perfis.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={perfilIds.includes(p.id)} onChange={() => alternarPerfil(p.id)} className="h-4 w-4 accent-[var(--primary)]" />
              {p.nome}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="video">{inicial ? "Trocar o vídeo (opcional)" : "Vídeo (MP4)"}</Label>
        <input id="video" type="file" accept="video/mp4,video/webm" onChange={(e) => setVideo(e.target.files?.[0] ?? null)} className="text-sm" />
        {inicial && (
          <a href={inicial.videoUrl} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground underline">
            Ver o vídeo atual
          </a>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="legendas">Legendas (.vtt, opcional)</Label>
        <input id="legendas" type="file" accept=".vtt,text/vtt" onChange={(e) => setLegendas(e.target.files?.[0] ?? null)} className="text-sm" />
        {inicial?.temLegendas && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={removerLegendas} onChange={(e) => setRemoverLegendas(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
            Remover as legendas atuais
          </label>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="quiz">{inicial ? `Trocar o quiz (hoje: ${inicial.nPerguntas} perguntas)` : "Quiz (quiz.json do módulo)"}</Label>
        <input
          id="quiz"
          type="file"
          accept=".json,application/json"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            lerQuiz(f ? await f.text() : "");
          }}
          className="text-sm"
        />
        <Textarea
          value={quizTexto}
          onChange={(e) => lerQuiz(e.target.value)}
          rows={4}
          placeholder="…ou cole aqui o conteúdo do quiz.json"
          className="font-mono text-xs"
          aria-label="Conteúdo do quiz"
        />
        {quizInfo && <p className={`text-xs ${quizInfo.ok ? "text-good" : "text-destructive"}`}>{quizInfo.texto}</p>}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
        Ativo (aparece para os perfis marcados)
      </label>

      {inicial && (video || quizTexto.trim()) && (
        <div className="rounded-lg bg-warn-soft p-3 text-sm text-warn">
          Trocar o vídeo ou o quiz sobe a versão (hoje v{inicial.versao}): quem já foi aprovado vai precisar refazer.
        </div>
      )}
      {erro && <div className="anexo-erro">{erro}</div>}
      {aviso && <div className="rounded-lg bg-good-soft p-3 text-sm text-good">{aviso}</div>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? (etapa ?? "Salvando…") : inicial ? "Salvar alterações" : "Cadastrar treinamento"}
        </Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={() => router.push("/treinamentos/gerenciar")}>
          Voltar
        </Button>
      </div>
    </form>
  );
}
