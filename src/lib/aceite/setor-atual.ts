// Com quem está o Aceite agora (coluna "Está com" das tabelas de Aceites, pedido do Thiago em
// 08/10/2026). Na etapa Engenharia e material podem ser dois setores ao mesmo tempo. Sem acesso ao
// banco: serve às telas.

import { papelGarantido } from "./suportes";
import { lotesDoAceite, comoAceite, loteGarantido, type AceiteComLotes } from "./lotes";

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
  pedidoInterno?: string | null;
};

// Aceite dividido em lotes: com quem está cada lote, agrupado por setor e ação ("PCP: definir a data de
// entrega (2 lotes)"). Os lotes já concluídos não aparecem.
function setoresDosLotes(a: AceiteSetor & { id?: string }): SetorAtual[] {
  const base = a as unknown as AceiteComLotes & { id: string };
  const grupos = new Map<string, SetorAtual & { n: number }>();
  for (const l of lotesDoAceite(base)) {
    if (l.etapa === "CONCLUIDO") continue;
    for (const s of setoresDaEtapa(comoAceite(base, l) as unknown as AceiteSetor)) {
      const chave = `${s.setor}|${s.acao}`;
      const g = grupos.get(chave);
      if (g) g.n++;
      else grupos.set(chave, { ...s, n: 1 });
    }
  }
  return [...grupos.values()].map(({ n, ...s }) => ({ ...s, acao: `${s.acao} (${n} ${n === 1 ? "lote" : "lotes"})` }));
}

export function setoresAtuais(a: AceiteSetor): SetorAtual[] {
  if (a.etapa === "EM_LOTES" && (a as { lotes?: unknown[] }).lotes?.length) return setoresDosLotes(a);
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
  const faltaInterno = !!a.engenhariaEm && !a.pedidoInterno && ["ENGENHARIA_MATERIAL", "EM_LOTES", "PCP", "ATENDIMENTO", "ENTREGA"].includes(a.etapa);
  const interno: SetorAtual = { setor: "Vendas", acao: "informar o pedido interno", cor: COR.vendas };
  // Concluído com OF pendente: só Vendas. Nos demais, o setor da etapa e, junto, as pendências de Vendas.
  const daEtapa = a.etapa === "CONCLUIDO" && faltaOF ? [of] : [...setoresDaEtapa(a), ...(faltaInterno ? [interno] : []), ...(faltaOF ? [of] : [])];
  return daNegociacao.length && a.etapa === "CONCLUIDO" ? daNegociacao : [...daNegociacao, ...daEtapa.filter((x) => !daNegociacao.some((d) => d.setor === x.setor))];
}

function setoresDaEtapa(a: AceiteSetor): SetorAtual[] {
  switch (a.etapa) {
    case "VENDAS":
      return [{ setor: "Vendas", acao: "preencher o Aceite", cor: COR.vendas }];
    case "ENGENHARIA_MATERIAL": {
      const lista: SetorAtual[] = [];
      if (!a.engenhariaEm) lista.push({ setor: "Engenharia", acao: "conferir o cadastro", cor: COR.engenharia });
      // Aceite dividido: o papel só está garantido quando o de todos os lotes está.
      const lotes = (a as { lotes?: unknown[] }).lotes;
      const papelOk = lotes?.length
        ? lotesDoAceite(a as unknown as AceiteComLotes).every((l) => loteGarantido(l, a.pedidosMaterial as never))
        : papelGarantido(a);
      if (!papelOk) lista.push({ setor: "Compras", acao: "data de chegada do papel", cor: COR.compras });
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
    case "CANCELADO":
      return [{ setor: "Cancelado", acao: "pedido cancelado", cor: COR.concluido }];
    default:
      return [{ setor: "Concluído", acao: "entregue ao cliente", cor: COR.concluido }];
  }
}
