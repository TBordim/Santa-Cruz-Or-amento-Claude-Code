"use client";

import { useState } from "react";

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
    <div>
      {valores.map((v, i) => (
        <div key={i} className="row2" style={{ gridTemplateColumns: "1fr auto", marginBottom: 8 }}>
          <input
            name={name}
            value={v}
            placeholder={placeholder}
            onChange={(e) => setValores(valores.map((x, j) => (j === i ? e.target.value : x)))}
          />
          {valores.length > 1 && (
            <button
              type="button"
              className="btn ghost"
              onClick={() => setValores(valores.filter((_, j) => j !== i))}
            >
              Remover
            </button>
          )}
        </div>
      ))}
      <div className="btn-row">
        <button type="button" className="btn secondary" onClick={() => setValores([...valores, ""])}>
          {botaoLabel}
        </button>
      </div>
    </div>
  );
}
