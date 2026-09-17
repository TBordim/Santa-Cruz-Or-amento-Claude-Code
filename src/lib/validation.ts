// Mesma regra de hoje (fazerLogin/criarUsuario no santa-cruz-orcamentos.html): PIN de 4 a 6 dígitos.
export const PIN_REGEX = /^[0-9]{4,6}$/;

// Custo do bcrypt para o hash do PIN — 10 rounds é o padrão recomendado pela própria lib
// (equilíbrio entre segurança e latência aceitável num login).
export const BCRYPT_ROUNDS = 10;
