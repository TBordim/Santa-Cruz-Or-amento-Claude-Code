import { Badge } from "@/components/ui/badge";
import { corDoModulo, rotuloDoModulo } from "@/lib/treinamentos/apresentacao";
import { ROTULO_SITUACAO, type Situacao } from "@/lib/treinamentos/situacao";

// Selo do módulo a que o treinamento pertence, na cor do módulo (a mesma do cartão na página de entrada).
export function SeloModulo({ modulo }: { modulo: string }) {
  const cor = corDoModulo(modulo);
  return (
    <span
      className="inline-flex h-5 items-center gap-1.5 rounded-4xl px-2 text-xs font-medium"
      style={{ color: cor, background: `color-mix(in srgb, ${cor} 12%, transparent)` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: cor }} />
      {rotuloDoModulo(modulo)}
    </span>
  );
}

const ESTILO: Record<Situacao["tipo"], string> = {
  CONCLUIDO: "bg-good-soft text-good",
  REFAZER: "bg-warn-soft text-warn",
  ATUALIZADO: "bg-warn-soft text-warn",
  PENDENTE: "bg-secondary text-secondary-foreground",
};

export function formatarData(d: Date): string {
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function SelosSituacao({ situacao }: { situacao: Situacao }) {
  const { tipo, melhorNota, data } = situacao;
  return (
    <Badge className={`border-0 ${ESTILO[tipo]}`}>
      {ROTULO_SITUACAO[tipo]}
      {tipo === "CONCLUIDO" && melhorNota != null && data ? ` · ${melhorNota}% · ${formatarData(data)}` : ""}
      {tipo === "REFAZER" && melhorNota != null ? ` · melhor ${melhorNota}%` : ""}
    </Badge>
  );
}
