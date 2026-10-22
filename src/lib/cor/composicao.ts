// A soma de uma composição precisa fechar em 100,00% exatos — regra única usada tanto no servidor
// (recusa salvar) quanto no ⚠ da tela, pra os dois nunca discordarem. O ±0,005 não é folga
// aceitável: é só a margem de ponto flutuante do JavaScript (33,33+33,33+33,34 pode dar
// 99,99999999999999), invisível em 2 casas decimais.
export function somaFecha100(total: number): boolean {
  return Math.abs(total - 100) <= 0.005;
}
