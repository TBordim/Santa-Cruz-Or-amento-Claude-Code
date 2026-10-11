import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Kpis, type Kpi } from "@/components/painel-setor/Kpis";
import { PrecisaDeVoce, type Tarefa } from "@/components/painel-setor/PrecisaDeVoce";
import { chegadaDoPapel, fmtDia } from "@/lib/aceite/constantes";
import { modelosDoDoc } from "@/lib/orcamentos/modelos";
import { classificacaoLabel, fmtDateTime } from "@/lib/orcamentos/constantes";
import { listarPendenciasEngenharia } from "@/lib/engenharia/pendencias";
import { listarAtividadesEngenharia, type Atividade } from "@/lib/engenharia/atividades";

export const dynamic = "force-dynamic";

const FILTROS = ["aceites", "orcamentos", "cadastros"] as const;
type Filtro = (typeof FILTROS)[number];

const COR_MODULO: Record<Atividade["modulo"], string> = {
  "Aceite de Pedido": "#2E6B4F",
  Orçamento: "#26405C",
};

// Módulo Engenharia no formato "painel" (08/10/2026): tudo que espera a Engenharia, de qualquer
// módulo (Orçamento e Aceite hoje), com os números por origem (clicar filtra), a lista do que fazer
// e, embaixo, o registro do que a Engenharia já fez em cada módulo.
export default async function EngenhariaPage({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  const { filtro: f } = await searchParams;
  const filtro = (FILTROS as readonly string[]).includes(f ?? "") ? (f as Filtro) : null;

  const pend = await listarPendenciasEngenharia();
  const { origens } = pend;
  const atividades = await listarAtividadesEngenharia(origens);

  const kpis: Kpi[] = [
    ...(origens.aceite ? [{ key: "aceites", n: pend.aceites.length, label: "Aceites a conferir", tom: "modulo" as const }] : []),
    ...(origens.orcamento ? [{ key: "orcamentos", n: pend.orcamentos.length, label: "Orçamentos na etapa Engenharia", tom: "modulo" as const }] : []),
    ...(origens.cadastro ? [{ key: "cadastros", n: pend.cadastros.length, label: "Cadastros de produto pendentes", tom: "modulo" as const }] : []),
  ];

  // Aceite primeiro (pedido do cliente parado), depois orçamento na etapa 2, depois cadastro sem Aceite.
  const tarefas: Tarefa[] = [
    ...(!filtro || filtro === "aceites"
      ? pend.aceites.map((a) => {
          const novos = modelosDoDoc(a.orcamento).filter((m) => !m.codInterno).length;
          const chegada = chegadaDoPapel(a.pedidosMaterial);
          return {
            key: `aceite-${a.id}`,
            titulo: (
              <>
                <span className="font-mono">{a.numero ?? "Aceite sem nº"}</span> · {a.orcamento.cliente}
              </>
            ),
            contexto: [
              "Aceite de Pedido",
              novos ? `produto novo${novos > 1 ? ` (${novos} modelos)` : ""}: criar cadastro e código` : "conferir cadastro e montagem",
              chegada ? `papel chega ${fmtDia(chegada)}` : null,
            ]
              .filter(Boolean)
              .join(" · "),
            selo: novos ? { texto: "Produto novo", tom: "pend" as const } : { texto: "Conferir", tom: "neutral" as const },
            acao: { texto: "Conferir", href: `/engenharia/aceite/${a.id}` },
          };
        })
      : []),
    ...(!filtro || filtro === "orcamentos"
      ? pend.orcamentos.map((o) => ({
          key: `orc-${o.id}`,
          titulo: o.cliente ?? "Orçamento",
          contexto: `Orçamento · etapa 2 · ${o.produtoDescricao ?? ""} · ${classificacaoLabel(o.classificacao)} · desde ${fmtDateTime(o.atualizadoEm)}`,
          selo: { texto: "Orçamento", tom: "neutral" as const },
          acao: { texto: "Abrir no Orçamento", href: `/painel/${o.id}`, primaria: false },
        }))
      : []),
    ...(!filtro || filtro === "cadastros"
      ? pend.cadastros.map((o) => ({
          key: `cad-${o.id}`,
          titulo: o.cliente ?? "Orçamento",
          contexto: `Orçamento · etapa 7 · produto novo aprovado em ${fmtDateTime(o.desfechoEm)}, sem Nº de Cadastro`,
          selo: { texto: "Cadastro", tom: "pend" as const },
          acao: { texto: "Lançar código", href: `/painel/${o.id}`, primaria: false },
        }))
      : []),
  ];

  return (
    <>
      <PageHeader
        title="Engenharia"
        description="Tudo que espera decisão ou preenchimento da Engenharia: Aceites a conferir, orçamentos na etapa Engenharia e cadastros de produto."
      />
      <div className="flex flex-col gap-6">
        <Kpis itens={kpis} base="/engenharia" ativo={filtro} corModulo="#6C63B5" />
        <PrecisaDeVoce tarefas={tarefas} vazio="Nada esperando a Engenharia agora." />

        <section className="flex flex-col gap-2.5">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Registro de atividades</h3>
            <p className="text-xs text-muted-foreground">O que a Engenharia fez em cada módulo, mais recente primeiro.</p>
          </div>
          {atividades.length === 0 ? (
            <div className="empty-state">Nenhuma atividade registrada ainda.</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Módulo</TableHead>
                    <TableHead>Atividade</TableHead>
                    <TableHead>Cliente e produto</TableHead>
                    <TableHead>Por</TableHead>
                    <TableHead className="text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {atividades.map((x) => (
                    <TableRow key={x.id}>
                      <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">{fmtDateTime(x.quando)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: COR_MODULO[x.modulo] }}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: COR_MODULO[x.modulo] }} />
                          {x.modulo}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{x.atividade}</TableCell>
                      <TableCell className="max-w-[260px]">
                        <span className="block truncate text-sm text-foreground">{x.cliente}</span>
                        <span className="block truncate text-xs text-muted-foreground">{x.produto}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{x.por || "—"}</TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Button asChild size="sm" variant="outline">
                            <Link href={x.href}>Abrir</Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
