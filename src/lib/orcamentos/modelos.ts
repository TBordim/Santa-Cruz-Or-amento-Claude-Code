// Regras do "conjunto" de um orçamento — vários modelos na mesma faca e SOs por quantidade ×
// opção de papel. Pedido do Thiago em 30/09/2026 (exemplos reais: Compactor, 3 modelos numa
// faca; Torre e Cia, um Pré Cadastro com uma SO por quantidade). Sem acesso ao banco: pode ser
// importado tanto por Server Actions quanto por componentes de cliente.

import { chave } from "./chave";
import { normalizarCodigoInterno } from "./codigo-interno";
import { parseQuantidade } from "./motor";
import type { ClassificacaoModelo, Modelo, PrecificacaoTier, ReqCliente, Suporte } from "./types";

export const CLASSIFICACOES_MODELO: readonly ClassificacaoModelo[] = [
  "NOVO",
  "REPETICAO_SEM_ALTERACAO",
  "REPETICAO_COM_ALTERACAO",
  "REPETICAO_NOVO",
];

export function ehRepeticao(c: string | null | undefined): boolean {
  return !!c?.startsWith("REPETICAO");
}

// Cards de antes de 30/09/2026 não têm a lista `modelos` — o produto único deles está nos
// campos soltos (produtoDescricao, codigoCliente, codInterno, classificacao) e vira um modelo
// só. "principal" é o id fixo desse modelo; a arte antiga (Anexo sem modeloId) aparece nele.
export function modelosDoDoc(doc: {
  modelos?: unknown;
  produtoDescricao?: string | null;
  codigoCliente?: string | null;
  codInterno?: string | null;
  classificacao?: string | null;
}): Modelo[] {
  if (Array.isArray(doc.modelos) && doc.modelos.length) return doc.modelos as Modelo[];
  return [
    {
      id: "principal",
      descricao: doc.produtoDescricao ?? "",
      codigoCliente: doc.codigoCliente ?? "",
      codInterno: normalizarCodigoInterno(doc.codInterno),
      classificacao: (CLASSIFICACOES_MODELO.includes(doc.classificacao as ClassificacaoModelo)
        ? doc.classificacao
        : "NOVO") as ClassificacaoModelo,
    },
  ];
}

// Classificação que vale pro conjunto na aprovação automática: basta um modelo novo pra tratar
// o conjunto inteiro como novo (decisão do Thiago em 30/09/2026). Ordem do "mais novo" pro "mais
// repetido".
const PESO_CLASSIFICACAO: ClassificacaoModelo[] = ["NOVO", "REPETICAO_NOVO", "REPETICAO_COM_ALTERACAO", "REPETICAO_SEM_ALTERACAO"];

export function classificacaoDoConjunto(modelos: Modelo[]): ClassificacaoModelo | null {
  if (!modelos.length) return null;
  return PESO_CLASSIFICACAO.find((c) => modelos.some((m) => m.classificacao === c)) ?? null;
}

// Campos soltos de produto do Orcamento, mantidos como RESUMO dos modelos — busca, Painel,
// Histórico e Arquivo legado continuam lendo esses campos. Com mais de um modelo não existe um
// código interno único, então o campo solto fica vazio (quem precisa lê os modelos).
export function resumoDosModelos(modelos: Modelo[]) {
  const produtoDescricao = modelos.map((m) => m.descricao).filter(Boolean).join(" / ");
  return {
    produtoDescricao,
    produtoChave: chave(produtoDescricao),
    codigoCliente: modelos.map((m) => m.codigoCliente).filter(Boolean).join(" / "),
    codInterno: modelos.length === 1 ? modelos[0].codInterno : "",
    classificacao: classificacaoDoConjunto(modelos),
  };
}

// Códigos internos do conjunto, ordenados — é a "identidade" usada pra achar o último
// fornecimento dos mesmos modelos. null quando algum modelo ainda não tem código (produto novo):
// aí não existe fornecimento anterior pra comparar.
export function codigosDoConjunto(modelos: Modelo[]): string[] | null {
  const codigos = modelos.map((m) => normalizarCodigoInterno(m.codInterno));
  if (!codigos.length || codigos.some((c) => !c)) return null;
  return [...codigos].sort();
}

export function mesmosCodigos(a: string[] | null, b: string[] | null): boolean {
  return !!a && !!b && a.length === b.length && a.every((c, i) => c === b[i]);
}

