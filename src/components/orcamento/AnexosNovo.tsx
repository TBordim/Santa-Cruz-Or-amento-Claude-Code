"use client";

import { useRef, useState } from "react";
import { FileText, Image as ImageIcon, Paperclip, X } from "lucide-react";
import { prepararAnexo } from "@/lib/anexos/compressao";
import { MAX_ARQUIVOS_NOVO, MAX_TOTAL_BYTES_NOVO, tipoAnexoAceito } from "@/lib/anexos/limites";
import { Button } from "@/components/ui/button";

function fmtKB(bytes: number) {
  return (bytes / 1024).toFixed(0) + " KB";
}

// Anexos do Novo Orçamento: o orçamento ainda não existe, então os arquivos vão no próprio envio
// do formulário e o servidor os grava depois de criar o orçamento. Imagens são comprimidas aqui
// no navegador (mesmo pipeline dos anexos da gaveta). A lista preparada é copiada pra um input
// escondido de nome "anexos" — é ele que o FormData do formulário leva.
export function AnexosNovo() {
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [erro, setErro] = useState<string | undefined>();
  const [preparando, setPreparando] = useState(false);
  const envioRef = useRef<HTMLInputElement>(null);

  function atualizar(lista: File[]) {
    setArquivos(lista);
    const dt = new DataTransfer();
    lista.forEach((f) => dt.items.add(f));
    if (envioRef.current) envioRef.current.files = dt.files;
  }

  async function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const escolhidos = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!escolhidos.length) return;

    setErro(undefined);
    setPreparando(true);
    const nova = [...arquivos];
    let total = nova.reduce((s, f) => s + f.size, 0);
    try {
      for (const original of escolhidos) {
        if (nova.length >= MAX_ARQUIVOS_NOVO) throw new Error(`No máximo ${MAX_ARQUIVOS_NOVO} arquivos por orçamento.`);
        if (!tipoAnexoAceito(original.type)) throw new Error(`"${original.name}": só imagens ou PDF.`);
        const pronto = await prepararAnexo(original);
        if (total + pronto.size > MAX_TOTAL_BYTES_NOVO) {
          throw new Error(
            `Os arquivos passam de ${(MAX_TOTAL_BYTES_NOVO / 1_000_000).toFixed(1).replace(".", ",")} MB no total. Reduza o PDF ou anexe só o essencial — o resto pode ser enviado depois, direto à Santa Cruz.`,
          );
        }
        nova.push(pronto);
        total += pronto.size;
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao preparar o arquivo.");
    } finally {
      // Mantém o que já deu certo mesmo se um dos arquivos falhou.
      atualizar(nova);
      setPreparando(false);
    }
  }

  const total = arquivos.reduce((s, f) => s + f.size, 0);

  return (
    <div className="flex flex-col gap-2">
      <input ref={envioRef} type="file" name="anexos" multiple className="hidden" tabIndex={-1} aria-hidden />

      {arquivos.length > 0 && (
        <div className="flex flex-col gap-2">
          {arquivos.map((a, i) => (
            <div key={`${a.name}-${i}`} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-2.5">
              {a.type === "application/pdf" ? (
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{a.name}</span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">{fmtKB(a.size)}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remover ${a.name}`}
                onClick={() => atualizar(arquivos.filter((_, j) => j !== i))}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <span className="text-xs text-muted-foreground">
            {arquivos.length} de {MAX_ARQUIVOS_NOVO} arquivos · {fmtKB(total)} de {fmtKB(MAX_TOTAL_BYTES_NOVO)}
          </span>
        </div>
      )}

      <div>
        <Button asChild variant="secondary" size="sm" className="gap-1.5">
          <label className="cursor-pointer">
            <Paperclip className="h-3.5 w-3.5" />
            {preparando ? "Preparando…" : "Anexar arquivo"}
            <input
              type="file"
              multiple
              accept="image/*,application/pdf"
              className="hidden"
              onChange={aoEscolher}
              disabled={preparando || arquivos.length >= MAX_ARQUIVOS_NOVO}
            />
          </label>
        </Button>
      </div>
      {erro && <div className="anexo-erro">{erro}</div>}
    </div>
  );
}
