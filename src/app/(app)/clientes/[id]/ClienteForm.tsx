"use client";

import Link from "next/link";
import { useFormActionSemReset } from "@/hooks/use-form-action";
import { salvarCliente } from "../actions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { FormSection, Field, Row2 } from "@/components/form-section";

type ClienteEditavel = {
  id: string;
  razaoSocial: string;
  cnpj: string;
  endereco: string;
  complemento: string;
  bairro: string;
  cep: string;
  uf: string;
  municipio: string;
  telefone: string;
  email: string;
  contato: string;
  prazosPagamento: string;
  ativo: boolean;
  pendente: boolean;
};

// Envio pelo onSubmit (useFormActionSemReset): com <form action> o navegador limpava o que a
// pessoa digitou quando a ação voltava com erro de validação.
export function ClienteForm({ cliente: c }: { cliente: ClienteEditavel }) {
  const [state, onSubmit, pending] = useFormActionSemReset(salvarCliente, undefined);

  return (
    <Card className="max-w-[760px]">
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-0">
          <input type="hidden" name="id" value={c.id} />

          <FormSection title="Cliente">
            <Field label="Razão social">
              <Input name="razaoSocial" required defaultValue={c.razaoSocial} />
            </Field>
            <Row2>
              <Field label="CNPJ"><Input name="cnpj" required defaultValue={c.cnpj} inputMode="numeric" /></Field>
              <Field label="Contato"><Input name="contato" defaultValue={c.contato} /></Field>
            </Row2>
            <Row2>
              <Field label="Telefone"><Input name="telefone" defaultValue={c.telefone} /></Field>
              <Field label="E-mail"><Input name="email" type="email" defaultValue={c.email} /></Field>
            </Row2>
          </FormSection>

          <FormSection title="Endereço">
            <Field label="Endereço"><Input name="endereco" defaultValue={c.endereco} /></Field>
            <Row2>
              <Field label="Complemento"><Input name="complemento" defaultValue={c.complemento} /></Field>
              <Field label="Bairro"><Input name="bairro" defaultValue={c.bairro} /></Field>
            </Row2>
            <Row2>
              <Field label="Município"><Input name="municipio" defaultValue={c.municipio} /></Field>
              <Row2 compacto>
                <Field label="UF"><Input name="uf" maxLength={2} defaultValue={c.uf} /></Field>
                <Field label="CEP"><Input name="cep" defaultValue={c.cep} inputMode="numeric" /></Field>
              </Row2>
            </Row2>
          </FormSection>

          <FormSection title="Condição de pagamento">
            <Field label="Prazos (dias)" hint="Parcelas separadas por barra, ex.: 28/35/42. Deixe em branco se não houver condição cadastrada.">
              <Input name="prazosPagamento" defaultValue={c.prazosPagamento} />
            </Field>
          </FormSection>

          <FormSection title="Situação">
            <label className="flex min-h-9 items-center gap-2 text-sm md:min-h-0">
              <Checkbox name="conferido" defaultChecked={!c.pendente} />
              <span>Dados conferidos (tira o cliente da fila de pendentes)</span>
            </label>
            <label className="flex min-h-9 items-center gap-2 text-sm md:min-h-0">
              <Checkbox name="ativo" defaultChecked={c.ativo} />
              <span>Cliente ativo (desmarque para ele deixar de aparecer na busca do Novo Orçamento)</span>
            </label>
          </FormSection>

          {state?.erro && <div className="anexo-erro mt-4">{state.erro}</div>}
          <div className="mt-6 flex gap-2">
            <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</Button>
            <Button asChild variant="outline">
              <Link href="/clientes">Cancelar</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
