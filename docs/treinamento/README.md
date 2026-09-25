# Programa de Treinamento — App Sta Cruz

Kit de vídeos de treinamento, um por módulo, de 3 a 6 minutos, com legendas, para ver no
computador e no celular. Apresentado pelo mascote **Santinho**.

## Ordem dos vídeos

1. Laboratório: `laboratorio/`
2. Representante (Novo orçamento sem login)
3. Etapas internas do Orçamento

Não há vídeo de Administração.

## Santinho

- **Aparência:** corpo em losango laranja arredondado, com degradê de `#FFA646` a `#F47216`.
  Visual infantil, olhos grandes, bracinhos e perninhas curtos em marrom-escuro, e o símbolo
  oficial do logo da Santa Cruz em branco no peito.
- **Arte oficial:** [`assets/santinho.svg`](assets/santinho.svg), na pose "feliz, acenando". A
  arte mostra:
  - braços, pernas e sapatos em marrom `#4A2208` / `#3A1905`;
  - sobrancelhas;
  - bochechas rosadas;
  - boca aberta sorrindo;
  - brilho no canto superior esquerdo do corpo.

  As outras expressões (neutro, explicando, apontando, alerta, comemorando) ainda precisam ser
  desenhadas a partir desta base.
- **Nome na tela:** quando o Santinho aparece, o nome "Santinho" surge em cima dele, com as
  letras pulando uma a uma. O estilo segue o do personagem:
  - fonte Fredoka 700 (arredondada, gratuita);
  - degradê laranja `#FFC27A → #FFA646 → #F47216 → #DA5E0C`;
  - contorno marrom `#4A2208` e sombra 3D `#9A430A`;
  - **o "t" é uma cruz** com o mesmo estilo, em referência à Santa Cruz.

  O nome some ao fim da primeira frase da fala.
- **Som da abertura:** `gravacoes/laboratorio/som-abertura.wav`, sintetizado, sem direitos de
  terceiros. Tem um acorde com "plim-plim" na vinheta, vento girando no tornado e um sininho
  quando o Santinho aparece. A voz entra em 5,4 s.
- **Voz:** masculina, calorosa, português do Brasil.
- **Personalidade:** simpático e bem-humorado, mas sempre trata a equipe como adultos
  competentes. O humor é pontual, nunca em toda frase. As piadas são do mundo gráfico (papel,
  tinta, vinco, dobra, bobina, prova de cor) e nunca ridicularizam o usuário.
- **Expressões:** neutro, feliz, explicando, apontando, alerta (erros comuns), comemorando.
- **Bordões:**
  - Abertura: "Olá! Eu sou o Santinho, e hoje a gente vai colocar esse módulo no papel!"
  - Alerta: "Opa, cuidado aqui, que esse erro borra a impressão!"
  - Encerramento: "Pronto, tudo impresso e aprovado. Agora é com você!"

## Regras de todos os vídeos

- **Abertura padrão (cerca de 8 s), igual em todos os vídeos:**
  1. Tela de texto opcional: o uso do app é padrão da empresa.
  2. Vinheta: logotipo completo da Santa Cruz, "Programa de Treinamento" e o nome do módulo.
  3. Transformação: o logotipo gira como um **pequeno tornado laranja** e se condensa no
     Santinho, que aterrissa acenando e começa a apresentação. Anima-se uma vez e reaproveita-se,
     trocando só o nome do módulo.
- **Nenhuma pessoa real aparece**, nem em imagem nem em voz. O único apresentador é o Santinho.
- **Só dados fictícios**, gravados no ambiente de demonstração (`00-ambiente-demo.md`).
- **Tudo o que é dito sobre o sistema vem do código.** Dúvidas ficam marcadas `[CONFIRMAR]`.

## Arquivos por módulo

`mapa-do-modulo.md` → `roteiro.md` → `gravacao.md` → `narracao.txt` + `legendas.srt` → `quiz.json`
