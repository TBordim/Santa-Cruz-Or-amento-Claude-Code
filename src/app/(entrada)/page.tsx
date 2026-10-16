import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { sessaoAtual, podeEditar } from "@/lib/permissions";
import { modulosAcessiveis, type ModuloKey } from "@/lib/modulos";
import { contarPendentes } from "@/lib/treinamentos/dados";
import { contarPendenciasVendas, contarPendenciasPcp, FILAS_PM, FILA_ATENDIMENTO } from "@/lib/aceite/filas";
import { contarPendenciasEngenharia } from "@/lib/engenharia/pendencias";
import { Entrada } from "./Entrada";

export const dynamic = "force-dynamic";

// "/" — página de entrada, escolha de módulo (ver Entrada.tsx). Fica fora do layout (app) de
// propósito: é a tela de escolha, ainda sem menu de módulo. Conta o que espera pela pessoa em cada
// módulo em que ela trabalha (a área de edição do módulo; administrador vê todas).
export default async function EntradaPage() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  const acessiveis = modulosAcessiveis(sessao.admin, sessao.areas);
  const abre = (m: ModuloKey) => acessiveis.includes(m);

  const [vendas, compras, pcp, atendimento, retorno, diretoria] = await Promise.all([
    podeEditar("ACEITE_VENDAS"),
    podeEditar("COMPRAS_PM"),
    podeEditar("PCP_ENTREGA"),
    podeEditar("ATENDIMENTO_CLIENTE"),
    podeEditar("FINALIZADO"),
    podeEditar("DIRETORIA"),
  ]);
  const pendencias: Partial<Record<ModuloKey, number>> = {
    treinamentos: await contarPendentes(sessao),
    ...(abre("atendimento") && (atendimento || retorno)
      ? {
          atendimento:
            (atendimento ? await prisma.aceite.count({ where: FILA_ATENDIMENTO }) : 0) +
            (atendimento ? await prisma.negociacaoData.count({ where: { status: "AGUARDANDO_ATENDIMENTO" } }) : 0) +
            (retorno ? await prisma.orcamento.count({ where: { origem: "NOVO", etapa: "FINALIZADO", desfecho: "AGUARDANDO" } }) : 0),
        }
      : {}),
    ...(abre("diretoria") && diretoria
      ? { diretoria: await prisma.orcamento.count({ where: { origem: "NOVO", etapa: "DIRETORIA", statusDiretoria: "PENDENTE" } }) }
      : {}),
    ...(abre("aceite") && vendas ? { aceite: await contarPendenciasVendas() } : {}),
    ...(abre("engenharia") ? { engenharia: await contarPendenciasEngenharia() } : {}),
    ...(abre("compras") && compras ? { compras: await prisma.pedidoMaterial.count({ where: FILAS_PM.prazo }) } : {}),
    ...(abre("pcp") && pcp
      ? {
          pcp: await contarPendenciasPcp(),
        }
      : {}),
  };

  return <Entrada sessao={sessao} acessiveis={acessiveis} pendencias={pendencias} />;
}
