// Cancelamento de pedido no Aceite (19/10/2026, regras da Karen). Sem acesso ao banco.
//
// Só Vendas cancela, com motivo livre, e o pedido não reabre (se o cliente voltar, abre-se outro Aceite).
// Quem é avisado depende do que já foi feito: PCP se o pedido já tinha sido programado; Compras só se o
// papel já foi reservado ou comprado; Engenharia se o pedido era novo ou teve alteração que pediu faca,
// clichê ou cadastro; Pré-impressão se a OF já estava aberta. O papel NÃO é cancelado pelo sistema:
// Compras decide caso a caso quais Ordens de Compra podem ser canceladas.

import { lotesDoAceite, type AceiteComLotes } from "./lotes";
import { fmtDia } from "./constantes";

export type SetorAviso = "PCP" | "COMPRAS" | "ENGENHARIA";

export const SETOR_AVISO: Record<SetorAviso, { rotulo: string; area: "PCP_ENTREGA" | "COMPRAS_PM" | "ACEITE_ENGENHARIA" }> = {
  PCP: { rotulo: "PCP", area: "PCP_ENTREGA" },
  COMPRAS: { rotulo: "Compras", area: "COMPRAS_PM" },
  ENGENHARIA: { rotulo: "Engenharia", area: "ACEITE_ENGENHARIA" },
};

type AceiteParaCancelar = AceiteComLotes & {
  facaNova?: boolean;
  clicheNovo?: boolean;
  cadastroSituacao?: string;
  pedidoCadastradoEm?: Date | null;
  pedidosMaterial?: { numero?: number; status: string; loteId?: string | null }[];
};

export type Cancelamento = {
  avisos: { setor: SetorAviso; texto: string }[];
  // OF já aberta: a Pré-impressão precisa saber (hoje avisada fora do sistema).
  avisarPreImpressao: boolean;
  // O que Vendas faz no ERP, e que o formulário pede para confirmar.
  temOF: boolean;
  temPedidoNoERP: boolean;
};

export function avaliarCancelamento(a: AceiteParaCancelar): Cancelamento {
  const lotes = lotesDoAceite(a);
  const avisos: Cancelamento["avisos"] = [];

  // PCP: já programado = o PCP definiu a data (do Aceite ou de algum lote).
  const programados = lotes.filter((l) => l.pcpEm || ["PEDIDO", "ATENDIMENTO", "ENTREGA"].includes(l.etapa));
  if (programados.length) {
    const datas = programados.map((l) => l.dataEntrega).filter((d): d is Date => !!d);
    avisos.push({
      setor: "PCP",
      texto: `O pedido já tinha passado pelo PCP${datas.length ? ` (entrega prevista ${datas.map((d) => fmtDia(d)).join(", ")})` : ""}. Tire da programação.`,
    });
  }

  // Compras: papel reservado em estoque ou Pedido de Material ativo (comprado/solicitado).
  const reservado = lotes.some((l) => l.suportes.some((s) => s.situacao === "RESERVADO_TOTAL" || s.situacao === "RESERVADO_PARCIAL"));
  const pms = (a.pedidosMaterial ?? []).filter((p) => p.status !== "CANCELADO");
  if (reservado || pms.length) {
    const partes = [
      reservado ? "há papel reservado em estoque (a reserva não deve ser renovada)" : null,
      pms.length ? `há ${pms.length} Pedido${pms.length > 1 ? "s" : ""} de Material ativo${pms.length > 1 ? "s" : ""}${pms.some((p) => p.numero) ? ` (PM ${pms.map((p) => p.numero).filter(Boolean).join(", ")})` : ""}: decida caso a caso quais Ordens de Compra podem ser canceladas` : null,
    ].filter(Boolean);
    avisos.push({ setor: "COMPRAS", texto: `Pedido cancelado: ${partes.join("; ")}.` });
  }

  // Engenharia: pedido novo ou alteração que pediu faca, clichê ou cadastro.
  if (a.facaNova || a.clicheNovo || a.cadastroSituacao === "CRIADO") {
    avisos.push({
      setor: "ENGENHARIA",
      texto: `Pedido cancelado, com ${[a.cadastroSituacao === "CRIADO" ? "produto novo cadastrado" : null, a.facaNova ? "faca nova" : null, a.clicheNovo ? "clichê novo" : null].filter(Boolean).join(", ")}. Veja se ainda é preciso.`,
    });
  }

  const temOF = lotes.some((l) => !!l.numeroOF);
  return { avisos, avisarPreImpressao: temOF, temOF, temPedidoNoERP: lotes.some((l) => !!l.pedidoCadastradoEm) || !!a.pedidoCadastradoEm };
}

// O que ficou por fazer no ERP, dado o que Vendas marcou na hora de cancelar.
export function pendenciaNoErp(c: Pick<Cancelamento, "temOF">, feito: { pedido: boolean; of: boolean; envelope: boolean }): boolean {
  return !feito.pedido || (c.temOF && (!feito.of || !feito.envelope));
}
