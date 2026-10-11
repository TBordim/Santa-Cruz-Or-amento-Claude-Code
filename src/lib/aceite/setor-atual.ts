// Com quem está o Aceite agora (coluna "Está com" das tabelas de Aceites, pedido do Thiago em
// 08/10/2026). Na etapa Engenharia e material podem ser dois setores ao mesmo tempo. Sem acesso ao
// banco: serve às telas.

import { papelGarantido } from "./suportes";

export type SetorAtual = { setor: string; acao: string; cor: string };

const COR = {
  vendas: "#2E6B4F",
  engenharia: "#6C63B5",
  compras: "#8C5A21",
  pcp: "#2C7A8C",
  atendimento: "#3E6E9E",
  concluido: "#5B6270",
};

type AceiteSetor = Parameters<typeof papelGarantido>[0] & {
  etapa: string;
  engenhariaEm: Date | null;
  negociacoes?: { status: string }[];
  pedidoCadastradoEm?: Date | null;
  numeroOF?: string | null;
};

export function setoresAtuais(a: AceiteSetor): SetorAtual[] {
  // Negociação de data em andamento: quem precisa agir nela aparece primeiro.
  const neg = a.negociacoes?.find((n) => n.status !== "ENCERRADA");
  const daNegociacao: SetorAtual[] =
    neg?.status === "AGUARDANDO_PCP"
      ? [{ setor: "PCP", acao: "reanalisar a data que o cliente pediu", cor: COR.pcp }]
      : neg?.status === "AGUARDANDO_ATENDIMENTO"
        ? [{ setor: "Atendimento", acao: "informar o cliente da resposta do PCP", cor: COR.atendimento }]
        : [];
  // Pedido cadastrado sem OF: Vendas ainda deve registrar (pode ser depois, mas fica à vista).
  const faltaOF = !!a.pedidoCadastradoEm && !a.numeroOF && ["ATENDIMENTO", "ENTREGA", "CONCLUIDO"].includes(a.etapa);
  const of: SetorAtual = { setor: "Vendas", acao: "registrar a OF", cor: COR.vendas };
  const daEtapa = faltaOF ? (a.etapa === "CONCLUIDO" ? [of] : [...setoresDaEtapa(a), of]) : setoresDaEtapa(a);
  return daNegociacao.length && a.etapa === "CONCLUIDO" ? daNegociacao : [...daNegociacao, ...daEtapa.filter((x) => !daNegociacao.some((d) => d.setor === x.setor))];
}

function setoresDaEtapa(a: AceiteSetor): SetorAtual[] {
  switch (a.etapa) {
    case "VENDAS":
      return [{ setor: "Vendas", acao: "preencher o Aceite", cor: COR.vendas }];
    case "ENGENHARIA_MATERIAL": {
      const lista: SetorAtual[] = [];
      if (!a.engenhariaEm) lista.push({ setor: "Engenharia", acao: "conferir o cadastro", cor: COR.engenharia });
      if (!papelGarantido(a)) lista.push({ setor: "Compras", acao: "data de chegada do papel", cor: COR.compras });
      return lista.length ? lista : [{ setor: "PCP", acao: "a caminho", cor: COR.pcp }];
    }
    case "PCP":
      return [{ setor: "PCP", acao: "definir a data de entrega", cor: COR.pcp }];
    case "PEDIDO":
      return [{ setor: "Vendas", acao: "cadastrar o pedido no ERP", cor: COR.vendas }];
    case "ATENDIMENTO":
      return [{ setor: "Atendimento", acao: "enviar a data ao cliente", cor: COR.atendimento }];
    case "ENTREGA":
      return [{ setor: "PCP", acao: "confirmar a entrega ao cliente", cor: COR.pcp }];
    default:
      return [{ setor: "Concluído", acao: "entregue ao cliente", cor: COR.concluido }];
  }
}
