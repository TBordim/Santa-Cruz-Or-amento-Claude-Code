# Mapa do módulo Laboratório

**Versão 4 (25/09/2026).** Feita a partir da branch `feat/modulo-laboratorio-cor`, commit
`32975b7`, já no GitHub. Em relação à versão 3, o eixo LAB passou a aparecer também nas cores
importadas da planilha (commit `670eefb`).

Arquivos lidos:
- `src/app/(app)/laboratorio/**`;
- `src/lib/cor/*`, incluindo `lab-alvo.ts`, `formato.ts`, `composicao.ts` e `codigo.ts`;
- `src/hooks/use-form-action.ts`;
- `src/lib/areas.ts`, `src/lib/permissions.ts`, `Sidebar.tsx`, `ModuloSwitcher.tsx`, `src/app/login/*`;
- os models do módulo Cor em `prisma/schema.prisma`, que não mudaram.

O app não usa zod. Todas as validações estão nas *server actions*. Todos os exemplos são fictícios.

**Números:** o módulo inteiro mostra números com **vírgula decimal** (ΔE 1,35; 72,50%; 18,125 kg;
L* 48,5), inclusive nas mensagens. Os campos aceitam vírgula ou ponto.

---

## 1. Fluxo geral

O ciclo do laboratório: **fórmula → puxada (Quick Peek) → registra o melhor LAB → ajuste → nova
rodada → … até o menor ΔE → aprovação**. Depois a Produção consulta a fórmula aprovada e calcula
o lote.

| # | Etapa | Onde | Quem pode fazer |
|---|---|---|---|
| 1 | Entrar no app | Login | qualquer colaborador com usuário |
| 2 | Trocar para o módulo Laboratório | seletor "Módulo" no topo do menu | qualquer um logado |
| 3 | Cadastrar a cor (cliente, referência, LAB alvo…). **O código é gerado pelo sistema** | Cor → quadro "Nova cor" | Laboratório / Engenharia* |
| 4 | Registrar a 1ª fórmula (rodada 1) | bancada da cor | Laboratório / Engenharia* |
| 5 | Fazer a puxada e registrar o melhor LAB | bancada, dentro da rodada | Laboratório / Engenharia* |
| 6 | Ler o ΔE e o **eixo LAB** (para que lado ajustar). Se ΔE ≥ 1,00, registrar um ajuste (rodada 2, 3…) e voltar ao passo 5 | bancada | Laboratório / Engenharia* |
| 7 | Aprovar a rodada vencedora (a cor vira "Aprovado") | bancada | Laboratório / Engenharia* |
| 8 | Buscar a cor pelo código e calcular a tinta de um lote em kg | Produção | qualquer um logado |
| — | Corrigir a qualquer momento: dados da cor (menos o código), composição de uma rodada (inclusive a aprovada), ou excluir uma rodada | bancada | Laboratório / Engenharia* |

\* O perfil precisa ter a permissão "Laboratório" (`COR_LABORATORIO`) **ou** "Engenharia de cor"
(`COR_ENGENHARIA`), ou ser administrador. As duas fazem exatamente a mesma coisa, e **o vídeo
trata Laboratório e Engenharia juntos** (decisão do Thiago). Quem não tem nenhuma das duas vê
as telas (menos Bases), mas formulários, lápis, lixeiras e botões não aparecem. O representante
(sem login) é mandado para o login.

A tela **Bases** existe só para administrador e **fica fora do vídeo**.

---

## 2. Telas

### T0. Login (`/login`)
- **Objetivo:** entrar no app.
- **Perfil:** todos.
- **Como chegar:** abrir o endereço do app.
- Primeira tela: **"Sou Representante"** ou **"Sou colaborador da Santa Cruz"**. O colaborador
  escolhe **"Seu nome"**, digita o **PIN** e clica em **Entrar**. O login sempre leva ao **Painel
  do módulo Orçamento**.

### T1. Início do Laboratório (`/laboratorio`)
- **Objetivo:** porta de entrada do módulo, com os cartões **Cor** e **Produção**. O
  administrador vê também **Bases**.
- **Perfil:** qualquer um logado.
- **Como chegar:** topo do menu lateral, campo **"Módulo"** → **Laboratório**. No celular, o
  seletor fica na barra superior. O menu passa a mostrar **Início**, **Cor** e **Produção**.

