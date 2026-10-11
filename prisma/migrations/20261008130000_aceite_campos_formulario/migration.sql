-- AlterTable
ALTER TABLE "aceites" ADD COLUMN     "clicheNovo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "facaNova" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "itens" JSONB,
ADD COLUMN     "numero" SERIAL NOT NULL,
ADD COLUMN     "numeroOF" TEXT,
ADD COLUMN     "pedidoInterno" TEXT,
ADD COLUMN     "protocoloRequisitos" TEXT,
ADD COLUMN     "suporteCodigo" TEXT,
ADD COLUMN     "suporteDescricao" TEXT,
ADD COLUMN     "suporteFolhas" INTEGER,
ADD COLUMN     "suporteQtdFolha" INTEGER,
ADD COLUMN     "suporteUtilizarCodigo" TEXT,
ADD COLUMN     "suporteUtilizarDescricao" TEXT;

-- AlterTable
ALTER TABLE "pedidos_material" ADD COLUMN     "codigoMaterial" TEXT,
ADD COLUMN     "entregaDesejada" TEXT,
ADD COLUMN     "formato" TEXT,
ADD COLUMN     "formatoMinimo" TEXT,
ADD COLUMN     "numeroOC" TEXT,
ADD COLUMN     "numeroSC" TEXT,
ADD COLUMN     "pesoKg" DECIMAL(14,3);

-- CreateIndex
CREATE UNIQUE INDEX "aceites_numero_key" ON "aceites"("numero");

