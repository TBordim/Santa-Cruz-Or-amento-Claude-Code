-- CreateEnum
CREATE TYPE "Desfecho" AS ENUM ('AGUARDANDO', 'POSITIVO', 'NEGATIVO', 'SEM_RETORNO');

-- AlterTable
ALTER TABLE "orcamentos" DROP COLUMN "fotoDados",
ADD COLUMN     "acabamento" TEXT,
ADD COLUMN     "aguardandoCompras" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "analiseCredito" TEXT,
ADD COLUMN     "classificacaoDetalhe" TEXT,
ADD COLUMN     "cnpj" TEXT,
ADD COLUMN     "comissaoCev" TEXT,
ADD COLUMN     "comissaoEspecial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "comissaoObs" TEXT,
ADD COLUMN     "comprasItem" TEXT,
ADD COLUMN     "comprasPedidoEm" TIMESTAMP(3),
ADD COLUMN     "comprasRetornoEm" TIMESTAMP(3),
ADD COLUMN     "comprasSolicitadoPor" TEXT,
ADD COLUMN     "condPagamento" TEXT,
ADD COLUMN     "conflitoClassificacao" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "contatoCompras" TEXT,
ADD COLUMN     "contatoTecnico" TEXT,
ADD COLUMN     "desfecho" "Desfecho",
ADD COLUMN     "desfechoEm" TIMESTAMP(3),
ADD COLUMN     "desfechoMotivo" TEXT,
ADD COLUMN     "desfechoPor" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "endereco" TEXT,
ADD COLUMN     "entregaDatas" TEXT,
ADD COLUMN     "entregaLocalidade" TEXT,
ADD COLUMN     "finalizadoEm" TIMESTAMP(3),
ADD COLUMN     "fotoPathname" TEXT,
ADD COLUMN     "fotoUrl" TEXT,
ADD COLUMN     "fsc" TEXT,
ADD COLUMN     "modalidade" TEXT,
ADD COLUMN     "obsEngenharia" TEXT,
ADD COLUMN     "orcamentoAnteriorId" TEXT,
ADD COLUMN     "origemPedido" TEXT,
ADD COLUMN     "prazoDias" INTEGER,
ADD COLUMN     "precoAnterior" DECIMAL(12,2),
ADD COLUMN     "produtoNovo" BOOLEAN,
ADD COLUMN     "qtdEntregas" TEXT,
ADD COLUMN     "representante" TEXT,
ADD COLUMN     "telefone" TEXT,
ADD COLUMN     "usaSelo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vistoEngenhariaEm" TIMESTAMP(3),
ADD COLUMN     "vistoEngenhariaPor" TEXT;

-- AlterTable
ALTER TABLE "anexos" DROP COLUMN "dados",
ADD COLUMN     "pathname" TEXT NOT NULL,
ADD COLUMN     "url" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_orcamentoAnteriorId_fkey" FOREIGN KEY ("orcamentoAnteriorId") REFERENCES "orcamentos"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
