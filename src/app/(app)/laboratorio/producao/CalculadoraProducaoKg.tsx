"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { num } from "@/lib/cor/formato";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Componente = { baseCodigo: string; baseNome: string; percentual: number };

// Puro client-side, sem ida ao servidor — kg × percentual de cada base = gramas daquele lote.
// Pensada pra quem só consulta (papel Produção): informa o código de uma cor aprovada
// (já resolvido na página) e quantos kg vai produzir, e recebe a quantidade de cada tinta.
export function CalculadoraProducaoKg({ componentes }: { componentes: Componente[] }) {
  const [kg, setKg] = useState("");
  const kgNum = Number(String(kg).replace(",", "."));
  const valido = Number.isFinite(kgNum) && kgNum > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5 sm:max-w-xs">
        <Label htmlFor="kg">Quantidade a produzir (kg)</Label>
        <Input id="kg" inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} placeholder="Ex.: 25" />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Base</TableHead>
            <TableHead className="text-right">%</TableHead>
            <TableHead className="text-right">kg</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {componentes.map((c) => (
            <TableRow key={c.baseCodigo}>
              <TableCell>
                {c.baseCodigo} <span className="text-muted-foreground">— {c.baseNome}</span>
              </TableCell>
              <TableCell className="text-right font-mono">{num(c.percentual, 2)}</TableCell>
              <TableCell className="text-right font-mono">
                {valido ? num((c.percentual / 100) * kgNum, 3) : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
