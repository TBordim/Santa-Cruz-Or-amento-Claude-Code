-- Vários modelos por orçamento (mesma faca) e arte por modelo. Só colunas novas e opcionais:
-- nenhum dado existente muda.
ALTER TABLE "orcamentos" ADD COLUMN "modelos" JSONB;
ALTER TABLE "anexos" ADD COLUMN "modeloId" TEXT;
