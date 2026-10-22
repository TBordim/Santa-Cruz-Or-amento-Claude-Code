// Berço: peça de encaixe (outra faca) que vai na mesma folha da caixa, uma por caixa. Para o
// empacotador a caixa e o berço viram uma só "peça composta": os dois lado a lado ou um sobre o
// outro, dentro de um retângulo. Assim cada pose da folha leva uma caixa e o seu berço (1 para 1).
// Não há encaixe entre peças vizinhas nem corte seco com a peça composta: o contorno que o
// empacotador enxerga é o retângulo, então a lâmina compartilhada não seria real.
import { calcularOpcoes, type Entrada, type Opcao } from "./calcular";
import { CONFIG, type Config, type Maquina } from "./config";
import { areaPoligono, type Faca, type Pt } from "./geometria";

const mover = (pts: Pt[], dx: number, dy: number): Pt[] => pts.map(([x, y]) => [x + dx, y + dy]);
// Gira 90° no sentido horário (x, y) -> (-y, x) e leva o canto mínimo para a origem.
function girar90(f: Faca): Faca {
  const g = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [f.H - y, x]);
  return {
    W: f.H,
    H: f.W,
    contorno: g(f.contorno),
    area: f.area,
    corte: f.corte,
    vinco: f.vinco,
    secoes: f.secoes?.map(g),
    linhas: f.linhas?.map(g),
    cola: f.cola ? g(f.cola) : undefined,
    origem: f.origem,
  };
}

export type PosicaoBerco = "direita" | "abaixo";

// Junta a caixa (na origem) e o berço (à direita ou abaixo, girado ou não).
export function facaComBerco(caixa: Faca, berco: Faca, posicao: PosicaoBerco, girado: boolean, espaco = CONFIG.espacoFacasMm): Faca {
  const b = girado ? girar90(berco) : berco;
  const dx = posicao === "direita" ? caixa.W + espaco : 0;
  const dy = posicao === "abaixo" ? caixa.H + espaco : 0;
  const W = posicao === "direita" ? caixa.W + espaco + b.W : Math.max(caixa.W, b.W);
  const H = posicao === "abaixo" ? caixa.H + espaco + b.H : Math.max(caixa.H, b.H);
  const bc = mover(b.contorno, dx, dy);
  const contorno: Pt[] = [
    [0, 0],
    [W, 0],
    [W, H],
    [0, H],
  ];
  return {
    W,
    H,
    contorno,
    area: areaPoligono(caixa.contorno) + areaPoligono(b.contorno),
    corte: caixa.corte + berco.corte,
    vinco: caixa.vinco + berco.vinco,
    secoes: [...(caixa.secoes ?? []), ...(b.secoes ?? []).map((s) => mover(s, dx, dy))],
    linhas: [...(caixa.linhas ?? []), ...(b.linhas ?? []).map((l) => mover(l, dx, dy))],
    cola: caixa.cola,
    // O desenho usa os contornos reais das duas peças; o retângulo acima serve só ao empacotador.
    partes: [caixa.contorno, bc],
    origem: caixa.origem,
  };
}

// Calcula as opções com a caixa e o berço juntos, testando as quatro maneiras de juntar (berço à
// direita ou abaixo, girado ou não), e devolve tudo na ordem de aproveitamento. Corte duplo sempre.
export function calcularComBerco(e: Omit<Entrada, "faca">, caixa: Faca, berco: Faca, cfg: Config = CONFIG): { opcoes: Opcao[]; faca: Map<Opcao, Faca>; maquinas: Maquina[]; avisos: string[] } {
  const opcoes: Opcao[] = [];
  const faca = new Map<Opcao, Faca>();
  let maquinas: Maquina[] = [];
  const avisos: string[] = [];
  for (const posicao of ["direita", "abaixo"] as const) {
    for (const girado of [false, true]) {
      const composta = facaComBerco(caixa, berco, posicao, girado, cfg.espacoFacasMm);
      const r = calcularOpcoes({ ...e, faca: composta, corteSeco: false }, cfg);
      maquinas = r.maquinas;
      for (const a of r.avisos) if (!avisos.includes(a)) avisos.push(a);
      for (const o of r.opcoes) {
        opcoes.push(o);
        faca.set(o, composta);
      }
    }
  }
  // A mesma regra de ordem do calcularOpcoes: quem passa de +10% vai para o fim; depois, aproveitamento.
  opcoes.sort((x, y) => {
    const xo = x.excesso > cfg.toleranciaAcima;
    const yo = y.excesso > cfg.toleranciaAcima;
    if (xo !== yo) return xo ? 1 : -1;
    if (Math.abs(x.aproveitamento - y.aproveitamento) > 0.0005) return y.aproveitamento - x.aproveitamento;
    if (x.formato.oferta !== y.formato.oferta) return y.formato.oferta - x.formato.oferta;
    return x.folhas - y.folhas;
  });
  return { opcoes, faca, maquinas, avisos };
}
