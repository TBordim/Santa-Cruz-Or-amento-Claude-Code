"use client";

import { lerQuantidade } from "@/lib/aceite/constantes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Datas que o cliente pediu: uma linha por entrega, com quantidade e observação opcionais. Serve ao
// pedido inteiro (Aceite sem divisão) e a cada lote (Aceite dividido).
export type DataForm = { data: string; quantidade: string; obs: string };

export const dataVazia = (): DataForm => ({ data: "", quantidade: "", obs: "" });

// Conteúdo do campo escondido que vai ao servidor (só as linhas com data).
export function datasParaEnvio(datas: DataForm[]) {
  return datas.filter((d) => d.data).map((d) => ({ data: d.data, quantidade: lerQuantidade(d.quantidade), obs: d.obs }));
}

export function EditorDatasCliente({
  datas,
  onChange,
  titulo = "Datas do cliente",
  dica = "Uma por entrega pedida; a quantidade é opcional.",
}: {
  datas: DataForm[];
  onChange: (d: DataForm[]) => void;
  titulo?: string;
  dica?: string;
}) {
  const muda = (i: number, campo: keyof DataForm, v: string) => onChange(datas.map((d, n) => (n === i ? { ...d, [campo]: v } : d)));
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{titulo}</span>
        <span className="text-xs text-muted-foreground">{dica}</span>
      </div>
      {datas.map((d, i) => (
        <div key={i} className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2 sm:grid-cols-[7rem_10rem_8rem_1fr_auto]">
          <span className="text-xs font-medium text-muted-foreground">{i + 1}ª data</span>
          <Input type="date" min={d.data && d.data < new Date().toLocaleDateString("en-CA") ? d.data : new Date().toLocaleDateString("en-CA")} value={d.data} onChange={(e) => muda(i, "data", e.target.value)} aria-label={`${i + 1}ª data do cliente`} />
          <Input value={d.quantidade} inputMode="numeric" placeholder="Qtd. até lá" onChange={(e) => muda(i, "quantidade", e.target.value)} aria-label={`Quantidade da ${i + 1}ª data`} />
          <Input className="hidden sm:block" value={d.obs} placeholder="Observação (opcional)" onChange={(e) => muda(i, "obs", e.target.value)} aria-label={`Observação da ${i + 1}ª data`} />
          {i > 0 ? (
            <Button type="button" size="sm" variant="ghost" className="text-bad" onClick={() => onChange(datas.filter((_, n) => n !== i))}>
              Remover
            </Button>
          ) : (
            <span />
          )}
        </div>
      ))}
      <div>
        <Button type="button" size="sm" variant="outline" onClick={() => onChange([...datas, dataVazia()])}>
          + Adicionar data
        </Button>
      </div>
    </div>
  );
}
