"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sair } from "./actions";

type Props = {
  nome: string | null;
  perfilNome: string | null;
  admin: boolean;
  pendentesDiretoria?: number;
};

// Versão de sidebarHtml() do painel atual (linhas 2980-3063). Sem sessão, só existe "Novo
// Orçamento" (representante externo) + link pra login — mesmo comportamento do sidebarHtml
// original quando !sessaoAtual().
export function Sidebar({ nome, perfilNome, admin, pendentesDiretoria = 0 }: Props) {
  const pathname = usePathname();
  const logado = !!nome;

  const items = logado
    ? [
        { href: "/painel", label: "Painel" },
        { href: "/novo", label: "Novo orçamento" },
        { href: "/diretoria", label: "Diretoria", count: pendentesDiretoria },
        { href: "/historico", label: "Histórico" },
        { href: "/legado", label: "Arquivo legado" },
        { href: "/resumo", label: "Resumo semanal" },
        ...(admin ? [{ href: "/administracao", label: "Administração" }] : []),
      ]
    : [{ href: "/novo", label: "Novo orçamento" }];

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
            {"count" in it && <span className={`count${it.count ? "" : " zero"}`}>{it.count}</span>}
          </Link>
        ))}
      </nav>

      {logado ? (
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
      ) : (
        <div className="persona-box">
          <Link href="/login" className="btn ghost" style={{ width: "100%", display: "block", textAlign: "center" }}>
            Sou colaborador · Entrar
          </Link>
        </div>
      )}
    </div>
  );
}
