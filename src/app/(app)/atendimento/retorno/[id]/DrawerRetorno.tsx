import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { podeEditar } from "@/lib/permissions";
import { etapaInfo } from "@/lib/orcamentos/constantes";
import { modelosDoDoc } from "@/lib/orcamentos/modelos";
import { formatarCodigoInterno } from "@/lib/orcamentos/codigo-interno";
import { DrawerSheet } from "@/app/(app)/painel/[id]/DrawerSheet";
import { EtapasAnteriores } from "@/app/(app)/painel/[id]/EtapasAnteriores";
import { FormFinalizado } from "@/app/(app)/painel/[id]/FormFinalizado";

// Gaveta do Retorno do Cliente aberta no módulo Atendimento ao Cliente (pedido do Thiago em
// 08/10/2026): a mesma gaveta da etapa 6 do Painel, com o mesmo formulário de desfecho, mas que
// fecha de volta pro Atendimento. O desfecho positivo abre o Aceite, como no Painel.
export async function DrawerRetorno({ id }: { id: string }) {
  const raw = await prisma.orcamento.findUnique({ where: { id }, include: { anexos: true } });
  if (!raw) notFound();
  const doc = { ...raw, precoAnterior: raw.precoAnterior ? Number(raw.precoAnterior) : null };
  const et = etapaInfo(doc.etapa ?? "");
  const modelos = modelosDoDoc(doc);
  const aguardando = doc.etapa === "FINALIZADO" && doc.desfecho === "AGUARDANDO";
  const pode = await podeEditar("FINALIZADO");

  const titulo = (
    <>
      <div className="mb-1 flex items-center gap-1.5">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: et?.color ?? "var(--muted-foreground)" }} />
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wide" style={{ color: et?.color }}>
          {et?.label ?? doc.etapa}
        </span>
      </div>
      {doc.numeroSequencial && <span className="mr-1.5 font-mono text-muted-foreground">SO {doc.numeroSequencial} —</span>}
      {doc.cliente}
    </>
  );
  const descricao =
    modelos.length > 1 ? (
      <>
        {modelos.length} modelos na mesma faca: {modelos.map((m) => m.descricao).filter(Boolean).join(" / ")}
      </>
    ) : (
      <>
        {doc.produtoDescricao}
        {doc.codInterno ? ` · SC:${formatarCodigoInterno(doc.codInterno)}` : ""}
      </>
    );

  return (
    <DrawerSheet titulo={titulo} descricao={descricao} voltarPara="/atendimento">
      <EtapasAnteriores doc={doc} />
      {!aguardando ? (
        <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          O retorno do cliente deste orçamento já foi registrado.
        </div>
      ) : pode ? (
        <FormFinalizado doc={doc} voltarPara="/atendimento" />
      ) : (
        <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          Sem permissão para registrar o retorno do cliente (área Retorno do Cliente).
        </div>
      )}
    </DrawerSheet>
  );
}
