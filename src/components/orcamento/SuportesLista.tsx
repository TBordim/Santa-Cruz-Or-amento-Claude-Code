"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, Row2 } from "@/components/form-section";

// Lista repetível de suportes (papel). `campoA`/`campoB` são os `name` dos dois campos de cada
// linha (descricao+gramatura em Em Aberto, formato+codigo na Engenharia) — FormData.getAll()
// nos dois nomes, pareados por índice, reconstrói a lista no server action.
export function SuportesLista({
  campoA,
  campoB,
  labelA,
  labelB,
  valoresIniciais,
}: {
  campoA: string;
  campoB: string;
  labelA: string;
  labelB: string;
  valoresIniciais?: { a: string; b: string }[];
}) {
  const [linhas, setLinhas] = useState(valoresIniciais?.length ? valoresIniciais : [{ a: "", b: "" }]);

  return (
    <div className="flex flex-col gap-3">
      {linhas.map((l, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
          <Row2>
            <Field label={labelA}>
              <Input
                name={campoA}
                value={l.a}
                onChange={(e) => setLinhas(linhas.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))}
              />
            </Field>
            <Field label={labelB}>
              <Input
                name={campoB}
                value={l.b}
                onChange={(e) => setLinhas(linhas.map((x, j) => (j === i ? { ...x, b: e.target.value } : x)))}
              />
            </Field>
          </Row2>
          {linhas.length > 1 && (
            <Button type="button" variant="ghost" size="sm" className="w-fit text-destructive hover:text-destructive" onClick={() => setLinhas(linhas.filter((_, j) => j !== i))}>
              Remover material
            </Button>
          )}
        </div>
      ))}
      <div>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setLinhas([...linhas, { a: "", b: "" }])}>
          <Plus className="h-3.5 w-3.5" /> Adicionar material
        </Button>
      </div>
    </div>
  );
}
