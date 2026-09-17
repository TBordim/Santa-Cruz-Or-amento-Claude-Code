"use client";

import { useActionState } from "react";
import { autenticar } from "./actions";

type Usuario = { id: string; nome: string };

export function LoginForm({ usuarios }: { usuarios: Usuario[] }) {
  const [erro, formAction, pending] = useActionState(autenticar, undefined);

  return (
    <form action={formAction} className="panel">
      <div className="brand">
        <div className="mark">
          <h1>Orçamentos</h1>
        </div>
        <div className="sub">SANTA CRUZ IND. GRÁFICA</div>
      </div>
      <p className="label" style={{ marginBottom: 12, display: "block" }}>Entrar como colaborador</p>
      <div className="field">
        <label htmlFor="usuarioId">Seu nome</label>
        <select id="usuarioId" name="usuarioId" required defaultValue="">
          <option value="" disabled>Escolha seu nome…</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>{u.nome}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="pin">PIN</label>
        <input id="pin" name="pin" type="password" inputMode="numeric" autoComplete="off" required />
      </div>
      {erro && <div className="anexo-erro">{erro}</div>}
      <div className="btn-row">
        <button type="submit" className="btn" disabled={pending}>
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </div>
    </form>
  );
}
