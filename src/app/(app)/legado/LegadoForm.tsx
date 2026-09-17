"use client";

import { useActionState } from "react";
import { criarLegado } from "./actions";
import { prepararAnexo } from "@/lib/anexos/compressao";

export function LegadoForm() {
  const [state, formAction, pending] = useActionState(criarLegado, undefined);

  // Comprime a foto no navegador e substitui o arquivo do próprio <input> (via DataTransfer)
  // antes do submit nativo — assim o formulário continua um <form action={formAction}> comum,
  // sem precisar interceptar a submissão manualmente.
  async function onFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const preparado = await prepararAnexo(file);
      const dt = new DataTransfer();
      dt.items.add(preparado);
      e.target.files = dt.files;
    } catch {
      // erro de compressão: deixa o arquivo original, a validação do lado do servidor não existe
      // aqui de propósito (foto é opcional) — só não comprime.
    }
  }

  return (
    <form action={formAction} className="panel" style={{ marginBottom: 24 }}>
      <h3 className="sub-head" style={{ marginTop: 0 }}>Novo registro do Arquivo legado</h3>
      <div className="field"><label>Cliente</label><input name="cliente" required /></div>
      <div className="row2">
        <div className="field"><label>Código do produto</label><input name="produtoCodigo" /></div>
        <div className="field"><label>Descrição do produto</label><input name="produtoDescricao" required /></div>
      </div>
      <div className="row2">
        <div className="field"><label>Preço atual (por milheiro)</label><input name="precoAtual" placeholder="Ex.: 1.234,56" /></div>
        <div className="field"><label>Data</label><input name="dataTexto" placeholder="Ex.: meados de 2025" /></div>
      </div>
      <div className="row2">
        <div className="field"><label>Custo primário (%)</label><input name="custoPrimarioPct" /></div>
        <div className="field"><label>Margem P2 (%)</label><input name="margemP2Pct" /></div>
      </div>
      <div className="field"><label>Quantidade</label><input name="quantidade" /></div>
      <div className="field"><label>Observação</label><textarea name="obs" rows={2} /></div>
      <div className="field">
        <label>Foto da folha (opcional)</label>
        <input type="file" name="foto" accept="image/*,application/pdf" onChange={onFotoChange} />
        <span className="hint">A leitura automática por IA só funciona com imagens — um PDF pode ser visualizado, mas não é lido.</span>
      </div>
      {state?.erro && <div className="anexo-erro">{state.erro}</div>}
      <div className="btn-row">
        <button type="submit" className="btn" disabled={pending}>{pending ? "Salvando…" : "Cadastrar"}</button>
      </div>
    </form>
  );
}