### T2. Cor, a lista de cores (`/laboratorio/cor`)
- **Objetivo:** cadastrar uma cor nova e encontrar as já cadastradas.
- **Perfil:** qualquer um vê. O quadro "Nova cor" só aparece para Laboratório / Engenharia.
- **Como chegar:** menu → **Cor**, ou o cartão do Início.
- **Tabela da lista:**
  - **Código:** link para a bancada, com o nº de rodadas embaixo.
  - **Cliente / referência.**
  - **LAB alvo.**
  - **LAB aprovado.**
  - **ΔE:** o menor. **Fica em vermelho se for 1,00 ou mais.**
  - **Status.**
  - No celular, LAB alvo e ΔE somem e o status vai para baixo do código.
- **A lista não segue a ordem dos números.** Primeiro vem a cor **alterada mais recentemente**.
  Para achar uma cor específica, use a busca.
- A bolinha de cor ao lado de cada LAB é só apoio visual: "não substitui a cabine de luz D50".

### T3. Bancada da cor (`/laboratorio/cor/<id>`)
- **Objetivo:** tudo sobre uma cor numa tela só.
- **Perfil:** qualquer um vê. Os controles de registro só aparecem para Laboratório / Engenharia.
- **Como chegar:** clicar no código na lista. Depois de "Criar cor", a bancada abre sozinha.
- **Blocos, de cima para baixo:**
  1. Título com o código, e cliente · referência.
  2. Quadro do **LAB alvo** com a amostra; quadro com **Substrato**, **Acabamento** e **Status**;
     e o botão **"Editar dados"**.
  3. **Eixo LAB.** Aparece se a cor tiver LAB alvo **ou**, nas cores importadas da planilha
     antiga, o LAB final. Nesse segundo caso, a mira se chama **"Final (planilha)"** em vez de
     "Alvo", para não parecer um alvo de verdade. Uma cor sem alvo e sem LAB final (ex.: cadastrada
     sem LAB alvo) não tem eixo. No desenho:
     - O **plano a\*/b\*** tem os nomes nas pontas, **cada um escrito na própria cor**: Vermelho,
       Verde, Amarelo e Azul.
     - O **alvo** é uma mira (aro com cruz). A **última puxada** é uma bolinha com a cor
       aproximada da tinta.
     - Uma **seta vermelha** vai da puxada até o alvo, mostrando o sentido do ajuste. Ela não
       aparece se os dois pontos estiverem quase em cima um do outro.
     - Ao lado fica uma **régua de L\*** (claro ↔ escuro).
     - Sem nenhuma puxada ainda: "Registre a puxada de uma rodada pra ver a seta de ajuste aqui."
  4. **"Evolução do ΔE2000 por rodada (meta < 1,00)"**, ex.: `R1: 3,42 → R2: 1,35 → R3: 0,71`.
     Valores de 1,00 ou mais ficam **em vermelho**. O menor dentro da meta fica em verde.
  5. **Um cartão por rodada**, com:
     - número da rodada;
     - origem;
     - selo "Aprovada";
     - total em %, com **⚠ se não fechar em 100,00**;
     - **lápis** ("Corrigir esta rodada") e **lixeira** ("Excluir esta rodada");
     - tabela **Base / % / g (lote 10g)**;
     - leituras com ΔE2000;
     - formulário da puxada;
     - botão de aprovar.
  6. Quadro **"Registrar a primeira fórmula"** / **"Novo ajuste — rodada N"**.
- A coluna de gramas usa o **lote fixo de 10 g do teste de bancada**. Confirmado.

### T4. Produção, a calculadora (`/laboratorio/producao`)
- **Objetivo:** buscar uma cor **aprovada** pelo código e calcular quantos kg de cada base usar.
- **Perfil:** qualquer um logado.
- **Como chegar:** menu → **Produção**, ou o cartão do Início.
- O cálculo é kg de cada base = % × kg do lote ÷ 100, com 3 casas decimais (ex.: 18,125), feito
  na hora.

---

## 3. Campos por tela

### T0. Login

