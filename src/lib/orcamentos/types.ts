// Formato dos 3 campos Json do Orcamento (reqCliente, reqTecnicos, precificacao) — portado
// de lerRequisitosCliente/lerRequisitosTecnicos/enviarParaDiretoria no santa-cruz-orcamentos.html.
// Validados com Zod (ver schemas.ts) antes de qualquer gravação — o Prisma não valida o
// conteúdo de campos Json.

// Cada material a partir do segundo diz se é uma ALTERNATIVA aos outros ("opcao" — o cliente
// quer o orçamento em mais de um papel, e cada opção gera as próprias SOs) ou se entra JUNTO no
// produto ("conjunto" — vale pra todas as SOs). O primeiro material é sempre a opção base.
// Materiais gravados antes de 30/09/2026 não têm o campo e contam como "conjunto": até então
// não existia orçamento em papéis alternativos. Pedido do Thiago em 30/09/2026.
export type UsoMaterial = "opcao" | "conjunto";
export type Suporte = { descricao: string; gramatura: string; uso?: UsoMaterial };

// Engenharia, por material (um bloco por material da Solicitação, mesma ordem): cada papel tem
// o próprio formato, código, quantidade por folha e aproveitamento. Os campos de formato suporte
// ficavam uma vez só pro card inteiro (os soltos em ReqTecnicos) até 30/09/2026 — continuam lá
// nos cards antigos e são exibidos como do primeiro material.
export type SuporteTecnico = {
  formato: string;
  codigo: string;
  qtdFolha?: string;
  flsAcerto?: string;
  fatorC?: string;
  fatorL?: string;
  corte?: string;
  qtdCh?: string;
  idealC?: string;
  idealL?: string;
};

export type ClassificacaoModelo = "NOVO" | "REPETICAO_SEM_ALTERACAO" | "REPETICAO_COM_ALTERACAO" | "REPETICAO_NOVO";

// Um modelo (produto) do orçamento. Vários modelos só dividem o mesmo orçamento quando usam a
// mesma faca (produção conjugada): medidas, material, acabamento, quantidades e preço são do
// conjunto, não de cada modelo. `id` liga o modelo à própria arte (Anexo.modeloId).
export type Modelo = {
  id: string;
  descricao: string;
  codigoCliente: string;
  codInterno: string; // só dígitos, "" enquanto não houver cadastro
  classificacao: ClassificacaoModelo;
};

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
  // Campos soltos de formato suporte: só em cards de antes de 30/09/2026 (hoje ficam por
  // material, em `suportes`).
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
  // Opção de papel desta SO: índice do material em ReqCliente.suportes e o texto dele congelado
  // na hora do cálculo. Cada SO é uma combinação quantidade × opção de papel (2 papéis × 2
  // quantidades = 4 SOs). Ausente quando o orçamento tem um papel só (e nos cards antigos).
  papelIdx?: number;
  papel?: string;
  // Uma SO ("Orçamento S.O. nº") por faixa/quantidade, não uma só pro card inteiro — cada
  // quantidade é orçada separadamente e precisa dar pra rastrear cada uma pelo próprio número
  // (pedido do Thiago em 25/09/2026). O número da solicitação inteira é o Nº de Pré Cadastro.
  // O campo continua se chamando numeroSequencial por compatibilidade com o que já está gravado.
  numeroSequencial: string;
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

  // As SOs de um orçamento são alternativas: o cliente fecha UMA delas. Marcada no Retorno do
  // Cliente junto do desfecho positivo; é o valor dela que conta no Histórico e na comparação
  // do próximo orçamento (último fornecimento).
  escolhidaPeloCliente?: boolean;
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
