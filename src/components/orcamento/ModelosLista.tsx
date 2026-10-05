"use client";

import { useRef, useState } from "react";
import { ChevronDown, Copy, Plus, X } from "lucide-react";
import { CLASSIFICACOES } from "@/lib/orcamentos/constantes";
import { normalizarCores } from "@/lib/orcamentos/cores";
import type { ClassificacaoModelo, Modelo } from "@/lib/orcamentos/types";
import { Field } from "@/components/form-section";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CodigoInternoInput } from "./CodigoInternoInput";

type Linha = { chave: number; modelo: Modelo };

const VAZIO: Omit<Modelo, "id"> = { descricao: "", codigoCliente: "", codInterno: "", classificacao: "NOVO", cores: "" };

// Teto de modelos por orçamento: cobre com folga os casos reais (dezenas de sabores/nuances na
// mesma faca) e evita um formulário gigante por engano (colar a lista errada, por exemplo).
const MAX_MODELOS = 100;

// "uva, morango; framboesa" ou uma por linha (inclusive lista com marcadores ou numerada, como
// vem copiada de um e-mail) -> ["uva", "morango", "framboesa"]. Repetidas (sem diferenciar
// maiúsculas) entram uma vez só.
function lerVariacoes(texto: string): string[] {
  const vistas = new Set<string>();
  return texto
    .split(/[\n\r,;]+/)
    .map((s) => s.replace(/^[\s\-–•*·]*(\d+\s*[.)-]\s+)?/, "").trim())
    .filter((s) => {
      const k = s.toLowerCase();
      if (!s || vistas.has(k)) return false;
      vistas.add(k);
      return true;
    });
}

// Enter num campo do painel de criação em lote não pode enviar o formulário inteiro do orçamento.
function semEnviar(e: React.KeyboardEvent) {
  if (e.key === "Enter") e.preventDefault();
}

