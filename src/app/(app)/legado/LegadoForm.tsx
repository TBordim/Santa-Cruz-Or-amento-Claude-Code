"use client";

import { useActionState } from "react";
import { CamposMargem } from "@/components/orcamento/CamposMargem";
import { criarLegado } from "./actions";
import { prepararAnexo } from "@/lib/anexos/compressao";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CodigoInternoInput } from "@/components/orcamento/CodigoInternoInput";
import { DESFECHOS_LEGADO } from "@/lib/orcamentos/constantes";

export function LegadoForm() {
  const [state, formAction, pending] = useActionState(criarLegado, undefined);

  // Comprime a foto no navegador e substitui o arquivo do próprio <input> (via DataTransfer)
  // antes do submit nativo — assim o formulário continua um <form action={formAction}> comum,
  // sem precisar interceptar a submissão manualmente.
  async function onFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const preparado = await prepararAnexo(file);
      const dt = new DataTransfer();
      dt.items.add(preparado);
      e.target.files = dt.files;
    } catch {
      // erro de compressão: deixa o arquivo original, a validação do lado do servidor não existe
      // aqui de propósito (foto é opcional) — só não comprime.
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base">Novo registro do Arquivo legado</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cliente">Cliente</Label>
            <Input id="cliente" name="cliente" required />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="codInterno">Código interno (Santa Cruz)</Label>
              <CodigoInternoInput id="codInterno" name="codInterno" />
              <span className="text-xs text-muted-foreground">
                Informe o código OU as medidas abaixo (ao menos comprimento e largura). Produto que o cliente não aprovou não tem código.
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="produtoDescricao">Descrição do produto</Label>
              <Input id="produtoDescricao" name="produtoDescricao" required />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Medidas (mm)</Label>
            <div className="grid grid-cols-3 gap-3">
              <Input name="medidaF" placeholder="Comprimento" inputMode="decimal" aria-label="Comprimento (mm)" />
              <Input name="medidaL" placeholder="Largura" inputMode="decimal" aria-label="Largura (mm)" />
              <Input name="medidaA" placeholder="Altura" inputMode="decimal" aria-label="Altura (mm)" />
            </div>
            <span className="text-xs text-muted-foreground">
              Sem código, é pelas medidas exatas do mesmo cliente que a Diretoria encontra este registro para comparar o preço.
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="precoAtual">Preço atual (por milheiro)</Label>
              <Input id="precoAtual" name="precoAtual" placeholder="Ex.: 1.234,56" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dataTexto">Data</Label>
              <Input id="dataTexto" name="dataTexto" placeholder="Ex.: meados de 2025" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="custoPrimarioPct">Custo primário (%)</Label>
              <Input id="custoPrimarioPct" name="custoPrimarioPct" />
            </div>
            <CamposMargem nameP2="margemP2Pct" nameP1="margemP1Pct" idP2="margemP2Pct" idP1="margemP1Pct" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quantidade">Quantidade</Label>
            <Input id="quantidade" name="quantidade" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="desfecho">Desfecho do orçamento (obrigatório)</Label>
            <select
              id="desfecho"
              name="desfecho"
              required
              defaultValue=""
              className="h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base md:h-8 md:text-sm"
            >
              <option value="" disabled>Escolha…</option>
              {DESFECHOS_LEGADO.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
            <span className="text-xs text-muted-foreground">Como aquele orçamento terminou. A Diretoria vê isso ao comparar com o orçamento novo.</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="obs">Observação</Label>
            <Textarea id="obs" name="obs" rows={2} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="foto">Foto da folha (opcional)</Label>
            <Input id="foto" type="file" name="foto" accept="image/*,application/pdf" onChange={onFotoChange} />
            <span className="text-xs text-muted-foreground">A leitura automática por IA só funciona com imagens — um PDF pode ser visualizado, mas não é lido.</span>
          </div>
          {state?.erro && <div className="anexo-erro">{state.erro}</div>}
          <div>
            <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Cadastrar"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
