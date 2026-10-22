import { fmtDateTime } from "@/lib/orcamentos/constantes";
import { origemLabel, rotuloRevisao } from "@/lib/protocolos/comum";
import { ExternalLink } from "lucide-react";

export type RevisaoVista = {
  id: string;
  revisao: number;
  mudou: string | null;
  origem: string;
  criadoPor: string;
  criadoEm: Date;
  arquivoNome: string | null;
  arquivoUrl: string | null;
  link: string | null;
  copiaNome: string | null;
  copiaUrl: string | null;
};

function Abrir({ href, texto }: { href: string; texto: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm underline underline-offset-2">
      <ExternalLink className="h-3 w-3" /> {texto}
    </a>
  );
}

// Linha do tempo das revisões de um protocolo, da mais recente pra mais antiga. Nenhuma sai da lista:
// a arte anterior é propriedade do cliente e fica guardada.
export function RevisoesProtocolo({ revisoes }: { revisoes: RevisaoVista[] }) {
  const ordenadas = [...revisoes].sort((a, b) => b.revisao - a.revisao);
  return (
    <div className="flex flex-col gap-2">
      {ordenadas.map((r, i) => (
        <div key={r.id} className="rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <span className="font-mono text-sm font-semibold text-foreground">{rotuloRevisao(r.revisao)}</span>
            {i === 0 && <span className="text-xs font-medium text-good">em uso</span>}
            <span className="text-xs text-muted-foreground">
              {origemLabel(r.origem)} · {r.criadoPor} · {fmtDateTime(r.criadoEm)}
            </span>
          </div>
          {r.mudou && <div className="mt-1 text-sm text-foreground">Mudou: {r.mudou}</div>}
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
            {r.arquivoUrl && <Abrir href={r.arquivoUrl} texto={r.arquivoNome ?? "Arquivo da arte"} />}
            {r.link && <Abrir href={r.link} texto="Link da arte" />}
            {r.copiaUrl && <Abrir href={r.copiaUrl} texto={`Cópia carimbada${r.copiaNome ? ` (${r.copiaNome})` : ""}`} />}
            {!r.arquivoUrl && !r.link && !r.copiaUrl && <span className="text-xs text-muted-foreground">Sem arquivo registrado.</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
