"use client";

import { useActionState } from "react";
import { autenticar } from "./actions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Usuario = { id: string; nome: string };

export function LoginForm({ usuarios }: { usuarios: Usuario[] }) {
  const [erro, formAction, pending] = useActionState(autenticar, undefined);

  return (
    <Card className="w-full max-w-[380px]">
      <CardHeader className="items-center gap-2 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- logo pequeno e fixo */}
        <img src="/logo-santa-cruz.png" alt="Santa Cruz" width={44} height={44} />
        <div>
          <h1 className="font-serif text-xl font-semibold text-foreground">Orçamentos</h1>
          <p className="font-mono text-[10px] tracking-widest text-muted-foreground">SANTA CRUZ IND. GRÁFICA</p>
        </div>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <p className="text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">Entrar como colaborador</p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="usuarioId">Seu nome</Label>
            <Select name="usuarioId" required>
              <SelectTrigger id="usuarioId" className="w-full">
                <SelectValue placeholder="Escolha seu nome…" />
              </SelectTrigger>
              <SelectContent>
                {usuarios.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pin">PIN</Label>
            <Input id="pin" name="pin" type="password" inputMode="numeric" autoComplete="off" required />
          </div>
          {erro && <div className="anexo-erro">{erro}</div>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
