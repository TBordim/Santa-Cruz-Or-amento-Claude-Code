// Datas digitadas nas telas do Aceite, PCP, Compras e Atendimento: bloqueia data retroativa onde a data é uma
// PREVISÃO (entrega, prazo, chegada) e data absurda onde é um REGISTRO do que já aconteceu (entrega feita,
// recebimento). Pedido do PCP em 31/10/2026: um lançamento saiu em 2016 em vez de 2026. Sem acesso ao banco.
import { fmtDia } from "./constantes";

const DIA = 86400000;
// Previsão mais de 2 anos à frente é quase certamente erro de digitação (ex.: 2062).
const LIMITE_FUTURO_DIAS = 730;

// Data PREVISTA (entrega, prazo, chegada, data pedida): não pode ser anterior a hoje.
export function erroDataPrevista(data: Date | null, rotulo: string, hoje: Date): string | null {
  if (!data) return null;
  if (data < hoje) return `A ${rotulo} não pode ser anterior a hoje (${fmtDia(hoje)}). Confira o ano e o dia.`;
  if (data.getTime() > hoje.getTime() + LIMITE_FUTURO_DIAS * DIA) return `A ${rotulo} (${fmtDia(data)}) está muito distante. Confira o ano.`;
  return null;
}

// Data REGISTRADA do que já aconteceu (entrega feita, recebimento): não pode ser depois de hoje nem antes de o
// pedido existir (`desde`).
export function erroDataRegistrada(data: Date | null, rotulo: string, desde: Date, hoje: Date): string | null {
  if (!data) return null;
  if (data > hoje) return `A ${rotulo} não pode ser depois de hoje.`;
  const inicio = new Date(Date.UTC(desde.getUTCFullYear(), desde.getUTCMonth(), desde.getUTCDate()));
  if (data < inicio) return `A ${rotulo} (${fmtDia(data)}) não pode ser anterior a ${fmtDia(inicio)}. Confira o ano.`;
  return null;
}

// Para `min` e `max` dos campos de data (AAAA-MM-DD).
export const paraInput = (d: Date) => d.toISOString().slice(0, 10);
