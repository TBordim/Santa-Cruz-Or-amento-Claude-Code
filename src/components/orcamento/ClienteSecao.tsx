"use client";

import { createContext, useContext, useRef, useState } from "react";
import { Search, UserPlus, X } from "lucide-react";
import { buscarClientes, consultarCnpj } from "@/app/(app)/novo/clientes-actions";
import { cnpjValido } from "@/lib/clientes/cnpj";
import type { ClienteSugestao } from "@/lib/clientes/tipos";
import { FormSection, Field, Grade } from "@/components/form-section";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Cliente escolhido na busca (ou digitado, quando é novo). Os campos do formulário são não
// controlados: quando a escolha muda, `versao` muda e eles remontam (key) com o valor novo em
// defaultValue — sem efeito, e a pessoa continua podendo corrigir qualquer campo à mão.
type Estado = {
  escolhido: ClienteSugestao | null;
  versao: number;
  // true quando o cliente é novo (CNPJ que não está no cadastro) — o servidor cadastra no envio.
  novo: boolean;
  escolher: (c: ClienteSugestao | null, novo?: boolean) => void;
};
const ClienteContext = createContext<Estado>({ escolhido: null, versao: 0, novo: false, escolher: () => {} });

export function ClienteProvider({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<{ escolhido: ClienteSugestao | null; versao: number; novo: boolean }>({
    escolhido: null,
    versao: 0,
    novo: false,
  });
  const escolher = (c: ClienteSugestao | null, novo = false) =>
    setEstado((e) => ({ escolhido: c, versao: e.versao + 1, novo }));
  return <ClienteContext.Provider value={{ ...estado, escolher }}>{children}</ClienteContext.Provider>;
}

// Os dois campos de fora da seção Cliente que o cadastro também preenche.
export function CampoCliente({
  nome,
  campo,
  defaultValue,
  ...props
}: {
  nome: string;
  campo: "condPagamento" | "entregaLocalidade";
  defaultValue?: string | null;
} & Omit<React.ComponentProps<typeof Input>, "name" | "defaultValue">) {
  const { escolhido, versao } = useContext(ClienteContext);
  const doCadastro =
    campo === "condPagamento" ? escolhido?.condPagamento : escolhido ? escolhido.entregaEndereco || escolhido.endereco : undefined;
  return <Input key={versao} name={nome} defaultValue={escolhido ? (doCadastro ?? "") : (defaultValue ?? "")} {...props} />;
}

export type ClienteDefaults = {
  cliente?: string | null;
  cnpj?: string | null;
  endereco?: string | null;
  representante?: string | null;
  comissaoCev?: string | null;
  telefone?: string | null;
  email?: string | null;
  contatoCompras?: string | null;
};

export function ClienteSecao({ defaults, comBusca }: { defaults?: ClienteDefaults; comBusca: boolean }) {
  const { escolhido, versao, novo, escolher } = useContext(ClienteContext);
  const [consulta, setConsulta] = useState("");
  const [resultados, setResultados] = useState<ClienteSugestao[] | null>(null);
  const [modoNovo, setModoNovo] = useState(false);
  const [cnpjNovo, setCnpjNovo] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [consultando, setConsultando] = useState(false);
  // Só a última resposta vale: digitar rápido dispara várias buscas que podem voltar fora de ordem.
  const sequencia = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function aoDigitar(valor: string) {
    setConsulta(valor);
    if (timer.current) clearTimeout(timer.current);
    if (valor.trim().length < 3) {
      setResultados(null);
      return;
    }
    const minha = ++sequencia.current;
    timer.current = setTimeout(async () => {
      try {
        const lista = await buscarClientes(valor);
        if (minha !== sequencia.current) return;
        setResultados(lista);
        setAviso(null);
      } catch {
        // Falha na chamada (rede, servidor, banco): sem isto a tela ficava muda.
        if (minha === sequencia.current) {
          setResultados(null);
          setAviso("Não consegui buscar os clientes agora. Atualize a página (Ctrl+F5) e tente de novo.");
        }
      }
    }, 250);
  }

  function escolherCadastrado(c: ClienteSugestao) {
    escolher(c, false);
    setConsulta("");
    setResultados(null);
    setModoNovo(false);
    setAviso(null);
  }

  async function buscarCnpjNovo() {
    setAviso(null);
    if (!cnpjValido(cnpjNovo)) {
      setAviso("CNPJ inválido — confira os números.");
      return;
    }
    setConsultando(true);
    const r = await consultarCnpj(cnpjNovo);
    setConsultando(false);
    if (!r.ok) {
      setAviso(r.erro);
      return;
    }
    if (r.cadastrado) {
      escolherCadastrado(r.cadastrado);
      setAviso("Esse CNPJ já estava no cadastro — carreguei os dados dele.");
      return;
    }
    escolher(
      {
        id: "",
        razaoSocial: r.razaoSocial,
        cnpj: cnpjNovo,
        endereco: r.endereco,
        telefone: r.telefone,
        email: r.email,
        contato: "",
        condPagamento: "",
        entregaEndereco: "",
        pendenteConferencia: true,
      },
      true,
    );
    setAviso(
      r.razaoSocial
        ? "Dados trazidos da Receita Federal — confira e complete o que faltar. O cadastro fica pendente de conferência."
        : "Não consegui consultar a Receita agora — preencha os dados à mão. O cadastro fica pendente de conferência.",
    );
  }

  function limparEscolha() {
    escolher(null, false);
    setAviso(null);
  }

  const c = escolhido;
  // Antes de escolher alguém vale o que veio de fora (card existente); depois, o cadastro.
  const valor = (doCadastro: string | undefined, fallback: string | null | undefined) => (c ? (doCadastro ?? "") : (fallback ?? ""));

  return (
    <FormSection title="Cliente" denso>
      {comBusca && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
          {c && !novo ? (
            <div className="flex items-center justify-between gap-2 text-sm">
              <span>
                Cliente do cadastro: <strong>{c.razaoSocial}</strong>
                {c.pendenteConferencia && <span className="ml-2 text-xs text-muted-foreground">(pendente de conferência)</span>}
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={limparEscolha} className="gap-1">
                <X className="h-3.5 w-3.5" /> Trocar
              </Button>
            </div>
          ) : modoNovo ? (
            <>
              <span className="text-sm font-medium">Cliente novo — informe o CNPJ</span>
              <div className="flex gap-2">
                <Input
                  value={cnpjNovo}
                  onChange={(e) => setCnpjNovo(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  inputMode="numeric"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void buscarCnpjNovo();
                    }
                  }}
                />
                <Button type="button" onClick={buscarCnpjNovo} disabled={consultando}>
                  {consultando ? "Consultando…" : "Buscar CNPJ"}
                </Button>
              </div>
              <button
                type="button"
                className="self-start text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setModoNovo(false);
                  setAviso(null);
                }}
              >
                Voltar para a busca
              </button>
            </>
          ) : (
            <>
              <label className="text-sm font-medium">Buscar cliente cadastrado</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={consulta}
                  onChange={(e) => aoDigitar(e.target.value)}
                  placeholder="Digite parte do nome ou do CNPJ"
                  className="pl-8"
                  autoComplete="off"
                />
              </div>
              {resultados && resultados.length > 0 && (
                <ul className="flex flex-col overflow-hidden rounded-lg border border-border bg-background">
                  {resultados.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => escolherCadastrado(r)}
                        className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-muted"
                      >
                        <span className="font-medium">{r.razaoSocial}</span>
                        <span className="text-xs text-muted-foreground">{r.cnpj}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {resultados && resultados.length === 0 && (
                <span className="text-xs text-muted-foreground">Nenhum cliente encontrado com esse texto.</span>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 self-start"
                onClick={() => {
                  setModoNovo(true);
                  setAviso(null);
                }}
              >
                <UserPlus className="h-3.5 w-3.5" /> Cliente não está na lista — cadastrar novo
              </Button>
            </>
          )}
          {aviso && <span className="text-xs text-muted-foreground">{aviso}</span>}
        </div>
      )}

      {/* Vai junto no envio: o servidor liga o orçamento ao cadastro (ou cadastra o cliente novo). */}
      <input type="hidden" name="clienteId" value={c?.id ?? ""} />
      <input type="hidden" name="clienteNovo" value={novo ? "1" : ""} />

      {/* Grade de 3 colunas (adapta à largura): nome e CNPJ numa linha, endereço inteiro, e os
          contatos curtos lado a lado — antes cada um ocupava uma linha ou meia linha. */}
      <Grade cols={3}>
        <Field label="Cliente" className="@2xl:col-span-2">
          <Input key={`cli-${versao}`} name="cliente" required defaultValue={valor(c?.razaoSocial, defaults?.cliente)} />
        </Field>
        <Field label="CNPJ">
          <Input key={`cnpj-${versao}`} name="cnpj" defaultValue={valor(c?.cnpj, defaults?.cnpj)} />
        </Field>
        <Field label="Endereço" className="@md:col-span-2 @2xl:col-span-3">
          <Input key={`end-${versao}`} name="endereco" defaultValue={valor(c?.endereco, defaults?.endereco)} />
        </Field>
        <Field label="Telefone">
          <Input key={`tel-${versao}`} name="telefone" defaultValue={valor(c?.telefone, defaults?.telefone)} />
        </Field>
        <Field label="E-mail">
          <Input key={`mail-${versao}`} name="email" type="email" defaultValue={valor(c?.email, defaults?.email)} />
        </Field>
        <Field label="Contato compras">
          <Input key={`cont-${versao}`} name="contatoCompras" defaultValue={valor(c?.contato, defaults?.contatoCompras)} />
        </Field>
        <Field label="Representante">
          <Input name="representante" defaultValue={defaults?.representante ?? ""} />
        </Field>
        <Field label="Comissão CEV">
          <Input name="comissaoCev" defaultValue={defaults?.comissaoCev ?? ""} />
        </Field>
      </Grade>
    </FormSection>
  );
}