// Modelos (produtos) do orçamento. Vários modelos só entram no mesmo orçamento quando usam a
// mesma faca (mesma medida) — produção conjugada, um preço por faixa pro conjunto. Faca
// diferente é outro orçamento. Pedido do Thiago em 30/09/2026 (exemplo real: Compactor, 3
// modelos numa faca). Os campos de cada linha usam o mesmo `name` e são lidos pareados por
// índice em lerModelos (leitura.ts); modelo novo vai com id vazio e ganha um no servidor.
//
// Desde 05/10/2026 dá pra criar muitos de uma vez: orçamento com dezenas de tipos do mesmo
// produto (sabores, nuances) era lento e sujeito a erro lançando um a um. Cada tipo continua
// sendo um modelo de verdade (código próprio, rastreabilidade, comparação na Diretoria).
export function ModelosLista({ valoresIniciais, codigoOpcional = false }: { valoresIniciais?: Modelo[]; codigoOpcional?: boolean }) {
  const proxima = useRef(valoresIniciais?.length ?? 1);
  const [linhas, setLinhas] = useState<Linha[]>(
    valoresIniciais?.length
      ? valoresIniciais.map((modelo, i) => ({ chave: i, modelo }))
      : [{ chave: 0, modelo: { id: "", ...VAZIO } }],
  );
  const [base, setBase] = useState("");
  const [variacoes, setVariacoes] = useState("");
  const [padraoClass, setPadraoClass] = useState<ClassificacaoModelo>("NOVO");
  const [padraoCores, setPadraoCores] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);

  function atualizar(chave: number, parcial: Partial<Modelo>) {
    setLinhas((ls) => ls.map((l) => (l.chave === chave ? { ...l, modelo: { ...l.modelo, ...parcial } } : l)));
  }

  function novaLinha(modelo: Partial<Modelo>): Linha {
    return { chave: proxima.current++, modelo: { id: "", ...VAZIO, ...modelo } };
  }

  // A primeira linha, ainda em branco, é só o ponto de partida: sai quando a lista em lote entra.
  const primeiraVazia = (ls: Linha[]) => ls.length === 1 && !ls[0].modelo.descricao && !ls[0].modelo.id;

  function criarEmLote() {
    setAviso(null);
    const nomes = lerVariacoes(variacoes);
    if (!nomes.length) {
      setAviso("Digite ou cole os tipos (por exemplo: uva, morango, framboesa).");
      return;
    }
    const cores = normalizarCores(padraoCores);
    if (cores === null) {
      setAviso("Número de cores inválido: use Frente/Verso, por exemplo 3/0 ou 2/1.");
      return;
    }
    const existentes = primeiraVazia(linhas) ? [] : linhas;
    if (existentes.length + nomes.length > MAX_MODELOS) {
      setAviso(`No máximo ${MAX_MODELOS} modelos por orçamento (você está tentando chegar a ${existentes.length + nomes.length}).`);
      return;
    }
    const parteComum = base.trim();
    const criadas = nomes.map((v) =>
      novaLinha({ descricao: parteComum ? `${parteComum} — ${v}` : v, classificacao: padraoClass, cores }),
    );
    setLinhas([...existentes, ...criadas]);
    setVariacoes("");
    setAviso(`${criadas.length} modelos criados. Confira os nomes abaixo e complete os códigos, se tiver.`);
  }

  function aplicarATodos() {
    setAviso(null);
    const cores = normalizarCores(padraoCores);
    if (cores === null) {
      setAviso("Número de cores inválido: use Frente/Verso, por exemplo 3/0 ou 2/1.");
      return;
    }
    setLinhas((ls) =>
      ls.map((l) => ({ ...l, modelo: { ...l.modelo, classificacao: padraoClass, ...(cores ? { cores } : {}) } })),
    );
    setAviso(`Classificação${cores ? " e nº de cores" : ""} aplicados a todos os ${linhas.length} modelos.`);
  }

  function duplicar(chave: number) {
    if (linhas.length >= MAX_MODELOS) {
      setAviso(`No máximo ${MAX_MODELOS} modelos por orçamento.`);
      return;
    }
    // Copia o que costuma se repetir. Os códigos não vão junto: cada tipo tem os seus.
    setLinhas((ls) => {
      const i = ls.findIndex((l) => l.chave === chave);
      const o = ls[i].modelo;
      const copia = novaLinha({ descricao: o.descricao, classificacao: o.classificacao, cores: o.cores });
      return [...ls.slice(0, i + 1), copia, ...ls.slice(i + 1)];
    });
  }

  function adicionar(qtd: number) {
    if (linhas.length + qtd > MAX_MODELOS) {
      setAviso(`No máximo ${MAX_MODELOS} modelos por orçamento.`);
      return;
    }
    setLinhas((ls) => [...ls, ...Array.from({ length: qtd }, () => novaLinha({ classificacao: padraoClass }))]);
  }

  const varios = linhas.length > 1;

  return (
    <div className="flex flex-col gap-3">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg border border-border bg-secondary px-4 py-3 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground">Tem vários tipos do mesmo produto? Criar de uma vez</span>
            <span className="text-xs font-normal text-muted-foreground">
              Sabores, cores ou nuances: digite ou cole os nomes e o sistema cria um modelo para cada um.
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <span className="group-open:hidden">Abrir</span>
            <span className="hidden group-open:inline">Fechar</span>
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          </span>
        </summary>

        <div className="mt-3 flex flex-col gap-3 rounded-lg border border-border p-3">
          <Field label="Produto (parte comum do nome)" hint='Opcional. Ex.: "Caixa de gelatina" — cada modelo fica "Caixa de gelatina — Uva".'>
            <Input value={base} onChange={(e) => setBase(e.target.value)} onKeyDown={semEnviar} placeholder="Caixa de gelatina" />
          </Field>
          <Field label="Tipos" hint="Separe por vírgula ou um por linha. Pode colar uma lista copiada do e-mail do cliente.">
            <Textarea
              value={variacoes}
              onChange={(e) => setVariacoes(e.target.value)}
              rows={4}
              placeholder={"Uva, Morango, Framboesa, Limão"}
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Classificação padrão">
              <Select value={padraoClass} onValueChange={(v) => setPadraoClass(v as ClassificacaoModelo)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLASSIFICACOES.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Nº de cores padrão (Frente/Verso)" hint="Opcional. Ex.: 3/0.">
              <Input value={padraoCores} onChange={(e) => setPadraoCores(e.target.value)} onKeyDown={semEnviar} placeholder="3/0" maxLength={7} />
            </Field>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={criarEmLote} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Criar modelos
            </Button>
            {varios && (
              <Button type="button" variant="outline" onClick={aplicarATodos}>
                Aplicar classificação e cores a todos
              </Button>
            )}
          </div>
        </div>
      </details>
      {aviso && <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{aviso}</div>}

      {linhas.map(({ chave, modelo }, i) => {
        const repeticao = modelo.classificacao.startsWith("REPETICAO");
        return (
          <div key={chave} className="flex flex-col gap-2.5 rounded-lg border border-dashed border-border p-3">
            <input type="hidden" name="modeloId" value={modelo.id} />
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {varios ? `Modelo ${i + 1}` : "Produto"}
              </div>
              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="icon-sm" aria-label={`Duplicar o modelo ${i + 1}`} title="Duplicar" onClick={() => duplicar(chave)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                {varios && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    aria-label={`Remover o modelo ${i + 1}`}
                    title="Remover"
                    onClick={() => setLinhas((ls) => ls.filter((l) => l.chave !== chave))}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            <Field label="Descrição do produto">
              <Input name="modeloDescricao" required value={modelo.descricao} onChange={(e) => atualizar(chave, { descricao: e.target.value })} />
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Classificação">
                {/* Valor por campo escondido: o <select> nativo interno do Radix não é confiável
                    pra ler pareado por índice com os outros campos da linha. */}
                <input type="hidden" name="modeloClassificacao" value={modelo.classificacao} />
                <Select value={modelo.classificacao} onValueChange={(v) => atualizar(chave, { classificacao: v as ClassificacaoModelo })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CLASSIFICACOES.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field
                label="Código interno (Santa Cruz)"
                hint={
                  repeticao
                    ? codigoOpcional
                      ? "Se não tiver o código agora, pode deixar em branco — o escritório completa antes de seguir."
                      : "Obrigatório — o produto já existe no sistema."
                    : "Produto novo ganha o código só se o cliente aprovar."
                }
              >
                <CodigoInternoInput name="modeloCodInterno" required={repeticao && !codigoOpcional} defaultValue={modelo.codInterno} />
              </Field>
              <Field label="Código do cliente" hint="Só pra registro, formato livre.">
                <Input name="modeloCodigoCliente" defaultValue={modelo.codigoCliente} />
              </Field>
              <Field label="Nº de cores (Frente/Verso)" hint="Ex.: 3/0 ou 2/1.">
                <Input
                  name="modeloCores"
                  value={modelo.cores ?? ""}
                  onChange={(e) => atualizar(chave, { cores: e.target.value })}
                  placeholder="3/0"
                  maxLength={7}
                  pattern="\s*\d{1,2}\s*/\s*\d{1,2}\s*"
                  title="Use Frente/Verso, por exemplo 3/0 ou 2/1"
                />
              </Field>
            </div>
          </div>
        );
      })}

      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => adicionar(1)}>
            <Plus className="h-3.5 w-3.5" /> Adicionar modelo
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => adicionar(5)}>
            + 5 modelos
          </Button>
          {varios && <span className="self-center text-xs text-muted-foreground">{linhas.length} modelos</span>}
        </div>
        <span className="text-xs text-muted-foreground">
          Só modelos que usam a mesma faca (mesma medida). Faca diferente é outro orçamento.
        </span>
      </div>
    </div>
  );
}
