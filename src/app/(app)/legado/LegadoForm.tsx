"use client";

import { useActionState } from "react";
import { criarLegado } from "./actions";
import { prepararAnexo } from "@/lib/anexos/compressao";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CodigoInternoInput } from "@/components/orcamento/CodigoInternoInput";

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
              <CodigoInternoInput id="codInterno" name="codInterno" required />
              <span className="text-xs text-muted-foreground">Obrigatório — é por esse código que a Diretoria compara com pedidos atuais.</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="produtoDescricao">Descrição do produto</Label>
              <Input id="produtoDescricao" name="produtoDescricao" required />
            </div>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="custoPrimarioPct">Custo primário (%)</Label>
              <Input id="custoPrimarioPct" name="custoPrimarioPct" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="margemP2Pct">Margem P2 (%)</Label>
              <Input id="margemP2Pct" name="margemP2Pct" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quantidade">Quantidade</Label>
            <Input id="quantidade" name="quantidade" />
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
