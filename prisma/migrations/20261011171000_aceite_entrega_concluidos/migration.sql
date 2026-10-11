-- Até 11/10/2026 o Aceite concluía quando o Atendimento avisava o cliente. Agora conclui quando o
-- PCP confirma a entrega: os que estavam concluídos ainda não tiveram a entrega confirmada.
UPDATE "aceites" SET "etapa" = 'ENTREGA' WHERE "etapa" = 'CONCLUIDO';
