// Pré-montagem: dado o contorno da faca aberta e o pedido, gera as opções de folha inteira, corte
// e poses por fator, da melhor para a pior. Função pura: não lê banco nem arquivo.
import { CONFIG, type Config, type FormatoFolha, type Maquina } from "./config";
import { blocoExato, empacotar, type Arranjo, type Estrategia } from "./empacotar";
import type { Faca } from "./geometria";

export type FibraCartucho = "livre" | "altura" | "largura";
// Onde fica a fibra do papel na máquina: "74" = no sentido do 74 (transversal à passagem, o
// padrão de compra), "53" = no sentido da passagem.
export type FibraMaquina = "74" | "53";

export type Entrada = {
  faca: Faca;
  quantidade: number;
  cores: number;
  espessuraMm: number;
  fibraCartucho: FibraCartucho;
  fibraMaquina: FibraMaquina;
  barraControle: boolean;
  // Corte seco: lâmina compartilhada, só tampa com tampa. Corte duplo: lâminas separadas (4 mm).
  corteSeco: boolean;
  // Considerar também a folha sob medida (formato ideal de compra). Padrão: sim.
  incluirSobMedida?: boolean;
  // Aceitar fatores menores que o mínimo da corte e vinco automática (32 × 40 cm), que só dá para
  // cortar na manual ou na guilhotina. Padrão: não.
  permitirCorteManual?: boolean;
  // Pinça maior que a mínima da configuração. Padrão: a mínima.
  pincaMm?: number;
};

export type Opcao = {
  formato: FormatoFolha;
  corte: number;
  cortesLargura: number;
  cortesAltura: number;
  // Fator: pedaço da folha depois do corte (mm).
  wf: number;
  hf: number;
  // Cartucho girado 90° em relação à fibra do fator.
  girada90: boolean;
  fibraMaquina: FibraMaquina;
  arranjo: Arranjo;
  // Origem da região de impressão dentro do fator (mm).
  ox0: number;
  oy0: number;
  // Faixas usadas nesta opção (mm): pinça num lado e barra de controle (0 se não houver) no oposto.
  pincaMm: number;
  barraMm: number;
  posesPorFator: number;
  pecasPorFolha: number;
  aproveitamento: number;
  folhas: number;
  pecasProduzidas: number;
  excesso: number;
  laminaMm: number;
  custoFaca: number;
  // Folha pedida sob medida (formato ideal de compra): o fornecedor corta da bobina no tamanho
  // pedido, o que leva `prazoDias`. As outras usam um formato padrão em estoque.
  sobMedida: boolean;
  prazoDias: number | null;
  // Só nas opções sob medida: ganho de aproveitamento sobre a melhor opção em estoque.
  ganhoPontos: number | null;
  // Fator menor que o mínimo da corte e vinco automática: só dá para fazer na manual ou na guilhotina.
  exigeCorteManual: boolean;
};

export type Resultado = {
  opcoes: Opcao[];
  maquinas: Maquina[];
  avisos: string[];
};

export function maquinasPossiveis(cores: number, espessuraMm: number, cfg: Config = CONFIG): Maquina[] {
  return cfg.maquinas.filter((m) => cores <= m.coresMax && espessuraMm <= m.espessuraMaxMm);
}

const ESTRATEGIAS: Estrategia[] = ["grade", "deslocada", "virada"];

