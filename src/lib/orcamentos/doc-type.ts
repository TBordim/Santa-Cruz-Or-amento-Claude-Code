import type { OrcamentoModel, AnexoModel } from "@/generated/prisma/models";

export type OrcamentoComAnexos = OrcamentoModel & { anexos: AnexoModel[] };
