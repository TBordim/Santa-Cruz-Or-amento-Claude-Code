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
