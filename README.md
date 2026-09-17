# Santa Cruz — Sistema de Orçamentos

Migração do painel de orçamentos da Santa Cruz Ind. Gráfica (hoje um Claude Artifact
single-file, `santa-cruz-orcamentos.html`) para um sistema próprio em Next.js.
Automação construída no Claude Code.

Fonte da verdade do modelo de dados/regras do sistema atual:
`ESPECIFICACAO-sistema-atual.md`, na raiz do repositório de origem.

## Status: Fase 1 (Fundação)

- [x] Next.js (App Router) + TypeScript
- [x] Schema Prisma (Postgres) para `orcamentos`, `perfis`, `usuarios`, `anexos`
- [x] Login por PIN hasheado com bcrypt + sessão de servidor (Auth.js)
- [x] Tela de Administração (Perfis de acesso + Usuários) validada no servidor
- [ ] Fluxo de 6 etapas (Solicitação → Engenharia → Orçamento → Diretoria → Envio de Oferta →
      Finalizado) — Fase 2

## Rodando localmente

```bash
npm install
npx prisma dev -d          # Postgres local efêmero (ou aponte DATABASE_URL para o Neon)
cp .env.example .env       # preencha DATABASE_URL e AUTH_SECRET
npx prisma migrate dev
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). No primeiro acesso (banco sem nenhum
usuário), a tela de login vira um formulário de criação do administrador.

## Stack

- **Next.js 16** (App Router, Server Actions)
- **Prisma 7** com o driver adapter `@prisma/adapter-pg` (funciona igual contra o Postgres
  local do `prisma dev` e contra o Neon)
- **Auth.js v5** (Credentials provider, sessão JWT)
- **bcryptjs** para o hash do PIN
- Deploy: **Vercel**, banco: **Neon** (Postgres serverless)
