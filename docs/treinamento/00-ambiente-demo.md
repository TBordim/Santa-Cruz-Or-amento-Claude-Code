# Fase 0 — Ambiente de demonstração (plano, ainda não implementado)

Objetivo: ter uma cópia do App Sta Cruz com dados fictícios, separada da produção, para gravar
os vídeos de treinamento sem expor cliente, preço ou fórmula real e sem risco de alterar
nada em produção.

## Arquitetura proposta

| Peça | Produção (hoje) | Demonstração (novo) |
|---|---|---|
| Branch do Git | `main` | `demo` (criada a partir da `main`, nunca volta para ela) |
| Endereço | domínio de produção da Vercel | URL de preview fixa da branch: `<projeto>-git-demo-<conta>.vercel.app` |
| Banco | Neon, banco de produção | Neon, **banco novo e vazio** `santacruz_demo` |
| `AUTH_SECRET` | o de produção | um **novo**, para login de produção não valer na demo e vice-versa |
| Anexos (Blob) | store de produção | store separado, ou nenhum, porque o Laboratório não usa anexos |
| Dados | reais | só fictícios, criados pelo script `seed-demo` |

Por que banco novo e vazio, e não uma cópia (branch do Neon) da produção: uma cópia leva
junto clientes, preços e fórmulas reais. Um banco vazio recebe as tabelas pelas migrações do
próprio build. A migração `20260923120000_seed_bases_cor` já cria o catálogo de bases IRO
sozinha. Esse catálogo é informação pública do fornecedor, não dado de cliente.

## Resultado da verificação (24/09/2026, só leitura, pelo conector da Vercel)

**Status: aprovado pelo Thiago em 24/09/2026.**

- **Plano:** Hobby, conta pessoal `tbordim`. Projeto `santa-cruz-or-amento-claude-code`.
- **Banco:** Neon ligado pela integração do Marketplace da Vercel (store
  `santa-cruz-orcamentos`). As variáveis foram recriadas em 24/09 por volta das 11h30 (horário
  de Brasília). **Todas as variáveis do Neon (`DATABASE_URL` e as outras) valem para Production
  e Preview.**
- **`AUTH_SECRET`:** o mesmo valor para Production e Preview.
- **Blob:** o token tem uma entrada para Production e outra para Preview, mas o
  `BLOB_STORE_ID` é o mesmo nos dois. Anexos enviados num preview vão para o store de produção.
- **Previews já feitos:** a branch `feat/modulo-laboratorio-cor` teve 7 previews entre 22 e
  24/09. Não dá para saber qual banco eles usaram, porque as variáveis foram recriadas depois do
  último. Hoje não há nada pendente: tudo o que essa branch migrou já está na `main`.
- **Conclusão:** o risco 1 está **confirmado para o futuro**. O próximo push de qualquer branch
  com migração nova altera o banco de produção.

## ✅ Demo pronta (25/09/2026)

**Endereço:** https://santa-cruz-or-amento-claude-code-git-demo-tbordim.vercel.app

- Login: **Ana Laboratório**, PIN **1111**. Também existem Bruno Engenharia (2222), Carla
  Produção (3333) e Demo Admin (9999).
- O ensaio completo do vídeo do Laboratório foi rodado **no endereço publicado**: 23 de 23
  verificações certas. Depois o seed foi rodado de novo, para a demo voltar ao início.
- **Para regravar do zero** (Claude ou quem estiver no computador), na pasta `wt-demo`:
  `npx dotenv -e .env.demo -- npx tsx prisma/seed-demo.ts`

### Como a demo funciona de verdade (descoberto em 25/09)

- A integração do Neon cria **uma branch de banco para cada branch de preview**
  (`preview/<branch>`), copiada da produção, e troca o servidor do `DATABASE_URL` pelo dela.
  **Os previews não tocam no banco de produção.** O risco 1 abaixo não se aplica desde que a
  integração foi reinstalada, em 24/09.
- A demo usa o banco **`santacruz_demo` da branch Neon `preview/demo`**. É para esse banco que
  as variáveis da branch `demo` apontam, com o servidor trocado pelo Neon.
- O `neondb` da branch `preview/demo` é **uma cópia dos dados reais** feita pelo Neon. A demo não
  usa esse banco, e ninguém deve gravar nele nem mostrá-lo.
- O `santacruz_demo` criado na branch **principal** do Neon, a da produção, está vazio e sem
  uso. Pode ser apagado.
- **Detalhe técnico:** um "Redeploy" herda as variáveis do deploy antigo. Para pegar variáveis
  novas, é preciso fazer um deploy novo a partir do Git.

## Andamento (25/09/2026, histórico)

**Pronto:**
- A branch `demo` foi criada a partir do Laboratório, com a `main` incorporada. Ela está só no
  computador do Thiago, na pasta `wt-demo`.
