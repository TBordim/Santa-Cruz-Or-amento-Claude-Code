"use client";

import { useState } from "react";
import Link from "next/link";
import { useActionState } from "react";
import { autenticar } from "./actions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FilePlus2 } from "lucide-react";

type Usuario = { id: string; nome: string };

// Representante comercial externo não tem usuário/PIN cadastrado — não faz sentido pedir login
// pra ele. A tela abre com essa escolha em vez do formulário de PIN direto: "Sou Representante"
// já leva pra Novo Orçamento (pública, ver auth.config.ts); só quem clica em "Sou colaborador"
// vê o formulário de usuário+PIN. Pedido do Thiago em 18/09/2026.
export function LoginForm({ usuarios }: { usuarios: Usuario[] }) {
  const [modo, setModo] = useState<"escolha" | "colaborador">("escolha");
  const [erro, formAction, pending] = useActionState(autenticar, undefined);

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
        {modo === "escolha" ? (
          <div className="flex flex-col gap-3">
            <Button asChild size="lg" className="w-full gap-2">
              <Link href="/novo">
                <FilePlus2 className="h-4 w-4" /> Sou Representante
              </Link>
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Envie uma solicitação de orçamento — não precisa de login.
            </p>
            <div className="my-1 border-t border-dashed border-border" />
            <Button type="button" variant="outline" className="w-full" onClick={() => setModo("colaborador")}>
              Sou colaborador da Santa Cruz
            </Button>
          </div>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setModo("escolha")}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar
            </button>
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
        )}
      </CardContent>
    </Card>
  );
}
