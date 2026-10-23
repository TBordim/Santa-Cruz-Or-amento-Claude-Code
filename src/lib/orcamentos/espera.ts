// Há quanto tempo o card aguarda o retorno do cliente (a oferta foi enviada e ele ainda não
// respondeu). Serve pra cobrar o representante e o cliente. Dias de calendário (fuso de São Paulo),
// não de 24 em 24 horas: oferta enviada ontem à noite já conta "1 dia" hoje de manhã. Sem acesso ao banco.
const dia = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

export function diasAguardando(desde: Date | null | undefined, agora: Date = new Date()): number | null {
  if (!desde) return null;
  const ini = Date.parse(dia(desde));
  const fim = Date.parse(dia(agora));
  return Math.max(0, Math.round((fim - ini) / 86400000));
}

export function textoDiasAguardando(dias: number): string {
  if (dias === 0) return "Aguardando desde hoje";
  return `Aguardando há ${dias} ${dias === 1 ? "dia" : "dias"}`;
}

// Versão curta pro card do quadro, que é estreito: "Hoje", "1 dia", "10 dias".
export function textoDiasCurto(dias: number): string {
  return dias === 0 ? "Hoje" : `${dias} ${dias === 1 ? "dia" : "dias"}`;
}

// Cor da faixa: calmo até 2 dias, atenção de 3 a 6, cobrança a partir de 7.
export function tomEspera(dias: number): "calmo" | "atencao" | "cobrar" {
  return dias >= 7 ? "cobrar" : dias >= 3 ? "atencao" : "calmo";
}

export const ESTILO_ESPERA: Record<"calmo" | "atencao" | "cobrar", string> = {
  calmo: "bg-secondary text-muted-foreground",
  atencao: "bg-warn-soft text-warn",
  cobrar: "bg-bad text-white",
};
