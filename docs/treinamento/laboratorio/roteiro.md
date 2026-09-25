# Roteiro: Módulo Laboratório

**Versão 1 (25/09/2026).** Baseado no [mapa do módulo, versão 3](mapa-do-modulo.md).

| | |
|---|---|
| **Duração** | 5 min 58 s (5 min 54 s sem o aviso opcional da cena 0a) |
| **Narração** | cerca de 670 palavras, a 130 palavras por minuto, o que dá uns 5 min 10 s de fala; o resto é ação na tela |
| **Público** | Laboratório e Engenharia (vídeo inteiro) e Produção (cenas 3 e 12) |
| **Apresentador** | só o Santinho. Nenhuma pessoa real aparece nem fala |
| **Legendas** | sempre ligadas |

---

## Dados da gravação (todos fictícios)

Estes valores precisam existir no ambiente demo (ver `00-ambiente-demo.md`). Os ΔE foram
calculados com a própria função do app, então a tela vai mostrar exatamente estes números.

| Item | Valor |
|---|---|
| Usuário | **Ana Laboratório**, PIN **1111**, permissão Laboratório |
| Cores que já existem no seed | STA0001 Pet Feliz Rações (Em desenvolvimento) · STA0002 Café Vale do Sol (Aprovado) · STA0003 Farmacêutica Boa Saúde (Aprovado) · STA0004 Cosméticos Lírio do Campo (Em desenvolvimento) |
| Cor criada ao vivo | **STA0005**, o próximo código que o sistema gera |
| Cliente | Doces Serra Azul Ltda. |
| Referência / tipo | LARANJA P. 1665 / Amostra do cliente |
| LAB alvo | L* 52 · a* 58 · b* 32 |
| Substrato / acabamento | Cartão duplex 300 g/m² / Verniz UV brilho |
| Rodada 1 (Fórmula do fornecedor) | IRO21 Orange 45,00 · IRO33 Warm Red 30,00 · IRO48 Transparent White 25,00 |
| Puxada da rodada 1 | L* 50,2 · a* 61,5 · b* 36,8 → **ΔE 2,59** (vermelho) |
| Rodada 2 (Ajuste nosso) | IRO21 44,00 · IRO33 28,50 · IRO48 27,50 |
| Puxada da rodada 2 | L* 51,6 · a* 58,9 · b* 33,1 → **ΔE 0,59** (dentro da meta) |
| Produção | STA0005, 25 kg → IRO21 11,000 · IRO33 7,125 · IRO48 6,875 kg |

Leitura do eixo LAB na rodada 1: a puxada ficou **mais vermelha** (a* 61,5 contra 58), **mais
amarela** (b* 36,8 contra 32) e **mais escura** (L* 50,2 contra 52). A seta aponta para menos
vermelho e menos amarelo, e a régua de L* mostra a tinta abaixo do alvo. O ajuste da rodada 2
tira um pouco de laranja e de vermelho e põe mais branco.

---

## Roteiro

