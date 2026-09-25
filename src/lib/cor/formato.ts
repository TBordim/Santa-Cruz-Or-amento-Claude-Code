// Números do módulo Laboratório sempre com vírgula decimal (padrão brasileiro) — na tela e nas
// mensagens de erro. Sem separador de milhar de propósito: "1.000,000 kg" confundiria no chão de
// fábrica. Sem `casas`, mostra o número como está (ex.: um LAB 48.5 vira "48,5").
export function num(n: number, casas?: number): string {
  return (casas == null ? String(n) : n.toFixed(casas)).replace(".", ",");
}
