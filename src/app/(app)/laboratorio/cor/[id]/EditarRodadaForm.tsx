"use client";

import { useEffect, useRef, useState } from "react";
import { editarRodada } from "./actions";
import { useFormActionSemReset } from "@/hooks/use-form-action";
import { num } from "@/lib/cor/formato";
import { somaFecha100 } from "@/lib/cor/composicao";
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

// Editor da composição de uma rodada JÁ SALVA — mesmo formato de linhas do NovaRodadaForm, mas
// carregado com a composição atual em vez da rodada anterior, e chamando editarRodada.
export function EditarRodadaForm({
  corId,
  rodadaId,
  origemAtual,
  bases,
  composicaoAtual,
  onFechar,
}: {
  corId: string;
  rodadaId: string;
  origemAtual: string;
  bases: Base[];
  composicaoAtual: { baseId: string; percentual: number }[];
  onFechar: () => void;
}) {
  const [erro, onSubmit, pending] = useFormActionSemReset(editarRodada, undefined);
  const enviou = useRef(false);

  // Fecha sozinho quando a correção salva com sucesso — mesmo motivo do EditarCorForm.
  useEffect(() => {
    if (pending) enviou.current = true;
    else if (enviou.current && !erro) onFechar();
  }, [pending, erro, onFechar]);

  const [linhas, setLinhas] = useState<Linha[]>(
    composicaoAtual.length > 0
      ? composicaoAtual.map((c, i) => ({ key: i, baseId: c.baseId, percentual: num(c.percentual) }))
      : [{ key: 0, baseId: "", percentual: "" }],
  );

  const atualiza = (key: number, campo: "baseId" | "percentual", valor: string) =>
    setLinhas((ls) => ls.map((l) => (l.key === key ? { ...l, [campo]: valor } : l)));

  const total = linhas.reduce((s, l) => s + (Number(l.percentual.replace(",", ".")) || 0), 0);

  // Rodada importada da planilha antiga não tem "Fornecedor"/"Ajuste nosso" como origem real —
  // mantém o valor atual selecionável (mas fora da lista normal) em vez de forçar uma escolha errada.
  const origens = ORIGENS.some((o) => o.value === origemAtual)
    ? ORIGENS
    : [...ORIGENS, { value: origemAtual, label: "Importada da planilha (manter)" }];

  return (
    <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-4 border-t border-dashed border-border pt-3">
      <input type="hidden" name="corId" value={corId} />
      <input type="hidden" name="rodadaId" value={rodadaId} />

      <div className="flex flex-col gap-1.5 sm:max-w-xs">
        <Label htmlFor={`origem-${rodadaId}`}>Origem da fórmula</Label>
        <Select name="origem" defaultValue={origemAtual} required>
          <SelectTrigger id={`origem-${rodadaId}`} className="w-full">
            <SelectValue placeholder="Escolha…" />
          </SelectTrigger>
          <SelectContent>
            {origens.map((o) => (
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
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Salvando…" : "Salvar correção"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onFechar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
