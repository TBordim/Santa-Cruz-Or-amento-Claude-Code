import { diasAguardando } from "./espera";

// Validade do orçamento (pedido do Thiago em 28/10/2026): 15 dias a partir do envio da oferta. Passado o
// prazo, o responsável do setor entra em contato com o representante, o cliente ou o responsável para
// obter uma definição; sem definição, o orçamento é cancelado por vencimento do prazo de retorno.
// Dias de calendário no fuso de São Paulo. Sem acesso ao banco.

export const PRAZO_VALIDADE_DIAS = 15;
// A partir de quantos dias restantes o prazo entra em atenção (hora de entrar em contato).
export const DIAS_DE_ATENCAO = 3;

export type SituacaoPrazo = "ok" | "atencao" | "hoje" | "vencido";

export type PrazoDoOrcamento = {
  dias: number; // dias desde o envio da oferta
  restantes: number; // negativo quando vencido
  vencido: boolean;
  situacao: SituacaoPrazo;
  venceEm: string; // dd/mm/aaaa
};

const diaSP = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

export function prazoDoOrcamento(ofertaEnviadaEm: Date | string | null | undefined, agora: Date = new Date()): PrazoDoOrcamento | null {
  if (!ofertaEnviadaEm) return null;
  const desde = new Date(ofertaEnviadaEm);
  const dias = diasAguardando(desde, agora);
  if (dias === null) return null;
  const restantes = PRAZO_VALIDADE_DIAS - dias;
  const vence = new Date(Date.parse(diaSP(desde)) + PRAZO_VALIDADE_DIAS * 86400000);
  return {
    dias,
    restantes,
    vencido: restantes < 0,
    situacao: restantes < 0 ? "vencido" : restantes === 0 ? "hoje" : restantes <= DIAS_DE_ATENCAO ? "atencao" : "ok",
    venceEm: vence.toLocaleDateString("pt-BR", { timeZone: "UTC" }),
  };
}

export function textoPrazo(p: PrazoDoOrcamento): string {
  if (p.vencido) return `Prazo vencido há ${-p.restantes} ${-p.restantes === 1 ? "dia" : "dias"}`;
  if (p.restantes === 0) return "Prazo vence hoje";
  return `Prazo vence em ${p.restantes} ${p.restantes === 1 ? "dia" : "dias"}`;
}

export const ESTILO_PRAZO: Record<SituacaoPrazo, string> = {
  ok: "bg-secondary text-muted-foreground",
  atencao: "bg-warn-soft text-warn",
  hoje: "bg-warn-soft text-warn",
  vencido: "bg-bad text-white",
};

export const COM_QUEM_CONTATO = [
  { key: "REPRESENTANTE", label: "Representante" },
  { key: "CLIENTE", label: "Cliente" },
  { key: "RESPONSAVEL", label: "Responsável" },
] as const;

export function rotuloContato(key: string): string {
  return COM_QUEM_CONTATO.find((c) => c.key === key)?.label ?? key;
}
