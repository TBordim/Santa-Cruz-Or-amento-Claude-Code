export type Lab = { l: number; a: number; b: number };

// Faixa físicamente válida do espaço CIELAB — L* é sempre 0–100; a*/b* não têm limite teórico
// fixo, mas fora de ±128 é sinal de erro de digitação (nenhuma tinta real da Santa Cruz chega lá).
export function validarLab(l: number, a: number, b: number): string | null {
  if (!Number.isFinite(l) || !Number.isFinite(a) || !Number.isFinite(b)) {
    return "LAB inválido — L*, a* e b* precisam ser números.";
  }
  if (l < 0 || l > 100) return "L* precisa estar entre 0 e 100.";
  if (a < -128 || a > 128 || b < -128 || b > 128) return "a* e b* precisam estar entre -128 e 128.";
  return null;
}

// LAB alvo é opcional na Cor, mas nunca parcial: os 3 campos vazios = sem alvo (válido); 1 ou 2
// preenchidos, ou preenchidos com algo inválido, é erro explícito — antes disso o valor ruim
// era descartado em silêncio (virava null sem avisar ninguém).
export function parseLabAlvoOuErro(formData: FormData): { lab: Lab | null; erro?: string } {
  const rawL = String(formData.get("labAlvoL") ?? "").trim();
  const rawA = String(formData.get("labAlvoA") ?? "").trim();
  const rawB = String(formData.get("labAlvoB") ?? "").trim();
  const preenchidos = [rawL, rawA, rawB].filter((v) => v !== "").length;

  if (preenchidos === 0) return { lab: null };
  if (preenchidos < 3) {
    return { lab: null, erro: "Preencha os 3 valores do LAB alvo (L*, a*, b*), ou deixe todos em branco." };
  }

  const l = Number(rawL.replace(",", "."));
  const a = Number(rawA.replace(",", "."));
  const b = Number(rawB.replace(",", "."));
  const erro = validarLab(l, a, b);
  if (erro) return { lab: null, erro };
  return { lab: { l, a, b } };
}
