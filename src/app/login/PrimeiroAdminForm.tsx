"use client";

import { useActionState } from "react";
import { criarPrimeiroAdmin } from "./actions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function PrimeiroAdminForm() {
  const [erro, formAction, pending] = useActionState(criarPrimeiroAdmin, undefined);

  return (
    <Card className="w-full max-w-[380px]">
      <CardHeader className="items-center gap-2 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- logo pequeno e fixo */}
        <img src="/logo-santa-cruz.png" alt="Santa Cruz" width={44} height={44} />
        <div>
          <h1 className="font-serif text-xl font-semibold text-foreground">App Sta Cruz</h1>
          <p className="font-mono text-[10px] tracking-widest text-muted-foreground">SANTA CRUZ IND. GRÁFICA</p>
        </div>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <p className="text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Primeiro acesso — crie o administrador
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nome">Seu nome</Label>
            <Input id="nome" name="nome" autoComplete="off" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pin">Crie um PIN (4 a 6 números)</Label>
            <Input id="pin" name="pin" type="password" inputMode="numeric" autoComplete="off" required />
          </div>
          {erro && <div className="anexo-erro">{erro}</div>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Criando…" : "Criar administrador"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Só aparece uma vez — depois, use a Administração para criar os demais usuários.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
