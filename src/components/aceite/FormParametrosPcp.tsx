"use client";

import { useFormActionSemReset } from "@/hooks/use-form-action";
import { salvarParametrosPcp } from "@/app/(app)/pcp/actions";
import type { ParametrosPcp } from "@/lib/pcp/sugestao";
import { FormSection, Field, DiretrizBlock, AcoesBar } from "@/components/form-section";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Prazos que o PCP usa para sugerir a data de entrega. Os valores iniciais são palpites: o PCP ajusta
// conforme a fábrica de verdade.
export function FormParametrosPcp({ p, salvo, podeEditar }: { p: ParametrosPcp; salvo: boolean; podeEditar: boolean }) {
  const [state, onSubmit, pending] = useFormActionSemReset(salvarParametrosPcp, undefined);
  const campo = (name: keyof ParametrosPcp, label: string, hint?: string) => (
    <Field label={label} hint={hint}>
      <Input name={name} inputMode="numeric" defaultValue={String(p[name])} disabled={!podeEditar} required />
    </Field>
  );
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <FormSection title="Sugestão de data de entrega">
        <DiretrizBlock>
          {salvo
            ? "Estes são os prazos que a sugestão de data usa. Dias úteis: sábado e domingo não contam; feriados ainda não são considerados."
            : "Ainda não foram ajustados: estes são valores iniciais de partida, não regras da fábrica. Ajuste e salve."}
        </DiretrizBlock>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {campo("diasProducaoMinimo", "Produção: mínimo (dias úteis)", "Vale para qualquer pedido, mesmo pequeno.")}
          {campo("folhasPorDia", "Capacidade (folhas por dia útil)", "Acima do mínimo, o prazo cresce com as folhas.")}
          {campo("diasMargem", "Margem de segurança (dias úteis)")}
          {campo("diasFacaNova", "Faca nova (dias úteis)", "Corre junto com a chegada do papel.")}
          {campo("diasClicheNovo", "Clichê novo (dias úteis)", "Corre junto com a chegada do papel.")}
          {campo("diasAcabamentoEspecial", "Acabamento especial (dias úteis)", "Hot stamping, relevo, plastificação etc.")}
        </div>
      </FormSection>
      {state?.erro && <div className="anexo-erro">{state.erro}</div>}
      {state?.ok && <div className="text-sm text-good">{state.ok}</div>}
      {podeEditar && (
        <AcoesBar>
          <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar parâmetros"}</Button>
        </AcoesBar>
      )}
    </form>
  );
}
