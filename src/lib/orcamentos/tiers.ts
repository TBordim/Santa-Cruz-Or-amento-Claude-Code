import { avaliarCriterios, avaliarDiscrepanciaLegado, parseQuantidade } from "./motor";
import type { PrecificacaoTier, StatusDiretoriaTier } from "./types";

// Normaliza pra comparar premissas (mesma função `chave()` do HTML original).
function chave(s: string | null | undefined): string {
  return (s || "").toString().trim().toUpperCase();
}

export type FaixaInput = {
  quantidade: string;
  precoProjetado: number;
  custoPrimarioPct: number | null;
  margemP2Pct: number | null;
  numeroLotes: string;
  numeroSetups: string;
};

// Registro de histórico casado (mesma clienteChave+código interno — orçamento "novo" aprovado
// OU registro do Arquivo legado, os dois contam igual) — usado como base de comparação de
// premissas e preço anterior. Ver buscarOrcamentoAnterior em legado.ts.
export type OrcamentoAnteriorRef = {
  id: string;
  precoFinal: number | null;
  quantidade: string | null;
  numeroLotes: string | null;
  numeroSetups: string | null;
  acabamento: string | null;
  custoPrimarioPct: number | null;
  margemP2Pct: number | null;
};

export type MontarPrecificacaoInput = {
  faixas: FaixaInput[];
  comissaoEspecial: boolean;
  acabamentoAtual: string;
  produtoNovoClassificacao: boolean; // classificacao === "novo" || "repeticao_novo"
  anterior: OrcamentoAnteriorRef | null;
};

// Equivalente ao corpo de cálculo de enviarParaDiretoria() — monta uma faixa por quantidade
// pedida, rodando os dois critérios independentes (motor.ts) para cada uma.
export function montarPrecificacao(input: MontarPrecificacaoInput): PrecificacaoTier[] {
  const { faixas, comissaoEspecial, acabamentoAtual, anterior } = input;
  const produtoNovo = !anterior || input.produtoNovoClassificacao;

  return faixas.map((f): PrecificacaoTier => {
    const premissasDivergentes: string[] = [];
    if (anterior) {
      if (chave(f.quantidade) !== chave(anterior.quantidade)) premissasDivergentes.push("Quantidade produzida");
      if (chave(f.numeroLotes) !== chave(anterior.numeroLotes)) premissasDivergentes.push("Número de lotes");
      if (chave(f.numeroSetups) !== chave(anterior.numeroSetups)) premissasDivergentes.push("Número de setups");
      if (chave(acabamentoAtual) !== chave(anterior.acabamento)) premissasDivergentes.push("Acabamento");
    }
    const premissasIguais = anterior ? premissasDivergentes.length === 0 : null;
    const variacaoPct =
      anterior && anterior.precoFinal
        ? (Math.abs(f.precoProjetado - anterior.precoFinal) / anterior.precoFinal) * 100
        : null;

    let precoFinalSugerido: number;
    if (produtoNovo) {
      // Multiplica por 1005 (inteiro) e só divide por 1000 no final, em vez de `* 1.005`
      // direto — `100 * 1.005` vira 100.49999999999999 em ponto flutuante (0,005 não tem
      // representação binária exata) e arredonda pra baixo por engano. Encontrado em teste
      // real: 100 devia sugerir 101, sugeria 100. `Number.EPSILON` não é grande o bastante pra
      // corrigir esse erro específico (~1,4e-14, bem maior que o EPSILON de ~2,2e-16).
      precoFinalSugerido = Math.round((f.precoProjetado * 1005) / 1000);
    } else if (premissasIguais && variacaoPct !== null && variacaoPct <= 2) {
      precoFinalSugerido = anterior!.precoFinal!;
    } else {
      precoFinalSugerido = f.precoProjetado;
    }

    const av = avaliarCriterios({
      custoPrimarioPct: f.custoPrimarioPct,
      margemP2Pct: f.margemP2Pct,
      comissaoEspecial,
      produtoNovo,
      premissasIguais,
      variacaoPct,
    });

    const tier: PrecificacaoTier = {
      quantidade: f.quantidade,
      precoProjetado: f.precoProjetado,
      custoPrimarioPct: f.custoPrimarioPct,
      margemP2Pct: f.margemP2Pct,
      numeroLotes: f.numeroLotes,
      numeroSetups: f.numeroSetups,
      precoAnterior: anterior?.precoFinal ?? null,
      quantidadeAnterior: anterior?.quantidade ?? null,
      custoPrimarioPctAnterior: anterior?.custoPrimarioPct ?? null,
      margemP2PctAnterior: anterior?.margemP2Pct ?? null,
      numeroLotesAnterior: anterior?.numeroLotes ?? null,
      numeroSetupsAnterior: anterior?.numeroSetups ?? null,
      acabamentoAnterior: anterior?.acabamento ?? null,
      produtoNovo,
      premissasIguais,
      premissasDivergentes,
      variacaoPct,
      precoFinalSugerido,
      motivoPendencia: av.motivo,
      statusDiretoria: "pendente",
    };

    // Critério 2 — discrepância vs. histórico (seção 3 da especificação): compara contra o
    // registro casado por código interno (orçamento aprovado ou Arquivo legado, ver
    // buscarOrcamentoAnterior em legado.ts).
    const discrepancia = avaliarDiscrepanciaLegado([
      { label: "Custo Primário (%)", anterior: anterior?.custoPrimarioPct ?? null, atual: f.custoPrimarioPct },
      { label: "Quantidade", anterior: parseQuantidade(anterior?.quantidade ?? null), atual: parseQuantidade(f.quantidade) },
      { label: "Margem P2 (%)", anterior: anterior?.margemP2Pct ?? null, atual: f.margemP2Pct },
      { label: "Último preço", anterior: anterior?.precoFinal ?? null, atual: f.precoProjetado },
    ]);

    if (av.aprovavel && discrepancia.bloqueia) {
      tier.statusDiretoria = "pendente";
      tier.motivoPendencia = discrepancia.motivo ?? tier.motivoPendencia;
    } else if (av.aprovavel) {
      tier.statusDiretoria = "auto_aprovado";
      tier.precoFinal = precoFinalSugerido;
      tier.decididoPor = "Sistema (regra automática)";
      tier.decididoEm = Date.now();
    }

    return tier;
  });
}

