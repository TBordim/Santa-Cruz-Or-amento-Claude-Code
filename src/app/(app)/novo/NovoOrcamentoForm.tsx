"use client";

import { useActionState } from "react";
import { CamposComerciaisFields } from "@/components/orcamento/CamposComerciaisFields";
import { criarOrcamento } from "./actions";

export function NovoOrcamentoForm() {
  const [state, formAction, pending] = useActionState(criarOrcamento, undefined);

  if (state?.sucesso) {
    return (
      <div className="panel">
        <h3 className="sub-head" style={{ marginTop: 0 }}>Solicitação enviada</h3>
        <p>Sua solicitação de orçamento foi registrada. A equipe da Santa Cruz vai dar seguimento.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="panel" style={{ maxWidth: 760 }}>
      <CamposComerciaisFields />
      {state?.erro && <div className="anexo-erro">{state.erro}</div>}
      <div className="btn-row">
        <button type="submit" className="btn" disabled={pending}>
          {pending ? "Enviando…" : "Enviar solicitação"}
        </button>
      </div>
    </form>
  );
}
