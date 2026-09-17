import { Fragment } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { sessaoAtual } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { valorTotalOrcamento } from "@/lib/orcamentos/legado";
import { DESFECHOS, PERIODOS, fmtMoney, fmtDate, desfechoInfo, dataLimite } from "@/lib/orcamentos/constantes";
import type { PrecificacaoTier } from "@/lib/orcamentos/types";
import { excluirHistorico } from "./actions";

export const dynamic = "force-dynamic";

type SP = { aba?: string; periodo?: string; q?: string; excluir?: string };

export default async function HistoricoPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");

  const sp = await searchParams;
  const aba = sp.aba ?? "todos";
  const periodoKey = sp.periodo ?? "todos";
  const periodo = PERIODOS.find((p) => p.key === periodoKey) ?? PERIODOS[0];
  const q = sp.q?.trim() ?? "";

  const docs = await prisma.orcamento.findMany({
    where: {
      OR: [
        { origem: "NOVO", etapa: { in: ["ENVIO_OFERTA", "FINALIZADO"] } },
        { origem: "LEGADO" },
      ],
      ...(periodo.dias ? { criadoEm: { gte: dataLimite(periodo.dias) } } : {}),
      ...(q ? { clienteChave: { contains: q.toUpperCase() } } : {}),
    },
    orderBy: { criadoEm: "desc" },
  });

  const filtrados = aba === "todos" ? docs : docs.filter((d) => (d.desfecho ?? "AGUARDANDO") === aba);

  const stats = DESFECHOS.map((d) => {
    const itens = docs.filter((x) => x.origem === "NOVO" && (x.desfecho ?? "AGUARDANDO") === d.key);
    const total = itens.reduce((s, x) => s + valorTotalOrcamento(x.precificacao as PrecificacaoTier[] | null), 0);
    return { ...d, count: itens.length, total };
  });

  return (
    <>
      <div className="view-header">
        <div>
          <h2>Histórico</h2>
          <p>Todos os orçamentos enviados/finalizados, com filtro de período e por desfecho.</p>
        </div>
      </div>

      <div className="stat-strip">
        {stats.map((s, i) => (
          <div key={s.key} className="stat" style={{ ["--stat-color" as string]: i === 1 ? "var(--good)" : i === 2 ? "var(--bad)" : "var(--ink-faint)" }}>
            <div className="n mono">{s.count}</div>
            <div className="l">{s.label} · {fmtMoney(s.total)}</div>
          </div>
        ))}
      </div>

      <div className="btn-row" style={{ marginBottom: 12 }}>
        <Link href="/historico?aba=todos" className={`btn${aba === "todos" ? "" : " ghost"}`}>Todos</Link>
        {DESFECHOS.map((d) => (
          <Link key={d.key} href={`/historico?aba=${d.key}`} className={`btn${aba === d.key ? "" : " ghost"}`}>{d.label}</Link>
        ))}
      </div>

      <form className="search-row">
        <input type="hidden" name="aba" value={aba} />
        <input name="q" defaultValue={q} placeholder="Buscar por cliente…" />
        <select name="periodo" defaultValue={periodoKey}>
          {PERIODOS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
        <button type="submit" className="btn secondary">Filtrar</button>
      </form>

      {filtrados.length === 0 ? (
        <div className="empty-state">Nenhum orçamento encontrado.</div>
      ) : (
        <div className="table-wrap">
          <table className="nowrap-table">
            <thead>
              <tr>
                <th>Cliente</th><th>Produto</th><th>Origem</th><th>Valor total</th><th>Data</th><th>Desfecho</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((d) => {
                const valor = valorTotalOrcamento(d.precificacao as PrecificacaoTier[] | null);
                const info = desfechoInfo(d.desfecho);
                const confirmando = sp.excluir === d.id;
                return (
                  <Fragment key={d.id}>
                    <tr>
                      <td>{d.cliente}</td>
                      <td>{d.produtoDescricao}</td>
                      <td><span className="pill neutral">{d.origem === "LEGADO" ? "Legado" : "Fluxo"}</span></td>
                      <td>{d.origem === "LEGADO" ? fmtMoney(d.precoAtual ? Number(d.precoAtual) : null) : fmtMoney(valor)}</td>
                      <td>{d.origem === "LEGADO" ? (d.dataLegadoTexto || fmtDate(d.criadoEm)) : fmtDate(d.criadoEm)}</td>
                      <td>{d.origem === "LEGADO" ? "—" : <span className={`pill ${info.pill}`}>{info.label}</span>}</td>
                      <td>
                        <div className="btn-row">
                          {d.origem === "NOVO" && <Link href={`/painel/${d.id}`} className="btn ghost">Ver</Link>}
                          {d.origem !== "LEGADO" && (
                            <Link href={`/historico?aba=${aba}&excluir=${d.id}`} className="btn ghost">Excluir</Link>
                          )}
                        </div>
                      </td>
                    </tr>
                    {confirmando && (
                      <tr>
                        <td colSpan={7}>
                          <div className="confirm-box">
                            <p>Excluir o registro de &quot;{d.cliente}&quot; é definitivo.</p>
                            <div className="btn-row">
                              <form action={excluirHistorico}>
                                <input type="hidden" name="id" value={d.id} />
                                <button type="submit" className="btn danger">Sim, excluir</button>
                              </form>
                              <Link href={`/historico?aba=${aba}`} className="btn ghost">Cancelar</Link>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
