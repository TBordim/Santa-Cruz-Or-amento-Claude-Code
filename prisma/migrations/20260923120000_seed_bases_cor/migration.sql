-- Catálogo inicial de bases do módulo Cor: 13 bases IRO (Sun Chemical) + 2 metálicas vistas no
-- histórico real. Resistências vêm do material institucional do fornecedor ("Bases IRO com
-- solidez" / "Códigos – Bases IRO"); vazio = não informado. Idempotente: ON CONFLICT no código
-- único, então rodar em banco que já tem o catálogo (ex.: seed manual anterior) não duplica nem
-- sobrescreve nada. Fica como migration pra qualquer ambiente novo (preview, produção) já nascer
-- com as bases, sem depender de rodar script à mão contra o banco.
INSERT INTO "cor_bases" ("id", "codigo", "nome", "sistema", "resistenciaLuz", "resistenciaAlcali", "resistenciaSolvente", "resistenciaAlcool")
VALUES
  (gen_random_uuid()::text, 'IRO12', 'Base Yellow', 'IRO'::"SistemaBase", 7, '+', NULL, '+'),
  (gen_random_uuid()::text, 'IRO17', 'Cyan / Blue', 'IRO'::"SistemaBase", 8, '+', '+', '+'),
  (gen_random_uuid()::text, 'IRO18', 'Mid Shade Yellow', 'IRO'::"SistemaBase", 5, '+', '+', '+'),
  (gen_random_uuid()::text, 'IRO21', 'Orange', 'IRO'::"SistemaBase", 5, '+', '+', '+'),
  (gen_random_uuid()::text, 'IRO32', 'Red 032', 'IRO'::"SistemaBase", 6, '+', '-', '+'),
  (gen_random_uuid()::text, 'IRO33', 'Warm Red', 'IRO'::"SistemaBase", 5, '+', '-', '-'),
  (gen_random_uuid()::text, 'IRO35', 'Blue Shade Magenta (Rubine)', 'IRO'::"SistemaBase", 5, '-', '+', '+'),
  (gen_random_uuid()::text, 'IRO45', 'Opaque White', 'IRO'::"SistemaBase", NULL, NULL, NULL, NULL),
  (gen_random_uuid()::text, 'IRO48', 'Transparent White', 'IRO'::"SistemaBase", NULL, NULL, NULL, NULL),
  (gen_random_uuid()::text, 'IRO50', 'Untoned Black', 'IRO'::"SistemaBase", 8, '+', '+', '+'),
  (gen_random_uuid()::text, 'IRO53', 'Resistant Violet', 'IRO'::"SistemaBase", 7, '+', '+', '+'),
  (gen_random_uuid()::text, 'IRO54', 'Resistant Pink', 'IRO'::"SistemaBase", 7, '+', '+', '+'),
  (gen_random_uuid()::text, 'IRO71', 'Green', 'IRO'::"SistemaBase", 8, '+', '-', '+'),
  (gen_random_uuid()::text, 'OURO RICO', 'OURO RICO', 'METALICO'::"SistemaBase", NULL, NULL, NULL, NULL),
  (gen_random_uuid()::text, 'PRATA 877', 'PRATA 877', 'METALICO'::"SistemaBase", NULL, NULL, NULL, NULL)
ON CONFLICT ("codigo") DO NOTHING;
