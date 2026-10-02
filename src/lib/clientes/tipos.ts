// Formato do cliente que vai do servidor pro formulário (tudo texto, já pronto pra preencher).
export type ClienteSugestao = {
  id: string;
  razaoSocial: string;
  cnpj: string; // formatado 00.000.000/0000-00
  endereco: string; // linha única: rua, complemento, bairro, município/UF, CEP
  telefone: string;
  email: string;
  contato: string;
  condPagamento: string; // "28/35/42 dias" ou vazio
  entregaEndereco: string; // vazio quando a entrega é no mesmo endereço
  pendenteConferencia: boolean;
};

export type EnderecoCliente = {
  endereco?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cep?: string | null;
  uf?: string | null;
  municipio?: string | null;
};

// "RUA X, 10 - COMPL - BAIRRO - CIDADE/UF - CEP 00000-000": o orçamento guarda o endereço como
// um texto só.
export function enderecoEmLinha(e: EnderecoCliente | null | undefined): string {
  if (!e) return "";
  const cidade = [e.municipio, e.uf].filter(Boolean).join("/");
  return [e.endereco, e.complemento, e.bairro, cidade, e.cep ? `CEP ${e.cep}` : null].filter(Boolean).join(" - ");
}

export function condPagamentoEmTexto(prazos: readonly number[]): string {
  return prazos.length ? `${prazos.join("/")} dias` : "";
}
