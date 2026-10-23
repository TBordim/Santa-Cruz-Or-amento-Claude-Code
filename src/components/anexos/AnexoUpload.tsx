"use client";

import { useRef, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { FileText, Image as ImageIcon, Maximize2, Paperclip, Trash2 } from "lucide-react";
import { ImagemAmpliavel, VisualizadorAmpliado } from "./VisualizadorAmpliado";
import { prepararAnexo } from "@/lib/anexos/compressao";
import { upload } from "@vercel/blob/client";
import { adicionarAnexo, excluirAnexo, registrarAnexoEnviado } from "./actions";
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

// Até aqui o arquivo vai dentro da requisição do servidor (limite de 4,5 MB da Vercel, com folga).
const LIMITE_PELO_SERVIDOR = 3_000_000;

type AnexoItem = { id: string; nome: string; url: string; mime: string; tamanho: number };

const EH_PDF = (m: string) => m === "application/pdf";
const EH_IMAGEM = (m: string) => m.startsWith("image/");

const TIPO_INFO = {
  ARTE: { label: "Arte do cliente", hint: "Arquivo de arte recebido do cliente em formato eletrônico." },
  ENGENHARIA: { label: "Anexos da Engenharia", hint: "Original, arte digital, Especificação GSC Montagem ou outro documento técnico." },
  ORDEM_COMPRA: {
    label: "E-mails e documentos do cliente",
    hint: "E-mail ou documento enviado pelo cliente que comprova a ordem de compra (PDF, imagem, .eml, .msg, Word ou Excel).",
  },
} as const;

// Tipos aceitos no seletor de arquivo: só a ordem de compra aceita e-mail e documentos de escritório.
const ACEITA = {
  ARTE: "image/*,application/pdf",
  ENGENHARIA: "image/*,application/pdf",
  ORDEM_COMPRA: "image/*,application/pdf,.eml,.msg,.doc,.docx,.xls,.xlsx,.csv,.txt",
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
  modeloId,
  titulo,
}: {
  orcamentoId: string;
  tipo: "ARTE" | "ENGENHARIA" | "ORDEM_COMPRA";
  anexos: AnexoItem[];
  somenteLeitura?: boolean;
  compacto?: boolean;
  // Arte de um modelo específico do orçamento (ver Orcamento.modelos). Sem ele, o anexo é do
  // orçamento inteiro.
  modeloId?: string;
  titulo?: string;
}) {
  const pathname = usePathname();
  const [erro, setErro] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const [aberto, setAberto] = useState<string | null>(null);
  const [pdfAmpliado, setPdfAmpliado] = useState<AnexoItem | null>(null);
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
        if (modeloId) fd.set("modeloId", modeloId);
        fd.set("caminho", pathname);
        if (preparado.size <= LIMITE_PELO_SERVIDOR) {
          fd.set("arquivo", preparado);
          await adicionarAnexo(fd);
        } else {
          // Arquivo grande: vai direto do navegador para o Blob (a Vercel recusa mais de 4,5 MB
          // dentro da requisição) e só o registro passa pelo servidor.
          const blob = await upload(`orcamentos/${orcamentoId}/${Date.now()}-${preparado.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`, preparado, {
            access: "public",
            handleUploadUrl: "/api/anexos/upload",
            clientPayload: JSON.stringify({ orcamentoId, tipo }),
            multipart: preparado.size > 8_000_000,
          });
          fd.set("url", blob.url);
          fd.set("pathname", blob.pathname);
          fd.set("nome", preparado.name);
          fd.set("mime", preparado.type);
          fd.set("tamanho", String(preparado.size));
          await registrarAnexoEnviado(fd);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        setErro(/unexpected response/i.test(msg) ? "Não foi possível enviar o arquivo. Tente de novo; se continuar, reduza o arquivo." : msg || "Falha ao anexar o arquivo.");
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
    <FormSection title={titulo ?? info.label}>
      {!compacto && <p className="-mt-2 text-xs text-muted-foreground">{info.hint}</p>}

      {anexos.length === 0 ? (
        <div className="text-sm text-muted-foreground">Nenhum arquivo anexado ainda.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {anexos.map((a) => (
            <div key={a.id} className="rounded-lg border border-border bg-muted/30 p-2.5">
              <div className="flex flex-wrap items-center gap-2">
                {EH_IMAGEM(a.mime) ? (
                  <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="min-w-[8rem] flex-1 truncate text-sm text-foreground">{a.nome}</span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">{fmtKB(a.tamanho)}</span>
                {EH_PDF(a.mime) || EH_IMAGEM(a.mime) ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setAberto(aberto === a.id ? null : a.id)}>
                    {aberto === a.id ? "Fechar" : "Ver"}
                  </Button>
                ) : (
                  // E-mail e documentos de escritório não abrem na página: baixa o arquivo.
                  <Button asChild variant="ghost" size="sm">
                    <a href={a.url} target="_blank" rel="noreferrer" download={a.nome}>Baixar</a>
                  </Button>
                )}
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
                (EH_PDF(a.mime) ? (
                  <>
                    <iframe src={a.url} className="mt-2.5 h-[60dvh] w-full md:h-[420px] rounded-md border border-border" />
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setPdfAmpliado(a)}>
                        <Maximize2 className="h-3.5 w-3.5" /> Ampliar
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <a href={a.url} target="_blank" rel="noreferrer">Abrir em nova aba</a>
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="mt-2.5">
                    <ImagemAmpliavel src={a.url} alt={a.nome} className="max-w-full rounded-md border border-border" />
                  </div>
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
                accept={ACEITA[tipo]}
                className="hidden"
                onChange={onFileChange}
                disabled={pending}
              />
            </label>
          </Button>
        </div>
      )}
      {erro && <div className="anexo-erro">{erro}</div>}
      {pdfAmpliado && (
        <VisualizadorAmpliado aberto aoMudar={(v) => !v && setPdfAmpliado(null)} src={pdfAmpliado.url} tipo="pdf" nome={pdfAmpliado.nome} />
      )}
    </FormSection>
  );
}
