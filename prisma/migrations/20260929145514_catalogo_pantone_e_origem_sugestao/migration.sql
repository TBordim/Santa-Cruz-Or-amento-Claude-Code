-- AlterEnum
ALTER TYPE "OrigemRodada" ADD VALUE 'SUGESTAO_PANTONE';

-- CreateTable
CREATE TABLE "cor_pantone_catalogo" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "labL" DECIMAL(6,2),
    "labA" DECIMAL(6,2),
    "labB" DECIMAL(6,2),
    "composicao" JSONB NOT NULL,
    "somaPercentual" DECIMAL(6,2) NOT NULL,
    "parcial" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cor_pantone_catalogo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cor_pantone_catalogo_codigo_key" ON "cor_pantone_catalogo"("codigo");
