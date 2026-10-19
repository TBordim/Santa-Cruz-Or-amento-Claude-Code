-- Pedido cancelado no Aceite (19/10/2026). SOMENTE ADITIVA: novo valor de etapa (CANCELADO), colunas opcionais
-- de cancelamento no Aceite e tabela de avisos de cancelamento aos setores. Não altera nem apaga dados.

-- AlterEnum
ALTER TYPE "EtapaAceite" ADD VALUE 'CANCELADO';

-- AlterTable
ALTER TABLE "aceites" ADD COLUMN     "canceladoAvisarPreImpressao" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canceladoEm" TIMESTAMP(3),
ADD COLUMN     "canceladoErpPendente" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canceladoMotivo" TEXT,
ADD COLUMN     "canceladoNaEtapa" TEXT,
ADD COLUMN     "canceladoPor" TEXT;

-- CreateTable
CREATE TABLE "avisos_cancelamento" (
    "id" TEXT NOT NULL,
    "aceiteId" TEXT NOT NULL,
    "setor" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vistoEm" TIMESTAMP(3),
    "vistoPor" TEXT,

    CONSTRAINT "avisos_cancelamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "avisos_cancelamento_setor_vistoEm_idx" ON "avisos_cancelamento"("setor", "vistoEm");

-- CreateIndex
CREATE INDEX "avisos_cancelamento_aceiteId_idx" ON "avisos_cancelamento"("aceiteId");

-- AddForeignKey
ALTER TABLE "avisos_cancelamento" ADD CONSTRAINT "avisos_cancelamento_aceiteId_fkey" FOREIGN KEY ("aceiteId") REFERENCES "aceites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