export function calcularOpcoes(e: Entrada, cfg: Config = CONFIG): Resultado {
  const avisos: string[] = [];
  const maquinas = maquinasPossiveis(e.cores, e.espessuraMm, cfg);
  if (!maquinas.length) avisos.push("Nenhuma Roland atende este número de cores e esta espessura de cartão.");
  const opcoes: Opcao[] = [];
  if (!(e.quantidade > 0) || !(e.faca.W > 0) || !(e.faca.H > 0)) return { opcoes, maquinas, avisos };

  const m74 = e.fibraMaquina === "74";
  const { fator, bobstAutomatica } = cfg;
  const pinca = Math.max(cfg.pincaMm, e.pincaMm ?? cfg.pincaMm);
  const barra = e.barraControle ? cfg.barraControleMm : 0;
  // Na direção da passagem descontam a pinça, a barra de controle (borda oposta) e a margem traseira;
  // na transversal, a margem lateral nos dois lados.
  const descPassagem = pinca + barra + cfg.margemTraseiraMm;
  const descTransversal = 2 * cfg.margemLateralMm;
  const ox0 = m74 ? barra + cfg.margemTraseiraMm : cfg.margemLateralMm;
  const oy0 = m74 ? cfg.margemLateralMm : barra + cfg.margemTraseiraMm;
  // Menor fator aceito: o da corte e vinco automática, ou o da impressora se a manual for permitida.
  const manualOk = e.permitirCorteManual === true;
  const minPassagem = manualOk ? fator.passagemMin : Math.max(fator.passagemMin, bobstAutomatica.passagemMin);
  const minTransversal = manualOk ? fator.transversalMin : Math.max(fator.transversalMin, bobstAutomatica.transversalMin);
  const precisaManual = (passagem: number, transversal: number) => passagem < bobstAutomatica.passagemMin || transversal < bobstAutomatica.transversalMin;

  const giros: boolean[] = [];
  if (e.fibraCartucho !== "largura") giros.push(false); // altura do cartucho ao longo da fibra
  if (e.fibraCartucho !== "altura") giros.push(true); // largura do cartucho ao longo da fibra

  // Dados de uma opção que não dependem de ser padrão ou sob medida.
  const montar = (arranjo: Arranjo, gira: boolean, formato: FormatoFolha, cortes: [number, number], wf: number, hf: number): Opcao => {
    const corte = cortes[0] * cortes[1];
    const pecasPorFolha = arranjo.n * corte;
    const folhas = Math.ceil(e.quantidade / pecasPorFolha);
    const pecasProduzidas = folhas * pecasPorFolha;
    const laminaMm = Math.max(0, arranjo.n * (e.faca.corte + e.faca.vinco) - arranjo.compartilhado);
    const passagem = m74 ? wf : hf;
    const transversal = m74 ? hf : wf;
    return {
      formato,
      corte,
      cortesLargura: cortes[0],
      cortesAltura: cortes[1],
      wf,
      hf,
      girada90: gira,
      fibraMaquina: e.fibraMaquina,
      arranjo,
      ox0,
      oy0,
      pincaMm: pinca,
      barraMm: barra,
      posesPorFator: arranjo.n,
      pecasPorFolha,
      aproveitamento: (arranjo.n * e.faca.area) / (wf * hf),
      folhas,
      pecasProduzidas,
      excesso: pecasProduzidas / e.quantidade - 1,
      laminaMm,
      custoFaca: (laminaMm / 1000) * cfg.precoMetroLaminaReais,
      sobMedida: false,
      prazoDias: null,
      ganhoPontos: null,
      exigeCorteManual: precisaManual(passagem, transversal),
    };
  };

  // ---- Folhas padrão em estoque: cada formato, cada corte, o encaixe que couber mais peças ----
  for (const f of cfg.formatosFolha) {
    for (const [a, b] of cfg.cortes) {
      const wf = f.w / a;
      const hf = f.h / b;
      const passagem = m74 ? wf : hf;
      const transversal = m74 ? hf : wf;
      if (passagem > fator.passagemMax || transversal > fator.transversalMax) continue;
      if (passagem < minPassagem || transversal < minTransversal) continue;
      const uw = wf - (m74 ? descPassagem : descTransversal);
      const uh = hf - (m74 ? descTransversal : descPassagem);
      for (const gira of giros) {
        const wp = gira ? uh : uw;
        const hp = gira ? uw : uh;
        const grade = empacotar(e.faca, wp, hp, cfg.espacoFacasMm, false, e.corteSeco);
        const encaixe = empacotar(e.faca, wp, hp, cfg.espacoFacasMm, true, e.corteSeco);
        for (const arranjo of [grade, encaixe && (!grade || encaixe.n > grade.n) ? encaixe : null]) {
          if (arranjo) opcoes.push(montar(arranjo, gira, f, [a, b], wf, hf));
        }
      }
    }
  }

  // ---- Folha sob medida: o fornecedor corta no tamanho pedido, então a folha é o próprio fator (corte 1) ----
  // Em vez de encolher o que coube nas folhas padrão, monta blocos exatos de colunas × linhas com cada
  // encaixe (grade, linhas deslocadas e tampa com tampa) e pega a menor folha, em cm inteiros, que
  // contém cada bloco. Assim o ganho do encaixe aparece mesmo quando não fecha número inteiro numa
  // folha padrão.
  if (e.incluirSobMedida !== false) {
    const melhorEstoque = opcoes.reduce((m, o) => Math.max(m, o.aproveitamento), 0);
    const mult = cfg.formatoIdeal.multiploMm;
    const acima = (x: number) => Math.ceil(x / mult - 1e-9) * mult;
    const melhorPorPoses = new Map<number, Opcao>();
    for (const gira of giros) {
      for (const estrategia of ESTRATEGIAS) {
        for (let cols = 1; cols <= cfg.sobMedida.maxColunas; cols++) {
          for (let linhas = 1; linhas <= cfg.sobMedida.maxLinhas; linhas++) {
            for (const modo of ["reta", "tijolo"] as const) {
              const arranjo = blocoExato(e.faca, cols, linhas, cfg.espacoFacasMm, estrategia, e.corteSeco, modo);
              if (!arranjo) continue;
              const usoW = gira ? arranjo.alturaUsada : arranjo.larguraUsada;
              const usoH = gira ? arranjo.larguraUsada : arranjo.alturaUsada;
              let wMin = usoW + (m74 ? descPassagem : descTransversal);
              let hMin = usoH + (m74 ? descTransversal : descPassagem);
              if (m74) {
                wMin = Math.max(wMin, minPassagem);
                hMin = Math.max(hMin, minTransversal);
              } else {
                hMin = Math.max(hMin, minPassagem);
                wMin = Math.max(wMin, minTransversal);
              }
              wMin = acima(wMin);
              hMin = acima(hMin);
              // O tamanho e o arredondamento não podem passar do limite da máquina.
              if ((m74 ? wMin : hMin) > fator.passagemMax || (m74 ? hMin : wMin) > fator.transversalMax) continue;
              const uwI = wMin - (m74 ? descPassagem : descTransversal);
              const uhI = hMin - (m74 ? descTransversal : descPassagem);
              const o = montar({ ...arranjo, wp: gira ? uhI : uwI, hp: gira ? uwI : uhI }, gira, { w: wMin, h: hMin, oferta: 0 }, [1, 1], wMin, hMin);
              o.sobMedida = true;
              o.prazoDias = cfg.formatoIdeal.prazoDias;
              o.ganhoPontos = melhorEstoque > 0 ? (o.aproveitamento - melhorEstoque) * 100 : null;
              // Só vale pedir sob medida se ganhar da melhor folha em estoque.
              if (o.ganhoPontos !== null && o.ganhoPontos < 0.5) continue;
              const atual = melhorPorPoses.get(o.posesPorFator);
              if (!atual || o.aproveitamento > atual.aproveitamento) melhorPorPoses.set(o.posesPorFator, o);
            }
          }
        }
      }
    }
    const melhores = [...melhorPorPoses.values()].sort((x, y) => y.aproveitamento - x.aproveitamento).slice(0, cfg.sobMedida.manter);
    opcoes.push(...melhores);
  }

  // Quem passa de +10% da quantidade vai para o fim; depois, maior aproveitamento, formato de
  // maior oferta e menos folhas.
  opcoes.sort((x, y) => {
    const xo = x.excesso > cfg.toleranciaAcima;
    const yo = y.excesso > cfg.toleranciaAcima;
    if (xo !== yo) return xo ? 1 : -1;
    if (Math.abs(x.aproveitamento - y.aproveitamento) > 0.0005) return y.aproveitamento - x.aproveitamento;
    if (x.formato.oferta !== y.formato.oferta) return y.formato.oferta - x.formato.oferta;
    return x.folhas - y.folhas;
  });
  if (!opcoes.length) avisos.push("Nenhuma montagem cabe com estas medidas. Confira a faca, a fibra e os limites da máquina.");
  return { opcoes, maquinas, avisos };
}
