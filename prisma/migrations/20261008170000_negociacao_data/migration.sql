-- CreateEnum
CREATE TYPE "StatusNegociacao" AS ENUM ('AGUARDANDO_PCP', 'AGUARDANDO_ATENDIMENTO', 'ENCERRADA');

-- CreateEnum
CREATE TYPE "ResultadoNegociacao" AS ENUM ('ATENDE', 'OUTRA_DATA', 'MANTIDA');

-- CreateTable
CREATE TABLE "negociacoes_data" (
    "id" TEXT NOT NULL,
    "aceiteId" TEXT NOT NULL,
    "status" "StatusNegociacao" NOT NULL DEFAULT 'AGUARDANDO_PCP',
    "dataAtual" DATE,
    "dataPedida" DATE,
    "motivo" TEXT,
    "abertaPor" TEXT NOT NULL,
    "abertaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resultado" "ResultadoNegociacao",
    "dataProposta" DATE,
    "respostaObs" TEXT,
    "respondidaPor" TEXT,
    "respondidaEm" TIMESTAMP(3),
    "encerradaPor" TEXT,
    "encerradaEm" TIMESTAMP(3),
    "encerradaObs" TEXT,

    CONSTRAINT "negociacoes_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "negociacoes_data_aceiteId_idx" ON "negociacoes_data"("aceiteId");

-- CreateIndex
CREATE INDEX "negociacoes_data_status_idx" ON "negociacoes_data"("status");

-- AddForeignKey
ALTER TABLE "negociacoes_data" ADD CONSTRAINT "negociacoes_data_aceiteId_fkey" FOREIGN KEY ("aceiteId") REFERENCES "aceites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

