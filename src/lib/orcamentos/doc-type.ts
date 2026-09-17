import type { OrcamentoModel, AnexoModel } from "@/generated/prisma/models";

// precoAnterior vem do Prisma como Decimal — React Server Components não aceita passar essa
// classe para um Client Component (warning "Only plain objects..."), então convertemos para
// number antes de entregar ao Drawer/forms de etapa.
export type OrcamentoComAnexos = Omit<OrcamentoModel, "precoAnterior"> & {
  precoAnterior: number | null;
  anexos: AnexoModel[];
};
