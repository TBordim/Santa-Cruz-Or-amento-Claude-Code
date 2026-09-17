import Link from "next/link";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { etapaInfo } from "@/lib/orcamentos/constantes";
import { voltarEtapa } from "../actions";
import { ExcluirCardButton } from "./ExcluirCardButton";
import { FormAberto } from "./FormAberto";
import { FormEngenharia } from "./FormEngenharia";
import { FormOrcamento } from "./FormOrcamento";
import { PainelDiretoria } from "./PainelDiretoria";
import { FormEnvioOferta } from "./FormEnvioOferta";
import { FormFinalizado } from "./FormFinalizado";

export async function Drawer({ id }: { id: string }) {
  const doc = await prisma.orcamento.findUnique({
    where: { id },
    include: { anexos: true },
  });
  if (!doc) notFound();

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

  return (
    <>
      <Link href="/painel" className="overlay" aria-label="Fechar" />
      <div className="drawer">
        <div className="drawer-head">
          <div>
            <div className="stage-tag">
              <span className="stage-dot" style={{ ["--stage-color" as string]: et?.color }} />
              <span className="label">{et?.label ?? doc.etapa}</span>
            </div>
            <h3 style={{ fontSize: 19, marginTop: 4 }}>
              {doc.numeroSequencial && <span className="mono" style={{ color: "var(--ink-faint)", fontWeight: 600 }}>Nº {doc.numeroSequencial} — </span>}
              {doc.cliente}
            </h3>
            <div className="hint" style={{ color: "var(--ink-soft)", fontSize: 12.5 }}>
              {doc.produtoDescricao}
              {doc.produtoCodigo ? ` · ${doc.produtoCodigo}` : ""}
              {doc.codInterno ? ` · SC:${doc.codInterno}` : ""}
            </div>
          </div>
          <Link href="/painel" className="drawer-close">&times;</Link>
        </div>

        <div className="btn-row" style={{ marginBottom: 10 }}>
          <form action={voltarEtapa}>
            <input type="hidden" name="id" value={doc.id} />
            <button type="submit" className="btn ghost">Voltar etapa</button>
          </form>
          <ExcluirCardButton id={doc.id} />
        </div>

        {corpo}
      </div>
    </>
  );
}
