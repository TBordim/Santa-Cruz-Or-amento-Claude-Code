import { redirect } from "next/navigation";
import Link from "next/link";
import { Play } from "lucide-react";
import { sessaoAtual } from "@/lib/permissions";
import { PageHeader } from "@/components/page-header";
import { SeloModulo, SelosSituacao } from "@/components/treinamentos/badges";
import { treinamentosDaPessoa } from "@/lib/treinamentos/dados";
import { corDoModulo, formatarDuracao, rotuloDoModulo } from "@/lib/treinamentos/apresentacao";
import { contaComoPendente } from "@/lib/treinamentos/situacao";

// Meus treinamentos: só os vídeos do perfil da pessoa (o administrador vê todos), agrupados por módulo, cada
// cartão com o selo do módulo e a situação dela. Um módulo só conta como concluído com todos aprovados.
export default async function TreinamentosPage() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");

  const itens = await treinamentosDaPessoa(sessao);
  const porModulo = new Map<string, typeof itens>();
  for (const t of itens) porModulo.set(t.modulo, [...(porModulo.get(t.modulo) ?? []), t]);

  return (
    <>
      <PageHeader
        title="Treinamentos"
        description={
          sessao.admin
            ? "Como administrador, você vê os vídeos de todos os perfis."
            : "Seus vídeos de treinamento: assista e responda o quiz. Dá para refazer o quiz quantas vezes precisar, até chegar a 75%."
        }
      />

      {itens.length === 0 ? (
        <div className="empty-state">Nenhum treinamento para o seu perfil ainda.</div>
      ) : (
        <div className="flex flex-col gap-8">
          {[...porModulo.entries()].map(([modulo, lista]) => {
            const concluidos = lista.filter((t) => !contaComoPendente(t.situacao)).length;
            const cor = corDoModulo(modulo);
            return (
              <section key={modulo}>
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2">
                  <h3 className="font-serif text-lg font-semibold tracking-tight" style={{ color: cor }}>
                    {rotuloDoModulo(modulo)}
                  </h3>
                  <span className="font-mono text-xs text-muted-foreground">
                    {concluidos} de {lista.length} {lista.length === 1 ? "concluído" : "concluídos"}
                    {concluidos === lista.length ? " · módulo completo" : ""}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {lista.map((t) => {
                    const duracao = formatarDuracao(t.duracaoSeg);
                    return (
                      <Link
                        key={t.id}
                        href={`/treinamentos/${t.id}`}
                        className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-4 no-underline transition-colors hover:bg-[color-mix(in_srgb,var(--cor)_5%,var(--card))]"
                        style={{ "--cor": cor } as React.CSSProperties}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <SeloModulo modulo={t.modulo} />
                          {duracao && <span className="font-mono text-[11px] text-muted-foreground">{duracao}</span>}
                        </div>
                        <div className="flex items-start gap-2.5">
                          <span
                            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                            style={{ background: `color-mix(in srgb, ${cor} 14%, var(--card))` }}
                          >
                            <Play className="h-3.5 w-3.5" style={{ color: cor }} />
                          </span>
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground">{t.titulo}</div>
                            {t.descricao && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.descricao}</p>}
                          </div>
                        </div>
                        <div className="mt-auto">
                          <SelosSituacao situacao={t.situacao} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