- `prisma/seed-demo.ts`:
  - recria 4 usuários e as cores STA0001–STA0004;
  - a trava de segurança recusou o banco local de sempre;
  - o seed foi rodado duas vezes seguidas, com o mesmo resultado.
- **Teste completo do roteiro** num Postgres local separado: 23 verificações, todas certas. Entre
  elas: o código STA0005, o ΔE 2,59 → 0,59, o "Ajuste nosso", as mensagens de erro e o cálculo
  11,000 / 7,125 / 6,875 kg.
- `wt-demo/.env.demo` foi criado (fora do Git), à espera da connection string do banco da demo.

**Falta, na ordem:**
1. **Neon (Thiago):** criar o banco `santacruz_demo` e copiar a connection string para o
   `wt-demo/.env.demo`. **Nunca colar no chat.**
2. **Vercel (Thiago):** criar `DATABASE_URL` e `AUTH_SECRET` para **Preview**, branch `demo`.
   Se a Vercel recusar o `DATABASE_URL` por conflito com a variável da integração do Neon, a
   alternativa é tirar o Preview da conexão do Neon (Storage) e depois criar a variável.
3. **Push da branch `demo` (Thiago):** `git push -u origin demo`. O build da Vercel aplica as
   migrações no banco da demo.
4. **Seed (Claude):** `npx dotenv -e .env.demo -- npx tsx prisma/seed-demo.ts`, rodado na pasta
   `wt-demo`.
5. **Conferir:** abrir o endereço do preview da branch `demo`. A lista de nomes do login precisa
   mostrar **só** Ana Laboratório, Bruno Engenharia, Carla Produção e Demo Admin. Se aparecer
   qualquer nome real, **pare**: o preview está no banco de produção.

## Passo a passo

### A. Verificações na Vercel (feito, ver acima)

1. Abra vercel.com → o projeto do app → **Settings → Environment Variables**.
2. Para `DATABASE_URL`, `AUTH_SECRET` e `BLOB_READ_WRITE_TOKEN`, veja em quais ambientes cada
   uma está marcada: **Production**, **Preview**, **Development**. Os valores ficam ocultos, então
   um print dessa tela é seguro e resolve.
3. **Settings → Git**: confirme que a *Production Branch* é `main`.
4. **Storage**: veja se o Neon aparece como integração ligada ao projeto.
5. **Settings → Deployment Protection**: anote o que está marcado.
6. Canto superior esquerdo: o nome do plano, **Hobby** ou **Pro**.

### B. Criar o banco da demo (você faz, eu guio com prints)

1. Pelo painel do Neon (ou Vercel → Storage → Neon), crie um banco novo chamado
   `santacruz_demo`. Pode ser no mesmo projeto do Neon.
2. Copie a *connection string* dele. **Não cole aqui no chat.** Eu digo onde colar.

### C. Variáveis de ambiente da branch `demo` (você faz na Vercel)

Em **Settings → Environment Variables**, adicione, marcando só **Preview** e escolhendo a
branch `demo` no campo *Git Branch*:

- `DATABASE_URL` = connection string do `santacruz_demo`
- `AUTH_SECRET` = valor novo (eu gero o comando para você)
- `BLOB_READ_WRITE_TOKEN` = token de um Blob store novo (opcional agora; só será necessário
  quando gravarmos a parte de anexos do Orçamento)

Uma variável definida para uma branch específica vale no lugar da variável geral de Preview,
então a branch `demo` passa a usar o banco da demo mesmo com a integração do Neon ligada ao
Preview. Depois do primeiro deploy, confirmo que funcionou olhando se a demo abre vazia, com a
tela de "criar primeiro administrador".

**Decisão separada, sua:** proteger a produção dos previews das **outras** branches. Hoje o
Claude Code testa as funcionalidades novas em previews que usam o banco de produção. Há duas
opções:
- (a) Em Storage → `santa-cruz-orcamentos` → aba do projeto, tirar o **Preview** da conexão.
  Os previews das branches de funcionalidade passam a falhar no build, por não terem banco,
  até que eu aponte todos para o banco da demo.
- (b) Apontar o Preview inteiro para o banco da demo. Os testes de funcionalidade passam a rodar
  com dados fictícios. **Recomendo esta.**

### D. Código (eu faço, só depois da sua aprovação, na branch `demo`)

1. Criar a branch `demo` a partir da `main`.
2. Criar `prisma/seed-demo.ts`:
   - **Apaga e recria** todos os dados fictícios, para cada gravação começar do mesmo ponto.
     Isso permite regravar uma cena quantas vezes for preciso.
   - **Trava de segurança:** recusa rodar se o nome do banco no `DATABASE_URL` não contiver
     `demo`. Assim é impossível rodar contra a produção por engano.
   - Usa a mesma função de ΔE2000 do app (`src/lib/cor`) para os valores exibidos baterem
     com o que o sistema calcula.
