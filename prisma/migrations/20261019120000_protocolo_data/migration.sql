-- Protocolo não tem "revisão": a arte alterada é reprotocolada com o mesmo número e a data muda
-- (Karen, 19/10/2026). Cada registro guarda a data do protocolo; os anteriores ficam como histórico.
ALTER TABLE "protocolo_revisoes" ADD COLUMN "dataProtocolo" TIMESTAMP(3);
UPDATE "protocolo_revisoes" SET "dataProtocolo" = "criadoEm";
ALTER TABLE "protocolo_revisoes" ALTER COLUMN "dataProtocolo" SET NOT NULL;
ALTER TABLE "protocolo_revisoes" ALTER COLUMN "dataProtocolo" SET DEFAULT CURRENT_TIMESTAMP;
