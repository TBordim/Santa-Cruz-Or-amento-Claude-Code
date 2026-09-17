import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/permissions";
import { legadosDoCliente } from "@/lib/orcamentos/legado";
import { prisma } from "@/lib/db";
import { LegadoForm } from "./LegadoForm";
import { LegadoRow } from "./LegadoRow";

export const dynamic = "force-dynamic";

export default async function LegadoPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");

  const { q } = await searchParams;
  const legados = q ? await legadosDoCliente(q) : await prisma.orcamento.findMany({ where: { origem: "LEGADO" }, orderBy: { criadoEm: "desc" } });

  return (
    <>
      <div className="view-header">
        <div>
          <h2>Arquivo legado</h2>
          <p>Registros antigos usados para comparar repetições — busca por cliente, não exige match perfeito de produto.</p>
        </div>
      </div>

      <LegadoForm />

      <form className="search-row">
        <input name="q" defaultValue={q ?? ""} placeholder="Buscar por cliente…" />
        <button type="submit" className="btn secondary">Buscar</button>
      </form>

      {legados.length === 0 ? (
        <div className="empty-state">Nenhum registro encontrado.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Cliente</th><th>Produto</th><th>Preço</th><th>Data</th><th></th></tr>
            </thead>
            <tbody>
              {legados.map((l) => (
                <LegadoRow
                  key={l.id}
                  legado={{
                    id: l.id,
                    cliente: l.cliente,
                    produtoDescricao: l.produtoDescricao,
                    produtoCodigo: l.produtoCodigo,
                    precoAtual: l.precoAtual ? Number(l.precoAtual) : null,
                    custoPrimarioPct: l.custoPrimarioPct ? Number(l.custoPrimarioPct) : null,
                    margemP2Pct: l.margemP2Pct ? Number(l.margemP2Pct) : null,
                    quantidade: l.quantidade ? Number(l.quantidade) : null,
                    dataLegadoTexto: l.dataLegadoTexto,
                    obs: l.obs,
                    fotoUrl: l.fotoUrl,
                    fotoMime: l.fotoMime,
                    criadoEm: l.criadoEm,
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
