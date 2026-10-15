import { PainelAtendimento } from "./PainelAtendimento";

export const dynamic = "force-dynamic";

export default async function AtendimentoPage({ searchParams }: { searchParams: Promise<{ filtro?: string; q?: string }> }) {
  const { filtro, q } = await searchParams;
  return <PainelAtendimento filtro={filtro} q={q} />;
}
