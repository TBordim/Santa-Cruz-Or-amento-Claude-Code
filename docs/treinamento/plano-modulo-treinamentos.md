# Plano: módulo "Treinamentos" no App Sta Cruz

**Versão 4 (01/10/2026). Só o plano: nada foi implementado.** Decisões do Thiago em 01/10/2026: cada colaborador vê só os vídeos do seu perfil (com o módulo bem identificado), os vídeos ficam no Vercel Blob, nota mínima de 75%, tentativas ilimitadas até aprovar e selo de pendência no menu.

## Objetivo

1. Cada colaborador com login vê os vídeos de treinamento **do seu perfil**, com o módulo identificado em cada um. Quem não tem o perfil não vê nem abre o vídeo de outro.
2. Assiste no próprio app e responde o **quiz** no fim.
3. O app registra **quem assistiu, a nota e a data**.
4. A **diretoria** acompanha tudo numa tela própria.

---

## Como encaixa no que já existe

- **É um módulo novo, como o Laboratório.** Basta uma entrada em `src/lib/modulos.ts`
  (`{ key: "treinamentos", label: "Treinamentos", basePath: "/treinamentos" }`) e uma pasta de
  rotas `src/app/(app)/treinamentos/`. O seletor "Módulo" do menu passa a oferecer
  "Treinamentos" sozinho.
- **Acesso ao módulo:** qualquer colaborador logado entra no módulo, mas só enxerga os vídeos do seu perfil. **Representantes ficam de fora**: eles não têm login (usam o Novo orçamento sem entrar), então não veem o módulo Treinamentos nem a página de entrada. Hoje `modulosAcessiveis` só libera um módulo a
  quem tem uma área marcada nele; Treinamentos precisa de uma exceção ali (sempre na lista), e entra
  também no `VISUAL` da página de entrada (`src/app/(entrada)/Entrada.tsx`), que exige uma entrada por
  módulo.
- **Permissões:** o mesmo esquema de hoje. Os perfis continuam no banco. Entra uma permissão nova em
  `src/lib/areas.ts`:
  - `TREINAMENTOS_ACOMPANHAMENTO`: vê o painel de acompanhamento (para a Diretoria).

  O cadastro de vídeos fica **só para administrador**, como a tela Bases.
- **Vídeo por perfil:** cada treinamento é ligado a um ou mais **perfis** (Laboratório,
  Engenharia, Produção…). Quem é desses perfis vê o cartão, abre o vídeo e faz o quiz. Quem não
  é, **não vê o cartão e não abre a página do vídeo**: o servidor confere o perfil em
  `/treinamentos/<id>` e ao enviar as respostas, não só esconde o botão. O administrador vê tudo,
  e quem tem `TREINAMENTOS_ACOMPANHAMENTO` vê todos no painel de acompanhamento (mas não faz o
  quiz dos que não são do seu perfil).
- **Quiz:** o `quiz.json` que produzimos em cada módulo é **importado como está**. Não precisa
  redigitar as perguntas.

---

## Schema Prisma proposto

Só **tabelas novas**. Nenhuma tabela existente muda.

```prisma
// ============================================================
// Módulo Treinamentos — vídeos por perfil, quiz e registro de quem fez
// ============================================================

enum ProvedorVideo {
  BLOB    // Vercel Blob (decidido em 01/10/2026) — <video> nativo, sabe quando o vídeo terminou
  YOUTUBE // reserva, caso o Blob não sirva
}

model Treinamento {
  id          String        @id @default(cuid())
  titulo      String        // "Laboratório — formulação e registro de cor"
  modulo      String        // chave de src/lib/modulos.ts ("laboratorio", "orcamento"...); aparece como selo no cartão
  descricao   String?
  videoUrl    String        // URL pública do MP4 no Blob (nome com sufixo aleatório)
  legendasUrl String?       // .vtt (as legendas do vídeo, convertidas do .srt)
  provedor    ProvedorVideo @default(BLOB)
  duracaoSeg  Int?

  // Conteúdo do quiz.json (perguntas, alternativas, correta, explicação) guardado inteiro —
  // é sempre lido junto do treinamento, nunca consultado pergunta a pergunta.
  quiz        Json
  notaMinima  Int           @default(75) // % de acertos pra contar como concluído (6 de 8 acertos); sem limite de tentativas
  // Sobe quando o vídeo ou o quiz mudam: tentativas antigas continuam valendo pra versão delas,
  // e o painel mostra quem precisa refazer.
  versao      Int           @default(1)

  ativo       Boolean       @default(true)
  ordem       Int           @default(0)
  criadoEm    DateTime      @default(now())
  atualizadoEm DateTime     @updatedAt

  perfis      TreinamentoPerfil[]
  tentativas  TentativaTreinamento[]

  @@map("trein_treinamentos")
}

// Quais perfis veem e devem fazer cada treinamento (muitos-para-muitos). Quem não está aqui não acessa.
model TreinamentoPerfil {
  treinamentoId String
  treinamento   Treinamento @relation(fields: [treinamentoId], references: [id], onDelete: Cascade)
  perfilId      String
  perfil        Perfil      @relation(fields: [perfilId], references: [id], onDelete: Cascade)

  @@id([treinamentoId, perfilId])
  @@map("trein_perfis")
}

// Cada vez que alguém responde o quiz. Guarda todas (histórico); o painel mostra a melhor.
model TentativaTreinamento {
  id                String      @id @default(cuid())
  treinamentoId     String
  treinamento       Treinamento @relation(fields: [treinamentoId], references: [id], onDelete: Cascade)
  usuarioId         String
  usuario           Usuario     @relation(fields: [usuarioId], references: [id])
  versaoTreinamento Int

  videoConcluido    Boolean     // o evento `ended` do <video> disparou na sessão
  respostas         Json        // [{ perguntaId, escolhida }]
  acertos           Int
  total             Int
  nota              Int         // 0–100
  aprovado          Boolean     // nota >= notaMinima da versão respondida

  criadaEm          DateTime    @default(now())

  @@index([usuarioId, treinamentoId])
  @@map("trein_tentativas")
}
```