| Rótulo na tela | Nome técnico | Tipo | Obrigatório? | Validação/regra | Exemplo válido (fictício) | Erro comum provável |
|---|---|---|---|---|---|---|
| Seu nome | `usuarioId` | lista de usuários ativos | Sim | — | Ana Laboratório | não escolher → "Escolha seu nome." |
| PIN | `pin` | texto (números) | Sim | confere com o PIN cadastrado | 1111 | errado → "Nome ou PIN incorretos." |

### T2. "Nova cor" e T3. "Editar dados da cor" (mesmos campos e regras)

| Rótulo na tela | Nome técnico | Tipo | Obrigatório? | Validação/regra | Exemplo válido (fictício) | Erro comum provável |
|---|---|---|---|---|---|---|
| Código | `codigo` | **travado** | — | **Gerado pelo sistema:** "STA" + 4 dígitos, o maior número existente + 1. Na criação o campo mostra o próximo número previsto ("Gerado automaticamente ao criar."). Na edição mostra o código atual ("Gerado pelo sistema, não muda.") | STA0192 | — (não se digita) |
| Cliente | `cliente` | texto livre | Não | — | Doces Serra Azul Ltda. | — |
| Código do produto | `codigoProduto` | texto livre | Não | entra na busca da lista | 9.001.006 | — |
| Referência | `referenciaDeclarada` | texto livre | Não | — | VERMELHO P. 485 | — |
| Tipo de referência | `tipoReferencia` | lista: Amostra do cliente / Padrão interno / Tarja do plotter (Pantone Digital) | Não | — | Amostra do cliente | — |
| LAB alvo: L* | `labAlvoL` | número | **os 3 ou nenhum** | entre **0 e 100** | 48,50 | 120 → "L* precisa estar entre 0 e 100." |
| LAB alvo: a* | `labAlvoA` | número | **os 3 ou nenhum** | entre **-128 e 128** | 62,30 | 150 → "a* e b* precisam estar entre -128 e 128." |
| LAB alvo: b* | `labAlvoB` | número | **os 3 ou nenhum** | entre **-128 e 128** | 38,10 | só 1 ou 2 preenchidos → "Preencha os 3 valores do LAB alvo (L*, a*, b*), ou deixe todos em branco."; texto → "LAB inválido — L*, a* e b* precisam ser números." |
| Substrato | `substrato` | texto livre | Não | — | Cartão duplex 300 g/m² | — |
| Acabamento | `acabamento` | texto livre | Não | — | Verniz UV brilho | — |
| Resistência exigida | `resistenciaExigida` | texto livre | Não | salvo, mas só aparece dentro de "Editar dados" | Resistente a álcali | — |

Botões:
- **Criar cor** na criação.
- **Salvar alterações** e **Cancelar** (ou o X) na edição. O quadro fecha sozinho quando salva.
- Na edição, **apagar os três campos do LAB alvo apaga o alvo**, e a cor passa a não ter ΔE nem
  eixo LAB.

**Busca da lista**

| Rótulo na tela | Nome técnico | Tipo | Obrigatório? | Validação/regra | Exemplo válido (fictício) | Erro comum provável |
|---|---|---|---|---|---|---|
| Buscar código, cliente, referência… | `q` | texto | Não | "contém", sem diferenciar maiúsculas, em código, cliente, código do produto e referência | serra azul | procurar a cor rolando a lista pela ordem dos números, que ela não segue. Use a busca. Esquecer a busca ativa → **Limpar** |

### T3. "Registrar a primeira fórmula" / "Novo ajuste — rodada N" / "Corrigir esta rodada" (mesmas regras)

| Rótulo na tela | Nome técnico | Tipo | Obrigatório? | Validação/regra | Exemplo válido (fictício) | Erro comum provável |
|---|---|---|---|---|---|---|
| Origem da fórmula | `origem` | lista: Fórmula do fornecedor / Ajuste nosso | **Sim** | vazia na rodada 1; "Ajuste nosso" nas seguintes; na correção, vem a atual | Fórmula do fornecedor | sem escolher → "Escolha a origem da rodada." |
| Composição: Base | `baseId` (por linha) | lista das bases ativas | pelo menos 1 linha válida | **cada tinta só pode aparecer uma vez**; linha sem base, ou sem % maior que zero, é ignorada sem aviso | IRO33 — Warm Red | mesma tinta em duas linhas → "A tinta IRO33 aparece em mais de uma linha — junte numa linha só." |
| Composição: % | `percentual` (por linha) | número | idem | **a soma precisa fechar em 100,00% exatos**; a tela mostra o total ao vivo, com ⚠ enquanto não fechar | 72,50 | soma 99,50 → "A soma dos percentuais precisa fechar em 100,00% — está em 99,50%." |
| (nº da rodada) | `numero` | automático | — | última rodada + 1 | 2 | — |

