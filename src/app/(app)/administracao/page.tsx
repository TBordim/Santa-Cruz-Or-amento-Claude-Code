import { Fragment } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { sessaoAtual } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AREAS } from "@/lib/areas";
import { PerfilForm } from "./PerfilForm";
import { UsuarioForm } from "./UsuarioForm";
import { excluirPerfil, excluirUsuario } from "./actions";

type SearchParams = {
  aba?: string;
  editarPerfil?: string;
  excluirPerfil?: string;
  erroPerfil?: string;
  editarUsuario?: string;
  excluirUsuario?: string;
};

// Reconstrução de viewAdministracao()/viewAdminPerfis()/viewAdminUsuarios() (linhas 4143-4244
// do HTML original) como Server Components: a aba ativa e qual linha está em edição/confirmação
// de exclusão viram parâmetros de URL (?aba=&editarPerfil=&excluirPerfil=) em vez de state.view/
// state.perfilEditId/state.confirmDeletePerfilId em memória — o equivalente server-first do
// mesmo comportamento.
export default async function AdministracaoPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  if (!sessao.admin) redirect("/");

  const sp = await searchParams;
  const aba = sp.aba === "usuarios" ? "usuarios" : "perfis";

  const [perfis, usuarios] = await Promise.all([
    prisma.perfil.findMany({
      orderBy: { nome: "asc" },
      include: { _count: { select: { usuarios: true } } },
    }),
    prisma.usuario.findMany({
      orderBy: { nome: "asc" },
      include: { perfil: true },
    }),
  ]);

  return (
    <>
      <div className="view-header">
        <div>
          <h2>Administração</h2>
          <p>
            Defina os perfis de acesso (o que cada um pode editar) e os usuários (quem usa cada perfil, com PIN
            próprio). Isso vale para sempre — nenhuma alteração aqui precisa de ajuste no código.
          </p>
        </div>
      </div>

      <div className="btn-row" style={{ marginBottom: 16 }}>
        <Link href="/administracao?aba=perfis" className={`btn${aba === "perfis" ? "" : " ghost"}`}>
          Perfis de acesso
        </Link>
        <Link href="/administracao?aba=usuarios" className={`btn${aba === "usuarios" ? "" : " ghost"}`}>
          Usuários
        </Link>
      </div>

      {aba === "perfis" ? (
        <>
          <PerfilForm
            key={sp.editarPerfil ?? "novo"}
            perfil={perfis.find((p) => p.id === sp.editarPerfil) ?? null}
          />
          <h3 className="sub-head">Perfis cadastrados</h3>
          {perfis.length === 0 ? (
            <div className="empty-state">Nenhum perfil cadastrado ainda.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Perfil</th>
                    <th>Acesso</th>
                    <th>Usuários</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {perfis.map((p) => {
                    const acessoTxt = p.admin
                      ? "Administrador (tudo)"
                      : AREAS.filter((a) => p.areas.includes(a.key)).map((a) => a.label).join(", ") ||
                        "Nenhuma área — só visualiza";
                    const confirmando = sp.excluirPerfil === p.id;
                    return (
                      <Fragment key={p.id}>
                        <tr>
                          <td>{p.nome}</td>
                          <td>{acessoTxt}</td>
                          <td>{p._count.usuarios}</td>
                          <td>
                            <div className="btn-row">
                              <Link href={`/administracao?aba=perfis&editarPerfil=${p.id}`} className="btn ghost">
                                Editar
                              </Link>
                              <Link href={`/administracao?aba=perfis&excluirPerfil=${p.id}`} className="btn ghost">
                                Excluir
                              </Link>
                            </div>
                          </td>
                        </tr>
                        {confirmando && (
                          <tr>
                            <td colSpan={4}>
                              <div className="confirm-box">
                                <p>Excluir o perfil &quot;{p.nome}&quot; é definitivo.</p>
                                {sp.erroPerfil && <div className="anexo-erro">{sp.erroPerfil}</div>}
                                <div className="btn-row">
                                  <form action={excluirPerfil}>
                                    <input type="hidden" name="id" value={p.id} />
                                    <button type="submit" className="btn danger">Sim, excluir</button>
                                  </form>
                                  <Link href="/administracao?aba=perfis" className="btn ghost">
                                    Cancelar
                                  </Link>
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
      ) : (
        <>
          <UsuarioForm
            key={sp.editarUsuario ?? "novo"}
            usuario={usuarios.find((u) => u.id === sp.editarUsuario) ?? null}
            perfis={perfis}
          />
          <h3 className="sub-head">Usuários cadastrados</h3>
          {usuarios.length === 0 ? (
            <div className="empty-state">Nenhum usuário cadastrado ainda.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Perfil</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => {
                    const confirmando = sp.excluirUsuario === u.id;
                    return (
                      <Fragment key={u.id}>
                        <tr>
                          <td>{u.nome}</td>
                          <td>{u.perfil.nome}</td>
                          <td>
                            {u.ativo ? (
                              <span className="pill good" style={pillStyle("good")}>Ativo</span>
                            ) : (
                              <span className="pill neutral" style={pillStyle("neutral")}>Inativo</span>
                            )}
                          </td>
                          <td>
                            <div className="btn-row">
                              <Link href={`/administracao?aba=usuarios&editarUsuario=${u.id}`} className="btn ghost">
                                Editar
                              </Link>
                              <Link href={`/administracao?aba=usuarios&excluirUsuario=${u.id}`} className="btn ghost">
                                Excluir
                              </Link>
                            </div>
                          </td>
                        </tr>
                        {confirmando && (
                          <tr>
                            <td colSpan={4}>
                              <div className="confirm-box">
                                <p>Excluir o usuário &quot;{u.nome}&quot; é definitivo — a pessoa deixa de conseguir entrar.</p>
                                <div className="btn-row">
                                  <form action={excluirUsuario}>
                                    <input type="hidden" name="id" value={u.id} />
                                    <button type="submit" className="btn danger">Sim, excluir</button>
                                  </form>
                                  <Link href="/administracao?aba=usuarios" className="btn ghost">
                                    Cancelar
                                  </Link>
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
      )}
    </>
  );
}

function pillStyle(kind: "good" | "neutral"): React.CSSProperties {
  const map = {
    good: { background: "var(--good-soft)", color: "var(--good)" },
    neutral: { background: "var(--surface-alt)", color: "var(--ink-soft)" },
  } as const;
  return {
    fontFamily: "var(--font-ibm-plex-mono)",
    fontSize: 10.5,
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: 20,
    ...map[kind],
  };
}
