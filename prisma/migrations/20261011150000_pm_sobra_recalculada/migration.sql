-- Sobra no fornecedor passou a ser calculada (pedido mínimo - quantidade que falta) em 11/10/2026.
-- PMs salvos antes tinham a sobra digitada à mão; recalcula para ficarem iguais à conta da tela.
UPDATE "pedidos_material"
SET "sobraPrevista" = GREATEST(0, "minimoFornecedor" - "quantidade")
WHERE "minimoFornecedor" IS NOT NULL AND "quantidade" IS NOT NULL;
