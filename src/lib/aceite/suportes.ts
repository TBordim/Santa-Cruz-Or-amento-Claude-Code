// Papéis (suportes) de um Aceite. Sem acesso ao banco: serve às Server Actions e às telas.
//
// Um Aceite pode usar vários papéis (na planilha do PCP há pedidos com quatro códigos, ou
// "Diversos"; decisão do Thiago em 08/10/2026). Cada papel tem a própria situação no estoque, e o
// que falta vai por Pedido de Material (PM), que é independente: pode ser de outro papel e formato. O
// Aceite nasce com o papel da SO fechada e os materiais de "conjunto" do orçamento; Vendas acrescenta
// outros (por exemplo, um formato a mais do estoque). Na tela o bloco é "Papel a ser utilizado".

import { opcoesDePapel, usoDoMaterial } from "@/lib/orcamentos/modelos";
import { parseQuantidade } from "@/lib/orcamentos/motor";
import type { PrecificacaoTier, ReqCliente, ReqTecnicos } from "@/lib/orcamentos/types";

export type SituacaoSuporte = "NAO_VERIFICADO" | "RESERVADO_TOTAL" | "RESERVADO_PARCIAL" | "SEM_ESTOQUE";

export type SuporteAceite = {
  id: string;
  // Tipo do papel (ex.: Vitamax), gramatura, código no ERP e formato.
  descricao: string;
  gramatura: string;
  codigo: string;
  formato: string;
  qtdFolha: number | null;
  folhas: number | null;
  // Folhas de acerto previstas no orçamento (somam às de produção na conta sugerida). Ausente em Aceites antigos.
  folhasAcerto?: number | null;
  situacao: SituacaoSuporte;
  obs: string;
  // Como o orçamento especificou, quando o papel veio dele; mostra a troca se Vendas mudar.
  doOrcamento: { descricao: string; gramatura: string; codigo: string; formato: string } | null;
};

export const SITUACOES_SUPORTE: { key: Exclude<SituacaoSuporte, "NAO_VERIFICADO">; label: string }[] = [
  { key: "RESERVADO_TOTAL", label: "Do estoque: reservado" },
  { key: "RESERVADO_PARCIAL", label: "Estoque em parte, o resto por PM" },
  { key: "SEM_ESTOQUE", label: "Sem estoque: tudo por PM" },
];

export function textoSuporte(s: Pick<SuporteAceite, "descricao" | "gramatura" | "formato">): string {
  return [s.descricao, s.gramatura && `${s.gramatura} g`, s.formato].filter(Boolean).join(" · ") || "Papel sem descrição";
}

// Papéis da SO fechada: o papel escolhido (opção) mais os materiais de conjunto.
export function suportesDoOrcamento(reqCliente: ReqCliente | null, reqTecnicos: ReqTecnicos | null, so: PrecificacaoTier | null): SuporteAceite[] {
  const lista = reqCliente?.suportes ?? [];
  const escolhido = so?.papelIdx ?? opcoesDePapel(reqCliente)[0]?.idx ?? 0;
  const indices = lista.map((s, idx) => ({ s, idx })).filter(({ s, idx }) => idx === escolhido || usoDoMaterial(s, idx) === "conjunto");
  if (!indices.length) indices.push({ s: { descricao: "", gramatura: "" }, idx: 0 });
  return indices.map(({ s, idx }, n) => {
    const t = reqTecnicos?.suportes?.[idx];
    const qtdFolhaTxt = t?.qtdFolha ?? (idx === 0 ? reqTecnicos?.qtdFolha : undefined);
    const base = { descricao: s.descricao ?? "", gramatura: s.gramatura ?? "", codigo: t?.codigo ?? "", formato: t?.formato ?? "" };
    return { id: `s${n + 1}`, ...base, qtdFolha: parseQuantidade(qtdFolhaTxt ?? null), folhas: null, folhasAcerto: parseQuantidade(t?.flsAcerto ?? (idx === 0 ? reqTecnicos?.flsAcerto : undefined) ?? null), situacao: "NAO_VERIFICADO", obs: "", doOrcamento: base };
  });
}

