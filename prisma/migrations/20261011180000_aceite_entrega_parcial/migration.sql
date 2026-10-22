-- AlterTable
ALTER TABLE "aceites" ADD COLUMN     "entregaCancelamentoMotivo" TEXT,
ADD COLUMN     "entregaSaldoCancelado" DECIMAL(14,3);

-- CreateTable
CREATE TABLE "entregas_aceite" (
    "id" TEXT NOT NULL,
    "aceiteId" TEXT NOT NULL,
    "quantidade" DECIMAL(14,3),
    "entregueEm" DATE NOT NULL,
    "obs" TEXT,
    "porNome" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entregas_aceite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "entregas_aceite_aceiteId_idx" ON "entregas_aceite"("aceiteId");

-- AddForeignKey
ALTER TABLE "entregas_aceite" ADD CONSTRAINT "entregas_aceite_aceiteId_fkey" FOREIGN KEY ("aceiteId") REFERENCES "aceites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

