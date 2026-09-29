import { notFound, redirect } from "next/navigation";
import { sessaoAtual, podeEditar } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { deltaE2000 } from "@/lib/cor/deltae";
import { labToCssColor } from "@/lib/cor/lab-to-rgb";
import { num } from "@/lib/cor/formato";
import { converterComposicaoParaIro } from "@/lib/cor/pantone";
import { NovaRodadaForm } from "./NovaRodadaForm";
import { PrimeiraFormula } from "./PrimeiraFormula";
import { RodadaCard } from "./RodadaCard";
import { EditarCorForm } from "./EditarCorForm";
import { EixoLabDiagram } from "./EixoLabDiagram";

// ΔE2000 máximo pra uma cor do histórico (ou um Pantone convertido) entrar como sugestão de ponto
// de partida — mais frouxo que a tolerância de aprovação (1,00): aqui é só "parecido o bastante pra
// economizar o primeiro chute", a fórmula ainda passa pelo ciclo normal de ajuste.
const TOLERANCIA_SUGESTAO_PONTO_PARTIDA = 2.5;

const STATUS_LABEL: Record<string, string> = {
  EM_DESENVOLVIMENTO: "Em desenvolvimento",
  APROVADO: "Aprovado",
  ALTERNATIVA: "Alternativa",
  AGUARDANDO_APROVACAO_CLIENTE: "Aguardando cliente",
  CANCELADO: "Cancelado",
};

// Tolerância de aprovação da Santa Cruz: ΔE2000 menor que 1,00.
const TOLERANCIA_DE = 1;

