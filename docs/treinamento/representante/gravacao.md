# Checklist de gravação: Representante, Novo Orçamento

**Versão 1 (02/10/2026).** Acompanha o [roteiro](roteiro.md).

Grave **só a tela**, sem voz. A narração do Santinho entra depois, na edição.

Diferença para o vídeo do Laboratório: aqui é **uma gravação contínua só** (login → formulário → enviar),
porque o formulário guarda o que foi digitado na própria página e não dá para recomeçar a meio. A edição
corta a gravação nas cenas 2 a 6. O ritmo de cada ação é ajustado depois que a voz estiver pronta, como nas
tomadas 2 e 4 do Laboratório (`h.ate(tv)` em `ferramentas/gravar-tomadas-laboratorio.mjs`).

---

## Dados e preparo da demo

A demo precisa de três coisas que o seed atual **não** tem:

1. **O código novo do Novo Orçamento**, na `main` desde 02/10/2026 (commits `d8455cc` e `8b21ddc`): login
   obrigatório, busca de cliente e campos obrigatórios. A demo hoje tem o Laboratório até 29/09 e precisa
   receber a `main` (merge local na pasta `wt-demo`, **sem commit**, como combinado).
2. **Um representante:** perfil "Representante" só com a área `NOVO`, e o usuário **Rafael Representante**,
   PIN **4444**.
3. **Clientes cadastrados**, para a busca ter o que mostrar.

Acrescente ao `prisma/seed-demo.ts` da `wt-demo` (sem commit):

```ts
// 1) import, junto dos outros:
import { textoBusca } from "../src/lib/clientes/busca";

// 2) na lista de apagar do passo 1, depois de prisma.orcamento.deleteMany():
prisma.cliente.deleteMany(),

// 3) em PERFIS:
{ chave: "rep", nome: "Representante", admin: false, areas: ["NOVO"] },

// 4) em USUARIOS:
{ nome: "Rafael Representante", pin: "4444", perfil: "rep" },

// 5) no fim do passo 3, depois do laço das cores:
const CLIENTES = [
  { cnpj: "11222333000181", razaoSocial: "Doces Serra Azul Ltda.", endereco: "Rua das Palmeiras, 120, Centro, Campinas/SP", telefone: "(19) 3000-1000", email: "compras@docesserraazul.example", contato: "Marta Souza" },
  { cnpj: "12345678000195", razaoSocial: "Docerias Vale Doce Ltda.", endereco: "Av. Brasil, 800, Jardim América, Ribeirão Preto/SP", telefone: "(16) 3000-2000", email: "compras@valedoce.example", contato: "Paulo Lima" },
  { cnpj: "45123789000106", razaoSocial: "Padaria Pão Nosso Ltda.", endereco: "Rua XV de Novembro, 45, Centro, Sorocaba/SP", telefone: "(15) 3000-3000", email: "pedidos@paonosso.example", contato: "Ana Ribeiro" },
];
for (const c of CLIENTES) await prisma.cliente.create({ data: { ...c, busca: textoBusca(c.razaoSocial) } });
```

Todos os dados são inventados; os três CNPJs passam na conferência dos dígitos.

Confira, antes de gravar, com a demo no ar:

- [ ] Login do **Rafael** (PIN 4444) cai no **Novo Orçamento** (e não na página de entrada) `[CONFIRMAR]`.
- [ ] Digitar `doce` (não `doces`) na busca mostra **2 clientes** (Doces Serra Azul e Docerias Vale Doce).
- [ ] A seção "Detalhes técnicos" aparece **recolhida** e abre com um clique.

## Preparar a tela

- [ ] Resolução **1280 × 720** (como as gravações do Laboratório). Tema **claro**.
- [ ] Servidor da demo em **modo produção** (`next build` + `next start`), para não aparecer o círculo "N" do
      Next no canto. Nunca grave no endereço de produção.
- [ ] Mouse movendo **devagar**, com anel de clique.

---

## Gravação única (cenas 2 a 6)

**Ponto de partida:** tela de login da demo, deslogado.

| Cena | Passos |
|---|---|
| **2 · Entrar** | 1. 🔴 ⏸ 1 s no login. 2. **"Sou colaborador da Santa Cruz"**. 3. Nome → **Rafael Representante**. 4. PIN `4444`. 5. **Entrar**. Abre o **Novo Orçamento**. ⏸ 1 s. |
| **3 · Cliente** | 6. Clique em **"Buscar cliente cadastrado"** e digite `doce`. ⏸ 1 s na lista (2 resultados). 7. Clique em **Doces Serra Azul Ltda.** Aparece "Cliente do cadastro: Doces Serra Azul Ltda.". ⏸ 1 s. 8. Passe o mouse sobre **"Cliente não está na lista — cadastrar novo"**, **sem clicar**. ⏸ 1 s. |
| **4 · Entrega e produto** | 9. Role até **Condições comerciais e entrega**. **Qtd. de entregas:** `1`. 10. **Data de entrega solicitada pelo Cliente:** `30/11/2026`. 11. Role até **Produto**. **Descrição do produto:** `Caixa para bolo 20 x 20 x 10 cm`. 12. **Quantidades a orçar:** `5000`; clique em **Adicionar quantidade**; `10000`. ⏸ 1 s. |
| **5 · Detalhes técnicos** | 13. Role até **"Detalhes técnicos (toque para abrir)"** e **clique para abrir**. 14. **Formato — Comprimento (mm):** `200`. **Largura (mm):** `200`. **Altura (mm):** `100`. 15. **Descrição do material:** `Cartão duplex`; **Gramatura (g/m²):** `300`. ⏸ 1 s. 16. Role até **Acabamento** e passe o mouse sobre as opções, **sem marcar nada**. ⏸ 2 s. |
| **6 · Enviar** | 17. Role até o fim. Clique em **Enviar solicitação**. Aparece **"Solicitação enviada"**. ⏸ 3 s. 18. ⏹ Pare. |

## Se errar

- Erro pequeno (clique errado, digitação): ⏸ 3 s e **repita só aquele passo**; a edição corta.
- Enviou antes da hora ou preencheu errado: pare, **rode o seed de novo** e recomece do passo 1.

## Depois de gravar

- [ ] O envio **cria um orçamento** na demo. Rode o seed de novo para a demo voltar ao início.
- [ ] Guarde a gravação como `rep-tomada-01.webm`.