| Cena | Tempo | Fala do Santinho | O que aparece na tela | Ação a gravar | Expressão/pose |
|---|---|---|---|---|---|
| **0a · Aviso** (opcional) | 0:00–0:04 | *(sem fala)* | Texto em tela, fundo neutro: "O App Sta Cruz é a ferramenta oficial da Santa Cruz para registrar o trabalho de cada área." | — | — |
| **0b · Vinheta** | 0:04–0:07 | *(sem fala; trilha começa)* | Logotipo completo da Santa Cruz (símbolo laranja + "santa cruz" + "Indústria Gráfica") no centro. Embaixo: "Programa de Treinamento · Módulo Laboratório" | — | — |
| **0c · Transformação** | 0:07–0:12 | *(sem fala; a trilha sobe e termina num "plim")* | O logotipo começa a girar e vira um **pequeno tornado laranja**. As letras cinza e o texto da vinheta são puxados para dentro do redemoinho. O giro desacelera e se condensa no **losango laranja arredondado**; o símbolo branco pousa no peito; os olhos se abrem; bracinhos e perninhas aparecem. O Santinho aterrissa e acena | — | nascendo → feliz, acenando (arte oficial) |
| **1 · Abertura** | 0:12–0:30 | Olá! Eu sou o Santinho, e hoje a gente vai colocar esse módulo no papel! Em poucos minutos, você vai cadastrar uma cor, registrar fórmulas e puxadas, aprovar a rodada certa e calcular a tinta de um lote na Produção. | O Santinho recém-formado, em tela cheia; ao fundo, a tela Início do Laboratório desfocada | — | feliz, acenando (arte oficial) |
| **2 · Visão geral** | 0:30–0:53 | O módulo Laboratório é a bancada digital de desenvolvimento de cor. Quem é do Laboratório ou da Engenharia registra tudo: a cor, as fórmulas testadas e as leituras. Quem produz entra para consultar a fórmula aprovada e calcular o lote. Tudo num lugar só, com histórico. | Diagrama simples: Cor → Rodadas → Puxada → Aprovação → Produção. Santinho no canto | — | explicando |
| **3 · Chegando ao módulo** *(Produção também)* | 0:53–1:11 | Depois de entrar com seu nome e seu PIN, o app abre no Orçamento. Para chegar aqui, use o campo Módulo, no topo do menu, e escolha Laboratório. No Início, você tem dois atalhos: Cor e Produção. | Painel do Orçamento → clique no seletor "Módulo" → Laboratório → tela Início com os cartões Cor e Produção | Login como Ana; abrir o seletor Módulo; escolher Laboratório | apontando (para o seletor) |
| **4 · Lista de cores** | 1:11–1:31 | Em Cor fica a lista de todas as cores. Ela não segue a ordem dos números: é como a pilha de provas na mesa, a última mexida fica por cima. Para achar uma cor, use a busca. Vale código, cliente ou referência. | Tela Cor; destaque na coluna Código e no campo de busca; busca por "café" | Clicar em Cor; digitar "café" na busca; clicar em Limpar | explicando (sorriso no trocadilho) |
| **5 · Nova cor** | 1:31–2:00 | Para cadastrar, use o quadro Nova cor. O código você não digita: o sistema gera o próximo número sozinho. Preencha o cliente, a referência e o tipo. E o mais importante: o LAB alvo. São três valores, L, a e b. Ou você preenche os três, ou deixa os três em branco. Depois, é só clicar em Criar cor. | Quadro Nova cor; zoom no Código travado (STA0005); zoom nos 3 campos do LAB alvo | Preencher os dados da gravação; clicar em Criar cor | apontando (Código travado) → explicando |
| **6 · Primeira fórmula** | 2:00–2:31 | Pronto: essa é a bancada da cor, com tudo sobre ela numa tela só. Vamos registrar a primeira fórmula. Escolha a origem, aqui Fórmula do fornecedor, e adicione as tintas com o percentual de cada uma. A soma precisa fechar em 100% exatos. Enquanto não fecha, aparece um alerta ao lado do total. Clique em Salvar rodada. | Bancada da STA0005 → quadro "Registrar a primeira fórmula"; zoom no total com ⚠ que some ao chegar em 100,00% | Origem: Fórmula do fornecedor; 3 tintas da rodada 1 (digitar a última devagar, para o ⚠ sumir na tela); Salvar rodada | explicando |
| **7 · Puxada** | 2:31–2:51 | Hora da puxada no Quick Peek. Aqui você registra só o melhor LAB, o mais perto do alvo. Digite L, a e b e clique em Registrar puxada. Digitou errado? É só corrigir: o valor novo substitui o antigo. | Cartão da Rodada 1; campos L*, a*, b* da puxada | Digitar a puxada da rodada 1; Registrar puxada | explicando |
| **8 · ΔE e eixo LAB** | 2:51–3:26 | Agora a bancada mostra o resultado. O ΔE dessa rodada ficou em 2,59, em vermelho, porque a meta é abaixo de 1. No eixo LAB, a mira é o alvo e a bolinha é a sua puxada. A seta mostra o caminho: aqui, menos vermelho e menos amarelo. E a régua ao lado mostra que a tinta ficou um pouco escura. A seta dá a direção; quanto mudar, é com você. | Zoom em "R1: 2,59" em vermelho → zoom no eixo LAB (mira, bolinha, seta) → zoom na régua de L* | Rolar até o eixo LAB; pausar na seta | alerta (no vermelho) → apontando (na seta) |
| **9 · Novo ajuste** | 3:26–3:51 | Vamos ajustar. O quadro Novo ajuste já vem com a fórmula da rodada anterior: mude só o que precisa. Aqui, um pouco menos de laranja e de vermelho, e mais branco. Salve, faça a puxada e registre. Olha só: 0,59. Dentro da tolerância! | Quadro "Novo ajuste — rodada 2" já preenchido → cartão da Rodada 2 → "R1: 2,59 → R2: 0,59" com 0,59 em verde | Alterar para a rodada 2; Salvar rodada; puxada da rodada 2; Registrar puxada | explicando → comemorando |
| **10 · Aprovar** | 3:51–4:11 | Chegou na cor? Clique em Aprovar esta rodada. Atenção: o botão não pede confirmação, e a cor passa na hora para Aprovado. Um ΔE acima de 1 até pode ser aprovado, mas fica em vermelho, para todo mundo ver. | Botão "Aprovar esta rodada" com "ΔE 0,59 — dentro da tolerância" → selo Aprovada → Status: Aprovado | Clicar em Aprovar esta rodada (Rodada 2) | alerta (sem confirmação) → feliz |
| **11 · Corrigir** | 4:11–4:33 | Errou algum dado? Editar dados corrige o cadastro, menos o código, que é fixo. O lápis corrige a fórmula de uma rodada, e a lixeira exclui. Cuidado: excluir a rodada aprovada devolve a cor para Em desenvolvimento, e ela sai da Produção. | Botão Editar dados aberto (Código travado) → Cancelar; lápis e lixeira destacados; janela "Excluir a rodada 2?" aberta | Abrir Editar dados e cancelar; passar o mouse no lápis; abrir a lixeira da Rodada 2 e clicar em **Cancelar** (não excluir) | explicando → alerta |
| **12 · Produção** *(Produção também)* | 4:33–4:58 | Agora, a Produção. No menu, clique em Produção, digite o código completo da cor e busque. Informe quantos quilos vai produzir, por exemplo 25, e o app calcula na hora quanto de cada tinta usar. Só aparecem cores aprovadas. | Tela "Calculadora de produção" → STA0005 → tabela com % e kg | Menu Produção; digitar "sta0005" (para mostrar que minúsculas funcionam); Buscar; digitar 25 no campo kg | explicando → feliz |
| **13 · Erros comuns** | 4:58–5:28 | Opa, cuidado aqui, que esse erro borra a impressão! Os deslizes mais comuns: preencher só parte do LAB alvo, fórmula que não fecha em 100%, a mesma tinta em duas linhas e, na Produção, digitar só parte do código. Em todos esses casos, o app avisa. Leia a mensagem e corrija. | Montagem rápida com as 4 mensagens reais: "Preencha os 3 valores do LAB alvo…", "A soma dos percentuais precisa fechar em 100,00% — está em 99,50%.", "A tinta IRO33 aparece em mais de uma linha…", "Nenhuma cor encontrada com o código "0005"." | Gravar cada erro separado (ver `gravacao.md`, Fase 3) | alerta |
| **14 · Recapitulação** | 5:28–5:48 | Recapitulando: um, cadastre a cor com o LAB alvo completo. Dois, registre cada rodada com a melhor puxada, e use o ΔE e a seta para ajustar. Três, aprove a rodada certa, e a Produção calcula o lote. | 3 cartões em tela, um por ponto, entrando junto com a fala | — | explicando (contando nos dedos) |
| **15 · Encerramento** | 5:48–5:58 | Pronto, tudo impresso e aprovado. Agora é com você! Responda o quiz a seguir e mostre que já domina o Laboratório. | Santinho em tela cheia; chamada "Quiz do Laboratório" | — | comemorando |

