# Plano: módulo "Treinamentos" no App Sta Cruz

**Versão 1 (25/09/2026). Só o plano: nada foi implementado.**

## Objetivo

1. Cada colaborador vê os vídeos de treinamento **do seu perfil**.
2. Assiste no próprio app e responde o **quiz** no fim.
3. O app registra **quem assistiu, a nota e a data**.
4. A **diretoria** acompanha tudo numa tela própria.

---

## Como encaixa no que já existe

- **É um módulo novo, como o Laboratório.** Basta uma entrada em `src/lib/modulos.ts`
  (`{ key: "treinamentos", label: "Treinamentos", basePath: "/treinamentos" }`) e uma pasta de
  rotas `src/app/(app)/treinamentos/`. O seletor "Módulo" do menu passa a oferecer
  "Treinamentos" sozinho.
- **Permissões:** o mesmo esquema de hoje. Os perfis continuam no banco, e o perfil diz onde a
  pessoa pode mexer. Entra uma permissão nova em `src/lib/areas.ts`:
  - `TREINAMENTOS_ACOMPANHAMENTO`: vê o painel de acompanhamento (para a Diretoria).

  O cadastro de vídeos fica **só para administrador**, como a tela Bases.
- **Vídeo por perfil:** cada treinamento é ligado a um ou mais **perfis** (Laboratório,
  Engenharia, Produção…). Quem é desses perfis vê o vídeo na sua lista.
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
  YOUTUBE // "não listado" — permite saber quando o vídeo terminou
  DRIVE   // Google Drive — não informa quando terminou (ver "Assistiu?")
}

model Treinamento {
  id          String        @id @default(cuid())
  titulo      String        // "Laboratório — formulação e registro de cor"
  modulo      String        // chave de src/lib/modulos.ts ("laboratorio", "orcamento"...)
  descricao   String?
  videoUrl    String
  provedor    ProvedorVideo
  duracaoSeg  Int?

  // Conteúdo do quiz.json (perguntas, alternativas, correta, explicação) guardado inteiro —
  // é sempre lido junto do treinamento, nunca consultado pergunta a pergunta.
  quiz        Json
  notaMinima  Int           @default(70) // % de acertos pra contar como concluído
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

// Quais perfis devem fazer cada treinamento (muitos-para-muitos).
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

  videoConcluido    Boolean     // YouTube: o player avisou que terminou; Drive: a pessoa clicou em "Terminei de assistir"
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

- **Quem vê:** qualquer um logado. Só aparecem os treinamentos dos perfis da pessoa.
- Um **cartão por vídeo**: título, duração e situação.

| Situação no cartão | Quando |
|---|---|
| **Pendente** (cinza) | nunca respondeu o quiz desta versão |
| **Refazer** (laranja) | respondeu, mas ficou abaixo da nota mínima |
| **Concluído · 88% · 26/09/2026** (verde) | aprovado na versão atual |
| **Atualizado, refazer** (laranja) | aprovado numa versão antiga; o vídeo ou o quiz mudou |

```
┌──────────────────────────────────────────────────────────┐
│ Treinamentos                                             │
│ Seus vídeos de treinamento — assista e responda o quiz.  │
├──────────────────────────┬───────────────────────────────┤
│ ▶ Laboratório            │ ▶ Orçamento — Solicitação     │
│   6 min · Concluído 88%  │   5 min · Pendente            │
│   26/09/2026             │                               │
└──────────────────────────┴───────────────────────────────┘
```

### 2. Assistir e responder (`/treinamentos/<id>`)

- **Vídeo** no topo, embutido: YouTube não listado ou Google Drive.
- **Quiz** embaixo. Ele é liberado:
  - no **YouTube**, quando o player avisa que o vídeo terminou;
  - no **Drive**, com o botão "Terminei de assistir", porque o Drive não informa quando o vídeo
    termina.
- Uma pergunta por bloco, com 4 alternativas, e o botão **Enviar respostas**.
- **Resultado:** a nota (ex.: "7 de 8 · 88% · Aprovado"). Para cada pergunta, mostra se acertou
  e a **explicação**, que já está no `quiz.json`. Se ficou abaixo da nota mínima, aparece
  **Refazer**.
- Funciona no celular: o vídeo ocupa a largura toda e as alternativas viram botões grandes.

### 3. Acompanhamento (`/treinamentos/acompanhamento`)

- **Quem vê:** perfis com `TREINAMENTOS_ACOMPANHAMENTO` (Diretoria) e administrador.
- **Resumo no topo:** % de concluídos por treinamento, e quantas pessoas estão pendentes ou
  precisam refazer.
- **Tabela pessoa × treinamento.** Cada célula mostra a situação, a melhor nota e a data. Dá
  para filtrar por perfil, por treinamento e só pendentes.
- **Detalhe da pessoa:** todas as tentativas, com data e nota.
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

- Cadastrar ou editar: título, módulo, **link do vídeo** (o app reconhece se é YouTube ou
  Drive), duração, **perfis**, nota mínima, ativo/inativo e ordem.
- **Importar quiz:** colar ou enviar o `quiz.json`. O app confere o formato (6 a 8 perguntas, 4
  alternativas, uma correta) antes de salvar.
- Trocar o vídeo ou o quiz **sobe a versão**. Nesse caso, o app avisa quantas pessoas vão
  precisar refazer.

---

## "Assistiu?": o limite honesto

Nenhum dos dois provedores prova que a pessoa **prestou atenção**.

- **YouTube não listado (recomendado):** o player embutido informa quando o vídeo terminou, e o
  quiz só abre depois disso.
- **Google Drive:** o vídeo embutido não informa nada ao app, então depende do clique em
  "Terminei de assistir".

O que vale como registro é **a nota no quiz**. É ela que mostra se a pessoa entendeu.

---

## Riscos e cuidados

1. **É o primeiro trabalho com migração desde a descoberta dos previews.** Hoje, o push de uma
   branch com tabela nova **cria as tabelas no banco de produção** na hora do preview. Antes de
   começar, é preciso separar o banco dos previews (Fase 0).
2. **Vídeo não listado não é privado.** Quem tiver o link consegue assistir. Como os vídeos só
   usam dados fictícios, o risco é baixo. Mesmo assim, não é lugar para conteúdo sigiloso.
3. **Perfil trocado:** se alguém muda de perfil, os treinamentos pendentes mudam junto. As
   tentativas antigas continuam no histórico.

---

## Decisões para você

1. **Nota mínima:** 70% (6 de 8 acertos)? Pode ser diferente por treinamento.
2. **Tentativas:** ilimitadas, contando a melhor nota? Ou um limite, por exemplo 3?
3. **Onde hospedar os vídeos:** YouTube não listado (recomendo) ou Google Drive?
4. **Representantes**, que não têm login: o vídeo deles fica:
   - (a) numa página pública, sem registro;
   - (b) numa página pública que pede nome e e-mail antes do quiz e registra o resultado;
   - (c) só por link enviado, fora do app.

   A (b) exige mais uma tabela e cuidado com dados pessoais.
5. **Aviso de pendência:** mostrar um selo "Treinamentos pendentes" no menu de quem tiver vídeo
   para fazer?

## Ordem sugerida de implementação (depois de aprovado)

1. Separar o banco dos previews (Fase 0).
2. Schema, migração, e a tela 4 (gerenciar), para cadastrar o vídeo do Laboratório.
3. Telas 1 e 2 (assistir e responder).
4. Tela 3 (acompanhamento).
