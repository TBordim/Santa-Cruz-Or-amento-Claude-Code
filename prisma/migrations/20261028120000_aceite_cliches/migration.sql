-- Códigos dos clichês novos do Aceite (28/10/2026). SOMENTE ADITIVA: uma coluna com padrão vazio; não altera nem apaga dados.

-- AlterTable
ALTER TABLE "aceites" ADD COLUMN     "codigosCliche" TEXT[] DEFAULT ARRAY[]::TEXT[];
