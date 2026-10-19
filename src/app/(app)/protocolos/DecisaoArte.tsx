"use client";

import { useState } from "react";
import { useFormActionSemReset } from "@/hooks/use-form-action";
import { decidirArte } from "./actions";
import { fmtDataProtocolo, type Sugestao } from "@/lib/protocolos/comum";
import { Field } from "@/components/form-section";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Modelo = { id: string; descricao: string };
type Modo = "novo" | "alterado" | "existente";

const MODOS: { key: Modo; titulo: string; ajuda: string }[] = [
  { key: "novo", titulo: "Arte nova", ajuda: "Cria o protocolo, com a data de hoje." },
  { key: "alterado", titulo: "Reprotocolar (arte alterada)", ajuda: "Mesmo número, data nova; a data anterior fica no histórico." },
  { key: "existente", titulo: "Já protocolada", ajuda: "É a mesma arte: esta é desconsiderada e o modelo usa o protocolo existente." },
];

// Decisão de Vendas sobre UMA arte que chegou. O sistema sugere o protocolo mais parecido do cliente
// (código interno e nome); Vendas confirma com um clique. Nada é ligado sem a confirmação.
export function DecisaoArte({
  arteId,
  sugestoes,
  modelos,
  modeloFixo,
  descricaoInicial,
  codInternoInicial,
}: {
  arteId: string;
  sugestoes: Sugestao[];
  modelos: Modelo[];
  modeloFixo: string | null;
  descricaoInicial: string;
  codInternoInicial: string;
}) {
  const [estado, onSubmit, pending] = useFormActionSemReset(decidirArte, undefined);
  const melhor = sugestoes.find((s) => s.pontos > 0) ?? null;
  // Há sugestão forte: abre já em "já protocolada" com ela marcada; Vendas só confirma ou troca.
  const [modo, setModo] = useState<Modo>(melhor ? "existente" : "novo");
  const [protocoloId, setProtocoloId] = useState<string>(melhor?.id ?? "");
  const precisaModelo = !modeloFixo && modelos.length > 1;

  if (estado?.ok) {
    return <div className="rounded-lg border border-border bg-good-soft px-3 py-2 text-sm text-good">{estado.ok}</div>;
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <input type="hidden" name="arteId" value={arteId} />
      <input type="hidden" name="modo" value={modo} />
      <input type="hidden" name="protocoloId" value={modo === "novo" ? "" : protocoloId} />

      <div className="grid gap-2 sm:grid-cols-3">
        {MODOS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setModo(m.key)}
            className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${modo === m.key ? "border-primary bg-muted/60" : "border-border hover:bg-muted/40"}`}
          >
            <span className="block font-semibold text-foreground">{m.titulo}</span>
            <span className="block text-xs text-muted-foreground">{m.ajuda}</span>
          </button>
        ))}
      </div>

      {precisaModelo && (
        <Field label="Modelo (sabor) desta arte" hint="O orçamento tem mais de um modelo: diga a qual deles a arte pertence.">
          <select name="modeloId" required defaultValue="" className="h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base md:h-8 md:text-sm">
            <option value="" disabled>Escolha…</option>
            {modelos.map((m) => <option key={m.id} value={m.id}>{m.descricao || "Modelo sem descrição"}</option>)}
          </select>
        </Field>
      )}
      {modeloFixo && <input type="hidden" name="modeloId" value={modeloFixo} />}

      {modo === "novo" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nº do protocolo" hint="Formato livre (vem da planilha). Sabores do mesmo produto: 2101/1, 2101/2…; sem sabores: 2101.">
            <Input name="numero" required />
          </Field>
          <Field label="Cód. interno (se houver)">
            <Input name="codInterno" defaultValue={codInternoInicial} inputMode="numeric" />
          </Field>
          <Field label="Descrição do produto" className="sm:col-span-2">
            <Input name="descricao" required defaultValue={descricaoInicial} />
          </Field>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="text-sm font-medium text-foreground">
            {sugestoes.length ? "Protocolos deste cliente" : "Este cliente ainda não tem protocolo cadastrado"}
          </div>
          {sugestoes.map((s) => (
            <label key={s.id} className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-muted/50">
              <input type="radio" name="_escolha" checked={protocoloId === s.id} onChange={() => setProtocoloId(s.id)} className="mt-1 accent-primary" />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-semibold text-foreground">{s.numero}</span>
                  <span className="text-xs text-muted-foreground">{fmtDataProtocolo(s.ultimaData)}</span>
                  {s.id === melhor?.id && <Badge className="border-0 bg-good-soft text-good">Sugerido</Badge>}
                </span>
                <span className="block break-words text-muted-foreground">{s.descricao}</span>
                {s.motivos.length > 0 && <span className="block text-xs text-muted-foreground">{s.motivos.join(" · ")}</span>}
              </span>
            </label>
          ))}
          <Field label="Ou informe o número de outro protocolo" hint="Só se não estiver na lista acima.">
            <Input name="numeroExistente" onChange={() => setProtocoloId("")} />
          </Field>
          {modo === "alterado" && (
            <Field label="O que mudou (opcional)" hint="Em relação à arte anterior.">
              <Textarea name="mudou" rows={2} />
            </Field>
          )}
        </div>
      )}

      {modo !== "existente" && (
        <Field label="Data do protocolo" hint="Hoje, se não mudar. É a data que garante a rastreabilidade.">
          <Input name="dataProtocolo" type="date" defaultValue={new Date().toLocaleDateString("sv-SE")} />
        </Field>
      )}

      {modo !== "existente" && (
        <Field label="Cópia carimbada (opcional)" hint="Escaneie ou fotografe a arte impressa e carimbada, se for o caso (útil para link).">
          <Input name="copia" type="file" accept="image/*,application/pdf" />
        </Field>
      )}

      {estado?.erro && <div className="anexo-erro">{estado.erro}</div>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : modo === "novo" ? "Criar protocolo" : modo === "alterado" ? "Reprotocolar com a data nova" : "Confirmar: já protocolada"}
        </Button>
      </div>
    </form>
  );
}