// A "bancada única" — tudo sobre UMA cor numa tela só. O ciclo do laboratório: fórmula → puxada
// (Quick Peek) → registra o MELHOR LAB → ajuste (manual ou por sugestão) → nova rodada… até o menor
// ΔE → aprovação. O ΔE mostrado é informativo — a sugestão automática de ajuste é Fase 3.
export default async function CorDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");

  const { id } = await params;
  const cor = await prisma.cor.findUnique({
    where: { id },
    include: {
      rodadas: {
        orderBy: { numero: "asc" },
        include: {
          composicoes: { include: { base: true }, orderBy: { percentual: "desc" } },
          leituras: { orderBy: { lidaEm: "asc" } },
        },
      },
    },
  });
  if (!cor) notFound();

  const podeRegistrar = (await podeEditar("COR_LABORATORIO")) || (await podeEditar("COR_ENGENHARIA"));
  const bases = await prisma.base.findMany({ where: { ativa: true }, orderBy: { codigo: "asc" } });

  const temLabAlvo = cor.labAlvoL != null && cor.labAlvoA != null && cor.labAlvoB != null;
  const labAlvo = temLabAlvo
    ? { l: Number(cor.labAlvoL), a: Number(cor.labAlvoA), b: Number(cor.labAlvoB) }
    : null;

  // Cor importada da planilha antiga só tem o LAB da fórmula final (o alvo nunca foi registrado):
  // usa ele pra amostra e pro texto, identificado como "final" — e sem ΔE, que exigiria um alvo.
  const leituraFinal = cor.rodadas.flatMap((r) => r.leituras).filter((l) => l.contexto === "FINAL").at(-1);
  const labFinal = leituraFinal ? { l: Number(leituraFinal.l), a: Number(leituraFinal.a), b: Number(leituraFinal.b) } : null;
  const labExibido = labAlvo ?? labFinal;

  // Serializa cada rodada (Decimal→number, base→código/nome) pro RodadaCard, um Client Component
  // que também cuida da edição/exclusão — não dá pra passar Decimal do Prisma direto pro cliente.
  const rodadasSerializadas = cor.rodadas.map((r) => {
    const composicoes = r.composicoes.map((c) => ({
      id: c.id,
      baseId: c.baseId,
      baseCodigo: c.base.codigo,
      baseNome: c.base.nome,
      percentual: Number(c.percentual),
    }));
    const leituras = r.leituras.map((l) => {
      const lab = { l: Number(l.l), a: Number(l.a), b: Number(l.b) };
      return { id: l.id, contexto: l.contexto, ...lab, deltaE: labAlvo ? deltaE2000(labAlvo, lab) : null };
    });
    const puxada = leituras.find((l) => l.contexto === "PUXADA");
    const de = puxada ? puxada.deltaE : null;
    return { rodada: r, composicoes, leituras, puxadaLab: puxada ? { l: puxada.l, a: puxada.a, b: puxada.b } : null, de };
  });
  const menorDe = rodadasSerializadas.reduce<number | null>(
    (m, x) => (x.de != null && (m == null || x.de < m) ? x.de : m),
    null,
  );
  const ultimaComposicao = cor.rodadas.at(-1)?.composicoes.map((c) => ({ baseId: c.baseId, percentual: Number(c.percentual) })) ?? [];

  // Última puxada registrada (a mais recente com leitura), pra desenhar a seta de ajuste no plano
  // a*/b* — é a referência que o colorista tem na mão na hora de montar a próxima rodada.
  const ultimaComPuxada = rodadasSerializadas.filter((x) => x.puxadaLab).at(-1);

  // Sugestão de ponto de partida (histórico): só faz sentido antes da 1ª rodada e com um LAB de
  // referência pra comparar — sem alvo real ainda usa o próprio LAB final (cor importada), mesma
  // lógica do labExibido acima.
  const sugestoesHistorico =
    cor.rodadas.length === 0 && labExibido
      ? await (async () => {
          const candidatos = await prisma.cor.findMany({
            where: { id: { not: cor.id }, rodadas: { some: { aprovada: true } } },
            select: {
              id: true,
              codigo: true,
              cliente: true,
              rodadas: {
                where: { aprovada: true },
                take: 1,
                select: {
                  composicoes: {
                    select: { baseId: true, percentual: true, base: { select: { codigo: true } } },
                    orderBy: { percentual: "desc" },
                  },
                  leituras: { select: { contexto: true, l: true, a: true, b: true } },
                },
              },
            },
          });
          return candidatos
            .map((c) => {
              const rodadaAprovada = c.rodadas[0];
              const leituraAprovada =
                rodadaAprovada?.leituras.find((l) => l.contexto === "PUXADA") ??
                rodadaAprovada?.leituras.find((l) => l.contexto === "FINAL");
              if (!rodadaAprovada || !leituraAprovada) return null;
              const lab = { l: Number(leituraAprovada.l), a: Number(leituraAprovada.a), b: Number(leituraAprovada.b) };
              return {
                corId: c.id,
                codigo: c.codigo,
                cliente: c.cliente,
                de: deltaE2000(labExibido, lab),
                lab,
                composicao: rodadaAprovada.composicoes.map((cp) => ({ baseId: cp.baseId, percentual: Number(cp.percentual) })),
              };
            })
            .filter((x): x is NonNullable<typeof x> => x != null && x.de <= TOLERANCIA_SUGESTAO_PONTO_PARTIDA)
            .sort((a, b) => a.de - b.de)
            .slice(0, 3);
        })()
      : [];

  // Sugestão de ponto de partida (Pantone): pega o Pantone mais próximo do LAB de referência QUE
  // seja conversível pra IRO com a equivalência confirmada (não é todo Pantone que é — Purple e o
  // combo Reflex Blue ainda não têm conversão, ver converterComposicaoParaIro). Caminha do mais
  // próximo pro mais longe até achar um conversível dentro da tolerância; se nenhum servir, null.
  const sugestaoPantone =
    cor.rodadas.length === 0 && labExibido
      ? await (async () => {
          const candidatos = await prisma.pantoneCor.findMany({
            where: { parcial: false, labL: { not: null }, labA: { not: null }, labB: { not: null } },
            select: { codigo: true, labL: true, labA: true, labB: true, composicao: true, somaPercentual: true },
          });
          const mapaBase = new Map(bases.map((b) => [b.codigo, b.id]));
          const ordenados = candidatos
            .filter((p) => Math.abs(Number(p.somaPercentual) - 100) <= 0.5)
            .map((p) => {
              const lab = { l: Number(p.labL), a: Number(p.labA), b: Number(p.labB) };
              return { codigo: p.codigo, lab, composicao: p.composicao as Record<string, number>, de: deltaE2000(labExibido, lab) };
            })
            .sort((a, b) => a.de - b.de);

          for (const p of ordenados) {
            if (p.de > TOLERANCIA_SUGESTAO_PONTO_PARTIDA) break; // ordenado por ΔE — nenhum próximo serve mais
            const conv = converterComposicaoParaIro(p.composicao);
            if (!conv.ok) continue;
            const composicao = conv.composicao
              .map((c) => ({ baseId: mapaBase.get(c.baseCodigo), percentual: c.percentual }))
              .filter((c): c is { baseId: string; percentual: number } => c.baseId != null);
            if (composicao.length !== conv.composicao.length) continue; // base IRO fora do catálogo ativo
            return { codigoPantone: p.codigo, de: p.de, lab: p.lab, composicao };
          }
          return null;
        })()
      : null;

  return (
    <>
      <PageHeader title={cor.codigo} description={[cor.cliente, cor.referenciaDeclarada].filter(Boolean).join(" · ") || undefined} />

      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
          {labExibido ? (
            <span
              className="h-14 w-14 shrink-0 rounded-xl border border-border"
              style={{ background: labToCssColor(labExibido) }}
              title="Apoio visual — não substitui a cabine de luz D50"
            />
          ) : (
            <span className="h-14 w-14 shrink-0 rounded-xl border border-dashed border-border" />
          )}
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              {labAlvo || !labFinal ? "LAB alvo" : "LAB final (alvo não registrado)"}
            </span>
            <span className="font-mono text-sm">
              {labExibido ? `L* ${num(labExibido.l)} · a* ${num(labExibido.a)} · b* ${num(labExibido.b)}` : "não registrado"}
            </span>
          </div>
        </div>
        <div className="flex flex-col justify-center gap-1 rounded-xl border border-border bg-card p-4 text-sm">
          <div>
            <span className="text-muted-foreground">Substrato:</span> {cor.substrato ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Acabamento:</span> {cor.acabamento ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Status:</span>{" "}
            <Badge variant="secondary">{STATUS_LABEL[cor.status] ?? cor.status}</Badge>
          </div>
        </div>
        {podeRegistrar && (
          <div className="flex items-start">
            <EditarCorForm
              cor={{
                id: cor.id,
                codigo: cor.codigo,
                cliente: cor.cliente,
                codigoProduto: cor.codigoProduto,
                referenciaDeclarada: cor.referenciaDeclarada,
                tipoReferencia: cor.tipoReferencia,
                labAlvoL: labAlvo?.l ?? null,
                labAlvoA: labAlvo?.a ?? null,
                labAlvoB: labAlvo?.b ?? null,
                substrato: cor.substrato,
                acabamento: cor.acabamento,
                resistenciaExigida: cor.resistenciaExigida,
              }}
            />
          </div>
        )}
      </div>

      {labExibido && (
        <div className="mb-6">
          {/* Cor importada sem alvo registrado (só o LAB final da planilha) ainda ganha o desenho —
              usa o final como referência/mira, só muda o rótulo pra não parecer um alvo de verdade. */}
          <EixoLabDiagram
            alvo={labExibido}
            atual={ultimaComPuxada?.puxadaLab ?? null}
            rotuloAtual={`Rodada ${ultimaComPuxada?.rodada.numero ?? ""}`}
            rotuloReferencia={labAlvo ? "Alvo" : "Final (planilha)"}
          />
        </div>
      )}

      {labAlvo && rodadasSerializadas.some((x) => x.de != null) && (
        <div className="mb-6 rounded-xl border border-border bg-card p-4">
          <div className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Evolução do ΔE2000 por rodada (meta &lt; {num(TOLERANCIA_DE, 2)})
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-sm">
            {rodadasSerializadas.map((x, i) => (
              <span key={x.rodada.id} className="flex items-center gap-2">
                {i > 0 && <span className="text-muted-foreground">→</span>}
                <span
                  className={
                    x.de != null && x.de >= TOLERANCIA_DE
                      ? "font-semibold text-destructive"
                      : x.de != null && x.de === menorDe
                        ? "font-semibold text-good"
                        : "text-foreground"
                  }
                >
                  R{x.rodada.numero}: {x.de != null ? num(x.de, 2) : "—"}
                </span>
              </span>
            ))}
          </div>
          {menorDe != null && (
            <div className="mt-2 text-xs text-muted-foreground">
              Menor até agora:{" "}
              <span className={`font-mono ${menorDe >= TOLERANCIA_DE ? "font-semibold text-destructive" : ""}`}>{num(menorDe, 2)}</span>
              {menorDe < TOLERANCIA_DE ? " — dentro da tolerância." : " — ainda acima da tolerância."}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-5">
        {cor.rodadas.length === 0 && <div className="empty-state">Nenhuma rodada registrada ainda.</div>}

        {rodadasSerializadas.map(({ rodada: r, composicoes, leituras, puxadaLab, de }) => (
          <RodadaCard
            key={r.id}
            corId={cor.id}
            rodadaId={r.id}
            numero={r.numero}
            origem={r.origem}
            aprovada={r.aprovada}
            composicoes={composicoes}
            leituras={leituras}
            puxadaLab={puxadaLab}
            deAprovacao={de}
            bases={bases}
            podeRegistrar={podeRegistrar}
          />
        ))}
      </div>

      {podeRegistrar && (
        <div className="mt-6">
          {cor.rodadas.length === 0 ? (
            <PrimeiraFormula corId={cor.id} bases={bases} sugestoes={sugestoesHistorico} sugestaoPantone={sugestaoPantone} />
          ) : (
            // key = número da próxima rodada: salvar uma rodada troca o número e recria o quadro do
            // zero — vem com "Ajuste nosso" e a fórmula da rodada recém-salva. Sem isso, o Select
            // não controlado mantinha a origem escolhida antes (ex.: "Fórmula do fornecedor").
            <NovaRodadaForm
              key={(cor.rodadas.at(-1)?.numero ?? 0) + 1}
              corId={cor.id}
              bases={bases}
              proximoNumero={(cor.rodadas.at(-1)?.numero ?? 0) + 1}
              composicaoAnterior={ultimaComposicao}
            />
          )}
        </div>
      )}
    </>
  );
}
