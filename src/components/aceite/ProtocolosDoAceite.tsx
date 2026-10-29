import { ExternalLink } from "lucide-react";
import { prisma } from "@/lib/db";
import { FormSection } from "@/components/form-section";
import { modelosDoDoc } from "@/lib/orcamentos/modelos";
import { fmtDataProtocolo } from "@/lib/protocolos/comum";

function Abrir({ href, texto }: { href: string; texto: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm underline underline-offset-2">
      <ExternalLink className="h-3 w-3" /> {texto}
    </a>
  );
}

// Protocolos da arte deste pedido, para todos os setores do Aceite (a Engenharia precisa saber qual protocolo vale e abrir
// o arquivo protocolado). Mostra cada arte recebida: protocolada (número, data, arquivo e cópia carimbada), já existente
// (descartada, aponta o protocolo em uso) ou aguardando Vendas. Pedido do Thiago em 28/10/2026.
export async function ProtocolosDoAceite({ orcamentoId }: { orcamentoId: string }) {
  const [orc, artes] = await Promise.all([
    prisma.orcamento.findUnique({ where: { id: orcamentoId } }),
    prisma.arteEnviada.findMany({
      where: { orcamentoId },
      orderBy: { enviadoEm: "asc" },
      include: {
        revisao: { include: { protocolo: true } },
        protocoloExistente: { include: { revisoes: { orderBy: { revisao: "desc" }, take: 1 } } },
      },
    }),
  ]);
  if (!artes.length) return null;
  const modelos = orc ? modelosDoDoc(orc) : [];
  return (
    <FormSection title="Protocolos da arte">
      <div className="flex flex-col gap-2">
        {artes.map((a) => {
          const modelo = modelos.find((m) => m.id === a.modeloId) ?? (modelos.length === 1 ? modelos[0] : null);
          const rev = a.estado === "PROTOCOLADA" ? a.revisao : a.estado === "DESCARTADA" ? (a.protocoloExistente?.revisoes[0] ?? null) : null;
          const protocolo = a.estado === "PROTOCOLADA" ? a.revisao?.protocolo : a.protocoloExistente;
          return (
            <div key={a.id} className="flex flex-col gap-1 rounded-lg border border-border bg-muted/20 p-3">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm">
                {protocolo ? (
                  <span className="font-mono font-semibold text-foreground">
                    Protocolo {protocolo.numero}
                    {rev ? ` · ${fmtDataProtocolo(rev.dataProtocolo)}` : ""}
                  </span>
                ) : (
                  <span className="font-semibold text-warn">Aguardando protocolo de Vendas</span>
                )}
                {modelo?.descricao && <span className="text-xs text-muted-foreground">{modelo.descricao}</span>}
                <span className="text-xs text-muted-foreground">arte recebida: {a.rotulo}</span>
              </div>
              {a.estado === "DESCARTADA" && <p className="text-xs text-muted-foreground">Esta arte é a mesma já protocolada; vale o protocolo acima.</p>}
              {rev && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  {rev.arquivoUrl && <Abrir href={rev.arquivoUrl} texto={rev.arquivoNome ?? "Arquivo protocolado"} />}
                  {rev.link && <Abrir href={rev.link} texto="Link da arte" />}
                  {rev.copiaUrl && <Abrir href={rev.copiaUrl} texto={`Cópia carimbada${rev.copiaNome ? ` (${rev.copiaNome})` : ""}`} />}
                  {!rev.arquivoUrl && !rev.link && !rev.copiaUrl && <span className="text-xs text-muted-foreground">Sem arquivo registrado.</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </FormSection>
  );
}
