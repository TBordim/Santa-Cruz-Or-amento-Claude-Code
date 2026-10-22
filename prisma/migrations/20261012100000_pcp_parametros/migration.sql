-- CreateTable
CREATE TABLE "pcp_parametros" (
    "id" TEXT NOT NULL DEFAULT 'padrao',
    "diasProducaoMinimo" INTEGER NOT NULL DEFAULT 5,
    "folhasPorDia" INTEGER NOT NULL DEFAULT 4000,
    "diasFacaNova" INTEGER NOT NULL DEFAULT 7,
    "diasClicheNovo" INTEGER NOT NULL DEFAULT 5,
    "diasAcabamentoEspecial" INTEGER NOT NULL DEFAULT 3,
    "diasMargem" INTEGER NOT NULL DEFAULT 1,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "atualizadoPor" TEXT,

    CONSTRAINT "pcp_parametros_pkey" PRIMARY KEY ("id")
);

