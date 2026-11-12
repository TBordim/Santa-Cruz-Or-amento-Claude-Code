import type { Modelo, ParteDoItem, ReqCliente } from "./types";

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
// Regra (esclarecida pelo Thiago em 28/10/2026): todos 0 = sem conjugação. Se há conjugação, NENHUM item fica
// com 0: cada montagem leva um número, em sequência (1, 2, 3...) sem pular; o item que não conjuga com ninguém
// leva o próprio número. O número é a ordem em que a produção monta. Ex.: 5 itens, 1+2 → 1, 3+4 → 2, o 5 → 3.
export function erroNaConjugacao(modelos: Modelo[]): string | null {
  if (modelos.length < 2) return null;
  const sem = modelos.map((m, i) => ({ m, i })).filter(({ m }) => m.conjugacao === undefined || m.conjugacao === null);
  if (sem.length) {
    const nomes = sem.map(({ m, i }) => m.descricao || `Modelo ${i + 1}`).join(", ");
    return `Informe a conjugação de cada modelo (0 em todos = sem conjugação; havendo conjugação, numere todas as montagens em sequência). Falta: ${nomes}.`;
  }
  if (modelos.every((m) => m.conjugacao === 0)) return null;
  const zerados = modelos.map((m, i) => ({ m, i })).filter(({ m }) => m.conjugacao === 0);
  if (zerados.length) {
    const nomes = zerados.map(({ m, i }) => m.descricao || `Modelo ${i + 1}`).join(", ");
    return `Como há conjugação, todos os itens precisam de número de montagem em sequência (o item que não conjuga leva o próprio número, não 0). Falta número em: ${nomes}.`;
  }
  const usados = [...new Set(modelos.map((m) => m.conjugacao!))].sort((a, b) => a - b);
  const falta = usados.findIndex((n, k) => n !== k + 1);
  if (falta >= 0) return `Os números de montagem precisam ser sequenciais, sem pular (1, 2, 3...). Hoje: ${usados.join(", ")}.`;
  return null;
}

// ---------- divisão em lotes (12/11/2026) ----------
//
// O pedido pode sair em mais de uma entrega (lote), na mesma SO. Cada lote tem a própria conjugação. Ex.: itens
// de 200 mil, 122 mil e 60 mil → lote 1: 60 mil do item 1 + 60 mil do item 3 (montagem 1) e 22 mil do item 2
// (montagem 2); lote 2: o resto (140 mil e 100 mil), sem conjugação. Item sem divisão vai inteiro no lote 1.

// Quantidade total de cada modelo, quando a Solicitação tem uma só quantidade e a separou por modelo.
export function totaisPorModelo(c: ReqCliente | null | undefined, modelos: Modelo[]): (number | null)[] | null {
  const opcoes = quantidadesPorItem(c, modelos);
  if (opcoes.length !== 1 || !opcoes[0].separada) return null;
  return opcoes[0].porModelo.map((q) => (q === null ? null : Number(digitos(q)) || null));
}

// Lê as partes de um item do formulário (JSON); vazio ou inválido → undefined (sem divisão).
export function lerPartes(bruto: unknown): ParteDoItem[] | undefined {
  try {
    const j = JSON.parse(String(bruto ?? ""));
    if (!Array.isArray(j)) return undefined;
    const partes = j
      .map((p) => ({ lote: Math.trunc(Number(p?.lote)), quantidade: Math.trunc(Number(p?.quantidade)), conjugacao: Math.trunc(Number(p?.conjugacao ?? 0)) }))
      .filter((p) => p.lote >= 1 && p.quantidade > 0 && p.conjugacao >= 0);
    return partes.length ? partes : undefined;
  } catch {
    return undefined;
  }
}

// Com divisão, a conjugação do modelo (a que o Aceite lê) é a do lote 1; sem parte no lote 1, a da primeira parte.
export function conjugacaoDasPartes(partes: ParteDoItem[]): number {
  return (partes.find((p) => p.lote === 1) ?? [...partes].sort((a, b) => a.lote - b.lote)[0]).conjugacao;
}

export function temDivisao(modelos: Modelo[]): boolean {
  return modelos.some((m) => m.partes?.length);
}

// Partes de cada modelo por lote: modelo sem divisão entra inteiro no lote 1 (quantidade null = o total).
function porLote(modelos: Modelo[]): Map<number, { i: number; quantidade: number | null; conjugacao: number | null }[]> {
  const mapa = new Map<number, { i: number; quantidade: number | null; conjugacao: number | null }[]>();
  modelos.forEach((m, i) => {
    const partes = m.partes?.length ? m.partes : [{ lote: 1, quantidade: null as number | null, conjugacao: m.conjugacao ?? null }];
    for (const p of partes) mapa.set(p.lote, [...(mapa.get(p.lote) ?? []), { i, quantidade: p.quantidade, conjugacao: p.conjugacao }]);
  });
  return mapa;
}

