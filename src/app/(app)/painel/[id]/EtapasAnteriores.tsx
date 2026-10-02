import type { ReactNode } from "react";
import type { OrcamentoComAnexos } from "@/lib/orcamentos/doc-type";
import type { ReqCliente, ReqTecnicos, PrecificacaoTier, SuporteTecnico } from "@/lib/orcamentos/types";
import { ETAPAS, classificacaoLabel, fmtMoney, fmtDateTime, desfechoInfo } from "@/lib/orcamentos/constantes";
import { formatarCodigoInterno } from "@/lib/orcamentos/codigo-interno";
import { fmtPct } from "@/lib/orcamentos/motor";
import { modelosDoDoc, anexosDoModelo, usoDoMaterial, textoMaterial, rotuloSO, soEscolhida } from "@/lib/orcamentos/modelos";
import { AnexoUpload } from "@/components/anexos/AnexoUpload";
import { ResumoBox } from "@/components/form-section";
import { AcordeaoEtapas } from "@/components/orcamento/AcordeaoEtapas";

// Cada etapa vê o que foi lançado em TODAS as anteriores (Engenharia vê a Solicitação; Orçamento
// vê Solicitação+Engenharia; Diretoria vê os 3; e assim por diante) — pedido da equipe em
// 24/09/2026. Só entram campos preenchidos (vazio não ocupa espaço) e os anexos aparecem no
// quadro da etapa que os criou. Tudo somente leitura: pra corrigir algo, "Voltar etapa".

type Valor = ReactNode | null | undefined | false;
type Linha = { label: string; value: Valor };
type Grupo = { titulo?: string; linhas: Linha[] };

const cheio = (v: Valor) => v !== null && v !== undefined && v !== false && v !== "";

function juntar(lista: string[] | undefined | null, extra?: string | null): string {
  return [...(lista ?? []), ...(extra ? [extra] : [])].join(", ");
}

function Corpo({ grupos, anexos }: { grupos: Grupo[]; anexos: ReactNode }) {
  const preenchidos = grupos
    .map((g) => ({ titulo: g.titulo, linhas: g.linhas.filter((l) => cheio(l.value)) as { label: string; value: ReactNode }[] }))
    .filter((g) => g.linhas.length > 0);

  if (!preenchidos.length && !anexos) {
    return <p className="text-sm text-muted-foreground">Nada foi preenchido nesta etapa.</p>;
  }
  return (
    <>
      {preenchidos.map((g, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          {g.titulo && <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g.titulo}</div>}
          <ResumoBox rows={g.linhas} quebrar />
        </div>
      ))}
      {anexos}
    </>
  );
}

function Anexos({ doc, tipo }: { doc: OrcamentoComAnexos; tipo: "ARTE" | "ENGENHARIA" }) {
  const lista = doc.anexos.filter((a) => a.tipo === tipo);
  if (!lista.length) return null;
  const modelos = modelosDoDoc(doc);
  // Arte: uma por modelo quando o orçamento tem mais de um (ver anexosDoModelo em modelos.ts).
  if (tipo === "ARTE" && modelos.length > 1) {
    return (
      <>
        {modelos.map((m, i) => {
          const doModelo = anexosDoModelo(lista, modelos, i);
          if (!doModelo.length) return null;
          return (
            <AnexoUpload key={m.id} orcamentoId={doc.id} tipo={tipo} anexos={doModelo} titulo={`Arte — ${m.descricao || `Modelo ${i + 1}`}`} somenteLeitura compacto />
          );
        })}
      </>
    );
  }
  return <AnexoUpload orcamentoId={doc.id} tipo={tipo} anexos={lista} somenteLeitura compacto />;
}

const STATUS_FAIXA: Record<string, string> = {
  auto_aprovado: "Auto-aprovado",
  aprovado: "Aprovado",
  revisao: "Revisão solicitada",
  pendente: "Pendente",
};

