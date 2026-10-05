"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Paperclip, X } from "lucide-react";
import { prepararAnexo } from "@/lib/anexos/compressao";
import { MAX_ARQUIVOS_NOVO, MAX_TOTAL_BYTES_NOVO, tipoAnexoAceito } from "@/lib/anexos/limites";
import { Button } from "@/components/ui/button";

function fmtKB(bytes: number) {
  return (bytes / 1024).toFixed(0) + " KB";
}

// Arquivo já preparado (imagem comprimida) + o endereço temporário que o navegador cria pra
// mostrá-lo na tela. O endereço precisa ser liberado (revokeObjectURL) quando o arquivo sai da
// lista ou a tela fecha, senão fica na memória.
type Item = { arquivo: File; url: string };

// Anexos do Novo Orçamento: o orçamento ainda não existe, então os arquivos vão no próprio envio
// do formulário e o servidor os grava depois de criar o orçamento. Imagens são comprimidas aqui
// no navegador (mesmo pipeline dos anexos da gaveta). A lista preparada é copiada pra um input
// escondido de nome "anexos" — é ele que o FormData do formulário leva. Cada arquivo mostra uma
// miniatura (imagem) e pode ser aberto em tamanho maior, pra quem anexa conferir o que escolheu.
export function AnexosNovo() {
  const [itens, setItens] = useState<Item[]>([]);
  const [erro, setErro] = useState<string | undefined>();
  const [preparando, setPreparando] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);
  const envioRef = useRef<HTMLInputElement>(null);
  // Espelho de `itens` pra liberar os endereços ao fechar a tela.
  const todosRef = useRef<Item[]>([]);

  useEffect(() => {
    return () => {
      todosRef.current.forEach((i) => URL.revokeObjectURL(i.url));
    };
  }, []);

  function atualizar(lista: Item[]) {
    todosRef.current = lista;
    setItens(lista);
    const dt = new DataTransfer();
    lista.forEach((i) => dt.items.add(i.arquivo));
    if (envioRef.current) envioRef.current.files = dt.files;
  }

  function remover(item: Item) {
    URL.revokeObjectURL(item.url);
    if (aberto === item.url) setAberto(null);
    atualizar(itens.filter((i) => i !== item));
  }

  async function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const escolhidos = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!escolhidos.length) return;

    setErro(undefined);
    setPreparando(true);
    const nova = [...itens];
    let total = nova.reduce((s, i) => s + i.arquivo.size, 0);
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
        nova.push({ arquivo: pronto, url: URL.createObjectURL(pronto) });
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

  const total = itens.reduce((s, i) => s + i.arquivo.size, 0);

  return (
    <div className="flex flex-col gap-2">
      <input ref={envioRef} type="file" name="anexos" multiple className="hidden" tabIndex={-1} aria-hidden />

      {itens.length > 0 && (
        <div className="flex flex-col gap-2">
          {itens.map((item) => {
            const { arquivo: a, url } = item;
            const pdf = a.type === "application/pdf";
            const visto = aberto === url;
            return (
              <div key={url} className="rounded-lg border border-border bg-muted/30 p-2.5">
                <div className="flex items-center gap-2.5">
                  {pdf ? (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-border bg-background">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAberto(visto ? null : url)}
                      className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border bg-background"
                      aria-label={`Ver ${a.name}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- endereço temporário do navegador (blob:), não é asset otimizável */}
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </button>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-foreground">{a.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">{fmtKB(a.size)}</div>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setAberto(visto ? null : url)}>
                    {visto ? "Fechar" : "Ver"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remover ${a.name}`}
                    onClick={() => remover(item)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {visto &&
                  (pdf ? (
                    <>
                      <iframe src={url} title={a.name} className="mt-2.5 h-[60dvh] w-full rounded-md border border-border md:h-[420px]" />
                      <div className="mt-1.5">
                        <Button asChild variant="outline" size="sm">
                          <a href={url} target="_blank" rel="noreferrer">Abrir em nova aba</a>
                        </Button>
                      </div>
                    </>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- idem acima
                    <img src={url} alt={a.name} className="mt-2.5 max-w-full rounded-md border border-border" />
                  ))}
              </div>
            );
          })}
          <span className="text-xs text-muted-foreground">
            {itens.length} de {MAX_ARQUIVOS_NOVO} arquivos · {fmtKB(total)} de {fmtKB(MAX_TOTAL_BYTES_NOVO)}
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
              disabled={preparando || itens.length >= MAX_ARQUIVOS_NOVO}
            />
          </label>
        </Button>
      </div>
      {erro && <div className="anexo-erro">{erro}</div>}
    </div>
  );
}
