-- AlterTable
ALTER TABLE "aceites" ADD COLUMN     "codigoFaca" TEXT,
ADD COLUMN     "dataCliente" DATE,
ADD COLUMN     "suportes" JSONB;

-- AlterTable
ALTER TABLE "pedidos_material" ADD COLUMN     "suporteRef" TEXT;

