-- Cards que ja estavam com desfecho POSITIVO e sem Nº de Cadastro de Produto (codInterno) na
-- etapa FINALIZADO (versao anterior, em que a pendencia era so um aviso dentro da etapa 6)
-- passam para a etapa nova. Em migration separada da que cria o valor do enum: no Postgres o
-- valor novo so pode ser usado depois que a transacao que o criou foi confirmada.
UPDATE "orcamentos"
SET "etapa" = 'CADASTRO_PRODUTO'
WHERE "origem" = 'NOVO'
  AND "etapa" = 'FINALIZADO'
  AND "desfecho" = 'POSITIVO'
  AND ("codInterno" IS NULL OR "codInterno" = '');
