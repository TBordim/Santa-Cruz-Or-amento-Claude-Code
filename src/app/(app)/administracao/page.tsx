import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AREAS } from "@/lib/areas";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { PerfilForm } from "./PerfilForm";
import { UsuarioForm } from "./UsuarioForm";
import { ExcluirPerfilButton } from "./ExcluirPerfilButton";
import { ExcluirUsuarioButton } from "./ExcluirUsuarioButton";

type SearchParams = {
  aba?: string;
  editarPerfil?: string;
  editarUsuario?: string;
};

// Reconstrução de viewAdministracao()/viewAdminPerfis()/viewAdminUsuarios() (linhas 4143-4244
// do HTML original) como Server Components: a aba ativa e qual registro está em edição viram
// parâmetros de URL — equivalente server-first do state.view/state.perfilEditId em memória.
export default async function AdministracaoPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  if (!sessao.admin) redirect("/");

  const sp = await searchParams;
  const aba = sp.aba === "usuarios" ? "usuarios" : "perfis";

  const [perfis, usuarios] = await Promise.all([
    prisma.perfil.findMany({ orderBy: { nome: "asc" }, include: { _count: { select: { usuarios: true } } } }),
    prisma.usuario.findMany({ orderBy: { nome: "asc" }, include: { perfil: true } }),
  ]);

  return (
    <>
      <PageHeader
        title="Administração"
        description="Defina os perfis de acesso (o que cada um pode editar) e os usuários (quem usa cada perfil, com PIN próprio). Isso vale para sempre — nenhuma alteração aqui precisa de ajuste no código."
      />

      <Tabs value={aba} className="w-full flex-col">
        <TabsList className="mb-2">
          <TabsTrigger value="perfis" asChild>
            <a href="/administracao?aba=perfis">Perfis de acesso</a>
          </TabsTrigger>
          <TabsTrigger value="usuarios" asChild>
            <a href="/administracao?aba=usuarios">Usuários</a>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="perfis" className="flex flex-col gap-6">
          <PerfilForm key={sp.editarPerfil ?? "novo"} perfil={perfis.find((p) => p.id === sp.editarPerfil) ?? null} />
          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground">Perfis cadastrados</h3>
            {perfis.length === 0 ? (
              <div className="empty-state">Nenhum perfil cadastrado ainda.</div>
            ) : (
              <div className="rounded-xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Perfil</TableHead>
                      <TableHead>Acesso</TableHead>
                      <TableHead>Usuários</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {perfis.map((p) => {
                      const acessoTxt = p.admin
                        ? "Administrador (tudo)"
                        : AREAS.filter((a) => p.areas.includes(a.key)).map((a) => a.label).join(", ") || "Nenhuma área — só visualiza";
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.nome}</TableCell>
                          <TableCell className="text-muted-foreground">{acessoTxt}</TableCell>
                          <TableCell>{p._count.usuarios}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button asChild variant="ghost" size="sm" className="gap-1.5">
                                <a href={`/administracao?aba=perfis&editarPerfil=${p.id}`}>
                                  <Pencil className="h-3.5 w-3.5" /> Editar
                                </a>
                              </Button>
                              <ExcluirPerfilButton id={p.id} nome={p.nome} />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="usuarios" className="flex flex-col gap-6">
          <UsuarioForm key={sp.editarUsuario ?? "novo"} usuario={usuarios.find((u) => u.id === sp.editarUsuario) ?? null} perfis={perfis} />
          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground">Usuários cadastrados</h3>
            {usuarios.length === 0 ? (
              <div className="empty-state">Nenhum usuário cadastrado ainda.</div>
            ) : (
              <div className="rounded-xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Perfil</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usuarios.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.nome}</TableCell>
                        <TableCell className="text-muted-foreground">{u.perfil.nome}</TableCell>
                        <TableCell>
                          {u.ativo ? (
                            <Badge className="bg-good-soft text-good border-0">Ativo</Badge>
                          ) : (
                            <Badge variant="secondary">Inativo</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button asChild variant="ghost" size="sm" className="gap-1.5">
                              <a href={`/administracao?aba=usuarios&editarUsuario=${u.id}`}>
                                <Pencil className="h-3.5 w-3.5" /> Editar
                              </a>
                            </Button>
                            <ExcluirUsuarioButton id={u.id} nome={u.nome} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
