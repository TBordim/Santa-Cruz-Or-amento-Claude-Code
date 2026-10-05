"use client";

import { useRef, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { useFormActionSemReset } from "@/hooks/use-form-action";
import { useSalvoToast } from "@/hooks/use-salvo-toast";
import { ajustarSolicitacao } from "../actions";
import type { AjusteOrcamento, Modelo, Suporte } from "@/lib/orcamentos/types";
import { anexosDoModelo, usoDoMaterial } from "@/lib/orcamentos/modelos";
import { AnexoUpload } from "@/components/anexos/AnexoUpload";
import { fmtDateTime } from "@/lib/orcamentos/constantes";
import { ListaDinamica } from "@/components/orcamento/ListaDinamica";
import { Field, Row2 } from "@/components/form-section";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Bloco de um papel novo: descrição, gramatura, uso e o formato/aproveitamento que a Engenharia
// preencheria. Todos os campos usam o mesmo `name` entre blocos e são lidos pareados por índice
// em ajustarSolicitacao (painel/actions.ts).
function NovoPapel({ primeiro, onRemover }: { primeiro: boolean; onRemover: () => void }) {
  const [uso, setUso] = useState<"opcao" | "conjunto">("opcao");
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-3">
      <Row2>
        <Field label="Descrição do material">
          <Input name="novoPapelDescricao" required placeholder="Ex.: Cartão Supremo" />
        </Field>
        <Field label="Gramatura (g/m²)">
          <Input name="novoPapelGramatura" />
        </Field>
      </Row2>
      {/* O primeiro material de um orçamento é sempre uma opção de fornecimento. */}
      {primeiro ? (
        <input type="hidden" name="novoPapelUso" value="opcao" />
      ) : (
        <Field
          label="Uso do material"
          hint="Opção de fornecimento = papel alternativo (gera uma SO por quantidade). Uso conjunto = material usado junto com o principal."
        >
          <input type="hidden" name="novoPapelUso" value={uso} />
          <Select value={uso} onValueChange={(v) => setUso(v as "opcao" | "conjunto")}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="opcao">Opção de fornecimento</SelectItem>
              <SelectItem value="conjunto">Uso conjunto</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      )}
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Formato e aproveitamento</div>
      <Row2 compacto>
        <Field label="Formato"><Input name="novoPapelFormato" /></Field>
        <Field label="Código"><Input name="novoPapelCodigo" /></Field>
      </Row2>
      <Row2 compacto>
        <Field label="Qtd. por Folha Inteira"><Input name="novoPapelQtdFolha" /></Field>
        <Field label="Fls. Acerto"><Input name="novoPapelFlsAcerto" /></Field>
      </Row2>
      <Row2 compacto>
        <Field label="Fator — Comprimento (cm)"><Input name="novoPapelFatorC" /></Field>
        <Field label="Fator — Largura (cm)"><Input name="novoPapelFatorL" /></Field>
      </Row2>
      <Row2 compacto>
        <Field label="Corte"><Input name="novoPapelCorte" /></Field>
        <Field label="Qtd./ch."><Input name="novoPapelQtdCh" /></Field>
      </Row2>
      <Row2 compacto>
        <Field label="Formato Ideal — Comprimento (cm)"><Input name="novoPapelIdealC" /></Field>
        <Field label="Formato Ideal — Largura (cm)"><Input name="novoPapelIdealL" /></Field>
      </Row2>
      <Button type="button" variant="ghost" size="sm" className="w-fit text-destructive hover:text-destructive" onClick={onRemover}>
        Remover este papel
      </Button>
    </div>
  );
}

// "Ajustar quantidades e papéis": o responsável pelo Orçamento inclui uma quantidade ou um papel
// que não estava previsto sem devolver o card ao início do processo. Só adiciona — o que já foi
// salvo não sai daqui —, e cada ajuste fica registrado. O componente é remontado (key, em
// FormOrcamento) a cada gravação, pra recomeçar limpo com a lista nova.
export type AnexoDoPedido = {
  id: string;
  tipo: string;
  nome: string;
  url: string;
  mime: string;
  tamanho: number;
  modeloId?: string | null;
};

// Arquivos do pedido (arte do cliente, anexos da Engenharia e o link da arte), só pra consulta:
// quem decide quantas SOs por papel precisa ver a arte sem sair do painel nem abrir a Solicitação.
function ArquivosDoPedido({
  id,
  anexos,
  modelos,
  linkArte,
}: {
  id: string;
  anexos: AnexoDoPedido[];
  modelos: Modelo[];
  linkArte?: string;
}) {
  const arte = anexos.filter((a) => a.tipo === "ARTE");
  const engenharia = anexos.filter((a) => a.tipo === "ENGENHARIA");
  if (!arte.length && !engenharia.length && !linkArte) {
    return <p className="mt-4 text-xs text-muted-foreground">Nenhum arquivo ou link de arte anexado a este pedido.</p>;
  }
  return (
    <div className="mt-4 flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="text-sm font-semibold text-foreground">Arquivos do pedido</div>
      {linkArte && (
        <div className="text-sm">
          <span className="text-muted-foreground">Link da arte: </span>
          <a href={linkArte} target="_blank" rel="noreferrer" className="break-all underline underline-offset-2">{linkArte}</a>
        </div>
      )}
      {modelos.length > 1
        ? modelos.map((m, i) => {
            const doModelo = anexosDoModelo(arte, modelos, i);
            if (!doModelo.length) return null;
            return (
              <AnexoUpload key={m.id} orcamentoId={id} tipo="ARTE" anexos={doModelo} titulo={`Arte — ${m.descricao || `Modelo ${i + 1}`}`} somenteLeitura compacto />
            );
          })
        : arte.length > 0 && <AnexoUpload orcamentoId={id} tipo="ARTE" anexos={arte} somenteLeitura compacto />}
      {engenharia.length > 0 && <AnexoUpload orcamentoId={id} tipo="ENGENHARIA" anexos={engenharia} somenteLeitura compacto />}
    </div>
  );
}

