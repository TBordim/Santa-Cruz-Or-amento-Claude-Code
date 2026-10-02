// CNPJ sem acesso ao banco, pra servir também aos componentes de cliente.

export function somenteDigitos(s: string | null | undefined): string {
  return String(s ?? "").replace(/\D/g, "");
}

export function formatarCnpj(s: string | null | undefined): string {
  const d = somenteDigitos(s);
  if (d.length !== 14) return String(s ?? "");
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

// Confere os dois dígitos verificadores.
export function cnpjValido(s: string | null | undefined): boolean {
  const d = somenteDigitos(s);
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const digito = (n: number) => {
    let soma = 0;
    let peso = n - 7;
    for (let i = 0; i < n; i++) {
      soma += Number(d[i]) * peso;
      peso = peso === 2 ? 9 : peso - 1;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return digito(12) === Number(d[12]) && digito(13) === Number(d[13]);
}
