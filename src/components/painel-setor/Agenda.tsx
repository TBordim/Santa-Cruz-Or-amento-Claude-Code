import Link from "next/link";
import { diasDaAgenda, type LinhaAgenda, type Periodo, type Segmento } from "@/lib/aceite/agenda";

const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export type LinhaDaTela = {
  id: string;
  href?: string;
  titulo: React.ReactNode;
  sub: string;
  l: LinhaAgenda;
};

const ESTILO_SEGMENTO: Record<Segmento["tipo"], { className: string; style?: React.CSSProperties }> = {
  papel: { className: "border border-dashed border-warn bg-warn-soft text-warn" },
  risco: { className: "border border-bad bg-bad-soft text-bad" },
  rumo: { className: "bg-[var(--navy-soft)] text-[var(--navy)]" },
  espera: {
    className: "border border-line-strong text-muted-foreground",
    style: { background: "repeating-linear-gradient(135deg, var(--surface-alt) 0 6px, var(--surface) 6px 12px)" },
  },
};

export function LegendaAgenda({ semEntrega = false }: { semEntrega?: boolean }) {
  const item = (className: string, texto: string, style?: React.CSSProperties) => (
    <span className="inline-flex items-center gap-1.5">
      <i className={`inline-block h-2.5 w-[18px] rounded-sm ${className}`} style={style} />
      {texto}
    </span>
  );
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {item("border border-dashed border-warn bg-warn-soft", "papel a caminho")}
      {item("border border-line-strong", "esperando", ESTILO_SEGMENTO.espera.style)}
      {!semEntrega && item("bg-[var(--navy-soft)]", "até a entrega")}
      {!semEntrega && item("bg-good", "entrega prometida")}
      {!semEntrega && item("border border-good bg-good-soft", "entregue (PCP confirmou)")}
      {item("border border-bad bg-bad-soft", "em risco")}
    </div>
  );
}

// Agenda das telas de setor (formato "painel + agenda"): uma linha por item, nos dias do período
// escolhido. Quem chama monta as linhas (Aceites ou Pedidos de Material) e decide a ordem. Períodos
// longos rolam para o lado em vez de espremer os dias.
export function Agenda({ linhas, hoje, periodo, vazio }: { linhas: LinhaDaTela[]; hoje: Date; periodo: Periodo; vazio: string }) {
  const dias = diasDaAgenda(periodo);
  const N = periodo.dias;
  const grade = { gridTemplateColumns: `200px repeat(${N}, minmax(0, 1fr))` };
  if (!linhas.length) return <div className="empty-state">{vazio}</div>;

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <div className="px-3.5 py-3" style={{ minWidth: Math.max(860, 228 + N * 30) }}>
        <div className="grid" style={grade}>
          <span />
          {dias.map((d, i) => {
            const eHoje = d.getTime() === hoje.getTime();
            // Mês em cima do primeiro dia e de cada dia 1, pra se achar quando o período vira o mês.
            const mes = i === 0 || d.getUTCDate() === 1 ? MESES[d.getUTCMonth()] : "";
            return (
              <span key={i} className={`pb-1 text-center font-mono text-[10px] leading-tight ${eHoje ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                <span className="block h-3 font-semibold text-foreground">{mes}</span>
                {eHoje ? "hoje" : SEMANA[d.getUTCDay()]}
                <br />
                {String(d.getUTCDate()).padStart(2, "0")}
              </span>
            );
          })}
        </div>
        {linhas.map((linha) => {
          const { l } = linha;
          const conteudo = (
            <>
              {dias.map((d, i) =>
                d.getUTCDay() === 0 || d.getUTCDay() === 6 ? (
                  <span key={`fds-${i}`} className="self-stretch bg-muted/60" style={{ gridColumn: i + 2, gridRow: 1 }} />
                ) : null,
              )}
              <span className="min-w-0 pr-2 text-[12.5px] leading-tight" style={{ gridColumn: 1, gridRow: 1 }}>
                <span className="block truncate text-foreground">{linha.titulo}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{linha.sub}</span>
              </span>
              {l.segmentos.map((s, i) => (
                <span
                  key={`s-${i}`}
                  className={`z-[1] flex h-5 items-center overflow-hidden whitespace-nowrap rounded-[5px] px-1.5 font-mono text-[10.5px] ${ESTILO_SEGMENTO[s.tipo].className}`}
                  style={{ gridColumn: `${s.ini + 2} / ${s.fim + 2}`, gridRow: 1, ...ESTILO_SEGMENTO[s.tipo].style }}
                  title={s.texto}
                >
                  {s.texto}
                </span>
              ))}
              {l.marcos.map((m, i) =>
                m.tipo === "papel" ? (
                  <span
                    key={`m-${i}`}
                    title={m.texto}
                    className="z-[2] h-2.5 w-2.5 justify-self-center rounded-full bg-warn shadow-[0_0_0_2px_var(--card)]"
                    style={{ gridColumn: m.dia + 2, gridRow: 1 }}
                  />
                ) : m.tipo === "entregue" ? (
                  <span
                    key={`m-${i}`}
                    title={m.texto}
                    className="z-[2] flex h-5 items-center justify-center rounded-full border border-good bg-good-soft font-mono text-[10.5px] font-semibold text-good"
                    style={{ gridColumn: m.dia + 2, gridRow: 1 }}
                  >
                    ✓{String(dias[m.dia].getUTCDate()).padStart(2, "0")}
                  </span>
                ) : (
                  <span
                    key={`m-${i}`}
                    title={m.texto}
                    className={`z-[2] flex h-5 items-center justify-center rounded-full font-mono text-[10.5px] font-semibold text-white ${m.tipo === "entrega-risco" ? "bg-bad" : "bg-good"}`}
                    style={{ gridColumn: m.dia + 2, gridRow: 1 }}
                  >
                    {String(dias[m.dia].getUTCDate()).padStart(2, "0")}
                  </span>
                ),
              )}
              {l.depois && (
                <span
                  className={`z-[2] justify-self-end whitespace-nowrap rounded-full px-2 font-mono text-[10.5px] font-semibold text-white ${l.risco ? "bg-bad" : "bg-good"}`}
                  style={{ gridColumn: `${N - 2} / ${N + 2}`, gridRow: 1 }}
                >
                  {l.depois}
                </span>
              )}
            </>
          );
          const classe = "grid min-h-10 items-center border-t border-border no-underline";
          return linha.href ? (
            <Link key={linha.id} href={linha.href} className={`${classe} transition-colors hover:bg-muted/40`} style={grade}>
              {conteudo}
            </Link>
          ) : (
            <div key={linha.id} className={classe} style={grade}>
              {conteudo}
            </div>
          );
        })}
      </div>
    </div>
  );
}
