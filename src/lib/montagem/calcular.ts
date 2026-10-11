// Pré-montagem: dado o contorno da faca aberta e o pedido, gera as opções de folha inteira, corte
// e poses por fator, da melhor para a pior. Função pura: não lê banco nem arquivo.
import { CONFIG, type Config, type FormatoFolha, type Maquina } from "./config";
import { empacotar, type Arranjo } from "./empacotar";
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
  // Corte seco: peças encostadas e lâmina compartilhada. Corte duplo: lâminas separadas.
  corteSeco: boolean;
  // Considerar também a folha sob medida (formato ideal de compra). Padrão: sim.
  incluirSobMedida?: boolean;
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
  // Só nas opções sob medida: ganho de aproveitamento sobre o formato padrão da mesma montagem.
  ganhoPontos: number | null;
};

export type Resultado = {
  opcoes: Opcao[];
  maquinas: Maquina[];
  avisos: string[];
};

export function maquinasPossiveis(cores: number, espessuraMm: number, cfg: Config = CONFIG): Maquina[] {
  return cfg.maquinas.filter((m) => cores <= m.coresMax && espessuraMm <= m.espessuraMaxMm);
}

export function calcularOpcoes(e: Entrada, cfg: Config = CONFIG): Resultado {
  const avisos: string[] = [];
  const maquinas = maquinasPossiveis(e.cores, e.espessuraMm, cfg);
  if (!maquinas.length) avisos.push("Nenhuma Roland atende este número de cores e esta espessura de cartão.");
  const opcoes: Opcao[] = [];
  if (!(e.quantidade > 0) || !(e.faca.W > 0) || !(e.faca.H > 0)) return { opcoes, maquinas, avisos };

  const m74 = e.fibraMaquina === "74";
  const faixa = cfg.pincaMm + (e.barraControle ? cfg.barraControleMm : 0);
  const barra = e.barraControle ? cfg.barraControleMm : 0;
  const { fator } = cfg;
  const mult = cfg.formatoIdeal.multiploMm;
  const acima = (x: number) => Math.ceil(x / mult - 1e-9) * mult;
  const vistas = new Set<string>();

  for (const f of cfg.formatosFolha) {
    for (const [a, b] of cfg.cortes) {
      const wf = f.w / a;
      const hf = f.h / b;
      const passagem = m74 ? wf : hf;
      const transversal = m74 ? hf : wf;
      if (passagem > fator.passagemMax || transversal > fator.transversalMax) continue;
      if (Math.min(wf, hf) < fator.passagemMin || Math.max(wf, hf) < fator.transversalMin) continue;
      // A pinça e a barra de controle ficam nas bordas de 74 e descontam da dimensão de 53.
      const uw = wf - 2 * cfg.margemMm - (m74 ? faixa : 0);
      const uh = hf - 2 * cfg.margemMm - (m74 ? 0 : faixa);
      const ox0 = cfg.margemMm + (m74 ? barra : 0);
      const oy0 = cfg.margemMm + (m74 ? 0 : barra);

      const giros: boolean[] = [];
      if (e.fibraCartucho !== "largura") giros.push(false); // altura do cartucho ao longo da fibra
      if (e.fibraCartucho !== "altura") giros.push(true); // largura do cartucho ao longo da fibra
      for (const gira of giros) {
        const wp = gira ? uh : uw;
        const hp = gira ? uw : uh;
        const grade = empacotar(e.faca, wp, hp, cfg.espacoFacasMm, false, e.corteSeco);
        const encaixe = empacotar(e.faca, wp, hp, cfg.espacoFacasMm, true, e.corteSeco);
        for (const arranjo of [grade, encaixe && (!grade || encaixe.n > grade.n) ? encaixe : null]) {
          if (!arranjo) continue;
          const corte = a * b;
          const pecasPorFolha = arranjo.n * corte;
          const folhas = Math.ceil(e.quantidade / pecasPorFolha);
          const pecasProduzidas = folhas * pecasPorFolha;
          const laminaMm = Math.max(0, arranjo.n * (e.faca.corte + e.faca.vinco) - arranjo.compartilhado);
          const aproveitamento = (arranjo.n * e.faca.area) / (wf * hf);

          const base: Opcao = {
            formato: f,
            corte,
            cortesLargura: a,
            cortesAltura: b,
            wf,
            hf,
            girada90: gira,
            fibraMaquina: e.fibraMaquina,
            arranjo,
            ox0,
            oy0,
            posesPorFator: arranjo.n,
            pecasPorFolha,
            aproveitamento,
            folhas,
            pecasProduzidas,
            excesso: pecasProduzidas / e.quantidade - 1,
            laminaMm,
            custoFaca: (laminaMm / 1000) * cfg.precoMetroLaminaReais,
            sobMedida: false,
            prazoDias: null,
            ganhoPontos: null,
          };
          opcoes.push(base);

          if (e.incluirSobMedida === false) continue;
          // Folha sob medida: a menor folha que contém exatamente esta montagem.
          const usoW = gira ? arranjo.alturaUsada : arranjo.larguraUsada;
          const usoH = gira ? arranjo.larguraUsada : arranjo.alturaUsada;
          let wMin = usoW + 2 * cfg.margemMm + (m74 ? faixa : 0);
          let hMin = usoH + 2 * cfg.margemMm + (m74 ? 0 : faixa);
          if (m74) {
            wMin = Math.max(wMin, fator.passagemMin);
            hMin = Math.max(hMin, fator.transversalMin);
          } else {
            hMin = Math.max(hMin, fator.passagemMin);
            wMin = Math.max(wMin, fator.transversalMin);
          }
          wMin = Math.min(acima(wMin), wf);
          hMin = Math.min(acima(hMin), hf);
          const aprovIdeal = (arranjo.n * e.faca.area) / (wMin * hMin);
          const ganho = (aprovIdeal - aproveitamento) * 100;
          if (ganho < 0.5) continue;
          // Várias folhas padrão podem levar à mesma folha sob medida: fica uma só.
          const chave = `${a}x${b}|${gira}|${arranjo.estrategia}|${arranjo.cols}x${arranjo.rows}|${wMin}x${hMin}`;
          if (vistas.has(chave)) continue;
          vistas.add(chave);
          const uwI = wMin - 2 * cfg.margemMm - (m74 ? faixa : 0);
          const uhI = hMin - 2 * cfg.margemMm - (m74 ? 0 : faixa);
          opcoes.push({
            ...base,
            formato: { w: wMin * a, h: hMin * b, oferta: 0 },
            wf: wMin,
            hf: hMin,
            arranjo: { ...arranjo, wp: gira ? uhI : uwI, hp: gira ? uwI : uhI },
            aproveitamento: aprovIdeal,
            sobMedida: true,
            prazoDias: cfg.formatoIdeal.prazoDias,
            ganhoPontos: ganho,
          });
        }
      }
    }
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
