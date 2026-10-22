"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil, X } from "lucide-react";
import { editarCor } from "./actions";
import { useFormActionSemReset } from "@/hooks/use-form-action";
import { num } from "@/lib/cor/formato";
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

type Cor = {
  id: string;
  codigo: string;
  cliente: string | null;
  codigoProduto: string | null;
  referenciaDeclarada: string | null;
  tipoReferencia: string | null;
  labAlvoL: number | null;
  labAlvoA: number | null;
  labAlvoB: number | null;
  substrato: string | null;
  acabamento: string | null;
  resistenciaExigida: string | null;
};

// Fechado por padrão (não é a ação mais comum na bancada) — abre num clique em "Editar dados" e
// vem preenchido com o que já está cadastrado; antes disso não havia como corrigir nada aqui.
export function EditarCorForm({ cor }: { cor: Cor }) {
  const [aberto, setAberto] = useState(false);
  const [erro, onSubmit, pending] = useFormActionSemReset(editarCor, undefined);
  const enviou = useRef(false);

  // Fecha sozinho quando salva com sucesso (erro volta undefined depois de um submit real) —
  // sem isso o formulário ficava aberto com os dados antigos até a pessoa fechar na mão.
  useEffect(() => {
    if (pending) enviou.current = true;
    else if (enviou.current && !erro) setAberto(false);
  }, [pending, erro]);

  if (!aberto) {
    return (
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setAberto(true)}>
        <Pencil className="h-3.5 w-3.5" /> Editar dados
      </Button>
    );
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Editar dados da cor</CardTitle>
        <Button type="button" variant="ghost" size="icon" aria-label="Cancelar edição" onClick={() => setAberto(false)}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={cor.id} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="codigo">Código</Label>
              <Input id="codigo" value={cor.codigo} disabled readOnly aria-describedby="codigo-dica" />
              <span id="codigo-dica" className="text-[11px] text-muted-foreground">Gerado pelo sistema, não muda.</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cliente">Cliente</Label>
              <Input id="cliente" name="cliente" defaultValue={cor.cliente ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="codigoProduto">Código do produto</Label>
              <Input id="codigoProduto" name="codigoProduto" defaultValue={cor.codigoProduto ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="referenciaDeclarada">Referência</Label>
              <Input id="referenciaDeclarada" name="referenciaDeclarada" defaultValue={cor.referenciaDeclarada ?? ""} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 sm:max-w-sm">
            <Label htmlFor="tipoReferencia">Tipo de referência</Label>
            <Select name="tipoReferencia" defaultValue={cor.tipoReferencia ?? undefined}>
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
              <Input name="labAlvoL" inputMode="decimal" placeholder="L*" aria-label="L* alvo" defaultValue={cor.labAlvoL != null ? num(cor.labAlvoL) : ""} />
              <Input name="labAlvoA" inputMode="decimal" placeholder="a*" aria-label="a* alvo" defaultValue={cor.labAlvoA != null ? num(cor.labAlvoA) : ""} />
              <Input name="labAlvoB" inputMode="decimal" placeholder="b*" aria-label="b* alvo" defaultValue={cor.labAlvoB != null ? num(cor.labAlvoB) : ""} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="substrato">Substrato</Label>
              <Input id="substrato" name="substrato" defaultValue={cor.substrato ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="acabamento">Acabamento</Label>
              <Input id="acabamento" name="acabamento" defaultValue={cor.acabamento ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="resistenciaExigida">Resistência exigida</Label>
              <Input id="resistenciaExigida" name="resistenciaExigida" defaultValue={cor.resistenciaExigida ?? ""} />
            </div>
          </div>

          {erro && <div className="anexo-erro">{erro}</div>}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : "Salvar alterações"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
