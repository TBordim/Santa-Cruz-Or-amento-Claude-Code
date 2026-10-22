# Ferramentas de gravação

Scripts que o Claude usa para gravar e testar os vídeos na **demo**. Nunca aponte para a produção.

| Script | O que faz |
|---|---|
| `ensaio-laboratorio.mjs` | Percorre o `gravacao.md` do Laboratório e confere 23 pontos da tela (números, mensagens, estados). Não grava vídeo. |
| `gravar-representante.mjs` | Grava, numa passada só, o fluxo do vídeo do Representante (login → Novo Orçamento → enviar), no ritmo da voz. `DRY=1` faz um ensaio sem enviar. Usa `cursor-gravacao.mjs`. |
| `abertura/abertura-express.html` e `renderizar-express.mjs` | Abertura do Santinho 2x mais rápida (3 s), para vídeos de 1 minuto. |
| `gravar-tomadas-laboratorio.mjs` | Grava as 14 tomadas em WebM 1280×720, com cursor visível e destaque de clique. |

Os dois criam dados na demo (a cor STA0005 e as rodadas dela), então:

1. **Antes:** reinicie a demo, na pasta `wt-demo`, com `npx dotenv -e .env.demo -- npx tsx prisma/seed-demo.ts`.
2. **Rode:** `node gravar-tomadas-laboratorio.mjs "<pasta de saída>"`. Para regravar só algumas tomadas, acrescente `"03,07"`. Precisa do `playwright-core` e do Chromium do Playwright instalados.
3. **Depois:** reinicie a demo de novo.

Por padrão os scripts usam a demo publicada (`BASE`, no começo de cada um). Para apontar para outra, defina `DEMO_URL` antes de rodar, por exemplo `DEMO_URL=http://localhost:3003 node ensaio-laboratorio.mjs`. Desde 01/10/2026 o ensaio confere 5 cores na lista, a página de entrada, o filtro de status e as sugestões da cena 6 (dados em `laboratorio/gravacao.md`, "Dados das sugestões").

## Regravar o vídeo do Representante (aprendido em 06/10/2026)

1. Na `wt-demo`: merge da `main` sem commit, `npx prisma generate`, `npm install` (a `main` ganhou o `pdf-lib`) e o seed (`npx dotenv -e .env.demo -- npx tsx prisma/seed-demo.ts`).
2. Sirva a demo em produção, **sem** `npm run build` (ele roda `prisma migrate deploy`): `npx dotenv -e .env.demo -- npx next build` e, depois, `AUTH_TRUST_HOST=true npx dotenv -e .env.demo -- npx next start -p 3003`. Sem `AUTH_TRUST_HOST` o login em `localhost` falha com `UntrustedHost`.
3. Grave com `gravar-representante.mjs` (ensaio com `DRY=1` antes). Ele precisa do `playwright-core`, que não está no repositório: instale numa pasta temporária e copie o script e o `cursor-gravacao.mjs` para lá. Atraso de até ~1 s em relação à voz é normal; o ritmo das ações foi calibrado para caber nos trechos da voz (deixar o cursor mais lento estoura os tempos).
4. Monte com `montagem/montar-representante.py`. Precisa de `faster-whisper` (se o `av` não abrir o MP3, decodifique antes com o ffmpeg), `imageio-ffmpeg`, os quadros da `abertura/renderizar-express.mjs`, `som-abertura.wav` (em `gravacoes/laboratorio`), os PNGs do Santinho (a partir de `assets/santinho.svg`) e o logo.
5. Depois: rode o seed de novo (a gravação cria um orçamento na demo).