Relações que entram nos models existentes (só a lista inversa, sem coluna nova no banco):
- `Perfil`: `treinamentos TreinamentoPerfil[]`.
- `Usuario`: `tentativasTreinamento TentativaTreinamento[]`.

**A nota é calculada no servidor.** O navegador só envia as alternativas escolhidas, e a
correção compara com o `quiz` guardado no banco. A pessoa não tem como mandar a própria nota.

---

## Telas

### 1. Meus treinamentos (`/treinamentos`)

- **Quem vê:** qualquer colaborador logado (representantes, que não têm login, não veem). Aparecem
  só os treinamentos ativos **dos perfis da pessoa**. O administrador vê todos.
- Os cartões vêm **agrupados por módulo**, cada grupo com o nome do módulo no título, e **cada
  cartão leva um selo com o módulo** (Laboratório, Orçamento…), na cor do módulo (a mesma da página
  de entrada).
- Um **cartão por vídeo**: selo do módulo, título, duração e situação.

| Situação no cartão | Quando |
|---|---|
| **Pendente** (cinza) | nunca respondeu o quiz desta versão |
| **Refazer** (laranja) | respondeu, mas ficou abaixo de 75%; pode tentar de novo quantas vezes precisar |
| **Concluído · 88% · 26/09/2026** (verde) | aprovado na versão atual |
| **Atualizado, refazer** (laranja) | aprovado numa versão antiga; o vídeo ou o quiz mudou |

