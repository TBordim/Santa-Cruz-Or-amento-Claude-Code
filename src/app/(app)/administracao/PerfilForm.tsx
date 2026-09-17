"use client";

import { useActionState } from "react";
import Link from "next/link";
import { salvarPerfil } from "./actions";
import { AREAS } from "@/lib/areas";

type PerfilEditavel = { id: string; nome: string; admin: boolean; areas: string[] } | null;

export function PerfilForm({ perfil }: { perfil: PerfilEditavel }) {
  const [erro, formAction, pending] = useActionState(salvarPerfil, undefined);
  const areasMarcadas = new Set(perfil?.areas ?? []);

  return (
    <form action={formAction} className="panel" style={{ marginBottom: 24 }}>
      <input type="hidden" name="id" value={perfil?.id ?? ""} />
      <h3 className="sub-head" style={{ marginTop: 0 }}>
        {perfil ? `Editar perfil — ${perfil.nome}` : "Novo perfil"}
      </h3>
      <div className="field">
        <label htmlFor="nome">Nome do perfil</label>
        <input id="nome" name="nome" required defaultValue={perfil?.nome ?? ""} placeholder="Ex.: Orçamento (Fabiana)" />
      </div>
      <label className="checkline" style={{ marginBottom: 10 }}>
        <input type="checkbox" name="admin" defaultChecked={perfil?.admin ?? false} />
        <span><strong>Administrador</strong> — acesso total, inclusive esta tela de Administração</span>
      </label>
      <div className="field">
        <label>Pode editar</label>
        <div className="hint" style={{ marginBottom: 8 }}>
          Colaboradores sempre podem ver todas as áreas do painel — isto só controla onde podem salvar/alterar algo.
        </div>
        {AREAS.map((a) => (
          <label key={a.key} className="checkline" style={{ display: "flex" }}>
            <input type="checkbox" name="areas" value={a.key} defaultChecked={areasMarcadas.has(a.key)} />
            <span>{a.label} <span className="hint">— {a.hint}</span></span>
          </label>
        ))}
      </div>
      {erro && <div className="anexo-erro">{erro}</div>}
      <div className="btn-row">
        <button type="submit" className="btn" disabled={pending}>
          {perfil ? "Salvar alterações" : "Criar perfil"}
        </button>
        {perfil && (
          <Link href="/administracao?aba=perfis" className="btn ghost">
            Cancelar
          </Link>
        )}
      </div>
    </form>
  );
}
