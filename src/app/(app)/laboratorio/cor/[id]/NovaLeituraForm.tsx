"use client";

import { useActionState } from "react";
import { registrarLeitura } from "./actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CONTEXTOS = [
  { value: "QUICKPEEK_FAIXA_1", label: "Quick Peek · faixa 1" },
  { value: "QUICKPEEK_FAIXA_2", label: "Quick Peek · faixa 2" },
  { value: "QUICKPEEK_FAIXA_3", label: "Quick Peek · faixa 3" },
  { value: "QUICKPEEK_FAIXA_4", label: "Quick Peek · faixa 4" },
  { value: "QUICKPEEK_FAIXA_5", label: "Quick Peek · faixa 5" },
  { value: "FINAL", label: "Final aprovada" },
  { value: "PRODUCAO", label: "Produção" },
];

// Registra as 5 faixas do Quick Peek, não só a vencedora — é exatamente o dado que hoje se
// perde. "vencedora" marca qual delas foi escolhida.
export function NovaLeituraForm({ rodadaId, corId }: { rodadaId: string; corId: string }) {
  const [erro, formAction, pending] = useActionState(registrarLeitura, undefined);

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-end gap-2 border-t border-dashed border-border pt-3">
      <input type="hidden" name="rodadaId" value={rodadaId} />
      <input type="hidden" name="corId" value={corId} />
      <div className="flex flex-col gap-1">
        <Label className="text-xs">Contexto</Label>
        <Select name="contexto" required>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Escolha…" />
          </SelectTrigger>
          <SelectContent>
            {CONTEXTOS.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs">L*</Label>
        <Input name="l" inputMode="decimal" className="w-20" required />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs">a*</Label>
        <Input name="a" inputMode="decimal" className="w-20" required />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs">b*</Label>
        <Input name="b" inputMode="decimal" className="w-20" required />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs">Densidade</Label>
        <Input name="densidade" inputMode="decimal" className="w-24" />
      </div>
      <label className="flex items-center gap-1.5 pb-2 text-xs">
        <Checkbox name="vencedora" />
        vencedora
      </label>
      <Button type="submit" size="sm" disabled={pending}>
        Registrar leitura
      </Button>
      {erro && <div className="anexo-erro w-full">{erro}</div>}
    </form>
  );
}
