-- CreateEnum
CREATE TYPE "SistemaBase" AS ENUM ('IRO', 'METALICO', 'CMYK');

-- CreateEnum
CREATE TYPE "TipoReferencia" AS ENUM ('AMOSTRA_CLIENTE', 'PADRAO_INTERNO', 'PLOTTER_PANTONE_DIGITAL');

-- CreateEnum
CREATE TYPE "StatusCor" AS ENUM ('EM_DESENVOLVIMENTO', 'APROVADO', 'ALTERNATIVA', 'AGUARDANDO_APROVACAO_CLIENTE', 'CANCELADO');

-- CreateEnum
CREATE TYPE "OrigemRodada" AS ENUM ('FORNECEDOR', 'SUGESTAO_SISTEMA', 'AJUSTE_MANUAL');

-- CreateEnum
CREATE TYPE "ContextoLeitura" AS ENUM ('QUICKPEEK_FAIXA_1', 'QUICKPEEK_FAIXA_2', 'QUICKPEEK_FAIXA_3', 'QUICKPEEK_FAIXA_4', 'QUICKPEEK_FAIXA_5', 'FINAL', 'PRODUCAO');

-- CreateEnum
CREATE TYPE "TipoEnvioFornecedor" AS ENUM ('SIMULACAO_FORMULA', 'FORMULA_FINALIZADA');

-- CreateTable
CREATE TABLE "cor_bases" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "sistema" "SistemaBase" NOT NULL DEFAULT 'IRO',
    "resistenciaLuz" INTEGER,
    "resistenciaAlcali" TEXT,
    "resistenciaSolvente" TEXT,
    "resistenciaAlcool" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cor_bases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cor_cores" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "cliente" TEXT,
    "codigoProduto" TEXT,
    "referenciaDeclarada" TEXT,
    "tipoReferencia" "TipoReferencia",
    "pantoneMaisProximo" TEXT,
    "labAlvoL" DECIMAL(6,2),
    "labAlvoA" DECIMAL(6,2),
    "labAlvoB" DECIMAL(6,2),
    "substrato" TEXT,
    "acabamento" TEXT,
    "resistenciaExigida" TEXT,
    "status" "StatusCor" NOT NULL DEFAULT 'EM_DESENVOLVIMENTO',
    "criadaPorId" TEXT,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadaEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cor_cores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cor_rodadas" (
    "id" TEXT NOT NULL,
    "corId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "origem" "OrigemRodada" NOT NULL,
    "aprovada" BOOLEAN NOT NULL DEFAULT false,
    "registradaPorId" TEXT,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cor_rodadas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cor_composicoes" (
    "id" TEXT NOT NULL,
    "rodadaId" TEXT NOT NULL,
    "baseId" TEXT NOT NULL,
    "percentual" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "cor_composicoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cor_leituras" (
    "id" TEXT NOT NULL,
    "rodadaId" TEXT NOT NULL,
    "contexto" "ContextoLeitura" NOT NULL,
    "vencedora" BOOLEAN NOT NULL DEFAULT false,
    "l" DECIMAL(6,2) NOT NULL,
    "a" DECIMAL(6,2) NOT NULL,
    "b" DECIMAL(6,2) NOT NULL,
    "densidade" DECIMAL(6,3),
    "deltaE2000" DECIMAL(6,3),
    "instrumento" TEXT,
    "iluminante" TEXT,
    "observador" TEXT,
    "substratoReal" TEXT,
    "lidaPorId" TEXT,
    "lidaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cor_leituras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cor_interacoes_fornecedor" (
    "id" TEXT NOT NULL,
    "corId" TEXT NOT NULL,
    "rodadaId" TEXT,
    "tipoEnvio" "TipoEnvioFornecedor" NOT NULL,
    "enviadoEm" TIMESTAMP(3),
    "recebidoEm" TIMESTAMP(3),
    "registradaPorId" TEXT,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cor_interacoes_fornecedor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cor_bases_codigo_key" ON "cor_bases"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "cor_cores_codigo_key" ON "cor_cores"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "cor_rodadas_corId_numero_key" ON "cor_rodadas"("corId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "cor_interacoes_fornecedor_rodadaId_key" ON "cor_interacoes_fornecedor"("rodadaId");

-- AddForeignKey
ALTER TABLE "cor_cores" ADD CONSTRAINT "cor_cores_criadaPorId_fkey" FOREIGN KEY ("criadaPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cor_rodadas" ADD CONSTRAINT "cor_rodadas_corId_fkey" FOREIGN KEY ("corId") REFERENCES "cor_cores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cor_rodadas" ADD CONSTRAINT "cor_rodadas_registradaPorId_fkey" FOREIGN KEY ("registradaPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cor_composicoes" ADD CONSTRAINT "cor_composicoes_rodadaId_fkey" FOREIGN KEY ("rodadaId") REFERENCES "cor_rodadas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cor_composicoes" ADD CONSTRAINT "cor_composicoes_baseId_fkey" FOREIGN KEY ("baseId") REFERENCES "cor_bases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cor_leituras" ADD CONSTRAINT "cor_leituras_rodadaId_fkey" FOREIGN KEY ("rodadaId") REFERENCES "cor_rodadas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cor_leituras" ADD CONSTRAINT "cor_leituras_lidaPorId_fkey" FOREIGN KEY ("lidaPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cor_interacoes_fornecedor" ADD CONSTRAINT "cor_interacoes_fornecedor_corId_fkey" FOREIGN KEY ("corId") REFERENCES "cor_cores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cor_interacoes_fornecedor" ADD CONSTRAINT "cor_interacoes_fornecedor_rodadaId_fkey" FOREIGN KEY ("rodadaId") REFERENCES "cor_rodadas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cor_interacoes_fornecedor" ADD CONSTRAINT "cor_interacoes_fornecedor_registradaPorId_fkey" FOREIGN KEY ("registradaPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
