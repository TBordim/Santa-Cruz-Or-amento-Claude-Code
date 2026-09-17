"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Lista repetível de valores simples (ex.: quantidadesLista) — cada input compartilha o mesmo
// `name`, então FormData.getAll(name) no server action já devolve a lista na ordem certa, sem
// precisar de nenhum código especial de leitura (mesmo truque usado nos checkboxes de área do
// formulário de Perfil). Em React, adicionar/remover linha é só estado — nenhuma manipulação
// direta do DOM feita a mão, ao contrário do santa-cruz-orcamentos.html (ver comentário na
// linha 218 do arquivo original sobre por que ele precisava fazer isso).
export function ListaDinamica({
  name,
  placeholder,
  valoresIniciais,
  botaoLabel,
}: {
  name: string;
  placeholder?: string;
  valoresIniciais?: string[];
  botaoLabel: string;
}) {
  const [valores, setValores] = useState<string[]>(valoresIniciais?.length ? valoresIniciais : [""]);

  return (
    <div className="flex flex-col gap-2">
      {valores.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            name={name}
            value={v}
            placeholder={placeholder}
            onChange={(e) => setValores(valores.map((x, j) => (j === i ? e.target.value : x)))}
          />
          {valores.length > 1 && (
            <Button type="button" variant="ghost" size="icon" onClick={() => setValores(valores.filter((_, j) => j !== i))}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      <div>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setValores([...valores, ""])}>
          <Plus className="h-3.5 w-3.5" /> {botaoLabel}
        </Button>
      </div>
    </div>
  );
}
