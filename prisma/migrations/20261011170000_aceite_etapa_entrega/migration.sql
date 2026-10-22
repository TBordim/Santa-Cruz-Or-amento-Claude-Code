-- AlterEnum
ALTER TYPE "EtapaAceite" ADD VALUE 'ENTREGA' BEFORE 'CONCLUIDO';

-- AlterTable
ALTER TABLE "aceites" ADD COLUMN     "entregaConfirmadaEm" TIMESTAMP(3),
ADD COLUMN     "entregaConfirmadaPor" TEXT,
ADD COLUMN     "entregaObs" TEXT,
ADD COLUMN     "entregueEm" DATE;

