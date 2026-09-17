-- CreateEnum
CREATE TYPE "OrigemOrcamento" AS ENUM ('NOVO', 'LEGADO');

-- CreateEnum
CREATE TYPE "EtapaOrcamento" AS ENUM ('ABERTO', 'ENGENHARIA', 'ORCAMENTO', 'DIRETORIA', 'ENVIO_OFERTA', 'FINALIZADO');

-- CreateEnum
CREATE TYPE "StatusDiretoria" AS ENUM ('AUTO_APROVADO', 'PENDENTE', 'APROVADO', 'REVISAO', 'LEGADO');

-- CreateEnum
CREATE TYPE "Classificacao" AS ENUM ('NOVO', 'REPETICAO_SEM_ALTERACAO', 'REPETICAO_COM_ALTERACAO', 'REPETICAO_NOVO');

-- CreateEnum
CREATE TYPE "TipoAnexo" AS ENUM ('ARTE', 'ENGENHARIA');

-- CreateTable
CREATE TABLE "perfis" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "admin" BOOLEAN NOT NULL DEFAULT false,
    "areas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "perfis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "perfilId" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orcamentos" (
    "id" TEXT NOT NULL,
    "origem" "OrigemOrcamento" NOT NULL DEFAULT 'NOVO',
    "cliente" TEXT,
    "clienteChave" TEXT,
    "produtoDescricao" TEXT,
    "produtoCodigo" TEXT,
    "produtoChave" TEXT,
    "codInterno" TEXT,
    "numeroSequencial" TEXT,
    "preCadastro" TEXT,
    "numeroOrcamento" TEXT,
    "classificacao" "Classificacao",
    "etapa" "EtapaOrcamento",
    "statusDiretoria" "StatusDiretoria",
    "precoAtual" DECIMAL(12,2),
    "custoPrimarioPct" DECIMAL(5,2),
    "margemP2Pct" DECIMAL(5,2),
    "quantidade" DECIMAL(12,2),
    "dataLegadoTexto" TEXT,
    "obs" TEXT,
    "fotoDados" TEXT,
    "fotoMime" TEXT,
    "reqCliente" JSONB,
    "reqTecnicos" JSONB,
    "precificacao" JSONB,
    "leituraAnterior" JSONB,
    "criadoPorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orcamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anexos" (
    "id" TEXT NOT NULL,
    "orcamentoId" TEXT NOT NULL,
    "tipo" "TipoAnexo" NOT NULL,
    "nome" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "dados" TEXT NOT NULL,
    "enviadoPorId" TEXT,
    "enviadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anexos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "perfis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anexos" ADD CONSTRAINT "anexos_orcamentoId_fkey" FOREIGN KEY ("orcamentoId") REFERENCES "orcamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anexos" ADD CONSTRAINT "anexos_enviadoPorId_fkey" FOREIGN KEY ("enviadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
