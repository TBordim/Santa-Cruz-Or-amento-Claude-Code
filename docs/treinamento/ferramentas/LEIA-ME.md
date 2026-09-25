# Ferramentas de gravação

Scripts que o Claude usa para gravar e testar os vídeos na **demo**. Nunca aponte para a produção.

| Script | O que faz |
|---|---|
| `ensaio-laboratorio.mjs` | Percorre o `gravacao.md` do Laboratório e confere 23 pontos da tela (números, mensagens, estados). Não grava vídeo. |
| `gravar-tomadas-laboratorio.mjs` | Grava as 14 tomadas em WebM 1280×720, com cursor visível e destaque de clique. |

Os dois criam dados na demo (a cor STA0005 e as rodadas dela), então:

1. **Antes:** reinicie a demo, na pasta `wt-demo`, com `npx dotenv -e .env.demo -- npx tsx prisma/seed-demo.ts`.
2. **Rode:** `node gravar-tomadas-laboratorio.mjs "<pasta de saída>"`. Para regravar só algumas tomadas, acrescente `"03,07"`. Precisa do `playwright-core` e do Chromium do Playwright instalados.
3. **Depois:** reinicie a demo de novo.

O endereço da demo está fixo no começo de cada script (`BASE`).
