import Link from "next/link";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { sessaoAtual } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { defaultsParaRepetir } from "@/lib/orcamentos/repetir";
import { NovoOrcamentoForm } from "./NovoOrcamentoForm";

export const dynamic = "force-dynamic";

// Representante logado: o próprio nome já vem no campo Representante. Colaborador da empresa
// abre com o campo em branco, porque quem pede nem sempre é um representante (venda direta da
// empresa, por exemplo).
//
// "?repetir=<id>" (botão Repetir, em Minhas Solicitações) abre o formulário já preenchido com os
// dados de uma solicitação anterior — só se ela for da própria pessoa.
export default async function NovoOrcamentoPage({ searchParams }: { searchParams: Promise<{ repetir?: string }> }) {
  const sessao = await sessaoAtual();
  const { repetir } = await searchParams;

  // Representante só repete o que ele mesmo enviou. Colaborador da empresa repete qualquer
  // solicitação (busca em "Solicitações anteriores"), mesmo cancelada ou já virada em pedido.
  const origem =
    repetir && sessao
      ? await prisma.orcamento.findFirst({
          where: sessao.soNovo ? { id: repetir, origem: "NOVO", criadoPorId: sessao.usuarioId } : { id: repetir },
        })
      : null;

  const representante = sessao?.soNovo ? sessao.nome : "";
  return (
    <>
      <PageHeader
        title="Novo Orçamento"
        description="Preencha os dados comerciais e técnicos básicos do pedido — a Santa Cruz segue o fluxo a partir daqui."
        action={
          sessao && !sessao.soNovo ? (
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href="/solicitacoes">
                <Search className="h-3.5 w-3.5" /> Buscar solicitação anterior
              </Link>
            </Button>
          ) : undefined
        }
      />
      <NovoOrcamentoForm
        // Trocar de solicitação de origem recomeça o formulário limpo (os campos são não controlados).
        key={origem?.id ?? "novo"}
        representante={representante}
        soRepresentante={!!sessao?.soNovo}
        inicial={origem ? defaultsParaRepetir(origem, sessao?.soNovo ? sessao.nome : (origem.representante ?? "")) : undefined}
        repetindo={origem ? { em: origem.criadoEm.toISOString(), cliente: origem.cliente ?? "" } : undefined}
      />
    </>
  );
}
