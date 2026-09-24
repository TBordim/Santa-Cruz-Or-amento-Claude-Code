-- Fluxo real do laboratório: a leitura de todas as faixas do Quick Peek é morosa e o
-- equipamento não dá densidade, então cada rodada guarda uma única leitura — o melhor LAB
-- (mais próximo do alvo) da "puxada". Cada rodada tem no máximo 1 PUXADA; "vencedora" perde o
-- sentido e densidade deixa de existir. Leituras QUICKPEEK_FAIXA_* que porventura existam viram
-- PUXADA (não há dado real delas em produção; só testes locais).
CREATE TYPE "ContextoLeitura_new" AS ENUM ('PUXADA', 'FINAL', 'PRODUCAO');

ALTER TABLE "cor_leituras" ALTER COLUMN "contexto" TYPE "ContextoLeitura_new"
  USING (CASE WHEN "contexto"::text LIKE 'QUICKPEEK_FAIXA_%' THEN 'PUXADA' ELSE "contexto"::text END)::"ContextoLeitura_new";

DROP TYPE "ContextoLeitura";
ALTER TYPE "ContextoLeitura_new" RENAME TO "ContextoLeitura";

ALTER TABLE "cor_leituras" DROP COLUMN "vencedora", DROP COLUMN "densidade";
