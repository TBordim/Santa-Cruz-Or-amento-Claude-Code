# Roteiro: Representante, Novo Orçamento (vídeo de 1 minuto)

**Versão 1 (02/10/2026).** Baseado no código da `main` até o commit `8b21ddc` (Novo Orçamento com login,
busca de cliente e campos obrigatórios).

| | |
|---|---|
| **Duração** | cerca de 54 s (meta: **menos de 1 min**) |
| **Narração** | 101 palavras. Na voz usada nos outros vídeos (cerca de 150 palavras por minuto), dá uns 40 s de fala, mais as pausas entre as cenas |
| **Público** | Representantes comerciais. Só abrem o Novo Orçamento; não veem Painel nem outros módulos |
| **Apresentador** | só o Santinho. Nenhuma pessoa real aparece nem fala |
| **Legendas** | sempre ligadas |
| **Como o representante recebe** | por **link enviado fora do app**. O representante não entra no módulo Treinamentos (o app o leva direto ao Novo Orçamento) |

**Ideia do vídeo:** o representante tem pressa. Sem explicar o sistema, sem humor longo: mostra o caminho
mais curto para mandar um pedido (entrar, cliente, entrega, produto, enviar) e tranquiliza sobre o que ele
**não** precisa saber (detalhes técnicos).

---

## Dados da gravação (todos fictícios)

Estes valores precisam existir no ambiente demo (ver `gravacao.md`, "Dados e preparo da demo").

| Item | Valor |
|---|---|
| Usuário | **Rafael Representante**, PIN **4444**, perfil Representante (só a área Novo Orçamento) |
| Cliente (na busca) | **Doces Serra Azul Ltda.** · CNPJ 11.222.333/0001-81. Digitando "doces" a lista mostra 2 clientes |
| Qtd. de entregas | `1` |
| Data de entrega solicitada pelo cliente | `30/11/2026` |
| Descrição do produto | `Caixa para bolo 20 x 20 x 10 cm` |
| Quantidades a orçar | `5000` e `10000` |
| Detalhes técnicos | **não preencher** (a seção fica recolhida) |

---

## Roteiro

| Cena | Tempo | Fala do Santinho | O que aparece na tela | Ação a gravar | Pose |
|---|---|---|---|---|---|
| **0 · Abertura express** | 0:00–0:03 | *(sem fala; som de entrada)* | Logo da Santa Cruz → mini tornado laranja → Santinho. Sem aviso e sem texto de vinheta; só "Representantes" pequeno embaixo do logo | — | nascendo → feliz, acenando |
| **1 · Boas-vindas** | 0:03–0:09 | Olá! Eu sou o Santinho. Em um minuto, você aprende a pedir um orçamento! | Santinho em tela cheia com o texto "Novo Orçamento em 1 minuto" | — | feliz, acenando |
| **2 · Entrar** | 0:09–0:15 | Entre com seu nome e seu pin. O Novo Orçamento já abre para você. | Tela de login → nome → PIN → Entrar → formulário "Novo Orçamento" | Login como Rafael | apontando |
| **3 · Cliente** | 0:15–0:26 | Comece pelo cliente: digite o nome ou o cê ene pê jota, e escolha na lista. Se ele for novo, clique em cadastrar novo. | Seção Cliente: campo "Buscar cliente cadastrado", lista com 2 resultados, cliente escolhido ("Cliente do cadastro: Doces Serra Azul Ltda."); o botão "Cliente não está na lista — cadastrar novo" destacado | Digitar "doces"; clicar no 1º resultado; passar o mouse no botão de cadastrar novo (**sem clicar**) | explicando |
| **4 · Entrega e produto** | 0:26–0:38 | Informe quantas entregas e a data que o cliente pediu. Depois, descreva o produto e coloque as quantidades a orçar. | Campos "Qtd. de entregas (obrigatório)" e "Data de entrega solicitada pelo Cliente (obrigatório)"; depois "Descrição do produto" e "Quantidades a orçar (obrigatório)" com 2 quantidades | Preencher entregas e data; descrição; quantidade 5000; Adicionar quantidade; 10000 | explicando |
| **5 · Detalhes técnicos** | 0:38–0:44 | Detalhes técnicos são opcionais. Não sabe? Deixe em branco, que a Engenharia analisa. | Seção "Detalhes técnicos (toque para abrir)", recolhida, com a frase "Se não tiver, deixe em branco" destacada | Rolar até a seção e passar o mouse; **não abrir** | apontando |
| **6 · Enviar** | 0:44–0:49 | Pronto! Clique em Enviar solicitação, e a Santa Cruz segue daqui. | Botão "Enviar solicitação" → cartão "Solicitação enviada" | Clicar em Enviar solicitação | comemorando |
| **7 · Fecho** | 0:49–0:54 | Foi rápido, né? Bons negócios! | Santinho em destaque + logo da Santa Cruz | — | feliz |

---

## Se passar de 1 minuto

Cortes, em ordem (do que menos faz falta):
1. Cena 5: tirar a fala inteira e deixar só o destaque na tela (−5 s).
2. Cena 3: tirar "Se ele for novo, clique em cadastrar novo" (−2 s).
3. Cena 1: reduzir a "Olá! Eu sou o Santinho." (−3 s).

## Notas de produção

- **Abertura express:** é a abertura padrão (`ferramentas/abertura/`) encurtada para 3 s: o logo entra, gira
  num mini tornado e vira o Santinho já acenando, e a voz começa logo depois. Não leva o aviso inicial
  nem o texto de vinheta. A versão completa de 12 s continua valendo para os vídeos longos.
- **Celular:** o representante pode assistir no celular. Use zoom na área de ação em todas as cenas de tela.
- **Santinho:** no canto, sem cobrir campos nem botões. Em destaque nas cenas 1, 6 e 7.
- **Número na fala:** "pin" e "cê ene pê jota" estão escritos do jeito falado, como "éle, á e bê" no vídeo do
  Laboratório.
- **Cadastrar cliente novo:** a fala só **cita** o botão. Clicar nele chama uma consulta externa de CNPJ,
  que não deve entrar na gravação.
- **Quiz:** este vídeo não tem quiz. O representante recebe só o link, sem nota nem registro.
