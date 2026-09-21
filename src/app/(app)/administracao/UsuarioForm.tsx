"use client";

import { useActionState } from "react";
import Link from "next/link";
import { salvarUsuario } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Perfil = { id: string; nome: string };
type UsuarioEditavel = { id: string; nome: string; perfilId: string; ativo: boolean } | null;

export function UsuarioForm({ usuario, perfis }: { usuario: UsuarioEditavel; perfis: Perfil[] }) {
  const [erro, formAction, pending] = useActionState(salvarUsuario, undefined);

  if (perfis.length === 0) {
    return <div className="empty-state">Crie ao menos um perfil de acesso antes de cadastrar usuários.</div>;
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="text-base">{usuario ? `Editar usuário — ${usuario.nome}` : "Novo usuário"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={usuario?.id ?? ""} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" name="nome" required defaultValue={usuario?.nome ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pin">PIN (4 a 6 números)</Label>
              <Input
                id="pin"
                name="pin"
                autoComplete="off"
                inputMode="numeric"
                placeholder={usuario ? "deixe em branco para manter o atual" : "Ex.: 1234"}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="perfilId">Perfil de acesso</Label>
            <Select name="perfilId" required defaultValue={usuario?.perfilId ?? undefined}>
              <SelectTrigger id="perfilId" className="w-full">
                <SelectValue placeholder="Escolha um perfil…" />
              </SelectTrigger>
              <SelectContent>
                {perfis.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {usuario && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox name="ativo" defaultChecked={usuario.ativo} />
              <span>Usuário ativo (desmarque para bloquear o acesso sem excluir)</span>
            </label>
          )}
          {erro && <div className="anexo-erro">{erro}</div>}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>{usuario ? "Salvar alterações" : "Criar usuário"}</Button>
            {usuario && (
              <Button asChild variant="outline">
                <Link href="/administracao?aba=usuarios">Cancelar</Link>
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
