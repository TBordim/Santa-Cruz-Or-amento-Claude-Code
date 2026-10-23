"use client";

import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import type { Modelo, ReqCliente } from "@/lib/orcamentos/types";
import { Field } from "@/components/form-section";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ModelosLista, type ItemModelo } from "./ModelosLista";

type Detalhe = NonNullable<ReqCliente["quantidadesPorModelo"]>;
type Opcao = {
  chave: number;
  // Quantidade digitada quando o orçamento tem um modelo só (ou valor antigo, sem divisão por modelo).
  total: string;
  // Quantidade de cada modelo, pela chave da linha em ModelosLista.
  porModelo: Record<number, string>;
};

const digitos = (v: string) => v.replace(/\D/g, "");
const numero = (v: string) => (digitos(v) ? parseInt(digitos(v), 10) : 0);
const fmt = (n: number) => n.toLocaleString("pt-BR");

// Modelos e quantidades a orçar. Cada quantidade é uma opção de fornecimento e gera uma SO. Com um
// modelo só, a pessoa digita a quantidade dele. Com mais de um (mesma faca), digita a quantidade de
// CADA modelo e o total do conjunto — que é o que vira SO — é somado sozinho (pedido do Thiago em
// 23/10/2026). Os campos "quantidades" (total) e "quantidadesDetalhe" (JSON da divisão) vão pareados
// por posição; ver lerQuantidadesPorModelo em leitura.ts.
export function ProdutoQuantidades({
  modelosIniciais,
  quantidadesIniciais,
  detalheInicial,
  codigoOpcional,
  obrigatorio,
  rotulo,
}: {
  modelosIniciais?: Modelo[];
  quantidadesIniciais?: string[];
  detalheInicial?: Detalhe;
  codigoOpcional?: boolean;
  obrigatorio: boolean;
  rotulo: string;
}) {
  const [modelos, setModelos] = useState<ItemModelo[]>(
    modelosIniciais?.length ? modelosIniciais.map((m, i) => ({ chave: i, descricao: m.descricao })) : [{ chave: 0, descricao: "" }],
  );
  const proxima = useRef(0);
  const novaChave = () => proxima.current++;

  const [opcoes, setOpcoes] = useState<Opcao[]>(() => {
    const totais = quantidadesIniciais?.length ? quantidadesIniciais : [""];
    return totais.map((total) => {
      const itens = detalheInicial?.[digitos(total)];
      const porModelo: Record<number, string> = {};
      if (itens) {
        (modelosIniciais ?? []).forEach((m, i) => {
          const x = itens[i]?.descricao === m.descricao ? itens[i] : itens.find((y) => y.descricao === m.descricao);
          if (x) porModelo[i] = x.quantidade;
        });
      }
      return { chave: novaChave(), total, porModelo };
    });
  });

  const varios = modelos.length > 1;

  function atualizar(chave: number, parcial: Partial<Opcao>) {
    setOpcoes((os) => os.map((o) => (o.chave === chave ? { ...o, ...parcial } : o)));
  }

  return (
    <>
      <ModelosLista valoresIniciais={modelosIniciais} codigoOpcional={codigoOpcional} onMudar={setModelos} />
      <Field
        label={rotulo}
        hint={
          varios
            ? "Cada quantidade gera uma SO. Informe a quantidade de cada modelo: o total do conjunto é somado sozinho."
            : "Cada quantidade gera uma SO."
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start gap-3">
            {opcoes.map((o, idx) => {
              const soma = modelos.reduce((s, m) => s + numero(o.porModelo[m.chave] ?? ""), 0);
              // Total que vai no envio: a soma dos modelos; sem nenhum valor por modelo, o total antigo (se houver).
              const totalFinal = varios ? (soma > 0 ? fmt(soma) : o.total.trim()) : o.total.trim();
              const detalhe = varios && soma > 0 ? JSON.stringify(modelos.map((m) => ({ descricao: m.descricao, quantidade: digitos(o.porModelo[m.chave] ?? "") }))) : "";
              return (
                <div key={o.chave} className={varios ? "w-full max-w-[520px] rounded-lg border border-border bg-muted/20 p-3" : "w-44"}>
                  <input type="hidden" name="quantidades" value={totalFinal} />
                  <input type="hidden" name="quantidadesDetalhe" value={detalhe} />
                  {varios ? (
                    <>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quantidade {idx + 1}</span>
                        {opcoes.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => setOpcoes(opcoes.filter((x) => x.chave !== o.chave))}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {modelos.map((m, i) => (
                          <label key={m.chave} className="flex items-center gap-2 text-sm">
                            <span className="min-w-0 flex-1 truncate text-foreground" title={m.descricao}>
                              {m.descricao || `Modelo ${i + 1}`}
                            </span>
                            <Input
                              className="w-32"
                              inputMode="numeric"
                              placeholder="Ex.: 5000"
                              required={obrigatorio && idx === 0 && i === 0 && !o.total.trim()}
                              value={o.porModelo[m.chave] ?? ""}
                              onChange={(e) => atualizar(o.chave, { porModelo: { ...o.porModelo, [m.chave]: e.target.value } })}
                            />
                          </label>
                        ))}
                      </div>
                      <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm">
                        <span className="font-semibold text-foreground">Total do conjunto</span>
                        <span className="font-mono text-base font-semibold text-foreground">{soma > 0 ? fmt(soma) : totalFinal || "—"}</span>
                      </div>
                      {soma === 0 && o.total.trim() && (
                        <p className="mt-1 text-xs text-muted-foreground">Total anterior, sem divisão por modelo. Preencha as quantidades acima para detalhar.</p>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Input
                        required={obrigatorio && idx === 0}
                        value={o.total}
                        inputMode="numeric"
                        placeholder="Ex.: 5000"
                        onChange={(e) => atualizar(o.chave, { total: e.target.value })}
                      />
                      {opcoes.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => setOpcoes(opcoes.filter((x) => x.chave !== o.chave))}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div>
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setOpcoes([...opcoes, { chave: novaChave(), total: "", porModelo: {} }])}>
              <Plus className="h-3.5 w-3.5" /> Adicionar quantidade
            </Button>
          </div>
        </div>
      </Field>
    </>
  );
}
