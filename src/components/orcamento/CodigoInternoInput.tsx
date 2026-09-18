"use client";

import type { ComponentProps } from "react";
import { formatarCodigoInterno } from "@/lib/orcamentos/codigo-interno";
import { Input } from "@/components/ui/input";

// Formata em tempo real enquanto digita (0.000.000) — o valor submetido no FormData já sai
// pontuado, mas os campos que salvam código interno sempre normalizam de novo (só dígitos) no
// servidor, então digitar com ou sem pontuação dá no mesmo resultado gravado.
export function CodigoInternoInput({
  defaultValue,
  ...props
}: Omit<ComponentProps<typeof Input>, "onChange" | "inputMode" | "placeholder">) {
  return (
    <Input
      inputMode="numeric"
      placeholder="0.000.000"
      defaultValue={defaultValue ? formatarCodigoInterno(String(defaultValue)) : ""}
      onChange={(e) => {
        e.target.value = formatarCodigoInterno(e.target.value);
      }}
      {...props}
    />
  );
}