```
┌──────────────────────────────────────────────────────────┐
│ Treinamentos                                             │
├──────────────────────────────────────────────────────────┤
│ LABORATÓRIO                         1 de 2 concluídos    │
│ ┌────────────────────────┐ ┌───────────────────────────┐ │
│ │ ● Laboratório          │ │ ● Laboratório             │ │
│ │ ▶ Formulação de cor    │ │ ▶ Produção do lote        │ │
│ │ 6 min · Concluído 88%  │ │ 4 min · Pendente          │ │
│ └────────────────────────┘ └───────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

- **Selo de pendência no menu:** enquanto a pessoa tiver algum treinamento do seu perfil sem
  aprovação, o item "Treinamentos" do menu e o cartão da página de entrada mostram um selo
  "Pendentes" com o número. Um módulo só conta como **concluído** quando **todos** os treinamentos
  dele, do perfil da pessoa, estão aprovados. O selo só avisa: não bloqueia o acesso a nenhum
  módulo.

### 2. Assistir e responder (`/treinamentos/<id>`)

- **Vídeo** no topo, em `<video controls>` nativo, servido pelo Vercel Blob, com as legendas
  (`<track>` com o `.vtt`) ligadas por padrão. Acima do vídeo, o selo do módulo e o título.
- **Quiz** embaixo. Ele é liberado quando o evento `ended` do vídeo dispara. Não há limite de
  tentativas: a pessoa refaz até chegar aos 75%. Depois de aprovada, pode rever o vídeo, mas o quiz
  não abre de novo naquela versão.
- Uma pergunta por bloco, com 4 alternativas, e o botão **Enviar respostas**.
- **Resultado:** a nota (ex.: "7 de 8 · 88% · Aprovado"). Para cada pergunta, mostra se acertou
  e a **explicação**, que já está no `quiz.json`. Se ficou abaixo dos 75%,
  aparece **Refazer** (o vídeo precisa terminar de novo antes de cada tentativa).
- Funciona no celular: o vídeo ocupa a largura toda e as alternativas viram botões grandes.

### 3. Acompanhamento (`/treinamentos/acompanhamento`)

- **Quem vê:** perfis com `TREINAMENTOS_ACOMPANHAMENTO` (Diretoria) e administrador.
- **Resumo no topo:** % de concluídos por treinamento, e quantas pessoas estão pendentes ou
  precisam refazer.
- **Tabela pessoa × treinamento.** Cada célula mostra a situação, a melhor nota e a data. Dá
  para filtrar por perfil, por treinamento e só pendentes.
- **Detalhe da pessoa:** todas as tentativas, com data e nota.
- **Módulo concluído:** uma coluna por módulo diz se a pessoa já tem todos os treinamentos dele
  aprovados.
- **Exportar CSV**, para planilha ou auditoria.

```
┌────────────────────┬───────────────┬──────────────────────┐
│ Colaborador        │ Laboratório   │ Orçamento — Solic.   │
├────────────────────┼───────────────┼──────────────────────┤
│ Ana (Laboratório)  │ ✔ 88% 26/09   │ —  (não se aplica)   │
│ Bruno (Engenharia) │ ✖ 50% refazer │ ● pendente           │
└────────────────────┴───────────────┴──────────────────────┘
```

### 4. Gerenciar treinamentos (`/treinamentos/gerenciar`, só administrador)

- Cadastrar ou editar: título, módulo, **vídeo** (envio do MP4 para o Blob) e legendas, duração,
  **perfis**, nota mínima (padrão 75%), ativo/inativo e ordem.
- **Importar quiz:** colar ou enviar o `quiz.json`. O app confere o formato (6 a 8 perguntas, 4
  alternativas, uma correta) antes de salvar.
- Trocar o vídeo ou o quiz **sobe a versão**. Nesse caso, o app avisa quantas pessoas vão
  precisar refazer.

---

## Hospedagem no Vercel Blob (decidido em 01/10/2026)

- O app já usa o Blob para anexos. Os vídeos vão num caminho separado (`treinamentos/`), enviados
  pela tela de gerenciar (tela 4) com **upload direto do navegador para o Blob** (as funções do
  servidor têm limite de corpo de requisição; um MP4 de 6 min passa dele).
- O vídeo é um MP4 H.264 + AAC, o mesmo que a montagem já produz. As legendas sobem como `.vtt`,
  convertidas do `.srt` do módulo.
- **Conferir antes de começar:** os limites de armazenamento e de transferência do plano Hobby.
  Cada vídeo tem em torno de 30 a 60 MB, e cada visualização conta como transferência. Se o limite
  apertar, o plano B é o YouTube não listado (`ProvedorVideo.YOUTUBE`).

## "Assistiu?": o limite honesto

O `<video>` nativo avisa quando o vídeo **terminou**, e o quiz só abre depois disso. Mesmo assim,
nada prova que a pessoa **prestou atenção**: ela pode deixar o vídeo rodando sem olhar. O que vale
como registro é **a nota no quiz**. É ela que mostra se a pessoa entendeu.

## Riscos e cuidados

1. **Migração nova.** Em 25/09 descobriu-se que a integração do Neon cria uma branch de banco para
   cada preview (`preview/<branch>`), então o preview **não** toca o banco de produção (ver
   `00-ambiente-demo.md`). A tabela nova só chega à produção quando a branch entrar na `main`. Mesmo
   assim, o `schema.prisma` mexe nas outras sessões: avisar o Thiago antes.
2. **Vídeo no Blob não é privado.** O app só mostra o vídeo a quem tem o perfil, mas a URL do Blob é
   pública, só não dá para adivinhar. Quem tiver o link consegue assistir, de qualquer perfil. Como os vídeos só usam dados fictícios, o risco é baixo. Mesmo assim, não é lugar
   para conteúdo sigiloso.
3. **Perfil trocado:** se alguém muda de perfil, os cartões mudam junto: somem os do perfil
   antigo e entram os do novo. As tentativas antigas continuam no histórico e no acompanhamento.

---

## Decisões

**Tomadas em 01/10/2026**
- **Quem vê o quê:** cada colaborador vê só os vídeos do seu perfil. Quem não tem o perfil não acessa
  o vídeo de outro. O módulo e o vídeo mostram sempre a qual módulo pertencem.
- **Representantes** ficam fora do módulo (não têm login). O vídeo deles é só um **link enviado, fora
  do app**: sem página pública, sem quiz e sem registro de nota, e sem tabela a mais.
- Os vídeos ficam no **Vercel Blob**.
- **Nota mínima:** 75% (6 de 8 acertos). O `quiz.json` do Laboratório já foi ajustado.
- **Tentativas:** ilimitadas. A pessoa refaz até aprovar, e o acompanhamento guarda todas.
- **Selo de pendência** no menu: sim. Um módulo só conta como concluído com **todos** os treinamentos
  dele aprovados. O selo **só avisa**: não bloqueia a entrada em nenhum módulo.

**Em aberto:** nada. O plano está fechado para o Thiago aprovar.

## Ordem sugerida de implementação (depois de aprovado)

1. Criar uma branch própria a partir da `main` (por exemplo `feat/modulo-treinamentos`, numa pasta
   nova), fora desta branch de documentação. Avisar o Thiago sobre o `schema.prisma`.
2. Schema, migração, e a tela 4 (gerenciar), com o upload para o Blob, para cadastrar o vídeo do
   Laboratório.
3. Telas 1 e 2 (listar por módulo, assistir e responder).
4. Tela 3 (acompanhamento).
