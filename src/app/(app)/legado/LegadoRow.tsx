"use client";

import { useState } from "react";
import { salvarDadosLegado, excluirLegado } from "./actions";
import { fmtMoney, fmtDate } from "@/lib/orcamentos/constantes";
import { paraCampoBR } from "@/lib/orcamentos/motor";

type Legado = {
  id: string;
  cliente: string | null;
  produtoDescricao: string | null;
  produtoCodigo: string | null;
  precoAtual: number | null;
  custoPrimarioPct: number | null;
  margemP2Pct: number | null;
  quantidade: number | null;
  dataLegadoTexto: string | null;
  obs: string | null;
  fotoUrl: string | null;
  fotoMime: string | null;
  criadoEm: Date;
};

export function LegadoRow({ legado }: { legado: Legado }) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <tr>
        <td>{legado.cliente}</td>
        <td>{legado.produtoDescricao}{legado.produtoCodigo ? ` (${legado.produtoCodigo})` : ""}</td>
        <td>{fmtMoney(legado.precoAtual)}</td>
        <td>{legado.dataLegadoTexto || fmtDate(legado.criadoEm)}</td>
        <td>
          <div className="btn-row">
            <button type="button" className="btn ghost" onClick={() => setAberto(!aberto)}>{aberto ? "Fechar" : "Abrir"}</button>
            <form
              action={excluirLegado}
              onSubmit={(e) => { if (!confirm(`Excluir o registro de "${legado.cliente}"?`)) e.preventDefault(); }}
            >
              <input type="hidden" name="id" value={legado.id} />
              <button type="submit" className="btn ghost">Excluir</button>
            </form>
          </div>
        </td>
      </tr>
      {aberto && (
        <tr>
          <td colSpan={5}>
            <div className="confirm-box" style={{ background: "var(--surface-alt)", borderColor: "var(--line)" }}>
              {legado.obs && <p style={{ color: "var(--ink)" }}>{legado.obs}</p>}
              <form action={salvarDadosLegado}>
                <input type="hidden" name="id" value={legado.id} />
                <div className="row2">
                  <div className="field"><label>Preço atual</label><input name="precoAtual" defaultValue={paraCampoBR(legado.precoAtual)} /></div>
                  <div className="field"><label>Quantidade</label><input name="quantidade" defaultValue={paraCampoBR(legado.quantidade)} /></div>
                </div>
                <div className="row2">
                  <div className="field"><label>Custo primário (%)</label><input name="custoPrimarioPct" defaultValue={paraCampoBR(legado.custoPrimarioPct)} /></div>
                  <div className="field"><label>Margem P2 (%)</label><input name="margemP2Pct" defaultValue={paraCampoBR(legado.margemP2Pct)} /></div>
                </div>
                <div className="btn-row">
                  <button type="submit" className="btn secondary">Salvar dados de comparação</button>
                </div>
              </form>
              {legado.fotoUrl && (
                legado.fotoMime === "application/pdf" ? (
                  <a href={legado.fotoUrl} target="_blank" rel="noreferrer" className="btn ghost" style={{ marginTop: 10 }}>Abrir PDF em nova aba</a>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- URL do Blob
                  <img src={legado.fotoUrl} alt="Foto da folha" className="anexo-preview" style={{ marginTop: 10, maxWidth: 320 }} />
                )
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
