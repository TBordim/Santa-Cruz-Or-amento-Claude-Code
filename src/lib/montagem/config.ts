// Configuração da Pré-montagem — tudo que muda por máquina, papel ou regra da casa fica aqui,
// nunca dentro do algoritmo. Valores marcados EXEMPLO ainda não foram confirmados pela
// Engenharia e devem ser trocados pelos reais. Medidas em milímetros.

export type Maquina = {
  id: string;
  nome: string;
  // Até quantas cores de impressão cabem numa passada (o verniz é à parte: as duas têm verniz).
  coresMax: number;
  // Espessura máxima do cartão que a máquina aceita.
  espessuraMaxMm: number;
};

export type FormatoFolha = {
  // Folha inteira comprada: o segundo número é o sentido da fibra (66×96 → fibra no 96).
  w: number;
  h: number;
  // 3 = muita oferta no fornecedor, 1 = pouca. Só desempata opções de mesmo aproveitamento.
  oferta: number;
};

export const CONFIG = {
  // Roland 505 e 507: formato 53×74, mesma família, sem opção Plus (informado pelo Thiago).
  maquinas: [
    { id: "roland-505", nome: "Roland 505", coresMax: 5, espessuraMaxMm: 0.8 },
    { id: "roland-507", nome: "Roland 507", coresMax: 7, espessuraMaxMm: 0.6 },
  ] satisfies Maquina[],

  // O fator (pedaço da folha depois do corte) passa na máquina com a "altura" na direção da passagem
  // e a "largura" (74) na transversal. Medidas informadas pelo Thiago em 13/10/2026:
  // - área máxima de impressão: 59 × 74 cm (altura × largura);
  // - tamanho mínimo de papel da impressora: 26 × 40 cm.
  fator: { passagemMax: 590, transversalMax: 740, passagemMin: 260, transversalMin: 400 },

  // A corte e vinco automática (Bobst SP 102) pede no mínimo 32 × 40 cm. Abaixo disso só dá para
  // cortar na manual ou na guilhotina (até o mínimo da impressora, 26 × 40 cm).
  bobstAutomatica: { passagemMin: 320, transversalMin: 400 },

  // Faixas das bordas de 74, descontadas da dimensão de passagem.
  pincaMm: 11, // pinça mínima; pode ser aumentada por pedido
  barraControleMm: 9, // na borda oposta à pinça; opcional por pedido
  margemTraseiraMm: 0, // AINDA NÃO INFORMADO: margem depois da barra (ou da borda, sem barra)

  // Margem de impressão nas laterais (as bordas ao longo da passagem), em cada lado.
  margemLateralMm: 5,

  // Corte duplo (lâminas separadas): espaço mínimo entre os cartuchos no sentido da tampa e do fundo.
  // No sentido da aba de cola os cartuchos sempre se encostam (uma aba contra o outro), nos dois cortes.
  espacoFacasMm: 4,

  // Produzir de 100% a 110% do pedido, nunca menos.
  // Aproveitamento mínimo: montagens abaixo disso não são consideradas em nenhum caso (decisão do Thiago, 20/10/2026).
  aproveitamentoMinimo: 0.7,

  // Entre duas montagens com as mesmas poses, a que encosta a ponta preferida (tampa com tampa) ganha se
  // perder no máximo isto de aproveitamento (0,005 = meio ponto percentual).
  toleranciaContato: 0.005,
  toleranciaAcima: 0.1,

  // EXEMPLO: lista de formatos e ofertas. Os formatos são os mesmos para qualquer papel.
  formatosFolha: [
    { w: 660, h: 960, oferta: 3 },
    { w: 960, h: 660, oferta: 3 },
    { w: 770, h: 1130, oferta: 2 },
    { w: 1130, h: 770, oferta: 2 },
    { w: 1020, h: 720, oferta: 2 },
  ] satisfies FormatoFolha[],

  // Cortes testados: [partes na largura, partes na altura] da folha inteira.
  cortes: [
    [1, 1],
    [2, 1],
    [1, 2],
    [3, 1],
    [1, 3],
    [2, 2],
    [4, 1],
    [1, 4],
    [3, 2],
    [2, 3],
  ] satisfies [number, number][],

  // Formato ideal de compra: o fornecedor produz em bobinas e corta no formato pedido, sem limite de
  // tamanho, mas leva cerca de 10 dias. O formato padrão em estoque é só carregar e entregar.
  // A folha sob medida tem de ter medida redonda, em múltiplos de meio centímetro (83 ou 83,5, nunca 83,4): o fator é arredondado
  // para cima em múltiplos de `multiploMm` (5 mm = 0,5 cm; use 10 para cm inteiros) e a folha é o fator vezes o nº de partes.
  formatoIdeal: { multiploMm: 5, prazoDias: 10 },

  // Busca de blocos exatos para a folha sob medida: até quantas colunas e linhas testar e quantas opções
  // sob medida manter (as de melhor aproveitamento, uma por número de poses).
  sobMedida: { maxColunas: 10, maxLinhas: 10, manter: 6 },

  // Lâmina da faca, cobrada por metro desenhado (corte e vinco pelo mesmo preço).
  precoMetroLaminaReais: 50,
};

export type Config = typeof CONFIG;
