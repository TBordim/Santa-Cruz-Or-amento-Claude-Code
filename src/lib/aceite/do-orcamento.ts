// O que o orçamento já definiu e o Aceite precisa mostrar sem ninguém redigitar: lotes orçados,
// entregas, folhas de acerto e montagens (pedido da Karen, 26/10/2026). Sem acesso ao banco.
import { opcoesDePapel, usoDoMaterial } from "@/lib/orcamentos/modelos";
import { ehPreMontagemSalva } from "@/lib/montagem/salva";
import { parseQuantidade } from "@/lib/orcamentos/motor";
import type { PrecificacaoTier, ReqCliente, ReqTecnicos } from "@/lib/orcamentos/types";

export type MaterialDoOrcamento = {
  papel: string;
  // Folhas de acerto que a Engenharia/Orçamento previu para este material.
  folhasAcerto: number | null;
  // Pré-montagem aprovada (folha, aproveitamento, folhas de produção); nulo se não houve.
  montagem: { formatoFolha: string; pecasPorFolha: number; aproveitamento: number; folhas: number } | null;
};

export type DoOrcamento = {
  lotes: string | null;
  entregas: string | null;
  datasEntrega: string | null;
  localEntrega: string | null;
  materiais: MaterialDoOrcamento[];
  totalFolhasAcerto: number;
};

const texto = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

export function doOrcamento(
  orc: { qtdEntregas: string | null; entregaDatas: string | null; entregaLocalidade: string | null },
  reqCliente: ReqCliente | null,
  reqTecnicos: ReqTecnicos | null,
  so: PrecificacaoTier | null,
): DoOrcamento {
  const lista = reqCliente?.suportes ?? [];
  const escolhido = so?.papelIdx ?? opcoesDePapel(reqCliente)[0]?.idx ?? 0;
  const indices = lista.map((s, idx) => ({ s, idx })).filter(({ s, idx }) => idx === escolhido || usoDoMaterial(s, idx) === "conjunto");
  const materiais = indices.map(({ s, idx }): MaterialDoOrcamento => {
    const t = reqTecnicos?.suportes?.[idx];
    const acerto = parseQuantidade(t?.flsAcerto ?? (idx === 0 ? reqTecnicos?.flsAcerto : undefined) ?? null);
    const pm = reqTecnicos?.preMontagem?.[String(idx)];
    const esc = pm && ehPreMontagemSalva(pm) ? pm.escolha : null;
    return {
      papel: [s.descricao, s.gramatura && `${s.gramatura} g`].filter(Boolean).join(" · ") || `Material ${idx + 1}`,
      folhasAcerto: acerto,
      montagem: esc
        ? { formatoFolha: `${Math.round(esc.folhaW)} × ${Math.round(esc.folhaH)} mm`, pecasPorFolha: esc.pecasPorFolha, aproveitamento: esc.aproveitamento * 100, folhas: esc.folhas }
        : null,
    };
  });
  return {
    lotes: texto(so?.numeroLotes),
    entregas: texto(orc.qtdEntregas),
    datasEntrega: texto(orc.entregaDatas),
    localEntrega: texto(orc.entregaLocalidade),
    materiais,
    totalFolhasAcerto: materiais.reduce((s, m) => s + (m.folhasAcerto ?? 0), 0),
  };
}
