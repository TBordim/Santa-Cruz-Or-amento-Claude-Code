// Listas de opções dos formulários — portadas 1:1 do santa-cruz-orcamentos.html (linhas 745-793).
export const ORIGENS_PEDIDO = ["Representante", "Cliente direto", "Interna"] as const;

export const CLASSIFICACOES = [
  { key: "NOVO", label: "Produto novo" },
  { key: "REPETICAO_SEM_ALTERACAO", label: "Repetição — sem alteração" },
  { key: "REPETICAO_COM_ALTERACAO", label: "Repetição — com alteração" },
  { key: "REPETICAO_NOVO", label: "Repetição — item novo do cliente" },
] as const;

export const ANALISE_CREDITO = ["Não aplicável (cliente já cadastrado)", "Pendente", "Aprovada", "Reprovada"] as const;
// Únicos valores que liberam avançar da Solicitação pra Engenharia (validarSolicitacao).
export const CREDITO_LIBERA = ["Não aplicável (cliente já cadastrado)", "Aprovada"];

export const OPCOES_FSC = ["Não FSC", "FSC"] as const;
export const OPCOES_IMPRESSAO = ["CMYK", "Pantone", "Especial", "Reativa", "Segurança", "Outro"] as const;
export const OPCOES_ACABAMENTO = ["Guilhotina", "Relevo Seco", "Hot-Stamping", "Corte e Vinco", "Relevo Brailler", "Acetato", "Colagem", "Outro"] as const;
export const OPCOES_VERNIZ = ["B. D'água", "B. D'água Fosco", "Fungicida", "UV Brilho", "Perolado", "Blister PVC", "Blister PET", "High Gloss", "Impermeabilizante", "Outro"] as const;
export const OPCOES_PLASTICO = ["Polietileno", "BOPP", "Brilho", "Fosco", "Externo", "Interno"] as const;
export const OPCOES_EMBALAGEM = ["Caixa de Papelão", "Kraft"] as const;
export const OPCOES_ANEXOS_ENGENHARIA = ["Especificação GSC Montagem", "Outro"] as const;
export const OPCOES_MODALIDADE = ["C.I.F.", "F.O.B."] as const;

export const DESFECHOS = [
  { key: "AGUARDANDO", label: "Aguardando retorno do cliente", pill: "neutral" },
  { key: "POSITIVO", label: "Positivo — virou pedido", pill: "good" },
  { key: "NEGATIVO", label: "Negativo — orçamento perdido", pill: "bad" },
  { key: "SEM_RETORNO", label: "Sem retorno do cliente", pill: "neutral" },
] as const;

export const PERIODOS = [
  { key: "todos", label: "Todos", dias: null },
  { key: "7d", label: "Última semana", dias: 7 },
  { key: "15d", label: "Última quinzena", dias: 15 },
  { key: "30d", label: "Último mês", dias: 30 },
  { key: "365d", label: "Último ano", dias: 365 },
  { key: "personalizado", label: "Personalizado", dias: null },
] as const;

export const ETAPAS = [
  { key: "ABERTO", label: "1. Solicitação de Orçamento", color: "#7A8699" },
  { key: "ENGENHARIA", label: "2. Engenharia", color: "#6C63B5" },
  { key: "ORCAMENTO", label: "3. Orçamento", color: "#2C7A8C" },
  { key: "DIRETORIA", label: "4. Diretoria", color: "#8C3B2E" },
  { key: "ENVIO_OFERTA", label: "5. Envio de oferta", color: "#3E7FA6" },
  { key: "FINALIZADO", label: "6. Retorno do Cliente", color: "#2F8F5B" },
  // Só produto novo com desfecho positivo e sem Nº de Cadastro de Produto passa por aqui.
  { key: "CADASTRO_PRODUTO", label: "7. Cadastro de Produto", color: "#946522" },
] as const;

export function etapaInfo(key: string) {
  return ETAPAS.find((e) => e.key === key);
}

export function classificacaoLabel(key: string | null | undefined) {
  return CLASSIFICACOES.find((c) => c.key === key)?.label ?? "—";
}

export function desfechoInfo(key: string | null | undefined) {
  return DESFECHOS.find((d) => d.key === key) ?? DESFECHOS[0];
}

// Equivalente a resumoAcabamento() — resume as seleções de acabamento/verniz/plástico feitas
// em Em Aberto (reqCliente) num texto único, usado como sugestão inicial do campo "Acabamento"
// no Orçamento (que o próprio Orçamento pode editar, mas não deveria nascer em branco).
export function resumoAcabamento(reqCliente: {
  acabamentos?: string[];
  acabamentoOutro?: string;
  verniz?: string[];
  plastico?: string[];
} | null | undefined): string {
  if (!reqCliente) return "";
  const partes: string[] = [];
  if (reqCliente.acabamentos?.length) partes.push(reqCliente.acabamentos.join(", "));
  if (reqCliente.acabamentoOutro) partes.push(reqCliente.acabamentoOutro);
  if (reqCliente.verniz?.length) partes.push("Verniz: " + reqCliente.verniz.join(", "));
  if (reqCliente.plastico?.length) partes.push("Plástico: " + reqCliente.plastico.join(", "));
  return partes.join(" · ");
}

export function fmtMoney(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return "R$ " + Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// new Date() em vez de new Date(Date.now() - x) — o linter (react-hooks/purity) reclama de
// Date.now() chamado direto num Server Component; new Date() sozinho não dispara o aviso.
export function dataLimite(diasAtras: number): Date {
  const d = new Date();
  d.setTime(d.getTime() - diasAtras * 86400000);
  return d;
}

export function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " " + dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