---

## Versão curta para a Produção (opcional)

Para quem só produz, dá para montar um corte de **cerca de 1 min** com a vinheta, a cena 3 e a
cena 12, mais uma abertura e um encerramento curtos. Os textos desse corte ficam para a Fase 4,
se você quiser.

## Notas de produção

- **Celular:** os campos do app são pequenos. Nas cenas 5 a 12, use **zoom** na área de ação,
  para ficar legível na tela do celular.
- **Santinho:** fica no canto inferior direito durante a gravação de tela, sem cobrir campos nem
  botões. Nas cenas 1, 2, 13, 14 e 15 ele fica em destaque.
- **Expressões novas:** o roteiro usa neutro, explicando, apontando, alerta e comemorando. Hoje só
  existe a arte "feliz, acenando", então as outras precisam ser desenhadas.
- **Transformação (cena 0c):** é a abertura padrão de **todos** os vídeos, junto com a vinheta.
  Basta animar uma vez e reaproveitar, trocando só o nome do módulo no texto da vinheta. Depois
  de formado, o Santinho está exatamente como na arte oficial (`assets/santinho.svg`).
- **Humor:** só dois momentos leves, a pilha de provas (cena 4) e a comemoração do 0,59 (cena 9),
  além dos bordões.
- **Números na fala:** aqui estão escritos como aparecem na tela. O `narracao.txt` (Fase 4) vai
  escrevê-los por extenso, do jeito falado ("dois vírgula cinquenta e nove").
