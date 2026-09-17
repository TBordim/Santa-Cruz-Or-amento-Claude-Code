"use client";

import { useRef, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { prepararAnexo } from "@/lib/anexos/compressao";
import { adicionarAnexo, excluirAnexo } from "./actions";

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
}: {
  orcamentoId: string;
  tipo: "ARTE" | "ENGENHARIA";
  anexos: AnexoItem[];
  somenteLeitura?: boolean;
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
    <div className="form-section">
      <h4>{info.label}</h4>
      <div className="hint" style={{ marginBottom: 10 }}>{info.hint}</div>

      {anexos.length === 0 ? (
        <div className="anexo-vazio">Nenhum arquivo anexado ainda.</div>
      ) : (
        <div className="anexos-bloco">
          {anexos.map((a) => (
            <div key={a.id} className="anexo-item">
              <div className="anexo-linha">
                <span>{a.mime === "application/pdf" ? "📄" : "🖼"}</span>
                <span className="anexo-nome">{a.nome}</span>
                <span className="anexo-meta">{fmtKB(a.tamanho)}</span>
                <button type="button" className="btn ghost" onClick={() => setAberto(aberto === a.id ? null : a.id)}>
                  {aberto === a.id ? "Fechar" : "Ver"}
                </button>
                {!somenteLeitura && (
                  <button type="button" className="btn ghost" onClick={() => onExcluir(a.id)} disabled={pending}>
                    Excluir
                  </button>
                )}
              </div>
              {aberto === a.id &&
                (a.mime === "application/pdf" ? (
                  <>
                    <iframe src={a.url} className="anexo-preview" style={{ height: 420, border: "1px solid var(--line)" }} />
                    <div style={{ marginTop: 6 }}>
                      <a href={a.url} target="_blank" rel="noreferrer" className="btn ghost">Abrir em nova aba</a>
                    </div>
                  </>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- URL do Blob, não é asset local otimizável
                  <img src={a.url} alt={a.nome} className="anexo-preview" />
                ))}
            </div>
          ))}
        </div>
      )}

      {!somenteLeitura && (
        <div className="anexo-envio">
          <label className="btn secondary anexo-botao">
            {pending ? "Enviando…" : "Anexar arquivo"}
            <input
              ref={inputRef}
              type="file"
              accept="image/*,application/pdf"
              className="anexo-input"
              onChange={onFileChange}
              disabled={pending}
            />
          </label>
        </div>
      )}
      {erro && <div className="anexo-erro">{erro}</div>}
    </div>
  );
}
