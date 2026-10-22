// Detalhes técnicos exigidos para LIBERAR a Solicitação para a Engenharia (pedido do Thiago em
// 09/10/2026). O representante não é obrigado a preenchê-los ao abrir o Novo Orçamento (em
// viagem ele pode não ter os dados); quem libera pra Engenharia, sim. Sem acesso ao banco.
import { numeroMedida } from "./medidas";
import type { ReqCliente } from "./types";

// Lista do que falta, em texto pronto pra mensagem. Vazio = completo.
// Exigidos: as 3 medidas (altura pode ser 0 em produto plano), ao menos um material com descrição
// e gramatura, e ao menos um tipo de impressão. Acabamento, verniz, plástico, embalagem e
// fechamento ficam opcionais: "nenhum" é resposta válida (nem todo produto tem plástico).
export function faltaNosDetalhesTecnicos(req: ReqCliente | null | undefined): string[] {
  const falta: string[] = [];
  const medida = (v: string | undefined) => numeroMedida(v ?? "") !== null;
  if (!medida(req?.medidaF)) falta.push("Comprimento (mm)");
  if (!medida(req?.medidaL)) falta.push("Largura (mm)");
  if (!medida(req?.medidaA)) falta.push("Altura (mm) — use 0 se o produto for plano");

  const materialCompleto = (req?.suportes ?? []).some((s) => s.descricao.trim() && s.gramatura.trim());
  if (!materialCompleto) falta.push("Material (descrição e gramatura)");

  if (!req?.impressao?.length) falta.push("Impressão (ao menos um tipo)");
  return falta;
}
