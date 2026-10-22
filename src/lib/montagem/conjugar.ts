// Conjugado: vários modelos na mesma faca, um só acerto. Cada modelo recebe um número de poses e
// precisa produzir de 100% a 100% + tolerância da quantidade pedida. Se nenhuma divisão serve,
// não conjuga (um acerto por modelo).
export type ModeloConjugado = { nome: string; quantidade: number };

export type ResultadoConjugado = {
  // Folhas de fator rodadas (a mesma para todos os modelos).
  folhas: number;
  modelos: { nome: string; poses: number; produz: number; sobre: number }[];
  posesVazias: number;
};

export function conjugar(posesDaFaca: number, modelos: ModeloConjugado[], toleranciaAcima = 0.1): ResultadoConjugado | null {
  if (!(posesDaFaca > 0) || !modelos.length || modelos.some((m) => !(m.quantidade > 0))) return null;
  const maior = Math.max(...modelos.map((m) => m.quantidade));
  for (let folhas = 1; folhas <= maior + 1; folhas++) {
    const poses = modelos.map((m) => Math.ceil(m.quantidade / folhas));
    const cabe = poses.every((p, i) => p * folhas <= modelos[i].quantidade * (1 + toleranciaAcima) + 1e-9);
    const soma = poses.reduce((s, p) => s + p, 0);
    if (cabe && soma <= posesDaFaca) {
      return {
        folhas,
        posesVazias: posesDaFaca - soma,
        modelos: modelos.map((m, i) => ({ nome: m.nome, poses: poses[i], produz: poses[i] * folhas, sobre: (poses[i] * folhas) / m.quantidade - 1 })),
      };
    }
  }
  return null;
}
