import { redirect } from "next/navigation";
import Link from "next/link";
import { sessaoAtual } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CalculadoraProducaoKg } from "./CalculadoraProducaoKg";

type SearchParams = { codigo?: string };

// Tela dedicada pro papel Produção: buscar uma cor pelo código e calcular a quantidade de cada
// tinta pra um lote em kg — sem precisar navegar pela bancada inteira do Laboratório (testes em
// andamento, histórico de rodadas etc., que não são da conta de quem só produz).
export default async function ProducaoPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");

  const { codigo } = await searchParams;
  const codigoBusca = codigo?.trim();

  const cor = codigoBusca
    ? await prisma.cor.findUnique({
        where: { codigo: codigoBusca },
        include: {
          rodadas: {
            where: { aprovada: true },
            orderBy: { numero: "desc" },
            take: 1,
            include: { composicoes: { include: { base: true }, orderBy: { percentual: "desc" } } },
          },
        },
      })
    : null;

  const rodadaAprovada = cor?.rodadas[0];

  return (
    <>
      <PageHeader
        title="Calculadora de produção"
        description="Informe o código de uma cor aprovada e quantos kg vai produzir — a quantidade de cada tinta sai calculada na hora."
      />

      <form className="mb-6 flex flex-wrap items-end gap-2" action="/laboratorio/producao">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="codigo">Código da cor</Label>
          <Input id="codigo" name="codigo" defaultValue={codigoBusca ?? ""} placeholder="Ex.: STA0058" className="w-48" />
        </div>
        <Button type="submit">Buscar</Button>
      </form>

      {codigoBusca && !cor && (
        <div className="empty-state">Nenhuma cor encontrada com o código &quot;{codigoBusca}&quot;.</div>
      )}

      {codigoBusca && cor && !rodadaAprovada && (
        <div className="empty-state">
          &quot;{cor.codigo}&quot; existe, mas ainda não tem nenhuma rodada aprovada — nada pra produzir ainda.{" "}
          <Link href={`/laboratorio/cor/${cor.id}`} className="underline">
            Ver na bancada
          </Link>
          .
        </div>
      )}

      {rodadaAprovada && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-4 flex flex-wrap items-baseline gap-2">
            <span className="font-semibold text-foreground">{cor!.codigo}</span>
            {cor!.cliente && <span className="text-sm text-muted-foreground">{cor!.cliente}</span>}
            <Link href={`/laboratorio/cor/${cor!.id}`} className="ml-auto text-xs text-muted-foreground underline">
              Ver na bancada
            </Link>
          </div>
          <CalculadoraProducaoKg
            componentes={rodadaAprovada.composicoes.map((c) => ({
              baseCodigo: c.base.codigo,
              baseNome: c.base.nome,
              percentual: Number(c.percentual),
            }))}
          />
        </div>
      )}
    </>
  );
}
