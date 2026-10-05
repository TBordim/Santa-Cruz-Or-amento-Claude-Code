"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { CLASSIFICACOES } from "@/lib/orcamentos/constantes";
import type { ClassificacaoModelo, Modelo } from "@/lib/orcamentos/types";
import { Field, Row2 } from "@/components/form-section";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CodigoInternoInput } from "./CodigoInternoInput";

type Linha = { chave: number; modelo: Modelo };

const VAZIO: Omit<Modelo, "id"> = { descricao: "", codigoCliente: "", codInterno: "", classificacao: "NOVO", cores: "" };

// Modelos (produtos) do orçamento. Vários modelos só entram no mesmo orçamento quando usam a
// mesma faca (mesma medida) — produção conjugada, um preço por faixa pro conjunto. Faca
// diferente é outro orçamento. Pedido do Thiago em 30/09/2026 (exemplo real: Compactor, 3
// modelos numa faca). Os campos de cada linha usam o mesmo `name` e são lidos pareados por
// índice em lerModelos (leitura.ts); modelo novo vai com id vazio e ganha um no servidor.
export function ModelosLista({ valoresIniciais }: { valoresIniciais?: Modelo[] }) {
  const proxima = useRef(valoresIniciais?.length ?? 1);
  const [linhas, setLinhas] = useState<Linha[]>(
    valoresIniciais?.length
      ? valoresIniciais.map((modelo, i) => ({ chave: i, modelo }))
      : [{ chave: 0, modelo: { id: "", ...VAZIO } }],
  );

  function mudarClassificacao(chave: number, classificacao: ClassificacaoModelo) {
    setLinhas(linhas.map((l) => (l.chave === chave ? { ...l, modelo: { ...l.modelo, classificacao } } : l)));
  }

  return (
    <div className="flex flex-col gap-3">
      {linhas.map(({ chave, modelo }, i) => {
        const repeticao = modelo.classificacao.startsWith("REPETICAO");
        return (
          <div key={chave} className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-3">
            {linhas.length > 1 && (
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Modelo {i + 1}</div>
            )}
            <input type="hidden" name="modeloId" value={modelo.id} />
            <Field label="Descrição do produto">
              <Input name="modeloDescricao" required defaultValue={modelo.descricao} />
            </Field>
            <Row2>
              <Field label="Classificação">
                {/* Valor por campo escondido: o <select> nativo interno do Radix não é confiável
                    pra ler pareado por índice com os outros campos da linha. */}
                <input type="hidden" name="modeloClassificacao" value={modelo.classificacao} />
                <Select value={modelo.classificacao} onValueChange={(v) => mudarClassificacao(chave, v as ClassificacaoModelo)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CLASSIFICACOES.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field
                label="Código interno (Santa Cruz)"
                hint={repeticao ? "Obrigatório — o produto já existe no sistema." : "Produto novo ganha o código só se o cliente aprovar."}
              >
                <CodigoInternoInput name="modeloCodInterno" required={repeticao} defaultValue={modelo.codInterno} />
              </Field>
            </Row2>
            <Row2>
              <Field label="Código do cliente" hint="O código que o próprio cliente usa pro produto — só pra registro, formato livre.">
                <Input name="modeloCodigoCliente" defaultValue={modelo.codigoCliente} />
              </Field>
              <Field
                label="Nº de cores (Frente/Verso)"
                hint="Ex.: 3/0 = três cores na frente e nenhuma no verso; 2/1 = duas na frente e uma no verso."
              >
                <Input
                  name="modeloCores"
                  defaultValue={modelo.cores ?? ""}
                  placeholder="3/0"
                  inputMode="text"
                  maxLength={7}
                  pattern="\s*\d{1,2}\s*/\s*\d{1,2}\s*"
                  title="Use Frente/Verso, por exemplo 3/0 ou 2/1"
                />
              </Field>
            </Row2>
            {linhas.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-fit text-destructive hover:text-destructive"
                onClick={() => setLinhas(linhas.filter((l) => l.chave !== chave))}
              >
                Remover modelo
              </Button>
            )}
          </div>
        );
      })}
      <div className="flex flex-col gap-1">
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setLinhas([...linhas, { chave: proxima.current++, modelo: { id: "", ...VAZIO } }])}
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar modelo
          </Button>
        </div>
        <span className="text-xs text-muted-foreground">
          Só modelos que usam a mesma faca (mesma medida). Faca diferente é outro orçamento.
        </span>
      </div>
    </div>
  );
}
