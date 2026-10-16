-- Lotes no Aceite (16/10/2026). Migração SOMENTE ADITIVA: não altera nem apaga nenhum dado.
-- Cria a tabela lotes_aceite e acrescenta colunas opcionais (loteId) em pedidos_material,
-- entregas_aceite e negociacoes_data. Aceite sem linhas em lotes_aceite continua um lote implícito
-- só, nas colunas do próprio Aceite. O valor novo do enum (EM_LOTES) só é usado por Aceite dividido.

-- AlterEnum
ALTER TYPE "EtapaAceite" ADD VALUE 'EM_LOTES';

-- AlterTable
ALTER TABLE "pedidos_material" ADD COLUMN     "loteId" TEXT;

-- AlterTable
ALTER TABLE "entregas_aceite" ADD COLUMN     "loteId" TEXT;

-- AlterTable
ALTER TABLE "negociacoes_data" ADD COLUMN     "loteId" TEXT;

-- CreateTable
CREATE TABLE "lotes_aceite" (
    "id" TEXT NOT NULL,
    "aceiteId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "etapa" "EtapaAceite" NOT NULL DEFAULT 'ENGENHARIA_MATERIAL',
    "itens" JSONB NOT NULL,
    "dataCliente" DATE,
    "datasCliente" JSONB,
    "suportes" JSONB,
    "situacaoPapel" "SituacaoPapel" NOT NULL DEFAULT 'NAO_VERIFICADO',
    "obs" TEXT,
    "numeroOF" TEXT,
    "dataEntregaSugerida" DATE,
    "dataEntrega" DATE,
    "pcpEm" TIMESTAMP(3),
    "pcpPor" TEXT,
    "pcpObs" TEXT,
    "pedidoCadastradoEm" TIMESTAMP(3),
    "pedidoCadastradoPor" TEXT,
    "clienteInformadoEm" TIMESTAMP(3),
    "clienteInformadoPor" TEXT,
    "entregueEm" DATE,
    "entregaConfirmadaEm" TIMESTAMP(3),
    "entregaConfirmadaPor" TEXT,
    "entregaObs" TEXT,
    "entregaSaldoCancelado" DECIMAL(14,3),
    "entregaCancelamentoMotivo" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lotes_aceite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lotes_aceite_etapa_idx" ON "lotes_aceite"("etapa");

-- CreateIndex
CREATE UNIQUE INDEX "lotes_aceite_aceiteId_numero_key" ON "lotes_aceite"("aceiteId", "numero");

-- CreateIndex
CREATE INDEX "pedidos_material_loteId_idx" ON "pedidos_material"("loteId");

-- CreateIndex
CREATE INDEX "entregas_aceite_loteId_idx" ON "entregas_aceite"("loteId");

-- CreateIndex
CREATE INDEX "negociacoes_data_loteId_idx" ON "negociacoes_data"("loteId");

-- AddForeignKey
ALTER TABLE "pedidos_material" ADD CONSTRAINT "pedidos_material_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "lotes_aceite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes_aceite" ADD CONSTRAINT "lotes_aceite_aceiteId_fkey" FOREIGN KEY ("aceiteId") REFERENCES "aceites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas_aceite" ADD CONSTRAINT "entregas_aceite_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "lotes_aceite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negociacoes_data" ADD CONSTRAINT "negociacoes_data_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "lotes_aceite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

