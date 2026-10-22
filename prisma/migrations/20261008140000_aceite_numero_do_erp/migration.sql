-- O Nº do Aceite é gerado no ERP e digitado por Vendas (decisão de 08/10/2026), não mais numerado
-- pelo banco. Os números automáticos gerados até aqui não são números do ERP: ficam vazios.
ALTER TABLE "aceites" ALTER COLUMN "numero" DROP DEFAULT,
ALTER COLUMN "numero" DROP NOT NULL,
ALTER COLUMN "numero" SET DATA TYPE TEXT;

UPDATE "aceites" SET "numero" = NULL;

DROP SEQUENCE IF EXISTS "aceites_numero_seq";
