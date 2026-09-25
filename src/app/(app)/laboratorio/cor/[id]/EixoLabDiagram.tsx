import { labToCssColor } from "@/lib/cor/lab-to-rgb";
import { num } from "@/lib/cor/formato";

type Lab = { l: number; a: number; b: number };

// Domínio do plano a*/b* — cobre com folga o que as tintas IRO da Santa Cruz produzem na prática
// (a maioria das fórmulas do histórico fica bem dentro disso); ponto fora da faixa é grudado na
// borda com uma seta, pra não estourar o desenho.
const DOMINIO = 100;
const RAIO = 78;
const CENTRO = 130;
const VIEWBOX = 260;

function paraXY(a: number, b: number) {
  const clamp = (v: number) => Math.max(-DOMINIO, Math.min(DOMINIO, v));
  return { x: CENTRO + (clamp(a) / DOMINIO) * RAIO, y: CENTRO - (clamp(b) / DOMINIO) * RAIO };
}

// O "relógio" a*/b* do material da Sun Chemical/X-Rite (verde↔vermelho no eixo horizontal,
// azul↔amarelo no vertical) — mesma referência visual que o colorista já usa mentalmente ao
// decidir "pra que lado mexer" numa correção manual. Server Component puro (só SVG, sem
// interatividade), plota o alvo e a última puxada e desenha a seta de correção entre os dois.
export function EixoLabDiagram({
  alvo,
  atual,
  rotuloAtual,
  rotuloReferencia = "Alvo",
}: {
  alvo: Lab;
  atual: Lab | null;
  rotuloAtual: string;
  // Cor importada da planilha antiga não tem alvo registrado — o desenho usa o LAB final como
  // referência (mira), e o rótulo muda pra deixar claro que não é um alvo de verdade.
  rotuloReferencia?: string;
}) {
  const pAlvo = paraXY(alvo.a, alvo.b);
  const pAtual = atual ? paraXY(atual.a, atual.b) : null;
  const distancia = pAtual ? Math.hypot(pAlvo.x - pAtual.x, pAlvo.y - pAtual.y) : 0;
  // Seta só aparece se a diferença for visível no desenho — dois pontos quase colados (praticamente
  // em cima do alvo) não precisam de indicação de direção nenhuma.
  const mostraSeta = pAtual != null && distancia > 4;

  const anéis = [25, 50, 75, 100];

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4">
      <svg viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} className="h-60 w-60 shrink-0" role="img" aria-label="Plano a*/b* com o alvo e a última puxada">
        <defs>
          <marker id="seta-ajuste" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--destructive)" />
          </marker>
        </defs>

        {anéis.map((r) => (
          <circle key={r} cx={CENTRO} cy={CENTRO} r={(r / DOMINIO) * RAIO} fill="none" stroke="var(--border)" strokeWidth={1} />
        ))}
        <line x1={CENTRO - RAIO} y1={CENTRO} x2={CENTRO + RAIO} y2={CENTRO} stroke="var(--border)" strokeWidth={1} />
        <line x1={CENTRO} y1={CENTRO - RAIO} x2={CENTRO} y2={CENTRO + RAIO} stroke="var(--border)" strokeWidth={1} />

        {/* Só o nome da cor na ponta de cada eixo, escrito na própria cor — o sinal e o valor numérico
            dos eixos já estão no texto abaixo do desenho; as duas coisas juntas aqui estouravam a
            largura do desenho. */}
        <text x={CENTRO + RAIO + 6} y={CENTRO + 4} className="fill-[var(--bad)] text-[9px] font-medium">
          Vermelho
        </text>
        <text x={CENTRO - RAIO - 6} y={CENTRO + 4} textAnchor="end" className="fill-[var(--good)] text-[9px] font-medium">
          Verde
        </text>
        <text x={CENTRO} y={CENTRO - RAIO - 8} textAnchor="middle" className="fill-[var(--warn)] text-[9px] font-medium">
          Amarelo
        </text>
        <text x={CENTRO} y={CENTRO + RAIO + 14} textAnchor="middle" className="fill-blue-700 dark:fill-blue-300 text-[9px] font-medium">
          Azul
        </text>

        {mostraSeta && pAtual && (
          <line x1={pAtual.x} y1={pAtual.y} x2={pAlvo.x} y2={pAlvo.y} stroke="var(--destructive)" strokeWidth={2} markerEnd="url(#seta-ajuste)" />
        )}

        {/* Alvo: aro com cruz — não é uma tinta de verdade, é a mira. */}
        <circle cx={pAlvo.x} cy={pAlvo.y} r={7} fill="none" stroke="var(--foreground)" strokeWidth={2} />
        <line x1={pAlvo.x - 10} y1={pAlvo.y} x2={pAlvo.x + 10} y2={pAlvo.y} stroke="var(--foreground)" strokeWidth={1} />
        <line x1={pAlvo.x} y1={pAlvo.y - 10} x2={pAlvo.x} y2={pAlvo.y + 10} stroke="var(--foreground)" strokeWidth={1} />

        {pAtual && atual && (
          <circle cx={pAtual.x} cy={pAtual.y} r={7} fill={labToCssColor(atual)} stroke="var(--card)" strokeWidth={2} />
        )}
      </svg>

      <div className="flex flex-col gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 shrink-0 rounded-full border-2 border-foreground" />
          <span className="text-muted-foreground">
            {rotuloReferencia} — a* {num(alvo.a)} · b* {num(alvo.b)}
          </span>
        </div>
        {atual ? (
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 shrink-0 rounded-full border border-border" style={{ background: labToCssColor(atual) }} />
            <span className="text-muted-foreground">
              {rotuloAtual} — a* {num(atual.a)} · b* {num(atual.b)}
            </span>
          </div>
        ) : (
          <div className="text-muted-foreground">Registre a puxada de uma rodada pra ver a seta de ajuste aqui.</div>
        )}
        {mostraSeta && (
          <div className="text-muted-foreground">
            A seta mostra o sentido do ajuste no plano — quanto mais próxima do centro do alvo, menor o ΔE.
          </div>
        )}
        {/* Régua de L* — o plano horizontal não mostra claro↔escuro, então entra à parte. */}
        <div className="mt-1 flex items-center gap-2">
          <div className="relative h-24 w-3 shrink-0 overflow-hidden rounded-full border border-border" style={{ background: "linear-gradient(to top, #111, #fff)" }}>
            <span
              className="absolute left-0 right-0 h-0.5 bg-foreground"
              style={{ bottom: `${Math.max(0, Math.min(100, alvo.l))}%` }}
              title={`${rotuloReferencia} L* ${num(alvo.l)}`}
            />
            {atual && (
              <span
                className="absolute left-0 right-0 h-0.5 bg-destructive"
                style={{ bottom: `${Math.max(0, Math.min(100, atual.l))}%` }}
                title={`${rotuloAtual} L* ${num(atual.l)}`}
              />
            )}
          </div>
          <span className="text-muted-foreground">
            L* — {rotuloReferencia.toLowerCase()} {num(alvo.l)}
            {atual && <> · {rotuloAtual.toLowerCase()} {num(atual.l)}</>}
          </span>
        </div>
      </div>
    </div>
  );
}