export function AjustesOrcamento({
  id,
  quantidades,
  suportes,
  ajustes,
  anexos,
  modelos,
  linkArte,
}: {
  id: string;
  quantidades: string[];
  suportes: Suporte[];
  ajustes: AjusteOrcamento[];
  anexos: AnexoDoPedido[];
  modelos: Modelo[];
  linkArte?: string;
}) {
  const [state, onSubmit, pending] = useFormActionSemReset(ajustarSolicitacao, undefined);
  useSalvoToast(pending, state?.erro, "Ajustes aplicados. As SOs novas aparecem logo abaixo.");
  const proxima = useRef(0);
  const [blocos, setBlocos] = useState<number[]>([]);

  return (
    <details className="group mt-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg border border-border bg-secondary px-4 py-3 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-foreground">Ajustar quantidades e papéis</span>
          <span className="text-xs font-normal text-muted-foreground">
            Precisa orçar outra quantidade ou incluir um papel? Faça aqui, sem devolver o card.
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <span className="group-open:hidden">Abrir</span>
          <span className="hidden group-open:inline">Fechar</span>
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </span>
      </summary>

      <ArquivosDoPedido id={id} anexos={anexos} modelos={modelos} linkArte={linkArte} />

      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-5 rounded-lg border border-border p-4">
        <input type="hidden" name="id" value={id} />

        <div className="flex flex-col gap-3">
          <div className="text-sm font-semibold text-foreground">Quantidades</div>
          {quantidades.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {quantidades.map((q) => (
                <span key={q} className="rounded-md border border-border bg-muted/40 px-2 py-1 font-mono text-xs">{q}</span>
              ))}
            </div>
          )}
          <Field label="Quantidades novas" hint="Cada quantidade nova gera uma SO. As que já estão lançadas não mudam nem saem.">
            <ListaDinamica name="novaQuantidade" placeholder="Ex.: 10.000" botaoLabel="Adicionar quantidade" />
          </Field>
        </div>

        <div className="flex flex-col gap-3">
          <div className="text-sm font-semibold text-foreground">Papéis</div>
          {suportes.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted-foreground">
                Papéis lançados — dá para corrigir a descrição e a gramatura, mas não remover.
              </span>
              {suportes.map((s, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Papel {i + 1} · {usoDoMaterial(s, i) === "opcao" ? "Opção de fornecimento" : "Uso conjunto"}
                  </span>
                  <Row2 compacto>
                    <Input name="papelDescricao" defaultValue={s.descricao} aria-label={`Descrição do papel ${i + 1}`} />
                    <Input name="papelGramatura" defaultValue={s.gramatura} placeholder="g/m²" aria-label={`Gramatura do papel ${i + 1}`} />
                  </Row2>
                </div>
              ))}
            </div>
          )}

          {blocos.map((chave, i) => (
            <NovoPapel
              key={chave}
              primeiro={suportes.length === 0 && i === 0}
              onRemover={() => setBlocos(blocos.filter((b) => b !== chave))}
            />
          ))}
          <div>
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setBlocos([...blocos, proxima.current++])}>
              <Plus className="h-3.5 w-3.5" /> Adicionar papel
            </Button>
          </div>
          <span className="text-xs text-muted-foreground">
            Papel novo entra com formato e aproveitamento preenchidos aqui mesmo (campos que a Engenharia preencheria).
          </span>
        </div>

        {state?.erro && <div className="anexo-erro">{state.erro}</div>}
        <div>
          <Button type="submit" disabled={pending}>{pending ? "Aplicando…" : "Aplicar ajustes"}</Button>
        </div>

        {ajustes.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <div className="text-sm font-semibold text-foreground">Ajustes já feitos neste orçamento</div>
            {ajustes.map((a, i) => (
              <div key={i} className="rounded-lg border border-border bg-muted/30 p-2.5 text-sm">
                <div className="text-xs text-muted-foreground">
                  {a.por} · {fmtDateTime(new Date(a.em))}
                </div>
                <ul className="mt-1 list-disc pl-5 text-foreground">
                  {a.itens.map((it, j) => <li key={j}>{it}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}
      </form>
    </details>
  );
}
