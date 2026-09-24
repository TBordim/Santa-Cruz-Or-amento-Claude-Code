"use client";

import { useActionState } from "react";
import { registrarPuxada } from "./actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Lab = { l: number; a: number; b: number };

// Resultado da puxada (Quick Peek) da rodada: só o melhor LAB — o mais próximo do alvo. Se já
// existe, o formulário vem preenchido e "Corrigir" sobrescreve (não acumula leituras).
export function NovaPuxadaForm({ rodadaId, corId, atual }: { rodadaId: string; corId: string; atual: Lab | null }) {
  const [erro, formAction, pending] = useActionState(registrarPuxada, undefined);

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-end gap-2 border-t border-dashed border-border pt-3">
      <input type="hidden" name="rodadaId" value={rodadaId} />
      <input type="hidden" name="corId" value={corId} />
      <div className="w-full text-xs font-medium text-muted-foreground">
        {atual ? "Corrigir o melhor LAB da puxada" : "Melhor LAB encontrado na puxada"}
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs">L*</Label>
        <Input name="l" inputMode="decimal" className="w-20" defaultValue={atual?.l} required />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs">a*</Label>
        <Input name="a" inputMode="decimal" className="w-20" defaultValue={atual?.a} required />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs">b*</Label>
        <Input name="b" inputMode="decimal" className="w-20" defaultValue={atual?.b} required />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {atual ? "Corrigir puxada" : "Registrar puxada"}
      </Button>
      {erro && <div className="anexo-erro w-full">{erro}</div>}
    </form>
  );
}