Botões:
- **Adicionar tinta** e 🗑 (remove a linha, mas nunca a última).
- **Salvar rodada** na criação.
- **Salvar correção** e **Cancelar** na correção.

No "Novo ajuste", a composição já vem com a fórmula da rodada anterior.

### T3. Formulário da puxada (dentro de cada rodada)

| Rótulo na tela | Nome técnico | Tipo | Obrigatório? | Validação/regra | Exemplo válido (fictício) | Erro comum provável |
|---|---|---|---|---|---|---|
| L* | `l` | número | **Sim** | 0 a 100 | 49,10 | vazio ou texto → "Preencha os 3 valores de LAB."; fora da faixa → "L* precisa estar entre 0 e 100." |
| a* | `a` | número | **Sim** | -128 a 128 | 60,80 | fora da faixa → "a* e b* precisam estar entre -128 e 128." |
| b* | `b` | número | **Sim** | -128 a 128 | 37,20 | idem |

Regras:
- É **uma puxada por rodada**.
- "Corrigir puxada" **substitui** o valor anterior.
- Rodadas importadas da planilha antiga não têm esse formulário.

### T4. Produção

| Rótulo na tela | Nome técnico | Tipo | Obrigatório? | Validação/regra | Exemplo válido (fictício) | Erro comum provável |
|---|---|---|---|---|---|---|
| Código da cor | `codigo` | texto | para buscar | código **completo**, sem diferenciar maiúsculas | sta0192 (encontra STA0192) | só "192" → "Nenhuma cor encontrada com o código "192"." |
| Quantidade a produzir (kg) | `kg` | número | para calcular | maior que zero | 25 | vazio ou 0 → a coluna kg mostra "—" |

---

## 4. Botões e ações

| Botão | Tela | O que faz | Reversível no app? |
|---|---|---|---|
| Entrar | T0 | login; abre o Painel de Orçamento | — |
| Módulo → Laboratório | menu | abre o Início do Laboratório | sim |
| Criar cor | T2 | gera o código, cria a cor e abre a bancada | sim, pelo "Editar dados" (menos o código). **Não existe excluir cor** |
| Buscar / Limpar | T2 | filtra / tira o filtro | sim |
| Editar dados → Salvar alterações | T3 | corrige os dados da cor, **menos o código**. Mudar o LAB alvo **recalcula todos os ΔE e o eixo** | sim |
| Adicionar tinta / 🗑 da linha | T3 | mexe nas linhas antes de salvar | sim |
| Salvar rodada | T3 | grava a nova rodada | sim (lápis ou lixeira) |
| ✏ Corrigir esta rodada → Salvar correção | T3 | troca a origem e a composição. **Vale também para a rodada aprovada, e muda a fórmula que a Produção usa, sem nova aprovação** (decisão do Thiago: pode) | sim |
| 🗑 Excluir esta rodada → Sim, excluir | T3 | pede confirmação ("A fórmula e a leitura dela somem do histórico."). **Se era a aprovada, a cor volta para "Em desenvolvimento"** e sai da Produção. A numeração das outras não muda (ex.: R1, R3), e está ok assim | **Não** |
| Registrar / Corrigir puxada | T3 | grava ou substitui o melhor LAB | o valor antigo se perde |
| Aprovar esta rodada | T3 | aprova esta rodada, **desaprova as outras** e muda a cor para **Aprovado**. **Sem confirmação** (decisão: fica assim). Só aparece com puxada registrada. ΔE ≥ 1,00 **pode** ser aprovado, com o aviso em vermelho | sim: aprovar outra, ou excluir a aprovada |
| Ver na bancada | T4 | abre a bancada | — |

---

## 5. Mensagens do sistema

