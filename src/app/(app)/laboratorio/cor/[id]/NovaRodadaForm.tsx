"use client";

import { useState } from "react";
import { criarRodada } from "./actions";
import { useFormActionSemReset } from "@/hooks/use-form-action";
import { num } from "@/lib/cor/formato";
import { somaFecha100 } from "@/lib/cor/composicao";
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
type Linha = { key: number; baseId: string; percentual: string };

// Na 1ª rodada a fórmula vem do fornecedor (ou do nosso histórico); nas seguintes é um ajuste em
// cima da anterior — por isso a composição já vem preenchida com a última rodada, e o colorista só
// mexe no que mudou.
export function NovaRodadaForm({
  corId,
  bases,
  proximoNumero,
  composicaoAnterior,
}: {
  corId: string;
  bases: Base[];
  proximoNumero: number;
  composicaoAnterior: { baseId: string; percentual: number }[];
}) {
  const [erro, onSubmit, pending] = useFormActionSemReset(criarRodada, undefined);
  const [linhas, setLinhas] = useState<Linha[]>(
    composicaoAnterior.length > 0
      ? composicaoAnterior.map((c, i) => ({ key: i, baseId: c.baseId, percentual: num(c.percentual) }))
      : [{ key: 0, baseId: "", percentual: "" }],
  );

  const atualiza = (key: number, campo: "baseId" | "percentual", valor: string) =>
    setLinhas((ls) => ls.map((l) => (l.key === key ? { ...l, [campo]: valor } : l)));

  const total = linhas.reduce((s, l) => s + (Number(l.percentual.replace(",", ".")) || 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {proximoNumero === 1 ? "Registrar a primeira fórmula" : `Novo ajuste — rodada ${proximoNumero}`}
        </CardTitle>
        {proximoNumero > 1 && (
          <p className="text-sm text-muted-foreground">Vem preenchida com a fórmula da rodada anterior; altere o que ajustou.</p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="corId" value={corId} />
          <input type="hidden" name="numero" value={proximoNumero} />

          <div className="flex flex-col gap-1.5 sm:max-w-xs">
            <Label htmlFor="origem">Origem da fórmula</Label>
            <Select name="origem" defaultValue={proximoNumero === 1 ? undefined : "AJUSTE_MANUAL"} required>
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
            {linhas.map((linha) => (
              <div key={linha.key} className="flex items-center gap-2">
                <Select name="baseId" value={linha.baseId} onValueChange={(v) => atualiza(linha.key, "baseId", v)}>
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
                <Input
                  name="percentual"
                  inputMode="decimal"
                  placeholder="%"
                  className="w-24"
                  value={linha.percentual}
                  onChange={(e) => atualiza(linha.key, "percentual", e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remover linha"
                  onClick={() => setLinhas((ls) => (ls.length > 1 ? ls.filter((l) => l.key !== linha.key) : ls))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit gap-1.5"
                onClick={() => setLinhas((ls) => [...ls, { key: (ls.at(-1)?.key ?? 0) + 1, baseId: "", percentual: "" }])}
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar tinta
              </Button>
              <span className="font-mono text-xs text-muted-foreground">
                total: {num(total, 2)}%{somaFecha100(total) ? "" : " ⚠"}
              </span>
            </div>
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
