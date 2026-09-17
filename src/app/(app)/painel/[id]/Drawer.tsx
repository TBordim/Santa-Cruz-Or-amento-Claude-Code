import { notFound } from "next/navigation";
import { CornerUpLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { etapaInfo } from "@/lib/orcamentos/constantes";
import { voltarEtapa } from "../actions";
import { Button } from "@/components/ui/button";
import { ExcluirCardButton } from "./ExcluirCardButton";
import { DrawerSheet } from "./DrawerSheet";
import { FormAberto } from "./FormAberto";
import { FormEngenharia } from "./FormEngenharia";
import { FormOrcamento } from "./FormOrcamento";
import { PainelDiretoria } from "./PainelDiretoria";
import { FormEnvioOferta } from "./FormEnvioOferta";
import { FormFinalizado } from "./FormFinalizado";

export async function Drawer({ id }: { id: string }) {
  const raw = await prisma.orcamento.findUnique({
    where: { id },
    include: { anexos: true },
  });
  if (!raw) notFound();
  const doc = { ...raw, precoAnterior: raw.precoAnterior ? Number(raw.precoAnterior) : null };

  const et = etapaInfo(doc.etapa ?? "");

  let corpo: React.ReactNode = null;
  switch (doc.etapa) {
    case "ABERTO":
      corpo = <FormAberto doc={doc} />;
      break;
    case "ENGENHARIA":
      corpo = <FormEngenharia doc={doc} />;
      break;
    case "ORCAMENTO":
      corpo = <FormOrcamento doc={doc} />;
      break;
    case "DIRETORIA":
      corpo = <PainelDiretoria doc={doc} />;
      break;
    case "ENVIO_OFERTA":
      corpo = <FormEnvioOferta doc={doc} />;
      break;
    case "FINALIZADO":
      corpo = <FormFinalizado doc={doc} />;
      break;
    default:
      corpo = <p>Etapa desconhecida.</p>;
  }

  const titulo = (
    <>
      <div className="mb-1 flex items-center gap-1.5">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: et?.color ?? "var(--muted-foreground)" }} />
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wide" style={{ color: et?.color }}>
          {et?.label ?? doc.etapa}
        </span>
      </div>
      {doc.numeroSequencial && (
        <span className="mr-1.5 font-mono text-muted-foreground">Nº {doc.numeroSequencial} —</span>
      )}
      {doc.cliente}
    </>
  );

  const descricao = (
    <>
      {doc.produtoDescricao}
      {doc.produtoCodigo ? ` · ${doc.produtoCodigo}` : ""}
      {doc.codInterno ? ` · SC:${doc.codInterno}` : ""}
    </>
  );

  return (
    <DrawerSheet titulo={titulo} descricao={descricao}>
      <div className="flex flex-wrap gap-2">
        <form action={voltarEtapa}>
          <input type="hidden" name="id" value={doc.id} />
          <Button type="submit" variant="outline" size="sm" className="gap-1.5">
            <CornerUpLeft className="h-3.5 w-3.5" /> Voltar etapa
          </Button>
        </form>
        <ExcluirCardButton id={doc.id} />
      </div>

      {corpo}
    </DrawerSheet>
  );
}
