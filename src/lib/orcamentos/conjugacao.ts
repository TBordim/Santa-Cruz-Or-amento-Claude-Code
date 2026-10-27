import type { Modelo, ReqCliente } from "./types";

// Quantidades por item e conjugação da montagem. Sem acesso ao banco.
//
// Conjugação (pedido do Thiago em 27/10/2026): com mais de um modelo, a Engenharia diz como serão
// montados. 0 = produzido sozinho, em montagem separada; o mesmo número (1, 2, 3...) em dois ou mais
// modelos = produzidos juntos na mesma montagem. Ex.: 4 modelos, o 1 com o 4 e o 2 com o 3 → modelos 1 e
// 4 levam "1", modelos 2 e 3 levam "2".

export type QuantidadeDoItem = { quantidade: string | null };
export type OpcaoPorItem = {
  total: string;
  // Um por modelo, na ordem dos modelos; null quando a solicitação não separou por modelo.
  porModelo: (string | null)[];
  separada: boolean;
};

const digitos = (v: string) => v.replace(/\D/g, "");

// Para cada quantidade a orçar, a quantidade de cada modelo (da divisão feita na Solicitação).
export function quantidadesPorItem(c: ReqCliente | null | undefined, modelos: Modelo[]): OpcaoPorItem[] {
  return (c?.quantidadesLista ?? []).filter(Boolean).map((total) => {
    const itens = c?.quantidadesPorModelo?.[digitos(total)];
    if (!itens || itens.length < 2 || modelos.length < 2) {
      return { total, porModelo: modelos.map((): string | null => (modelos.length === 1 ? total : null)), separada: modelos.length === 1 };
    }
    const usados = new Set<number>();
    const porModelo = modelos.map((m, i) => {
      // Casa pela posição quando a descrição bate; senão procura pela descrição (o modelo pode ter mudado de lugar).
      let k = itens[i] && itens[i].descricao === m.descricao && !usados.has(i) ? i : itens.findIndex((x, j) => x.descricao === m.descricao && !usados.has(j));
      if (k < 0 && itens.length === modelos.length && !usados.has(i)) k = i;
      if (k < 0) return null;
      usados.add(k);
      return itens[k].quantidade;
    });
    return { total, porModelo, separada: porModelo.every((q) => q !== null) };
  });
}

// Lê o campo "Conjugação": inteiro de 0 a `max`; vazio ou inválido → undefined (não mexe no que já há).
export function lerConjugacao(bruto: unknown, max: number): number | undefined {
  const t = String(bruto ?? "").trim();
  if (!/^\d{1,2}$/.test(t)) return undefined;
  const n = parseInt(t, 10);
  return n >= 0 && n <= max ? n : undefined;
}

// Mensagem de erro, ou null se a conjugação está completa e coerente. Só vale com mais de um modelo.
export function erroNaConjugacao(modelos: Modelo[]): string | null {
  if (modelos.length < 2) return null;
  const sem = modelos.map((m, i) => ({ m, i })).filter(({ m }) => m.conjugacao === undefined || m.conjugacao === null);
  if (sem.length) {
    const nomes = sem.map(({ m, i }) => m.descricao || `Modelo ${i + 1}`).join(", ");
    return `Informe a conjugação de cada modelo (0 = produzido sozinho; o mesmo número em dois modelos = produzidos juntos). Falta: ${nomes}.`;
  }
  const grupos = new Map<number, number>();
  for (const m of modelos) if (m.conjugacao! > 0) grupos.set(m.conjugacao!, (grupos.get(m.conjugacao!) ?? 0) + 1);
  const sozinho = [...grupos].find(([, n]) => n === 1);
  if (sozinho) return `O número de conjugação ${sozinho[0]} só foi usado em um modelo. Para produzir sozinho use 0; para produzir junto, repita o número em outro modelo.`;
  return null;
}

// Grupos formados, para mostrar: [{ numero: 1, modelos: ["Uva", "Abacaxi"] }]. Os com 0 ficam à parte.
export function gruposDeConjugacao(modelos: Modelo[]): { numero: number; modelos: string[] }[] {
  const mapa = new Map<number, string[]>();
  modelos.forEach((m, i) => {
    if (!m.conjugacao) return;
    mapa.set(m.conjugacao, [...(mapa.get(m.conjugacao) ?? []), m.descricao || `Modelo ${i + 1}`]);
  });
  return [...mapa].sort((a, b) => a[0] - b[0]).map(([numero, nomes]) => ({ numero, modelos: nomes }));
}

// Número de montagem de cada modelo no Aceite (onde o mesmo número é "sai junto na mesma folha"): o
// número da conjugação para quem é conjugado; um número próprio, depois dos usados, para quem é 0.
// null quando a conjugação não foi informada (orçamento de antes de 27/10/2026).
export function montagensDosModelos(modelos: Modelo[]): (number | null)[] {
  if (modelos.length < 2 || modelos.some((m) => m.conjugacao === undefined || m.conjugacao === null)) return modelos.map(() => null);
  let prox = Math.max(0, ...modelos.map((m) => m.conjugacao ?? 0)) + 1;
  return modelos.map((m) => (m.conjugacao! > 0 ? m.conjugacao! : prox++));
}
