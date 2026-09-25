"use client";

import { criarCor } from "./actions";
import { useFormActionSemReset } from "@/hooks/use-form-action";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TIPOS_REFERENCIA = [
  { value: "AMOSTRA_CLIENTE", label: "Amostra do cliente" },
  { value: "PADRAO_INTERNO", label: "Padrão interno" },
  { value: "PLOTTER_PANTONE_DIGITAL", label: "Tarja do plotter (Pantone Digital)" },
];

// O código não é digitado: o sistema gera o próximo STA na hora de criar. `proximoCodigo` é só a
// previsão mostrada no campo travado — se outra pessoa criar uma cor antes, o número real avança.
export function NovaCorForm({ proximoCodigo }: { proximoCodigo: string }) {
  const [erro, onSubmit, pending] = useFormActionSemReset(criarCor, undefined);

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-base">Nova cor</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="codigo">Código</Label>
              <Input id="codigo" value={proximoCodigo} disabled readOnly aria-describedby="codigo-dica" />
              <span id="codigo-dica" className="text-[11px] text-muted-foreground">Gerado automaticamente ao criar.</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cliente">Cliente</Label>
              <Input id="cliente" name="cliente" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="codigoProduto">Código do produto</Label>
              <Input id="codigoProduto" name="codigoProduto" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="referenciaDeclarada">Referência</Label>
              <Input id="referenciaDeclarada" name="referenciaDeclarada" placeholder="Ex.: VERDE P. 335" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 sm:max-w-sm">
            <Label htmlFor="tipoReferencia">Tipo de referência</Label>
            <Select name="tipoReferencia">
              <SelectTrigger id="tipoReferencia" className="w-full">
                <SelectValue placeholder="Escolha…" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_REFERENCIA.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>LAB alvo</Label>
            <div className="mt-1.5 grid max-w-sm grid-cols-3 gap-3">
              <Input name="labAlvoL" inputMode="decimal" placeholder="L*" aria-label="L* alvo" />
              <Input name="labAlvoA" inputMode="decimal" placeholder="a*" aria-label="a* alvo" />
              <Input name="labAlvoB" inputMode="decimal" placeholder="b*" aria-label="b* alvo" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="substrato">Substrato</Label>
              <Input id="substrato" name="substrato" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="acabamento">Acabamento</Label>
              <Input id="acabamento" name="acabamento" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="resistenciaExigida">Resistência exigida</Label>
              <Input id="resistenciaExigida" name="resistenciaExigida" />
            </div>
          </div>

          {erro && <div className="anexo-erro">{erro}</div>}
          <div>
            <Button type="submit" disabled={pending}>
              Criar cor
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
