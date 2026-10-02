-- CreateTable
CREATE TABLE "trein_treinamentos" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "descricao" TEXT,
    "videoUrl" TEXT NOT NULL,
    "videoPathname" TEXT NOT NULL,
    "legendasUrl" TEXT,
    "legendasPathname" TEXT,
    "duracaoSeg" INTEGER,
    "quiz" JSONB NOT NULL,
    "notaMinima" INTEGER NOT NULL DEFAULT 75,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trein_treinamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trein_perfis" (
    "treinamentoId" TEXT NOT NULL,
    "perfilId" TEXT NOT NULL,

    CONSTRAINT "trein_perfis_pkey" PRIMARY KEY ("treinamentoId","perfilId")
);

-- CreateTable
CREATE TABLE "trein_tentativas" (
    "id" TEXT NOT NULL,
    "treinamentoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "versaoTreinamento" INTEGER NOT NULL,
    "respostas" JSONB NOT NULL,
    "acertos" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "nota" INTEGER NOT NULL,
    "aprovado" BOOLEAN NOT NULL,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trein_tentativas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trein_tentativas_usuarioId_treinamentoId_idx" ON "trein_tentativas"("usuarioId", "treinamentoId");

-- AddForeignKey
ALTER TABLE "trein_perfis" ADD CONSTRAINT "trein_perfis_treinamentoId_fkey" FOREIGN KEY ("treinamentoId") REFERENCES "trein_treinamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trein_perfis" ADD CONSTRAINT "trein_perfis_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "perfis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trein_tentativas" ADD CONSTRAINT "trein_tentativas_treinamentoId_fkey" FOREIGN KEY ("treinamentoId") REFERENCES "trein_treinamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trein_tentativas" ADD CONSTRAINT "trein_tentativas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

