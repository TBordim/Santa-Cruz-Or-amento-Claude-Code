-- CreateEnum
CREATE TYPE "EtapaAceite" AS ENUM ('VENDAS', 'ENGENHARIA_MATERIAL', 'PCP', 'PEDIDO', 'CONCLUIDO');

-- CreateEnum
CREATE TYPE "SituacaoPapel" AS ENUM ('NAO_VERIFICADO', 'RESERVADO_TOTAL', 'RESERVADO_PARCIAL', 'SEM_ESTOQUE');

-- CreateEnum
CREATE TYPE "SituacaoCadastro" AS ENUM ('PENDENTE', 'EXISTENTE', 'CRIADO');

-- CreateEnum
CREATE TYPE "TipoMaterial" AS ENUM ('PAPEL', 'TINTA', 'VERNIZ', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusPedidoMaterial" AS ENUM ('SOLICITADO', 'EM_COMPRA', 'PRAZO_CONFIRMADO', 'RECEBIDO', 'CANCELADO');

-- CreateTable
CREATE TABLE "aceites" (
    "id" TEXT NOT NULL,
    "orcamentoId" TEXT NOT NULL,
    "etapa" "EtapaAceite" NOT NULL DEFAULT 'VENDAS',
    "soEscolhida" JSONB,
    "estoqueVerificadoEm" TIMESTAMP(3),
    "estoqueVerificadoPor" TEXT,
    "versaoVerificadaEm" TIMESTAMP(3),
    "versaoVerificadaPor" TEXT,
    "situacaoPapel" "SituacaoPapel" NOT NULL DEFAULT 'NAO_VERIFICADO',
    "papelObs" TEXT,
    "arquivoFisicoConferido" BOOLEAN NOT NULL DEFAULT false,
    "arquivoFisicoObs" TEXT,
    "vendasLiberadoEm" TIMESTAMP(3),
    "vendasLiberadoPor" TEXT,
    "cadastroSituacao" "SituacaoCadastro" NOT NULL DEFAULT 'PENDENTE',
    "engenhariaEm" TIMESTAMP(3),
    "engenhariaPor" TEXT,
    "engenhariaObs" TEXT,
    "dataEntregaSugerida" DATE,
    "dataEntrega" DATE,
    "pcpEm" TIMESTAMP(3),
    "pcpPor" TEXT,
    "pcpObs" TEXT,
    "numeroPedido" TEXT,
    "pedidoCadastradoEm" TIMESTAMP(3),
    "pedidoCadastradoPor" TEXT,
    "clienteInformadoEm" TIMESTAMP(3),
    "clienteInformadoPor" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aceites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos_material" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "origem" TEXT NOT NULL DEFAULT 'ACEITE',
    "aceiteId" TEXT,
    "material" "TipoMaterial" NOT NULL DEFAULT 'PAPEL',
    "descricao" TEXT NOT NULL,
    "quantidade" DECIMAL(14,3),
    "unidade" TEXT NOT NULL DEFAULT 'kg',
    "fornecedor" TEXT,
    "minimoFornecedor" DECIMAL(14,3),
    "sobraPrevista" DECIMAL(14,3),
    "status" "StatusPedidoMaterial" NOT NULL DEFAULT 'SOLICITADO',
    "prazoPrevisto" DATE,
    "obs" TEXT,
    "solicitadoPor" TEXT NOT NULL,
    "solicitadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "alertaEm" TIMESTAMP(3),
    "alertaVistoEm" TIMESTAMP(3),
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedido_material_eventos" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "prazoAnterior" DATE,
    "prazoNovo" DATE,
    "porNome" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pedido_material_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "aceites_orcamentoId_key" ON "aceites"("orcamentoId");

-- CreateIndex
CREATE INDEX "aceites_etapa_idx" ON "aceites"("etapa");

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_material_numero_key" ON "pedidos_material"("numero");

-- CreateIndex
CREATE INDEX "pedidos_material_aceiteId_idx" ON "pedidos_material"("aceiteId");

-- CreateIndex
CREATE INDEX "pedidos_material_status_idx" ON "pedidos_material"("status");

-- CreateIndex
CREATE INDEX "pedido_material_eventos_pedidoId_idx" ON "pedido_material_eventos"("pedidoId");

-- AddForeignKey
ALTER TABLE "aceites" ADD CONSTRAINT "aceites_orcamentoId_fkey" FOREIGN KEY ("orcamentoId") REFERENCES "orcamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos_material" ADD CONSTRAINT "pedidos_material_aceiteId_fkey" FOREIGN KEY ("aceiteId") REFERENCES "aceites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_material_eventos" ADD CONSTRAINT "pedido_material_eventos_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos_material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

