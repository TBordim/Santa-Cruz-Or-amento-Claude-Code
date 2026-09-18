import { notFound } from "next/navigation";
import { CornerUpLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { etapaInfo } from "@/lib/orcamentos/constantes";
import { buscarOrcamentoAnterior } from "@/lib/orcamentos/legado";
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
    case "DIRETORIA": {
      // Busca o "anterior" de novo, ao vivo, em vez de confiar só no que foi calculado quando
      // o card chegou na Diretoria (tier.precoAnterior etc.) — se o caso de comparação (um
      // Histórico ou Arquivo legado do mesmo cliente+produto) só passou a existir DEPOIS que
      // este card já estava na Diretoria, o valor congelado nunca vai refletir isso. Achado em
      // teste real: card enviado à Diretoria antes do outro orçamento existir ficava sem
      // comparação pra sempre, mesmo depois do outro ser finalizado.
      const anteriorAoVivo = await buscarOrcamentoAnterior(doc.clienteChave ?? "", doc.produtoChave ?? "", doc.id, doc.codInterno);
      corpo = <PainelDiretoria doc={doc} anteriorAoVivo={anteriorAoVivo} />;
      break;
    }
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
