// Normaliza texto pra comparar (mesma função `chave()` do HTML original): sem espaços nas
// pontas, maiúsculo. Arquivo próprio, sem acesso ao banco, pra poder ser usado também em
// componentes de cliente (ver modelos.ts).
export function chave(s: string | null | undefined): string {
  return (s || "").toString().trim().toUpperCase();
}
