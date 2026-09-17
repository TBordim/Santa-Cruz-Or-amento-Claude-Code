"use client";

import { useActionState } from "react";
import { criarPrimeiroAdmin } from "./actions";

export function PrimeiroAdminForm() {
  const [erro, formAction, pending] = useActionState(criarPrimeiroAdmin, undefined);

  return (
    <form action={formAction} className="panel">
      <div className="brand">
        <div className="mark">
          <h1>Orçamentos</h1>
        </div>
        <div className="sub">SANTA CRUZ IND. GRÁFICA</div>
      </div>
      <p className="label" style={{ marginBottom: 12, display: "block" }}>Primeiro acesso — crie o administrador</p>
      <div className="field">
        <label htmlFor="nome">Seu nome</label>
        <input id="nome" name="nome" autoComplete="off" required />
      </div>
      <div className="field">
        <label htmlFor="pin">Crie um PIN (4 a 6 números)</label>
        <input id="pin" name="pin" type="password" inputMode="numeric" autoComplete="off" required />
      </div>
      {erro && <div className="anexo-erro">{erro}</div>}
      <div className="btn-row">
        <button type="submit" className="btn" disabled={pending}>
          {pending ? "Criando…" : "Criar administrador"}
        </button>
      </div>
      <p className="field hint" style={{ marginTop: 10 }}>
        Só aparece uma vez — depois, use a Administração para criar os demais usuários.
      </p>
    </form>
  );
}
