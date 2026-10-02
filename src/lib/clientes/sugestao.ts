import { condPagamentoEmTexto, enderecoEmLinha, type ClienteSugestao, type EnderecoCliente } from "./tipos";
import { formatarCnpj } from "./cnpj";

// Cliente do banco -> formato que vai pro formulário. Fica fora de clientes-actions.ts porque
// arquivo "use server" só pode exportar funções assíncronas.
export function paraSugestao(c: {
  id: string;
  razaoSocial: string;
  cnpj: string;
  endereco: string | null;
  complemento: string | null;
  bairro: string | null;
  cep: string | null;
  uf: string | null;
  municipio: string | null;
  telefone: string | null;
  email: string | null;
  contato: string | null;
  prazosPagamento: number[];
  entrega: unknown;
  pendenteConferencia: boolean;
}): ClienteSugestao {
  return {
    id: c.id,
    razaoSocial: c.razaoSocial,
    cnpj: formatarCnpj(c.cnpj),
    endereco: enderecoEmLinha(c),
    telefone: c.telefone ?? "",
    email: c.email ?? "",
    contato: c.contato ?? "",
    condPagamento: condPagamentoEmTexto(c.prazosPagamento),
    entregaEndereco: enderecoEmLinha(c.entrega as EnderecoCliente | null),
    pendenteConferencia: c.pendenteConferencia,
  };
}
