-- Cadastro de clientes e vínculo opcional do orçamento com o cliente. Só tabela nova e coluna
-- nova e opcional: nenhum dado existente muda.
CREATE TYPE "OrigemCliente" AS ENUM ('IMPORTADO', 'REPRESENTANTE');

CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "busca" TEXT NOT NULL,
    "endereco" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cep" TEXT,
    "uf" TEXT,
    "municipio" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "contato" TEXT,
    "prazosPagamento" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "entrega" JSONB,
    "origem" "OrigemCliente" NOT NULL DEFAULT 'IMPORTADO',
    "pendenteConferencia" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "cadastradoPorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "clientes_cnpj_key" ON "clientes"("cnpj");
CREATE INDEX "clientes_busca_idx" ON "clientes"("busca");

ALTER TABLE "clientes" ADD CONSTRAINT "clientes_cadastradoPorId_fkey" FOREIGN KEY ("cadastradoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "orcamentos" ADD COLUMN "clienteId" TEXT;
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