| Mensagem (exata) | Onde | O que dispara |
|---|---|---|
| Escolha seu nome. | Login | Entrar sem escolher o nome |
| Digite o PIN. | Login | PIN vazio |
| Nome ou PIN incorretos. | Login | PIN errado, usuário inativo ou inexistente |
| Preencha os 3 valores do LAB alvo (L*, a*, b*), ou deixe todos em branco. | Nova cor / Editar | 1 ou 2 campos de LAB alvo preenchidos |
| LAB inválido — L*, a* e b* precisam ser números. | Nova cor / Editar | texto no LAB alvo |
| L* precisa estar entre 0 e 100. | Nova cor / Editar / Puxada | L* fora da faixa |
| a* e b* precisam estar entre -128 e 128. | Nova cor / Editar / Puxada | a* ou b* fora da faixa |
| Escolha a origem da rodada. | Rodada | origem vazia |
| Adicione pelo menos uma tinta com percentual. | Rodada | nenhuma linha com base **e** % maior que zero |
| A tinta X aparece em mais de uma linha — junte numa linha só. | Rodada | mesma tinta em duas linhas |
| A soma dos percentuais precisa fechar em 100,00% — está em X%. | Rodada | soma diferente de 100,00 (ex.: "está em 99,50%") |
| Preencha os 3 valores de LAB. | Puxada | campo vazio ou não numérico |
| Excluir a rodada N? / A fórmula e a leitura dela somem do histórico. (+ "Como é a rodada aprovada, a cor volta pra "Em desenvolvimento".") | Bancada | clicar na lixeira da rodada |
| Nenhuma cor cadastrada ainda. / Nenhuma cor encontrada para "…". | Lista | lista vazia / busca sem resultado |
| Nenhuma rodada registrada ainda. | Bancada | cor sem rodadas |
| Registre a puxada de uma rodada pra ver a seta de ajuste aqui. | Bancada (eixo LAB) | cor com alvo, sem puxada |
| — dentro da tolerância / — acima da tolerância (em vermelho) | Bancada | ΔE menor que 1,00 / igual ou maior |
| ⚠ ao lado do total | Rodada | soma diferente de 100,00 |
| Nenhuma cor encontrada com o código "…". | Produção | código não existe ou está incompleto |
| "…" existe, mas ainda não tem nenhuma rodada aprovada — nada pra produzir ainda. Ver na bancada. | Produção | cor sem rodada aprovada |

Ficam fora do vídeo, por serem raras ou de administrador:
- "Não foi possível gerar o código da cor agora. Tente de novo.", que só aparece se várias
  pessoas criarem cores exatamente no mesmo instante;
- "Sem permissão para registrar no módulo Cor.";
- "Rodada não encontrada.";
- as mensagens da tela Bases.

---

## 6. Existe no banco, mas não tem tela (fica fora do vídeo)

- Status **"Aguardando cliente", "Alternativa" e "Cancelado"**. Decidido: não vão ganhar tela.
- **Interação com o fornecedor** e **leituras de produção**. Decidido: não vão ganhar tela.
- **Sugestão automática de ajuste:** fase futura. A seta mostra só a direção, não quanto mudar.
- **Tipo de referência, Código do produto e Resistência exigida:** só aparecem dentro de
  "Editar dados". O Código do produto também entra na busca.

---

## 7. Decisões registradas

Todos os pontos `[CONFIRMAR]` foram resolvidos (24–25/09/2026):

| Ponto | Decisão |
|---|---|
| Corrigir cadastro da cor | "Editar dados", com o código travado |
| Código da cor | gerado pelo sistema: STA + 4 dígitos, sequencial |
| Aprovar com ΔE ≥ 1,00 | pode, com aviso em vermelho |
| Confirmação ao aprovar | não tem, fica assim |
| Corrigir a rodada aprovada | pode, sem nova aprovação |
| Soma da fórmula | 100,00% exatos |
| Mesma tinta em duas linhas | não pode |
| Laboratório × Engenharia de cor | tratados juntos no vídeo |
| Lote de 10 g | confirmado para o teste de bancada |
| Buraco na numeração ao excluir rodada | ok |
| Números | sempre com vírgula |
| PIN × senha de administrador | é o PIN (só muda o texto na tela Bases) |

A geração automática conta só os códigos no padrão exato STA + 4 dígitos. Códigos do histórico
(91801663…) ou fora do padrão (como a antiga "STA200" de teste) não empurram a numeração.
