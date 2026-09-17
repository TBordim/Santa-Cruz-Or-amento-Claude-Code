import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { fmtDateTime, dataLimite } from "@/lib/orcamentos/constantes";

export const dynamic = "force-dynamic";

// Equivalente a viewResumo() — janela fixa de 7 dias para a atividade da Diretoria; conversão
// de ofertas é all-time (todas as ofertas enviadas, não só as dos últimos 7 dias).
export default async function ResumoPage() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");

  const cutoff = dataLimite(7);

  const [abertos, autoAprovados, pendentesAgora, decididosManual] = await Promise.all([
    prisma.orcamento.count({ where: { origem: "NOVO", criadoEm: { gte: cutoff } } }),
    prisma.orcamento.count({ where: { origem: "NOVO", statusDiretoria: "AUTO_APROVADO", atualizadoEm: { gte: cutoff } } }),
    prisma.orcamento.count({ where: { origem: "NOVO", etapa: "DIRETORIA", statusDiretoria: "PENDENTE" } }),
    prisma.orcamento.findMany({
      where: { origem: "NOVO", statusDiretoria: { in: ["APROVADO", "REVISAO"] }, atualizadoEm: { gte: cutoff } },
      orderBy: { atualizadoEm: "desc" },
    }),
  ]);

  const aprovadosManual = decididosManual.filter((d) => d.statusDiretoria === "APROVADO").length;
  const revisoes = decididosManual.filter((d) => d.statusDiretoria === "REVISAO").length;

  const finalizados = await prisma.orcamento.findMany({ where: { origem: "NOVO", etapa: "FINALIZADO" } });
  const ganhos = finalizados.filter((d) => d.desfecho === "POSITIVO").length;
  const perdidos = finalizados.filter((d) => d.desfecho === "NEGATIVO").length;
  const semRetorno = finalizados.filter((d) => d.desfecho === "SEM_RETORNO").length;
  const aguardando = finalizados.filter((d) => !d.desfecho || d.desfecho === "AGUARDANDO").length;
  const respondidos = ganhos + perdidos + semRetorno;
  const taxaConversao = respondidos > 0 ? Math.round((ganhos / respondidos) * 100) : null;

  return (
    <>
      <div className="view-header">
        <div>
          <h2>Resumo semanal</h2>
          <p>Últimos 7 dias na Diretoria, mais a conversão de todas as ofertas já enviadas.</p>
        </div>
      </div>

      <h3 className="sub-head" style={{ marginTop: 0 }}>Atividade da Diretoria (últimos 7 dias)</h3>
      <div className="stat-strip">
        <div className="stat"><div className="n mono">{abertos}</div><div className="l">Orçamentos abertos</div></div>
        <div className="stat" style={{ ["--stat-color" as string]: "var(--good)" }}><div className="n mono">{autoAprovados}</div><div className="l">Aprovados automaticamente</div></div>
        <div className="stat" style={{ ["--stat-color" as string]: "var(--good)" }}><div className="n mono">{aprovadosManual}</div><div className="l">Aprovados pela Diretoria</div></div>
        <div className="stat" style={{ ["--stat-color" as string]: "var(--bad)" }}><div className="n mono">{revisoes}</div><div className="l">Devolvidos p/ revisão</div></div>
        <div className="stat" style={{ ["--stat-color" as string]: "var(--warn)" }}><div className="n mono">{pendentesAgora}</div><div className="l">Pendentes agora</div></div>
      </div>

      {decididosManual.length > 0 && (
        <div className="table-wrap" style={{ marginBottom: 26 }}>
          <table>
            <thead><tr><th>Cliente</th><th>Produto</th><th>Decisão</th><th>Comentário</th><th>Quando</th></tr></thead>
            <tbody>
              {decididosManual.map((d) => (
                <tr key={d.id}>
                  <td>{d.cliente}</td>
                  <td>{d.produtoDescricao}</td>
                  <td><span className={`pill ${d.statusDiretoria === "APROVADO" ? "good" : "bad"}`}>{d.statusDiretoria === "APROVADO" ? "Aprovado" : "Revisão"}</span></td>
                  <td>—</td>
                  <td>{fmtDateTime(d.atualizadoEm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="sub-head">Conversão de ofertas enviadas</h3>
      <div className="stat-strip">
        <div className="stat" style={{ ["--stat-color" as string]: "var(--good)" }}><div className="n mono">{ganhos}</div><div className="l">Ganhos</div></div>
        <div className="stat" style={{ ["--stat-color" as string]: "var(--bad)" }}><div className="n mono">{perdidos}</div><div className="l">Perdidos</div></div>
        <div className="stat"><div className="n mono">{semRetorno}</div><div className="l">Sem retorno</div></div>
        <div className="stat"><div className="n mono">{aguardando}</div><div className="l">Aguardando</div></div>
        <div className="stat" style={{ ["--stat-color" as string]: "var(--accent)" }}>
          <div className="n mono">{taxaConversao !== null ? `${taxaConversao}%` : "—"}</div>
          <div className="l">Taxa de conversão</div>
        </div>
      </div>
    </>
  );
}