export function EtapasAnteriores({ doc }: { doc: OrcamentoComAnexos }) {
  const idx = ETAPAS.findIndex((e) => e.key === doc.etapa);
  // Todas as etapas antes da atual. "Retorno do Cliente" só aparece como anterior pra etapa 7
  // (Cadastro de Produto), a única que vem depois dela.
  const anteriores = ETAPAS.slice(0, Math.max(idx, 0));
  if (!anteriores.length) return null;

  const c = doc.reqCliente as ReqCliente | null;
  const r = doc.reqTecnicos as ReqTecnicos | null;
  const tiers = (doc.precificacao as unknown as PrecificacaoTier[] | null) ?? [];
  const modelos = modelosDoDoc(doc);
  const materiais = c?.suportes ?? [];
  const tituloSO = (t: PrecificacaoTier) => `SO ${t.numeroSequencial || "sem número"} — ${rotuloSO(t)}`;
  const escolhida = soEscolhida(tiers);

  // Formato suporte por material (Engenharia). Card de antes de 30/09/2026 que ninguém salvou
  // de novo ainda tem os campos soltos, uma vez só: aparecem num grupo à parte.
  const linhasFormato = (v: Partial<SuporteTecnico> | ReqTecnicos | null | undefined): Linha[] => [
    { label: "Qtd. por Folha Inteira", value: v?.qtdFolha },
    { label: "Fls. Acerto", value: v?.flsAcerto },
    { label: "Fator — Comprimento (cm)", value: v?.fatorC },
    { label: "Fator — Largura (cm)", value: v?.fatorL },
    { label: "Corte", value: v?.corte },
    { label: "Qtd./ch.", value: v?.qtdCh },
    { label: "Formato Ideal — Comprimento (cm)", value: v?.idealC },
    { label: "Formato Ideal — Largura (cm)", value: v?.idealL },
  ];
  const nMateriaisEng = Math.max(materiais.length, r?.suportes?.length ?? 0);

  const conteudo: Record<string, ReactNode> = {
    ABERTO: (
      <Corpo
        anexos={<Anexos doc={doc} tipo="ARTE" />}
        grupos={[
          {
            titulo: "Classificação",
            linhas: [
              { label: "Origem do pedido", value: doc.origemPedido },
              { label: "Detalhe da classificação", value: doc.classificacaoDetalhe },
              { label: "Análise de crédito", value: doc.analiseCredito },
              { label: "FSC", value: doc.fsc },
              { label: "Usa selo", value: doc.usaSelo && "Sim" },
            ],
          },
          {
            titulo: "Cliente",
            linhas: [
              { label: "Cliente", value: doc.cliente },
              { label: "CNPJ", value: doc.cnpj },
              { label: "Endereço", value: doc.endereco },
              { label: "Representante", value: doc.representante },
              { label: "Comissão CEV", value: doc.comissaoCev },
              { label: "Telefone", value: doc.telefone },
              { label: "E-mail", value: doc.email },
              { label: "Contato compras", value: doc.contatoCompras },
            ],
          },
          {
            titulo: "Condições comerciais e entrega",
            linhas: [
              { label: "Condição de pagamento", value: doc.condPagamento },
              { label: "Modalidade", value: doc.modalidade },
              { label: "Localidade de entrega", value: doc.entregaLocalidade },
              { label: "Qtd. de entregas", value: doc.qtdEntregas },
              { label: "Data de entrega solicitada pelo Cliente", value: doc.entregaDatas },
            ],
          },
          ...modelos.map((m, i) => ({
            titulo: modelos.length > 1 ? `Modelo ${i + 1}` : "Produto",
            linhas: [
              { label: "Descrição", value: m.descricao },
              { label: "Classificação", value: classificacaoLabel(m.classificacao) },
              { label: "Código do cliente", value: m.codigoCliente },
              { label: "Código interno", value: m.codInterno && formatarCodigoInterno(m.codInterno) },
            ],
          })),
          {
            titulo: modelos.length > 1 ? "Conjunto" : undefined,
            linhas: [
              { label: "Quantidades a orçar", value: c?.quantidadesLista?.filter(Boolean).join(", ") },
              { label: "Observações", value: doc.obs },
            ],
          },
          {
            titulo: "Medidas e suporte",
            linhas: [
              { label: "Formato — Comprimento (mm)", value: c?.medidaF },
              { label: "Formato — Largura (mm)", value: c?.medidaL },
              { label: "Altura (mm)", value: c?.medidaA },
              ...materiais.map((s, i) => ({
                label: materiais.length > 1 ? `Material ${i + 1}` : "Suporte",
                value: `${textoMaterial(s)}${materiais.length > 1 ? ` · ${usoDoMaterial(s, i) === "opcao" ? "opção de fornecimento" : "uso conjunto"}` : ""}`,
              })),
            ],
          },
          {
            titulo: "Acabamento e revestimento",
            linhas: [
              { label: "Acabamento", value: juntar(c?.acabamentos, c?.acabamentoOutro) },
              { label: "Verniz", value: juntar(c?.verniz) },
              { label: "Plástico", value: juntar(c?.plastico) },
            ],
          },
          {
            titulo: "Embalagem e impressão",
            linhas: [
              { label: "Embalagem", value: juntar(c?.embalagem) },
              { label: "Detalhe da embalagem", value: c?.embalagemDetalhe },
              { label: "Impressão", value: juntar(c?.impressao) },
              { label: "Fechamento tampa", value: c?.fechamentoTampa },
              { label: "Fechamento fundo", value: c?.fechamentoFundo },
            ],
          },
        ]}
      />
    ),

    ENGENHARIA: (
      <Corpo
        anexos={<Anexos doc={doc} tipo="ENGENHARIA" />}
        grupos={[
          {
            titulo: "Cadastro",
            linhas: [
              { label: "Nº de Pré Cadastro", value: doc.preCadastro },
              ...modelos.map((m, i) => ({
                label: modelos.length > 1 ? `Código interno — ${m.descricao || `Modelo ${i + 1}`}` : "Código interno",
                value: m.codInterno && formatarCodigoInterno(m.codInterno),
              })),
            ],
          },
          ...Array.from({ length: nMateriaisEng }, (_, i) => {
            const v = r?.suportes?.[i];
            const mc = materiais[i];
            return {
              titulo: `Material ${i + 1}${mc ? ` — ${textoMaterial(mc)}` : ""}`,
              linhas: [{ label: "Formato", value: v?.formato }, { label: "Código", value: v?.codigo }, ...linhasFormato(v)],
            };
          }),
          { titulo: "Formato suporte", linhas: linhasFormato(r) },
          {
            titulo: "Anexos e observações",
            linhas: [
              { label: "Anexos previstos", value: juntar(r?.anexos) },
              { label: "Informações complementares", value: r?.infoComplementares },
              { label: "Observações de engenharia", value: doc.obsEngenharia },
              {
                label: "Liberado por",
                value: doc.vistoEngenhariaPor && `${doc.vistoEngenhariaPor}${doc.vistoEngenhariaEm ? ` · ${fmtDateTime(doc.vistoEngenhariaEm)}` : ""}`,
              },
            ],
          },
        ]}
      />
    ),

    ORCAMENTO: (
      <Corpo
        anexos={null}
        grupos={[
          {
            titulo: "Geral",
            linhas: [
              { label: "Acabamento", value: doc.acabamento },
              { label: "Condição comercial especial", value: doc.comissaoEspecial && (doc.comissaoObs || "Sim") },
              { label: "Cotação de Compras", value: doc.comprasItem },
            ],
          },
          ...tiers.map((t) => ({
            // Uma SO por quantidade × papel, não uma só pro card — ver PrecificacaoTier em types.ts.
            titulo: tituloSO(t),
            linhas: [
              { label: "Preço projetado", value: t.precoProjetado != null && fmtMoney(t.precoProjetado) },
              { label: "Custo primário", value: t.custoPrimarioPct != null && fmtPct(t.custoPrimarioPct) },
              { label: "Margem P2", value: t.margemP2Pct != null && fmtPct(t.margemP2Pct) },
              { label: "Nº de lotes", value: t.numeroLotes },
              { label: "Nº de setups", value: t.numeroSetups },
            ],
          })),
        ]}
      />
    ),

    DIRETORIA: (
      <Corpo
        anexos={null}
        grupos={tiers.map((t) => ({
          titulo: tituloSO(t),
          linhas: [
            { label: "Decisão", value: STATUS_FAIXA[t.statusDiretoria] ?? t.statusDiretoria },
            { label: "Preço final", value: t.precoFinal != null && fmtMoney(t.precoFinal) },
            { label: "Decidido por", value: t.decididoPor && `${t.decididoPor}${t.decididoEm ? ` · ${fmtDateTime(new Date(t.decididoEm))}` : ""}` },
            { label: "Comentário", value: t.comentarioDiretoria },
          ],
        }))}
      />
    ),

    ENVIO_OFERTA: (
      <Corpo
        anexos={null}
        grupos={[
          {
            linhas: [
              { label: "Nº de Orçamento", value: doc.numeroOrcamento },
              { label: "Oferta enviada em", value: doc.finalizadoEm && fmtDateTime(doc.finalizadoEm) },
            ],
          },
        ]}
      />
    ),

    FINALIZADO: (
      <Corpo
        anexos={null}
        grupos={[
          {
            linhas: [
              { label: "Desfecho", value: doc.desfecho && desfechoInfo(doc.desfecho).label },
              { label: "SO fechada pelo cliente", value: tiers.length > 1 && escolhida && tituloSO(escolhida) },
              { label: "Motivo", value: doc.desfechoMotivo },
              {
                label: "Registrado por",
                value: doc.desfechoPor && `${doc.desfechoPor}${doc.desfechoEm ? ` · ${fmtDateTime(doc.desfechoEm)}` : ""}`,
              },
            ],
          },
        ]}
      />
    ),
  };

  return (
    <AcordeaoEtapas
      paineis={anteriores.map((e) => ({ key: e.key, titulo: e.label, cor: e.color, children: conteudo[e.key] }))}
    />
  );
}
