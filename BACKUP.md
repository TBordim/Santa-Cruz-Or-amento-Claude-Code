# Backup diário do banco de dados

O banco de produção (Neon) está no plano gratuito, que guarda pouco histórico — se algo for
apagado por engano ou corrompido, a janela para desfazer é curta. Este workflow
(`.github/workflows/backup-diario.yml`) copia o banco inteiro, toda madrugada, para um
**segundo banco Postgres em nuvem**, separado do Neon de produção. Se o Neon tiver qualquer
problema, os dados de até um dia atrás estão a salvo nesse segundo banco.

Guarda também, por 14 dias, o arquivo do dump como anexo da própria execução no GitHub Actions —
uma segunda rede de segurança, caso o segundo banco também esteja fora do ar no mesmo dia.

Não depende de nenhuma conta pessoal (Google Drive, etc.) — só de um segundo banco Postgres e
dos "Secrets" deste repositório no GitHub, que já é onde o código do sistema mora.

## Configuração (única vez)

### 1. Crie o segundo banco

Recomendado: **[Supabase](https://supabase.com)** (gratuito, inclui Postgres) — é uma empresa
diferente do Neon, então um problema no Neon (conta suspensa, pane, cobrança) não afeta o
Supabase, e vice-versa.

1. Crie uma conta e um projeto novo no Supabase (escolha uma região, ex.: São Paulo).
2. Em **Project Settings → Database → Connection string**, copie a URL no formato
   `postgresql://postgres:SENHA@HOST:5432/postgres` (use a versão "Session pooler" ou a
   conexão direta — qualquer uma funciona aqui, o workflow roda uma vez por dia, não precisa de
   pooling de alta concorrência).

Alternativa mais simples (mas com menos independência real): criar um **segundo projeto no
próprio Neon**. Protege contra erro humano/bug no banco de produção, mas não contra um problema
que afete a conta inteira do Neon.

### 2. Adicione os dois segredos no GitHub

No repositório, vá em **Settings → Secrets and variables → Actions → New repository secret** e
crie dois:

| Nome | Valor |
|---|---|
| `DATABASE_URL` | A mesma connection string do Neon de produção (a mesma que está na Vercel) |
| `DATABASE_URL_BACKUP` | A connection string do banco novo (Supabase ou o segundo projeto Neon) |

### 3. Teste manualmente

Vá na aba **Actions** do repositório, abra "Backup diário do banco" na lista à esquerda, clique
em **Run workflow**. Depois de ~1 minuto, confira se terminou com o ícone verde. Se der erro,
abra a execução e veja em qual passo — a mensagem já indica o que falta.

A partir daí ele roda sozinho, todo dia às 3h (horário de Brasília), sem precisar fazer nada.

## Se um dia for preciso restaurar

O segundo banco é uma cópia fiel do banco de produção de até 24h atrás — dá pra trocar a
`DATABASE_URL` da Vercel para apontar pra ele temporariamente, ou usar `pg_dump`/`psql` para
trazer os dados de volta pro Neon. Peça ajuda nessa hora; é melhor fazer com calma do que correndo.

Os **arquivos anexados** (imagens e PDFs, guardados no Vercel Blob) não fazem parte deste
backup — este workflow cobre só o banco de dados (os registros, não os arquivos em si).
