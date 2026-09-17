"use client";

import { excluirCard } from "../actions";

export function ExcluirCardButton({ id }: { id: string }) {
  return (
    <form
      action={excluirCard}
      onSubmit={(e) => {
        if (!confirm("Excluir este orçamento é definitivo. Confirma?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="btn ghost">Excluir card</button>
    </form>
  );
}
