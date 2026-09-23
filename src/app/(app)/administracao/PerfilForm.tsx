"use client";

import { useActionState } from "react";
import Link from "next/link";
import { salvarPerfil } from "./actions";
import { AREAS } from "@/lib/areas";
import { MODULOS } from "@/lib/modulos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

type PerfilEditavel = { id: string; nome: string; admin: boolean; areas: string[] } | null;

export function PerfilForm({ perfil }: { perfil: PerfilEditavel }) {
  const [erro, formAction, pending] = useActionState(salvarPerfil, undefined);
  const areasMarcadas = new Set(perfil?.areas ?? []);

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="text-base">{perfil ? `Editar perfil — ${perfil.nome}` : "Novo perfil"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={perfil?.id ?? ""} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nome">Nome do perfil</Label>
            <Input id="nome" name="nome" required defaultValue={perfil?.nome ?? ""} placeholder="Ex.: Orçamento (Fabiana)" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="admin" defaultChecked={perfil?.admin ?? false} />
            <span><strong>Administrador</strong> — acesso total, inclusive esta tela de Administração</span>
          </label>
          <div className="flex flex-col gap-3">
            <Label>Pode editar</Label>
            <p className="text-xs text-muted-foreground">
              Colaboradores sempre podem ver todos os módulos — isto só controla onde podem salvar/alterar algo, agrupado por módulo.
            </p>
            {MODULOS.map((m) => {
              const areasDoModulo = AREAS.filter((a) => a.modulo === m.key);
              if (areasDoModulo.length === 0) return null;
              return (
                <div key={m.key} className="flex flex-col gap-2">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{m.label}</span>
                  <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3">
                    {areasDoModulo.map((a) => (
                      <label key={a.key} className="flex items-start gap-2 text-sm">
                        <Checkbox name="areas" value={a.key} defaultChecked={areasMarcadas.has(a.key)} className="mt-0.5" />
                        <span>{a.label} <span className="text-xs text-muted-foreground">— {a.hint}</span></span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {erro && <div className="anexo-erro">{erro}</div>}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>{perfil ? "Salvar alterações" : "Criar perfil"}</Button>
            {perfil && (
              <Button asChild variant="outline">
                <Link href="/administracao?aba=perfis">Cancelar</Link>
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
