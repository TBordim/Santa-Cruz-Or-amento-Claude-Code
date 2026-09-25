"use client";

import { useRef, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { FileText, Image as ImageIcon, Paperclip, Trash2 } from "lucide-react";
import { prepararAnexo } from "@/lib/anexos/compressao";
import { adicionarAnexo, excluirAnexo } from "./actions";
import { FormSection } from "@/components/form-section";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type AnexoItem = { id: string; nome: string; url: string; mime: string; tamanho: number };

const TIPO_INFO = {
  ARTE: { label: "Arte do cliente", hint: "Arquivo de arte recebido do cliente em formato eletrônico." },
  ENGENHARIA: { label: "Anexos da Engenharia", hint: "Original, arte digital, Especificação GSC Montagem ou outro documento técnico." },
} as const;

function fmtKB(bytes: number) {
  return (bytes / 1024).toFixed(0) + " KB";
}

export function AnexoUpload({
  orcamentoId,
  tipo,
  anexos,
  somenteLeitura,
  compacto,
}: {
  orcamentoId: string;
  tipo: "ARTE" | "ENGENHARIA";
  anexos: AnexoItem[];
  somenteLeitura?: boolean;
  compacto?: boolean;
}) {
  const pathname = usePathname();
  const [erro, setErro] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const [aberto, setAberto] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const info = TIPO_INFO[tipo];

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErro(undefined);
    startTransition(async () => {
      try {
        const preparado = await prepararAnexo(file);
        const fd = new FormData();
        fd.set("orcamentoId", orcamentoId);
        fd.set("tipo", tipo);
        fd.set("caminho", pathname);
        fd.set("arquivo", preparado);
        await adicionarAnexo(fd);
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Falha ao anexar o arquivo.");
      }
    });
    if (inputRef.current) inputRef.current.value = "";
  }

  function onExcluir(id: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("caminho", pathname);
      await excluirAnexo(fd);
    });
  }

  return (
    <FormSection title={info.label}>
      {!compacto && <p className="-mt-2 text-xs text-muted-foreground">{info.hint}</p>}

      {anexos.length === 0 ? (
        <div className="text-sm text-muted-foreground">Nenhum arquivo anexado ainda.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {anexos.map((a) => (
            <div key={a.id} className="rounded-lg border border-border bg-muted/30 p-2.5">
              <div className="flex flex-wrap items-center gap-2">
                {a.mime === "application/pdf" ? (
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="min-w-[8rem] flex-1 truncate text-sm text-foreground">{a.nome}</span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">{fmtKB(a.tamanho)}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => setAberto(aberto === a.id ? null : a.id)}>
                  {aberto === a.id ? "Fechar" : "Ver"}
                </Button>
                {!somenteLeitura && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" disabled={pending}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir o anexo &quot;{a.nome}&quot;?</AlertDialogTitle>
                        <AlertDialogDescription>Essa ação é definitiva e não pode ser desfeita — o arquivo é removido do armazenamento.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" disabled={pending} onClick={() => onExcluir(a.id)}>
                          {pending ? "Excluindo…" : "Sim, excluir"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              {aberto === a.id &&
                (a.mime === "application/pdf" ? (
                  <>
                    <iframe src={a.url} className="mt-2.5 h-[60dvh] w-full md:h-[420px] rounded-md border border-border" />
                    <div className="mt-1.5">
                      <Button asChild variant="outline" size="sm">
                        <a href={a.url} target="_blank" rel="noreferrer">Abrir em nova aba</a>
                      </Button>
                    </div>
                  </>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- URL do Blob, não é asset local otimizável
                  <img src={a.url} alt={a.nome} className="mt-2.5 max-w-full rounded-md border border-border" />
                ))}
            </div>
          ))}
        </div>
      )}

      {!somenteLeitura && (
        <div>
          {/* variant="secondary" (não "outline"): o "outline" usa o mesmo fundo da página por
              trás do botão, então sozinho (sem um botão colorido do lado pra dar contraste,
              como acontece nos outros "outline" da gaveta) ele ficava quase sem área visível de
              clique — só a borda fina e o texto. Pedido do Thiago em 23/09/2026. */}
          <Button asChild variant="secondary" size="sm" className="gap-1.5">
            <label className="cursor-pointer">
              <Paperclip className="h-3.5 w-3.5" />
              {pending ? "Enviando…" : "Anexar arquivo"}
              <input
                ref={inputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={onFileChange}
                disabled={pending}
              />
            </label>
          </Button>
        </div>
      )}
      {erro && <div className="anexo-erro">{erro}</div>}
    </FormSection>
  );
}
