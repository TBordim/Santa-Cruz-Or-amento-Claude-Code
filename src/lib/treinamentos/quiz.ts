// Regras do quiz dos treinamentos — funções puras (sem banco, sem sessão), usadas na validação do
// quiz.json que o administrador importa e na correção das respostas, que SEMPRE roda no servidor
// contra o quiz guardado no banco: o navegador só manda as alternativas escolhidas, nunca a nota.

export type Pergunta = {
  id: string;
  pergunta: string;
  alternativas: string[];
  // Índice (0 a 3) da alternativa certa.
  correta: number;
  explicacao: string;
};

export type Quiz = { perguntas: Pergunta[] };

// O que vai para o navegador antes de responder: sem a resposta certa e sem a explicação.
export type PerguntaPublica = Pick<Pergunta, "id" | "pergunta" | "alternativas">;

export const MIN_PERGUNTAS = 6;
export const MAX_PERGUNTAS = 8;
export const N_ALTERNATIVAS = 4;

export type ResultadoValidacao =
  | { ok: true; quiz: Quiz; modulo?: string; titulo?: string }
  | { ok: false; erro: string };

function texto(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

// Confere o formato do quiz.json (o mesmo que gravamos em docs/treinamento/<modulo>/quiz.json):
// 6 a 8 perguntas, 4 alternativas cada, uma correta, com explicação. Guarda só o que o app usa.
export function validarQuiz(entrada: unknown): ResultadoValidacao {
  if (!entrada || typeof entrada !== "object") return { ok: false, erro: "O quiz precisa ser um objeto JSON." };
  const bruto = entrada as { perguntas?: unknown; modulo?: unknown; titulo?: unknown };
  if (!Array.isArray(bruto.perguntas)) return { ok: false, erro: 'Falta a lista "perguntas".' };
  const n = bruto.perguntas.length;
  if (n < MIN_PERGUNTAS || n > MAX_PERGUNTAS) {
    return { ok: false, erro: `O quiz precisa ter de ${MIN_PERGUNTAS} a ${MAX_PERGUNTAS} perguntas (tem ${n}).` };
  }

  const ids = new Set<string>();
  const perguntas: Pergunta[] = [];
  for (const [i, p] of bruto.perguntas.entries()) {
    const num = i + 1;
    if (!p || typeof p !== "object") return { ok: false, erro: `Pergunta ${num}: formato inválido.` };
    const q = p as Record<string, unknown>;
    const id = texto(q.id);
    const enunciado = texto(q.pergunta);
    const explicacao = texto(q.explicacao);
    if (!id) return { ok: false, erro: `Pergunta ${num}: falta o "id".` };
    if (ids.has(id)) return { ok: false, erro: `Pergunta ${num}: o id "${id}" aparece mais de uma vez.` };
    ids.add(id);
    if (!enunciado) return { ok: false, erro: `Pergunta ${num}: falta o texto da pergunta.` };
    if (!explicacao) return { ok: false, erro: `Pergunta ${num}: falta a explicação.` };
    if (!Array.isArray(q.alternativas) || q.alternativas.length !== N_ALTERNATIVAS) {
      return { ok: false, erro: `Pergunta ${num}: precisa de exatamente ${N_ALTERNATIVAS} alternativas.` };
    }
    const alternativas = q.alternativas.map(texto);
    if (alternativas.some((a) => a === null)) return { ok: false, erro: `Pergunta ${num}: há alternativa vazia.` };
    if (new Set(alternativas).size !== alternativas.length) return { ok: false, erro: `Pergunta ${num}: há alternativas repetidas.` };
    if (!Number.isInteger(q.correta) || (q.correta as number) < 0 || (q.correta as number) >= N_ALTERNATIVAS) {
      return { ok: false, erro: `Pergunta ${num}: "correta" precisa ser um número de 0 a ${N_ALTERNATIVAS - 1}.` };
    }
    perguntas.push({ id, pergunta: enunciado, alternativas: alternativas as string[], correta: q.correta as number, explicacao });
  }

  return { ok: true, quiz: { perguntas }, modulo: texto(bruto.modulo) ?? undefined, titulo: texto(bruto.titulo) ?? undefined };
}

// Lê o JSON que está no banco (Json do Prisma) como Quiz, sem confiar no formato.
export function quizDoBanco(valor: unknown): Quiz {
  const r = validarQuiz(valor);
  if (!r.ok) throw new Error(`Quiz salvo com formato inválido: ${r.erro}`);
  return r.quiz;
}

export function perguntasPublicas(quiz: Quiz): PerguntaPublica[] {
  return quiz.perguntas.map(({ id, pergunta, alternativas }) => ({ id, pergunta, alternativas }));
}

export type ItemCorrecao = {
  perguntaId: string;
  escolhida: number;
  correta: number;
  acertou: boolean;
  explicacao: string;
};

export type Correcao = {
  acertos: number;
  total: number;
  nota: number; // 0 a 100
  aprovado: boolean;
  itens: ItemCorrecao[];
};

export type CorrecaoOuErro = { ok: true; correcao: Correcao } | { ok: false; erro: string };

// `respostas`: perguntaId -> índice da alternativa escolhida. Todas as perguntas precisam de resposta;
// ids que não existem no quiz são recusados (não dá para inflar a nota mandando respostas extras).
export function corrigir(quiz: Quiz, respostas: Record<string, unknown>, notaMinima: number): CorrecaoOuErro {
  const conhecidas = new Set(quiz.perguntas.map((p) => p.id));
  for (const id of Object.keys(respostas)) {
    if (!conhecidas.has(id)) return { ok: false, erro: "Resposta para uma pergunta que não existe." };
  }
  const itens: ItemCorrecao[] = [];
  for (const p of quiz.perguntas) {
    const escolhida = respostas[p.id];
    if (!Number.isInteger(escolhida) || (escolhida as number) < 0 || (escolhida as number) >= p.alternativas.length) {
      return { ok: false, erro: "Responda todas as perguntas antes de enviar." };
    }
    itens.push({
      perguntaId: p.id,
      escolhida: escolhida as number,
      correta: p.correta,
      acertou: escolhida === p.correta,
      explicacao: p.explicacao,
    });
  }
  const acertos = itens.filter((i) => i.acertou).length;
  const total = itens.length;
  const nota = Math.round((acertos / total) * 100);
  return { ok: true, correcao: { acertos, total, nota, aprovado: nota >= notaMinima, itens } };
}
