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
  // Total digitado antes (orçamento antigo, sem divisão por modelo): vale enquanto nenhum modelo tem quantidade.
  total: string;
  // Quantidade de cada modelo, pela chave da linha em ModelosLista.
  porModelo: Record<number, string>;
};

const digitos = (v: string) => v.replace(/\D/g, "");
const numero = (v: string) => (digitos(v) ? parseInt(digitos(v), 10) : 0);
const fmt = (n: number) => n.toLocaleString("pt-BR");

// Modelos e quantidades a orçar. A quantidade de cada modelo é digitada NA LINHA do próprio modelo,
// do lado da descrição (pedido do Thiago em 26/10/2026: com muitos modelos, as quantidades ficavam
// lá embaixo, longe do nome). Cada "quantidade" é uma opção de fornecimento e gera uma SO; o total do
// conjunto (soma dos modelos) é o que vira SO. Os campos "quantidades" (total) e "quantidadesDetalhe"
// (JSON da divisão por modelo) vão pareados por posição; ver lerQuantidadesPorModelo em leitura.ts.
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
    const umModelo = (modelosIniciais?.length ?? 1) <= 1;
    return totais.map((total) => {
      const itens = detalheInicial?.[digitos(total)];
      const porModelo: Record<number, string> = {};
      if (itens) {
        (modelosIniciais ?? []).forEach((m, i) => {
          const x = itens[i]?.descricao === m.descricao ? itens[i] : itens.find((y) => y.descricao === m.descricao);
          if (x) porModelo[i] = x.quantidade;
        });
      } else if (umModelo && total.trim()) {
        porModelo[0] = total; // um modelo só: a quantidade salva é a dele
      }
      return { chave: novaChave(), total, porModelo };
    });
  });

  const varios = modelos.length > 1;
  const somaDe = (o: Opcao) => modelos.reduce((s, m) => s + numero(o.porModelo[m.chave] ?? ""), 0);

  function mudar(opChave: number, modeloChave: number, valor: string) {
    setOpcoes((os) => os.map((o) => (o.chave === opChave ? { ...o, porModelo: { ...o.porModelo, [modeloChave]: valor } } : o)));
  }

  // Campo(s) de quantidade dentro da linha de cada modelo: um por opção de quantidade.
  const campoNaLinha = (modeloChave: number, indice: number) => (
    <div className="flex items-end gap-1.5">
      {opcoes.map((o, k) => (
        <Field key={o.chave} label={opcoes.length > 1 ? `Qtd. ${k + 1}` : "Quantidade"} className="w-28">
          <Input
            inputMode="numeric"
            placeholder="Ex.: 5000"
            required={obrigatorio && k === 0 && indice === 0 && !o.total.trim()}
            value={o.porModelo[modeloChave] ?? ""}
            onChange={(e) => mudar(o.chave, modeloChave, e.target.value)}
          />
        </Field>
      ))}
    </div>
  );

  return (
    <>
      <ModelosLista valoresIniciais={modelosIniciais} codigoOpcional={codigoOpcional} onMudar={setModelos} campoQuantidade={campoNaLinha} />
      <Field
        label={rotulo}
        hint={
          varios
            ? "A quantidade de cada modelo é digitada na linha dele, acima. O total do conjunto é somado sozinho e cada total gera uma SO."
            : "A quantidade é digitada na linha do modelo, acima. Cada quantidade gera uma SO."
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          {opcoes.map((o, k) => {
            const soma = somaDe(o);
            const totalFinal = soma > 0 ? fmt(soma) : o.total.trim();
            const detalhe = varios && soma > 0 ? JSON.stringify(modelos.map((m) => ({ descricao: m.descricao, quantidade: digitos(o.porModelo[m.chave] ?? "") }))) : "";
            return (
              <div key={o.chave} className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 py-1 pl-3 pr-1 text-sm">
                <input type="hidden" name="quantidades" value={totalFinal} />
                <input type="hidden" name="quantidadesDetalhe" value={detalhe} />
                <span className="text-muted-foreground">{opcoes.length > 1 ? `Quantidade ${k + 1}${varios ? " · total" : ""}:` : varios ? "Total do conjunto:" : "Quantidade:"}</span>
                <span className="font-mono font-semibold text-foreground">{totalFinal || "—"}</span>
                {opcoes.length > 1 ? (
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remover a quantidade ${k + 1}`} onClick={() => setOpcoes(opcoes.filter((x) => x.chave !== o.chave))}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <span className="w-2" />
                )}
              </div>
            );
          })}
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setOpcoes([...opcoes, { chave: novaChave(), total: "", porModelo: {} }])}>
            <Plus className="h-3.5 w-3.5" /> {opcoes.length > 0 ? "Adicionar outra quantidade" : "Adicionar quantidade"}
          </Button>
        </div>
      </Field>
    </>
  );
}
