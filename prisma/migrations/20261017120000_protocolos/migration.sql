-- CreateEnum
CREATE TYPE "OrigemArte" AS ENUM ('ORCAMENTO', 'ATENDIMENTO', 'ORDEM_DE_COMPRA');

-- CreateEnum
CREATE TYPE "EstadoArte" AS ENUM ('PENDENTE', 'PROTOCOLADA', 'DESCARTADA');

-- CreateTable
CREATE TABLE "protocolos" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "clienteId" TEXT,
    "clienteNome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "codInterno" TEXT,
    "criadoPor" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "protocolos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "protocolo_revisoes" (
    "id" TEXT NOT NULL,
    "protocoloId" TEXT NOT NULL,
    "revisao" INTEGER NOT NULL,
    "arquivoNome" TEXT,
    "arquivoMime" TEXT,
    "arquivoUrl" TEXT,
    "arquivoPathname" TEXT,
    "link" TEXT,
    "copiaNome" TEXT,
    "copiaUrl" TEXT,
    "copiaPathname" TEXT,
    "mudou" TEXT,
    "deRevisaoId" TEXT,
    "origem" "OrigemArte" NOT NULL,
    "criadoPor" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "protocolo_revisoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artes_enviadas" (
    "id" TEXT NOT NULL,
    "orcamentoId" TEXT,
    "modeloId" TEXT,
    "clienteNome" TEXT,
    "origem" "OrigemArte" NOT NULL,
    "anexoId" TEXT,
    "link" TEXT,
    "rotulo" TEXT NOT NULL,
    "estado" "EstadoArte" NOT NULL DEFAULT 'PENDENTE',
    "revisaoId" TEXT,
    "protocoloExistenteId" TEXT,
    "enviadoPor" TEXT NOT NULL,
    "enviadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decididaPor" TEXT,
    "decididaEm" TIMESTAMP(3),

    CONSTRAINT "artes_enviadas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "protocolos_numero_key" ON "protocolos"("numero");

-- CreateIndex
CREATE INDEX "protocolos_clienteId_idx" ON "protocolos"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "protocolo_revisoes_protocoloId_revisao_key" ON "protocolo_revisoes"("protocoloId", "revisao");

-- CreateIndex
CREATE UNIQUE INDEX "artes_enviadas_anexoId_key" ON "artes_enviadas"("anexoId");

-- CreateIndex
CREATE INDEX "artes_enviadas_estado_idx" ON "artes_enviadas"("estado");

-- CreateIndex
CREATE INDEX "artes_enviadas_orcamentoId_idx" ON "artes_enviadas"("orcamentoId");

-- AddForeignKey
ALTER TABLE "protocolos" ADD CONSTRAINT "protocolos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocolo_revisoes" ADD CONSTRAINT "protocolo_revisoes_protocoloId_fkey" FOREIGN KEY ("protocoloId") REFERENCES "protocolos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocolo_revisoes" ADD CONSTRAINT "protocolo_revisoes_deRevisaoId_fkey" FOREIGN KEY ("deRevisaoId") REFERENCES "protocolo_revisoes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "artes_enviadas" ADD CONSTRAINT "artes_enviadas_orcamentoId_fkey" FOREIGN KEY ("orcamentoId") REFERENCES "orcamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artes_enviadas" ADD CONSTRAINT "artes_enviadas_anexoId_fkey" FOREIGN KEY ("anexoId") REFERENCES "anexos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artes_enviadas" ADD CONSTRAINT "artes_enviadas_revisaoId_fkey" FOREIGN KEY ("revisaoId") REFERENCES "protocolo_revisoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artes_enviadas" ADD CONSTRAINT "artes_enviadas_protocoloExistenteId_fkey" FOREIGN KEY ("protocoloExistenteId") REFERENCES "protocolos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