3. Testar tudo primeiro num Postgres local (`npx prisma dev`), sem tocar em nada na nuvem.
4. Fazer push da branch `demo`. A Vercel faz o build, o build roda as migrações no banco
   `santacruz_demo`, e eu rodo o seed contra ele.
5. Entrar com cada usuário demo e conferir as telas.

Nada disso entra na `main`. Quando o app evoluir, eu trago a `main` para dentro da `demo`
(`git merge main`) antes de gravar, nunca o contrário.

## Usuários demo

O login do app é "escolher o nome na lista + PIN", então os nomes aparecem na gravação.

| Nome na lista | Perfil demo | Pode editar | PIN | Usado em |
|---|---|---|---|---|
| Ana Laboratório | Laboratório (demo) | `COR_LABORATORIO` | 1111 | vídeo do Laboratório |
| Bruno Engenharia | Engenharia de cor (demo) | `COR_ENGENHARIA` | 2222 | vídeo do Laboratório |
| Carla Produção | Consulta (demo) | nada, só vê | 3333 | parte "Produção" do Laboratório |
| Demo Admin | Administrador | tudo | 9999 | só para preparar o ambiente, não aparece nos vídeos |
| (sem login) | Representante | Novo orçamento | — | vídeo do representante |

Os perfis dos vídeos de Orçamento entram depois, quando chegarmos neles. Os PINs só existem
no banco da demo.

## Dados fictícios (primeiro lote: Laboratório)

- **Clientes inventados:** Doces Serra Azul, Café Vale do Sol, Farmacêutica Boa Saúde,
  Cosméticos Lírio do Campo, Pet Feliz Rações.
- **Quatro cores, STA0001 a STA0004,** com status que o app consegue produzir:
  - STA0001 Pet Feliz Rações (Em desenvolvimento);
  - STA0002 Café Vale do Sol (Aprovado);
  - STA0003 Farmacêutica Boa Saúde (Aprovado);
  - STA0004 Cosméticos Lírio do Campo (Em desenvolvimento).

  O código agora é gerado pelo sistema, então a cor criada ao vivo no vídeo sai como **STA0005**.
  Como o banco da demo é separado, não há risco de confundir essas cores com as reais. *(Antes
  o plano era usar STA9001 em diante; mudou com o código automático.)*
- **Rodadas** com fórmulas de bases IRO somando 100%, LAB alvo, puxadas com o ΔE caindo a cada
  rodada (ex.: 3,42 → 1,35 → 0,71) e uma rodada aprovada, que a tela Produção vai usar.
- *Removido depois do mapa da Fase 1:* interações com fornecedor e leituras de produção. Elas
  existem no banco, mas não têm tela, e mostrá-las confundiria quem assiste.
- **Uma cor "limpa" para cada ação a gravar**, deixada no estado exatamente anterior à ação
  (ex.: cor recém-criada sem rodada, para gravar o cadastro da primeira rodada ao vivo).
- **Segundo lote, para o vídeo do representante:** alguns orçamentos fictícios em etapas
  diferentes, para o painel não aparecer vazio.

Os detalhes exatos saem do mapa da Fase 1, que vai mostrar quais campos cada tela exige.

## Riscos

1. **Preview migrando a produção (o mais sério).** O build roda `prisma migrate deploy`. Se
   o `DATABASE_URL` de produção estiver marcado para Preview, todo push de qualquer branch
   aplica as migrações dela **no banco de produção**, antes mesmo de ela ir para a `main`.
   Pode já estar acontecendo com a branch `feat/modulo-laboratorio-cor`. O passo A confirma.
   A correção é o passo C.
2. **Seed rodado no banco errado.** Mitigado pela trava do nome `demo` no banco.
3. **Demo desatualizada.** Se a `main` mudar e a `demo` não, o vídeo mostra telas velhas.
   Mitigado pelo `git merge main` antes de cada gravação.
4. **Link da demo acessível.** A URL de preview é pública se a proteção de deploy estiver
   desligada, mas só tem dados fictícios. Se estiver ligada, só quem tem login na Vercel
   abre. Tudo bem para você gravar, mas representantes não conseguiriam praticar nela.
   Decidimos isso depois.
5. **Limites do plano gratuito** do Neon e da Vercel. Um banco a mais normalmente cabe.
   `[CONFIRMAR]` depois de ver o plano no passo A. Observação: o plano Hobby da Vercel é, pelos
   termos dela, para uso não comercial. Vale saber em qual plano o app está.

## O que eu preciso de você

1. O print (ou a descrição) do passo A.
2. Aprovação deste plano, ou ajustes (nomes dos usuários, clientes fictícios etc.).
