"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sair } from "./actions";

type Props = {
  nome: string;
  perfilNome: string;
  admin: boolean;
};

// Versão reduzida da sidebarHtml() do painel atual (linhas 2980-3063): nesta fase só existem
// "Início" (tela "Em construção") e "Administração" — o resto da navegação (Painel, Diretoria,
// Histórico, Arquivo legado, Resumo semanal) chega junto com o fluxo de 6 etapas na Fase 2.
export function Sidebar({ nome, perfilNome, admin }: Props) {
  const pathname = usePathname();

  const items = [{ href: "/", label: "Início" }, ...(admin ? [{ href: "/administracao", label: "Administração" }] : [])];

  return (
    <div className="sidebar">
      <div className="brand">
        <div className="mark">
          <span className="swatch">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo pequeno e fixo; o
                otimizador do next/image rejeita este PNG específico ("not a valid image") */}
            <img src="/logo-santa-cruz.png" alt="Santa Cruz" width={28} height={28} />
          </span>
          <h1>Orçamentos</h1>
        </div>
        <div className="sub">SANTA CRUZ IND. GRÁFICA</div>
      </div>

      <nav>
        {items.map((it) => (
          <Link key={it.href} href={it.href} className={`nav-btn${pathname === it.href ? " active" : ""}`}>
            <span className="nav-label">{it.label}</span>
          </Link>
        ))}
      </nav>

      <div className="persona-box conta-box">
        <span className="label">Conectado como</span>
        <div className="conta-nome">{nome}</div>
        <div className="conta-perfil">{perfilNome}{admin ? " · Administrador" : ""}</div>
        <form action={sair}>
          <button type="submit" className="btn ghost" style={{ marginTop: 8, width: "100%" }}>
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}