export type DecisaoResultado = {
  precificacao: PrecificacaoTier[];
  // Próximo estado do documento a partir da decisão desta faixa.
  proximo:
    | { tipo: "volta_orcamento"; comentario: string }
    | { tipo: "continua_diretoria" }
    | { tipo: "avanca_envio_oferta"; statusDiretoria: "auto_aprovado" | "aprovado"; precoFinal: number };
};

// Equivalente a decidirDiretoriaTier() — decide UMA faixa e recalcula o estado agregado do
// documento (só avança/retorna quando TODAS as faixas estiverem resolvidas).
export function decidirFaixa(
  precificacaoAtual: PrecificacaoTier[],
  idx: number,
  decisao: { aprovado: boolean; comentario: string; precoFinal: number | null; decididoPor: string },
): DecisaoResultado {
  const precificacao = precificacaoAtual.map((t) => ({ ...t }));
  const tier = precificacao[idx];
  const novoStatus: StatusDiretoriaTier = decisao.aprovado ? "aprovado" : "revisao";
  precificacao[idx] = {
    ...tier,
    statusDiretoria: novoStatus,
    comentarioDiretoria: decisao.comentario,
    decididoPor: decisao.decididoPor,
    decididoEm: Date.now(),
    precoFinal: decisao.aprovado && decisao.precoFinal !== null ? decisao.precoFinal : tier.precoFinal,
  };

  const algumaRevisao = precificacao.some((t) => t.statusDiretoria === "revisao");
  const algumaPendente = precificacao.some((t) => t.statusDiretoria === "pendente");

  if (algumaRevisao) {
    return { precificacao, proximo: { tipo: "volta_orcamento", comentario: decisao.comentario } };
  }
  if (algumaPendente) {
    return { precificacao, proximo: { tipo: "continua_diretoria" } };
  }
  const todasAuto = precificacao.every((t) => t.statusDiretoria === "auto_aprovado");
  return {
    precificacao,
    proximo: {
      tipo: "avanca_envio_oferta",
      statusDiretoria: todasAuto ? "auto_aprovado" : "aprovado",
      precoFinal: precificacao[0].precoFinal ?? precificacao[0].precoFinalSugerido,
    },
  };
}
