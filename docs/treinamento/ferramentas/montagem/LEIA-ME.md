# Montagem do vídeo (usado no Laboratório, 25/09/2026)

Pipeline que o Claude usou para montar `VIDEO-Laboratorio-completo-v2.mp4` (5 min 12 s):

1. **Voz:** narração da ElevenLabs (Nassif, velocidade 0,80). `transcrever.py` (faster-whisper,
   modelo `small`) dá o tempo de cada palavra. O áudio é cortado entre a última palavra de uma
   cena e a primeira da seguinte, e depois recebe +2 semitons
   (`asetrate=44100*2^(2/12),aresample=44100,atempo=1/2^(2/12)`).
2. **Legendas:** texto de tela do `roteiro.md`, com o tempo tirado das palavras da transcrição,
   sem sobreposição.
3. **Cenas animadas em HTML**, renderizadas quadro a quadro (`render-html.mjs` e `render-previa.mjs`):
   - `previa.html`: abertura com a vinheta, o tornado do logo, o Santinho com o nome (cruz no
     "t") e a cena 1;
   - `cena02.html`: diagrama "Do alvo ao lote";
   - `especiais.html`, com um modo por cena: zoom da cena 8, erros da cena 13, recapitulação da
     cena 14 e encerramento com o quiz da cena 15.
4. **Cenas de tela:** tomada acelerada até caber na voz, tela a 85% com moldura, o Santinho numa
   coluna à esquerda e a legenda numa faixa própria (ASS).
5. **Final:** `montar-completo.py` junta tudo. O áudio é normalizado com `loudnorm=I=-16`.

Dependências (instaladas pelo Claude numa pasta temporária): `playwright-core` com o Chromium,
`imageio-ffmpeg` (ffmpeg completo) e `faster-whisper`.