// Mensagem de erro, ou null. Cada lote segue a regra da conjugação: todos 0 = sem conjugação; havendo conjugação,
// ninguém fica com 0 e os números vão em sequência (1, 2, 3…), sem pular. Os lotes numeram em sequência (1, 2…) e a
// soma de cada item bate com a quantidade dele.
export function erroNasPartes(modelos: Modelo[], totais: (number | null)[] | null): string | null {
  if (!temDivisao(modelos)) return null;
  if (!totais) return "Para dividir em lotes, a Solicitação precisa ter uma só quantidade, separada por item.";
  const nome = (i: number) => modelos[i].descricao || `Modelo ${i + 1}`;
  const fmt = (n: number) => n.toLocaleString("pt-BR");
  for (const [i, m] of modelos.entries()) {
    if (!m.partes?.length) continue;
    const soma = m.partes.reduce((s, p) => s + p.quantidade, 0);
    const total = totais[i] ?? 0;
    if (soma < total) return `${nome(i)}: faltam ${fmt(total - soma)} para fechar ${fmt(total)} (os lotes somam ${fmt(soma)}).`;
    if (soma > total) return `${nome(i)}: os lotes passam ${fmt(soma - total)} de ${fmt(total)} (somam ${fmt(soma)}).`;
    const lotes = m.partes.map((p) => p.lote);
    if (new Set(lotes).size !== lotes.length) return `${nome(i)}: o mesmo lote aparece duas vezes.`;
  }
  const mapa = porLote(modelos);
  const numeros = [...mapa.keys()].sort((a, b) => a - b);
  const falta = numeros.findIndex((n, k) => n !== k + 1);
  if (falta >= 0) return `Os lotes precisam ser numerados em sequência, sem pular (1, 2, 3…). Hoje: ${numeros.join(", ")}.`;
  for (const n of numeros) {
    const itens = mapa.get(n)!;
    if (itens.some((x) => x.conjugacao === null)) return `Lote ${n}: informe a conjugação de cada item.`;
    const conj = itens.map((x) => x.conjugacao!);
    if (conj.every((c) => c === 0)) continue;
    if (conj.some((c) => c === 0)) return `Lote ${n}: como há conjugação, todos os itens do lote precisam de número de montagem em sequência (0 só se nenhum conjuga).`;
    const usados = [...new Set(conj)].sort((a, b) => a - b);
    if (usados.findIndex((u, k) => u !== k + 1) >= 0) return `Lote ${n}: os números de montagem precisam ser sequenciais, sem pular (1, 2, 3…). Hoje: ${usados.join(", ")}.`;
  }
  return null;
}

// Resumo por lote, para as telas: "Lote 1: Farol 60.000 (montagem 1) · Isababy 22.000 (montagem 2)".
export function resumoDosLotes(modelos: Modelo[], c?: ReqCliente | null): { lote: number; texto: string }[] {
  const totais = c ? totaisPorModelo(c, modelos) : null;
  if (!temDivisao(modelos)) return [];
  const fmt = (n: number) => n.toLocaleString("pt-BR");
  return [...porLote(modelos)]
    .sort((a, b) => a[0] - b[0])
    .map(([lote, itens]) => ({
      lote,
      texto: itens
        .map((x) => `${modelos[x.i].descricao || `Modelo ${x.i + 1}`}${(x.quantidade ?? totais?.[x.i]) ? ` ${fmt((x.quantidade ?? totais?.[x.i])!)}` : ""} (${x.conjugacao ? `montagem ${x.conjugacao}` : "sem conjugação"})`)
        .join(" · "),
    }));
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

// Montagens do pedido na ordem de produção, com os itens de cada uma. Sem conjugação (todos 0) cada item é uma
// montagem própria, em sequência. null quando a conjugação não foi informada.
export function montagensDoPedido(modelos: Modelo[]): { numero: number; modelos: string[] }[] | null {
  if (modelos.length < 2) return null;
  const numeros = montagensDosModelos(modelos);
  if (numeros.some((n) => n === null)) return null;
  const mapa = new Map<number, string[]>();
  modelos.forEach((m, i) => mapa.set(numeros[i]!, [...(mapa.get(numeros[i]!) ?? []), m.descricao || `Modelo ${i + 1}`]));
  return [...mapa].sort((a, b) => a[0] - b[0]).map(([numero, nomes]) => ({ numero, modelos: nomes }));
}