type AceiteComSuportes = {
  suportes?: unknown;
  suporteCodigo?: string | null;
  suporteDescricao?: string | null;
  suporteQtdFolha?: number | null;
  suporteFolhas?: number | null;
  suporteUtilizarCodigo?: string | null;
  suporteUtilizarDescricao?: string | null;
  situacaoPapel?: string;
  papelObs?: string | null;
};

// Lista de papéis do Aceite. Aceites de antes da lista (papel único nos campos suporte*) viram um
// papel só, com a troca ("suporte a utilizar") aplicada e a situação geral do Aceite.
export function lerSuportes(a: AceiteComSuportes): SuporteAceite[] {
  if (Array.isArray(a.suportes) && a.suportes.length) return a.suportes as SuporteAceite[];
  if (!a.suporteCodigo && !a.suporteDescricao && !a.suporteUtilizarCodigo) return [];
  const doOrcamento = { descricao: a.suporteDescricao ?? "", gramatura: "", codigo: a.suporteCodigo ?? "", formato: "" };
  return [
    {
      id: "s1",
      descricao: a.suporteUtilizarDescricao || doOrcamento.descricao,
      gramatura: "",
      codigo: a.suporteUtilizarCodigo || doOrcamento.codigo,
      formato: "",
      qtdFolha: a.suporteQtdFolha ?? null,
      folhas: a.suporteFolhas ?? null,
      situacao: (a.situacaoPapel as SituacaoSuporte) ?? "NAO_VERIFICADO",
      obs: a.papelObs ?? "",
      doOrcamento,
    },
  ];
}

// Situação geral do papel do Aceite (o campo situacaoPapel), a partir de cada papel.
export function situacaoGeral(suportes: SuporteAceite[]): SituacaoSuporte {
  if (!suportes.length || suportes.some((s) => s.situacao === "NAO_VERIFICADO")) return "NAO_VERIFICADO";
  if (suportes.every((s) => s.situacao === "RESERVADO_TOTAL")) return "RESERVADO_TOTAL";
  if (suportes.every((s) => s.situacao === "SEM_ESTOQUE")) return "SEM_ESTOQUE";
  return "RESERVADO_PARCIAL";
}

type PMResumo = { status: string; prazoPrevisto: Date | string | null; suporteRef?: string | null };

// PMs ativos do Aceite. Desde 11/10/2026 o PM não é preso a um papel: o que falta de estoque pode ser
// comprado em outro papel ou formato, conforme a oferta do mercado; então todos os PMs ativos valem
// para o conjunto (os antigos, com suporteRef, passam a valer igual).
export function pmsAtivos<T extends PMResumo>(pms: T[]): T[] {
  return pms.filter((p) => p.status !== "CANCELADO");
}

// Papel garantido = cada papel reservado por inteiro, ou com PM ativo e data de chegada definida
// (ou recebido). Mesma regra de antes, agora papel por papel.
export function suportesGarantidos(suportes: SuporteAceite[], pms: PMResumo[]): boolean {
  if (!suportes.length) return false;
  return suportes.every((s) => {
    if (s.situacao === "RESERVADO_TOTAL") return true;
    if (s.situacao === "NAO_VERIFICADO") return false;
    const doPapel = pmsAtivos(pms);
    return doPapel.length > 0 && doPapel.every((p) => p.status === "RECEBIDO" || !!p.prazoPrevisto);
  });
}

// Papel sem estoque completo e sem nenhum PM ativo: Vendas precisa emitir o PM antes de liberar.
export function suportesSemPM(suportes: SuporteAceite[], pms: PMResumo[]): SuporteAceite[] {
  return suportes.filter((s) => (s.situacao === "RESERVADO_PARCIAL" || s.situacao === "SEM_ESTOQUE") && pmsAtivos(pms).length === 0);
}

// Atalho com o Aceite inteiro (lista de papéis + PMs), usado pelas telas e pelo avanço ao PCP.
export function papelGarantido(a: AceiteComSuportes & { pedidosMaterial: PMResumo[] }): boolean {
  return suportesGarantidos(lerSuportes(a), a.pedidosMaterial);
}