// Arte de cada modelo. A do primeiro modelo inclui a arte "do orçamento inteiro" (sem modeloId —
// todos os anexos de antes de 30/09/2026) e a de modelo que já foi removido da lista, pra nenhum
// arquivo sumir da tela.
export function anexosDoModelo<T extends { modeloId?: string | null }>(anexos: T[], modelos: Modelo[], idx: number): T[] {
  const ids = new Set(modelos.map((m) => m.id));
  if (idx === 0) return anexos.filter((a) => !a.modeloId || !ids.has(a.modeloId) || a.modeloId === modelos[0]?.id);
  return anexos.filter((a) => a.modeloId === modelos[idx].id);
}

// ---------- Materiais e opções de papel ----------

export function usoDoMaterial(s: Suporte, idx: number): "opcao" | "conjunto" {
  if (idx === 0) return "opcao";
  return s.uso === "opcao" ? "opcao" : "conjunto";
}

export function textoMaterial(s: Pick<Suporte, "descricao" | "gramatura">): string {
  return [s.descricao, s.gramatura && `${s.gramatura} g/m²`].filter(Boolean).join(" ") || "Material sem descrição";
}

export type OpcaoPapel = { idx: number; texto: string };

// Opções de fornecimento (papéis alternativos). Com uma opção só, o orçamento não tem a
// "dimensão papel" — é o caso de quase todo orçamento, e de todos os de antes de 30/09/2026.
export function opcoesDePapel(c: ReqCliente | null | undefined): OpcaoPapel[] {
  return (c?.suportes ?? [])
    .map((s, idx) => ({ s, idx }))
    .filter(({ s, idx }) => usoDoMaterial(s, idx) === "opcao")
    .map(({ s, idx }) => ({ idx, texto: textoMaterial(s) }));
}

export type CombinacaoSO = { quantidade: string; papelIdx?: number; papel?: string };

// Uma SO por combinação quantidade × opção de papel (2 papéis × 2 quantidades = 4 SOs,
// resposta do Thiago em 30/09/2026). Agrupadas por papel: primeiro todas as quantidades do
// papel 1, depois as do papel 2...
export function combinacoesSO(c: ReqCliente | null | undefined): CombinacaoSO[] {
  const quantidades = c?.quantidadesLista ?? [];
  const opcoes = opcoesDePapel(c);
  if (opcoes.length <= 1) return quantidades.map((quantidade) => ({ quantidade }));
  return opcoes.flatMap((o) => quantidades.map((quantidade) => ({ quantidade, papelIdx: o.idx, papel: o.texto })));
}

// Casa uma SO já gravada com a combinação correspondente, mesmo que a lista mude de ordem (uma
// quantidade removida, um papel a mais) — o índice sozinho não serve pra isso.
export function chaveSO(t: { quantidade: string; papelIdx?: number }): string {
  return `${t.papelIdx ?? ""}|${chave(t.quantidade)}`;
}

export function rotuloSO(t: { quantidade: string; papel?: string }): string {
  return t.papel ? `${t.quantidade} · ${t.papel}` : t.quantidade;
}

// ---------- Valor ----------

export function soEscolhida(tiers: PrecificacaoTier[] | null | undefined): PrecificacaoTier | null {
  if (!tiers?.length) return null;
  return tiers.find((t) => t.escolhidaPeloCliente) ?? (tiers.length === 1 ? tiers[0] : null);
}

// Valor de uma SO (preço final × milheiros). O preço é "por milheiro" e a quantidade é gravada
// em unidades (ex.: "5000"), então é preço × (unidades / 1000) — bug antigo encontrado em teste
// real multiplicava por unidades direto (1000x o valor).
export function valorSO(t: PrecificacaoTier): number {
  const preco = t.precoFinal ?? t.precoFinalSugerido ?? 0;
  // A quantidade é digitada à mão, com ou sem ponto de milhar ("2.500" ou "2500"): só os dígitos
  // valem. Ler "2.500" como número decimal dava 2,5 unidades (total R$ 3,68 em vez de R$ 3.675).
  const unidades = parseQuantidade(t.quantidade) ?? 0;
  return preco * (unidades / 1000);
}

// Valor do orçamento no Histórico/Resumo. As SOs são alternativas (o cliente fecha uma só), então
// somar todas inflava o valor. Com a SO escolhida, vale ela; sem escolha (aguardando, negativo,
// sem retorno), vale a SO de maior valor — o quanto o orçamento podia render.
export function valorOrcamento(tiers: PrecificacaoTier[] | null | undefined): number {
  if (!tiers?.length) return 0;
  const escolhida = soEscolhida(tiers);
  if (escolhida) return valorSO(escolhida);
  return Math.max(...tiers.map(valorSO));
}
