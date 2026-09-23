"use client";

import { useActionState, useState } from "react";
import { criarRodada } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

const ORIGENS = [
  { value: "FORNECEDOR", label: "Fórmula do fornecedor" },
  { value: "AJUSTE_MANUAL", label: "Ajuste nosso" },
];

type Base = { id: string; codigo: string; nome: string };

export function NovaRodadaForm({
  corId,
  bases,
  proximoNumero,
}: {
  corId: string;
  bases: Base[];
  proximoNumero: number;
}) {
  const [erro, formAction, pending] = useActionState(criarRodada, undefined);
  const [linhas, setLinhas] = useState<number[]>([0]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Registrar rodada {proximoNumero}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="corId" value={corId} />
          <input type="hidden" name="numero" value={proximoNumero} />

          <div className="flex flex-col gap-1.5 sm:max-w-xs">
            <Label htmlFor="origem">Origem da fórmula</Label>
            <Select name="origem" required>
              <SelectTrigger id="origem" className="w-full">
                <SelectValue placeholder="Escolha…" />
              </SelectTrigger>
              <SelectContent>
                {ORIGENS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Composição</Label>
            {linhas.map((key) => (
              <div key={key} className="flex items-center gap-2">
                <Select name="baseId">
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="Base…" />
                  </SelectTrigger>
                  <SelectContent>
                    {bases.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.codigo} — {b.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input name="percentual" inputMode="decimal" placeholder="%" className="w-24" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remover linha"
                  onClick={() => setLinhas((ls) => (ls.length > 1 ? ls.filter((k) => k !== key) : ls))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit gap-1.5"
              onClick={() => setLinhas((ls) => [...ls, (ls.at(-1) ?? 0) + 1])}
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar tinta
            </Button>
          </div>

          {erro && <div className="anexo-erro">{erro}</div>}
          <div>
            <Button type="submit" disabled={pending}>
              Salvar rodada
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
