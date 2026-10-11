// Etapas, rótulos e regras do Aceite de Pedido. Sem acesso ao banco: serve tanto às Server
// Actions quanto aos componentes de cliente. Fluxo desenhado com o Thiago em 08/10/2026 (TP de
// Vendas 3.2, Engenharia 3.2 e PCP 3.3), com as decisões dele:
//  - o app não lê o ERP: estoque de produto acabado (sobras na expedição, TP de Vendas 3.2.1.1) e
//    versão do produto só recebem o visto de Vendas;
//  - estoque de papel pode ser total, parcial ou nenhum; o que falta vira Pedido de Material (PM);
//  - Engenharia e material correm em paralelo, e só com os dois prontos o Aceite vai ao PCP.

export const DESCRICAO_ACEITE =
  "Pedidos que o cliente fechou. Vendas verifica papel e versão, a Engenharia confere o cadastro, Compras garante o papel que falta, o PCP define a data de entrega, o Atendimento avisa o cliente e o PCP confirma a entrega.";

export const ETAPAS_ACEITE = [
  { key: "VENDAS", label: "1. Vendas", color: "#2E6B4F" },
  { key: "ENGENHARIA_MATERIAL", label: "2. Engenharia e material", color: "#6C63B5" },
  { key: "PCP", label: "3. PCP", color: "#2C7A8C" },
  { key: "PEDIDO", label: "4. Cadastro do pedido", color: "#946522" },
  // Atendimento ao Cliente envia a data prevista ao cliente e/ou representante (08/10/2026).
  { key: "ATENDIMENTO", label: "5. Informar o cliente", color: "#3E6E9E" },
  // Cliente avisado, pedido em produção: o PCP confirma a entrega e só então conclui (11/10/2026).
  { key: "ENTREGA", label: "6. Entrega ao cliente", color: "#2C7A8C" },
  { key: "CONCLUIDO", label: "7. Concluído", color: "#5B6270" },
] as const;

export type EtapaAceiteKey = (typeof ETAPAS_ACEITE)[number]["key"];

export function etapaAceiteInfo(key: string) {
  return ETAPAS_ACEITE.find((e) => e.key === key);
}

export const SITUACOES_PAPEL = [
  { key: "RESERVADO_TOTAL", label: "Tem todo o papel: reservado para o pedido" },
  { key: "RESERVADO_PARCIAL", label: "Tem parte: reservei o que há, o resto vai por PM" },
  { key: "SEM_ESTOQUE", label: "Não tem: todo o papel vai por PM" },
] as const;

export function situacaoPapelLabel(key: string | null | undefined): string {
  if (!key || key === "NAO_VERIFICADO") return "Não verificado";
  return SITUACOES_PAPEL.find((s) => s.key === key)?.label ?? key;
}

export const TIPOS_MATERIAL = [
  { key: "PAPEL", label: "Papel" },
  { key: "TINTA", label: "Tinta" },
  { key: "VERNIZ", label: "Verniz" },
  { key: "OUTRO", label: "Outro" },
] as const;

export function tipoMaterialLabel(key: string): string {
  return TIPOS_MATERIAL.find((t) => t.key === key)?.label ?? key;
}

export const STATUS_PM = [
  { key: "SOLICITADO", label: "Solicitado", pill: "pend" },
  { key: "EM_COMPRA", label: "Em compra", pill: "pend" },
  { key: "PRAZO_CONFIRMADO", label: "Prazo confirmado", pill: "good" },
  { key: "RECEBIDO", label: "Recebido", pill: "good" },
  { key: "CANCELADO", label: "Cancelado", pill: "neutral" },
] as const;

export type StatusPMKey = (typeof STATUS_PM)[number]["key"];

export function statusPMInfo(key: string) {
  return STATUS_PM.find((s) => s.key === key) ?? STATUS_PM[0];
}

export const PILL_STYLE: Record<string, string> = {
  pend: "bg-warn-soft text-warn",
  good: "bg-good-soft text-good",
  bad: "bg-bad-soft text-bad",
  neutral: "bg-secondary text-muted-foreground",
};

type PMResumo = { status: string; prazoPrevisto: Date | string | null; alertaEm?: Date | string | null; alertaVistoEm?: Date | string | null };

// PMs que contam pro pedido: cancelado não conta.
export function pmsAtivos<T extends PMResumo>(pms: T[]): T[] {
  return pms.filter((p) => p.status !== "CANCELADO");
}

// Data mais tarde entre os prazos dos PMs ativos: o papel inteiro só está disponível nela.
export function chegadaDoPapel(pms: PMResumo[]): Date | null {
  const datas = pmsAtivos(pms)
    .filter((p) => p.status !== "RECEBIDO" && p.prazoPrevisto)
    .map((p) => new Date(p.prazoPrevisto as Date | string));
  if (!datas.length) return null;
  return new Date(Math.max(...datas.map((d) => d.getTime())));
}

// Mudança do fornecedor ainda não vista pelo PCP.
export function temAlertaPendente(pms: PMResumo[]): boolean {
  return pmsAtivos(pms).some((p) => !!p.alertaEm && (!p.alertaVistoEm || new Date(p.alertaVistoEm) < new Date(p.alertaEm)));
}

// Datas sem horário (@db.Date) chegam como meia-noite UTC; formatar em UTC evita mostrar o dia
// anterior no fuso de Brasília.
export function fmtDia(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
}

// Valor de <input type="date"> (AAAA-MM-DD) a partir de uma data @db.Date.
export function paraInputData(d: Date | string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

// Lê AAAA-MM-DD de um formulário como data sem horário (meia-noite UTC). Vazio ou inválido = null.
export function lerData(v: FormDataEntryValue | null): Date | null {
  const s = String(v ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + "T00:00:00.000Z");
  return Number.isNaN(d.getTime()) ? null : d;
}

// Quantidade digitada no padrão brasileiro ("1.500,5" ou "1500"). Vazio ou inválido = null.
export function lerQuantidade(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim().replace(/\s/g, "");
  if (!s) return null;
  const n = Number(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/\.(?=\d{3}(\D|$))/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function fmtQuantidade(n: number | string | { toString(): string } | null | undefined, unidade?: string): string {
  if (n === null || n === undefined || n === "") return "—";
  const v = Number(n.toString());
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 3 }) + (unidade ? ` ${unidade}` : "");
}
