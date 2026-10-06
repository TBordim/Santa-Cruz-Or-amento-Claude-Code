// Trava de segurança do build: confere em QUAL banco o deploy vai trabalhar, antes do
// `prisma migrate deploy`. Nasceu do incidente de 06/10/2026: depois de trocar a senha na Neon, a
// integração Neon–Vercel reescreveu a DATABASE_URL de Production apontando pro banco de
// demonstração (santacruz_demo, vazio) — o app subiu normal, só que lendo um banco sem usuários
// (tela "Primeiro acesso"), e nada no build avisou.
//
// NUNCA imprime URL, usuário ou senha: só o nome do banco e o host (sem credencial).
//
// Em Production o build FALHA se:
//   1. DATABASE_URL não existir ou não for uma URL válida;
//   2. o nome do banco tiver "demo" (o banco de demonstração é o santacruz_demo);
//   3. DATABASE_URL_UNPOOLED (usada só pelo migrate) apontar pra outro banco/endpoint que a
//      DATABASE_URL — migrations iriam pra um banco e o app leria outro;
//   4. BANCO_ESPERADO estiver definida (opcional, recomendada: neondb) e o banco for diferente.
// Preview e local só imprimem o que encontraram. Saída deliberada pra um projeto de demonstração
// em Production: defina PERMITIR_BANCO_DEMO=1 (desliga só a regra 2).

const ambiente = process.env.VERCEL_ENV || "local";

function ler(nome) {
  const valor = process.env[nome];
  if (!valor) return null;
  try {
    const u = new URL(valor);
    return {
      host: u.hostname,
      // Pooled e direto são o mesmo endpoint com "-pooler" no nome — compara sem isso.
      endpoint: u.hostname.replace("-pooler", ""),
      banco: decodeURIComponent(u.pathname.replace(/^\//, "")),
    };
  } catch {
    return { invalida: true };
  }
}

const principal = ler("DATABASE_URL");
const direta = ler("DATABASE_URL_UNPOOLED");

function descrever(nome, c) {
  if (!c) return `${nome}: não definida`;
  if (c.invalida) return `${nome}: valor inválido (não é uma URL)`;
  return `${nome}: banco "${c.banco}" em ${c.host}`;
}

console.log(`[verificar-banco] ambiente: ${ambiente}`);
console.log(`[verificar-banco] ${descrever("DATABASE_URL", principal)}`);
console.log(`[verificar-banco] ${descrever("DATABASE_URL_UNPOOLED", direta)}`);

const problemas = [];

if (!principal || principal.invalida) {
  problemas.push("DATABASE_URL não está definida ou não é uma URL válida.");
} else {
  if (!process.env.PERMITIR_BANCO_DEMO && /demo/i.test(principal.banco)) {
    problemas.push(`DATABASE_URL aponta para o banco "${principal.banco}", que parece ser de DEMONSTRAÇÃO.`);
  }
  if (process.env.BANCO_ESPERADO && principal.banco !== process.env.BANCO_ESPERADO) {
    problemas.push(`DATABASE_URL aponta para "${principal.banco}", mas BANCO_ESPERADO é "${process.env.BANCO_ESPERADO}".`);
  }
}

if (direta && !direta.invalida && principal && !principal.invalida) {
  if (direta.banco !== principal.banco) {
    problemas.push(`DATABASE_URL_UNPOOLED ("${direta.banco}") e DATABASE_URL ("${principal.banco}") apontam para bancos diferentes.`);
  } else if (direta.endpoint !== principal.endpoint) {
    problemas.push("DATABASE_URL_UNPOOLED e DATABASE_URL apontam para servidores (endpoints) diferentes.");
  }
}
if (direta?.invalida) problemas.push("DATABASE_URL_UNPOOLED não é uma URL válida.");

if (problemas.length === 0) {
  console.log("[verificar-banco] ok.");
} else if (ambiente === "production") {
  console.error("\n[verificar-banco] BUILD DE PRODUÇÃO INTERROMPIDO — nada foi alterado no banco:");
  for (const p of problemas) console.error(`  - ${p}`);
  console.error(
    "\nCorrija as variáveis de ambiente de Production na Vercel (ver o roteiro enviado pelo time) e faça Redeploy.\n" +
      "Banco de demonstração em Production de propósito? Defina PERMITIR_BANCO_DEMO=1.",
  );
  process.exit(1);
} else {
  console.warn(`[verificar-banco] atenção (não bloqueia em "${ambiente}"):`);
  for (const p of problemas) console.warn(`  - ${p}`);
}
