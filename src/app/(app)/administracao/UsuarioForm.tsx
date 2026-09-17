"use client";

import { useActionState } from "react";
import Link from "next/link";
import { salvarUsuario } from "./actions";

type Perfil = { id: string; nome: string };
type UsuarioEditavel = { id: string; nome: string; perfilId: string; ativo: boolean } | null;

export function UsuarioForm({ usuario, perfis }: { usuario: UsuarioEditavel; perfis: Perfil[] }) {
  const [erro, formAction, pending] = useActionState(salvarUsuario, undefined);

  if (perfis.length === 0) {
    return <div className="empty-state">Crie ao menos um perfil de acesso antes de cadastrar usuários.</div>;
  }

  return (
    <form action={formAction} className="panel" style={{ marginBottom: 24 }}>
      <input type="hidden" name="id" value={usuario?.id ?? ""} />
      <h3 className="sub-head" style={{ marginTop: 0 }}>
        {usuario ? `Editar usuário — ${usuario.nome}` : "Novo usuário"}
      </h3>
      <div className="row2">
        <div className="field">
          <label htmlFor="nome">Nome</label>
          <input id="nome" name="nome" required defaultValue={usuario?.nome ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="pin">PIN (4 a 6 números)</label>
          <input
            id="pin"
            name="pin"
            autoComplete="off"
            inputMode="numeric"
            placeholder={usuario ? "deixe em branco para manter o atual" : "Ex.: 1234"}
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="perfilId">Perfil de acesso</label>
        <select id="perfilId" name="perfilId" required defaultValue={usuario?.perfilId ?? ""}>
          <option value="" disabled>Escolha um perfil…</option>
          {perfis.map((p) => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>
      </div>
      {usuario && (
        <label className="checkline">
          <input type="checkbox" name="ativo" defaultChecked={usuario.ativo} />
          <span>Usuário ativo (desmarque para bloquear o acesso sem excluir)</span>
        </label>
      )}
      {erro && <div className="anexo-erro">{erro}</div>}
      <div className="btn-row">
        <button type="submit" className="btn" disabled={pending}>
          {usuario ? "Salvar alterações" : "Criar usuário"}
        </button>
        {usuario && (
          <Link href="/administracao?aba=usuarios" className="btn ghost">
            Cancelar
          </Link>
        )}
      </div>
    </form>
  );
}
