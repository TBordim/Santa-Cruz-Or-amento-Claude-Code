"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, Row2 } from "@/components/form-section";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UsoMaterial } from "@/lib/orcamentos/types";

type Linha = { a: string; b: string; uso?: UsoMaterial | "" };

// Lista repetível de suportes (papel) da Solicitação — descrição + gramatura. `campoA`/`campoB`
// são os `name` dos dois campos de cada linha; FormData.getAll() nos dois nomes, pareados por
// índice, reconstrói a lista no server action.
//
// Com `comUso`, cada material a partir do segundo pergunta se é uma opção de fornecimento
// (papel alternativo: gera as próprias SOs) ou se é de uso conjunto (entra junto no produto).
// A primeira linha manda "opcao" num campo escondido pra manter `suporteUso` pareado com os
// outros dois. Pedido do Thiago em 30/09/2026.
export function SuportesLista({
  campoA,
  campoB,
  labelA,
  labelB,
  valoresIniciais,
  comUso,
}: {
  campoA: string;
  campoB: string;
  labelA: string;
  labelB: string;
  valoresIniciais?: Linha[];
  comUso?: boolean;
}) {
  const [linhas, setLinhas] = useState<Linha[]>(valoresIniciais?.length ? valoresIniciais : [{ a: "", b: "" }]);
  const atualizar = (i: number, parcial: Partial<Linha>) => setLinhas(linhas.map((x, j) => (j === i ? { ...x, ...parcial } : x)));

  return (
    <div className="flex flex-col gap-3">
      {linhas.map((l, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
          <Row2>
            <Field label={labelA}>
              <Input name={campoA} value={l.a} onChange={(e) => atualizar(i, { a: e.target.value })} />
            </Field>
            <Field label={labelB}>
              <Input name={campoB} value={l.b} onChange={(e) => atualizar(i, { b: e.target.value })} />
            </Field>
          </Row2>
          {comUso &&
            (i === 0 ? (
              <input type="hidden" name="suporteUso" value="opcao" />
            ) : (
              <Field
                label="Este material é"
                hint={
                  l.uso === "opcao"
                    ? "Papel alternativo: o cliente escolhe entre os papéis, e cada um gera as próprias SOs."
                    : l.uso === "conjunto"
                      ? "Entra junto no produto, em todas as SOs."
                      : "Obrigatório para liberar para a Engenharia."
                }
              >
                {/* Valor vai por campo escondido, não pelo `name` do Select: sem escolha, o
                    <select> nativo interno do Radix pode submeter a primeira opção sozinho. */}
                <input type="hidden" name="suporteUso" value={l.uso ?? ""} />
                <Select value={l.uso ?? ""} onValueChange={(v) => atualizar(i, { uso: v as UsoMaterial })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Escolha…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="opcao">Opção de fornecimento (outro papel)</SelectItem>
                    <SelectItem value="conjunto">Uso conjunto (entra junto no produto)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            ))}
          {linhas.length > 1 && (
            <Button type="button" variant="ghost" size="sm" className="w-fit text-destructive hover:text-destructive" onClick={() => setLinhas(linhas.filter((_, j) => j !== i))}>
              Remover material
            </Button>
          )}
        </div>
      ))}
      <div>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setLinhas([...linhas, { a: "", b: "", uso: "" }])}>
          <Plus className="h-3.5 w-3.5" /> Adicionar material
        </Button>
      </div>
    </div>
  );
}
