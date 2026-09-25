// Formato dos 3 campos Json do Orcamento (reqCliente, reqTecnicos, precificacao) — portado
// de lerRequisitosCliente/lerRequisitosTecnicos/enviarParaDiretoria no santa-cruz-orcamentos.html.
// Validados com Zod (ver schemas.ts) antes de qualquer gravação — o Prisma não valida o
// conteúdo de campos Json.

export type Suporte = { descricao: string; gramatura: string };
export type SuporteTecnico = { formato: string; codigo: string };

// Etapa 1 — Solicitação de Orçamento (Em Aberto). Medidas/suportes/acabamento/verniz/
// plástico/embalagem/impressão/fechamento são decisão de quem pede o orçamento, não da
// Engenharia — por isso vivem aqui, não em ReqTecnicos.
export type ReqCliente = {
  medidaF?: string;
  medidaL?: string;
  medidaA?: string;
  suportes: Suporte[];
  acabamentos: string[];
  acabamentoOutro?: string;
  verniz: string[];
  plastico: string[];
  embalagem: string[];
  embalagemDetalhe?: string;
  impressao: string[];
  fechamentoTampa?: string;
  fechamentoFundo?: string;
  // Uma ou mais quantidades pedidas — cada uma vira uma faixa em `precificacao`.
  quantidadesLista: string[];
};

// Etapa 2 — Engenharia. Campos "mortos" (caixaC/L/A, recursos*, processosManuais,
// tintasPorImpressao, insumosPorRecurso) foram removidos da UI em 11/09/2026 no sistema atual
// mas continuam podendo existir em registros antigos — o tipo aqui não os declara de
// propósito; como o campo é Json, eles sobrevivem soltos no objeto gravado e o spread
// {...anterior, ...novo} ao salvar nunca os apaga.
export type ReqTecnicos = {
  suportes: SuporteTecnico[];
  qtdFolha?: string;
  fatorC?: string;
  fatorL?: string;
  corte?: string;
  qtdCh?: string;
  idealC?: string;
  idealL?: string;
  flsAcerto?: string;
  anexos: string[];
  infoComplementares?: string;
};

// Uma faixa de precificação — uma por quantidade pedida em quantidadesLista. Ver
// avaliarCriterios/avaliarDiscrepanciaLegado/enviarParaDiretoria (motor.ts/tiers.ts) para como
// os campos calculados (produtoNovo, premissasIguais, precoFinalSugerido, statusDiretoria...)
// são preenchidos.
export type StatusDiretoriaTier = "auto_aprovado" | "pendente" | "aprovado" | "revisao";

export type PrecificacaoTier = {
  quantidade: string;
  precoProjetado: number;
  custoPrimarioPct: number | null;
  margemP2Pct: number | null;
  numeroLotes: string;
  numeroSetups: string;

  // Comparação com o orçamento anterior (casamento interno exato), quando existir.
  precoAnterior: number | null;
  quantidadeAnterior: string | null;
  custoPrimarioPctAnterior: number | null;
  margemP2PctAnterior: number | null;
  numeroLotesAnterior: string | null;
  numeroSetupsAnterior: string | null;
  acabamentoAnterior: string | null;

  produtoNovo: boolean;
  premissasIguais: boolean | null;
  premissasDivergentes: string[];
  variacaoPct: number | null;
  precoFinalSugerido: number;
  motivoPendencia: string;

  statusDiretoria: StatusDiretoriaTier;
  precoFinal?: number;
  decididoPor?: string;
  decididoEm?: number; // epoch ms
  comentarioDiretoria?: string;
  rascunhoPrecoFinal?: number | null;
  rascunhoComentario?: string;

  // Ajuste manual de preço feito DEPOIS da faixa já decidida (aprovada automática ou
  // manualmente) — a Diretoria pode ter motivo pra mudar o preço mesmo com tudo certo (ex.:
  // negociação com o cliente). Não apaga decididoPor/decididoEm original — os dois convivem,
  // um mostra quem decidiu primeiro, o outro quem ajustou por último.
  precoAjustadoPor?: string;
  precoAjustadoEm?: number; // epoch ms
};

// Leitura automática por IA do Arquivo legado — fica deste tipo pronto, mas a Fase 2 não
// preenche (ver plano: leitura por IA fica para uma fase posterior).
export type LeituraAnterior = {
  cliente?: string | null;
  produto?: string | null;
  data?: string | null;
  precoPorMilheiro?: number | null;
  quantidade?: string | null;
  numeroLotes?: string | null;
  numeroSetups?: string | null;
  acabamento?: string | null;
  custoPrimarioPct?: number | null;
  margemP2Pct?: number | null;
  observacao?: string | null;
  legadoId?: string | null;
};
