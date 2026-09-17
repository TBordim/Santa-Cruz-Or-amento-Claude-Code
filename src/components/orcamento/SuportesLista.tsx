"use client";

import { useState } from "react";

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
    <div>
      {linhas.map((l, i) => (
        <div key={i} className="suporte-linha">
          <div className="row2">
            <div className="field">
              <label>{labelA}</label>
              <input
                name={campoA}
                value={l.a}
                onChange={(e) => setLinhas(linhas.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))}
              />
            </div>
            <div className="field">
              <label>{labelB}</label>
              <input
                name={campoB}
                value={l.b}
                onChange={(e) => setLinhas(linhas.map((x, j) => (j === i ? { ...x, b: e.target.value } : x)))}
              />
            </div>
          </div>
          {linhas.length > 1 && (
            <button type="button" className="btn ghost" onClick={() => setLinhas(linhas.filter((_, j) => j !== i))}>
              Remover material
            </button>
          )}
        </div>
      ))}
      <div className="btn-row">
        <button type="button" className="btn secondary" onClick={() => setLinhas([...linhas, { a: "", b: "" }])}>
          + Adicionar material
        </button>
      </div>
    </div>
  );
}
