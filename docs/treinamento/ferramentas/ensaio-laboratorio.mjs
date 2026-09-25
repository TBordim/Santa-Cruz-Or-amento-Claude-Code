// Percorre o gravacao.md do Laboratório contra o app local (porta 3100, banco demo local).
import { chromium } from "playwright-core";
import os from "node:os";

const BASE = "http://localhost:3100";
const SHOTS = new URL("./shots/", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const exe = `${os.homedir()}/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe`;

const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const ok = [];
const falhas = [];
async function checa(nome, fn) {
  try { await fn(); ok.push(nome); } catch (e) { falhas.push(`${nome}: ${e.message.split("\n")[0]}`); }
}
const texto = (t, timeout = 15000) => page.getByText(t, { exact: false }).first().waitFor({ timeout });
async function escolhe(trigger, opcao) {
  await trigger.click();
  await page.getByRole("option", { name: opcao, exact: true }).click();
}

// Tomada 1 — login e troca de módulo
await page.goto(`${BASE}/login`);
await page.getByRole("button", { name: "Sou colaborador da Santa Cruz" }).click();
await escolhe(page.locator("#usuarioId"), "Ana Laboratório");
await page.fill("#pin", "1111");
await page.getByRole("button", { name: "Entrar" }).click();
await page.waitForURL(/\/painel/, { timeout: 60000 });
await escolhe(page.getByRole("combobox", { name: "Trocar de módulo" }).first(), "Laboratório");
await page.waitForURL(/\/laboratorio$/, { timeout: 60000 });
await checa("T1 Início com cartões Cor e Produção", async () => { await texto("Busque uma cor aprovada"); });

// Tomada 2 — lista e busca
await page.goto(`${BASE}/laboratorio/cor`);
await checa("T2 lista com 4 cores", async () => { await texto("(4"); });
await page.fill('input[name="q"]', "café");
await page.getByRole("button", { name: "Buscar", exact: true }).click();
await checa("T2 busca 'café' acha só STA0002", async () => {
  await texto("encontradas");
  if (!(await page.getByRole("link", { name: "STA0002" }).isVisible())) throw new Error("STA0002 não apareceu");
  if (await page.getByRole("link", { name: "STA0001" }).isVisible()) throw new Error("STA0001 não devia aparecer");
});
await page.getByRole("link", { name: "Limpar" }).click();

// Tomada 3 — nova cor
await checa("T3 código travado mostra STA0005", async () => {
  const v = await page.locator("#codigo").inputValue();
  if (v !== "STA0005") throw new Error(`mostrou ${v}`);
});
await page.fill("#cliente", "Doces Serra Azul Ltda.");
await page.fill("#referenciaDeclarada", "LARANJA P. 1665");
await escolhe(page.locator("#tipoReferencia"), "Amostra do cliente");
await page.getByLabel("L* alvo").fill("52");
await page.getByLabel("a* alvo").fill("58");
await page.getByLabel("b* alvo").fill("32");
await page.fill("#substrato", "Cartão duplex 300 g/m²");
await page.fill("#acabamento", "Verniz UV brilho");
await page.getByRole("button", { name: "Criar cor" }).click();
await page.waitForURL(/\/laboratorio\/cor\/.+/, { timeout: 60000 });
await checa("T3 bancada abriu como STA0005", async () => { await page.getByRole("heading", { name: "STA0005" }).waitFor(); });

// Tomada 4 — primeira fórmula
await escolhe(page.locator("#origem"), "Fórmula do fornecedor");
const linhas = [["IRO21 — Orange", "45"], ["IRO33 — Warm Red", "30"], ["IRO48 — Transparent White", "25"]];
for (const [i, [base, pct]] of linhas.entries()) {
  if (i > 0) await page.getByRole("button", { name: "Adicionar tinta" }).click();
  await escolhe(page.getByRole("combobox").filter({ hasText: "Base…" }).first(), base);
  await page.locator('input[name="percentual"]').nth(i).fill(pct);
}
await checa("T4 total 100,00% sem ⚠", async () => { await texto("total: 100,00%"); });
await page.getByRole("button", { name: "Salvar rodada" }).click();
await checa("T4 cartão Rodada 1", async () => { await texto("Rodada 1"); });

// Tomada 5 — puxada R1
await page.locator('input[name="l"]').first().fill("50,2");
await page.locator('input[name="a"]').first().fill("61,5");
await page.locator('input[name="b"]').first().fill("36,8");
await page.getByRole("button", { name: "Registrar puxada" }).first().click();

// Tomada 6 — ΔE e eixo
await checa("T6 'R1: 2,59' na evolução", async () => { await texto("R1: 2,59"); });
await checa("T6 eixo LAB com seta", async () => { await texto("A seta mostra o sentido do ajuste"); });
await page.locator('svg[aria-label^="Plano a*/b*"]').screenshot({ path: SHOTS + "eixo-r1.png" });

// Tomada 7 — novo ajuste (sem F5)
await checa("T7 novo ajuste vem com 'Ajuste nosso'", async () => {
  await texto("Novo ajuste — rodada 2");
  const t = await page.locator("#origem").innerText();
  if (!t.includes("Ajuste nosso")) throw new Error(`origem mostra "${t}"`);
});
await checa("T7 fórmula veio preenchida (45 / 30 / 25)", async () => {
  const v = await Promise.all([0, 1, 2].map((i) => page.locator('input[name="percentual"]').nth(i).inputValue()));
  if (v.join("|") !== "45|30|25") throw new Error(`veio ${v.join(" / ")}`);
});
for (const [i, pct] of ["44", "28,5", "27,5"].entries()) await page.locator('input[name="percentual"]').nth(i).fill(pct);
await page.getByRole("button", { name: "Salvar rodada" }).click();
await texto("Rodada 2");
await page.locator('input[name="l"]').nth(1).fill("51,6");
await page.locator('input[name="a"]').nth(1).fill("58,9");
await page.locator('input[name="b"]').nth(1).fill("33,1");
await page.getByRole("button", { name: "Registrar puxada" }).first().click();
await checa("T7 'R2: 0,59'", async () => { await texto("R2: 0,59"); });

// Tomada 8 — aprovar R2
await checa("T8 'ΔE 0,59 — dentro da tolerância'", async () => { await texto("ΔE 0,59 — dentro da tolerância"); });
await page.getByRole("button", { name: "Aprovar esta rodada" }).nth(1).click();
await checa("T8 status Aprovado", async () => { await page.getByText("Aprovado", { exact: true }).first().waitFor(); });
await page.screenshot({ path: SHOTS + "bancada-aprovada.png", fullPage: true });

// Tomada 9 — editar dados (cancelar) e lixeira (cancelar)
await page.getByRole("button", { name: "Editar dados" }).click();
await checa("T9 código travado em Editar dados", async () => { await texto("Gerado pelo sistema, não muda."); });
await page.getByRole("button", { name: "Cancelar", exact: true }).click();
await page.getByRole("button", { name: "Excluir esta rodada" }).nth(1).click();
await checa("T9 janela 'Excluir a rodada 2?'", async () => { await texto("Excluir a rodada 2?"); await texto('volta pra "Em desenvolvimento"'); });
await page.getByRole("button", { name: "Cancelar" }).click();

// Tomada 11b/11c — erros da composição (rodada 3), sem salvar
await page.reload();
for (const [i, pct] of ["44", "28", "27,5"].entries()) await page.locator('input[name="percentual"]').nth(i).fill(pct);
await checa("T11b ⚠ com 99,50%", async () => { await texto("total: 99,50% ⚠"); });
await page.getByRole("button", { name: "Salvar rodada" }).click();
await checa("T11b mensagem da soma", async () => { await texto("A soma dos percentuais precisa fechar em 100,00% — está em 99,50%."); });
await page.reload();
await page.locator('input[name="percentual"]').nth(2).fill("27,5");
await escolhe(page.getByRole("combobox").filter({ hasText: "IRO48" }).first(), "IRO33 — Warm Red");
await page.locator('input[name="percentual"]').nth(0).fill("44");
await page.locator('input[name="percentual"]').nth(1).fill("28,5");
await page.getByRole("button", { name: "Salvar rodada" }).click();
await checa("T11c mensagem da tinta repetida", async () => { await texto("A tinta IRO33 aparece em mais de uma linha — junte numa linha só."); });
await checa("T11 nenhuma rodada 3 foi salva", async () => {
  await page.reload();
  if (await page.getByText("Rodada 3", { exact: true }).count()) throw new Error("existe Rodada 3");
});

// Tomada 11a — LAB alvo incompleto
await page.goto(`${BASE}/laboratorio/cor`);
await page.fill("#cliente", "Teste de erro");
await page.getByLabel("L* alvo").fill("52");
await page.getByRole("button", { name: "Criar cor" }).click();
await checa("T11a mensagem do LAB incompleto", async () => { await texto("Preencha os 3 valores do LAB alvo (L*, a*, b*), ou deixe todos em branco."); });

// Tomada 10 — Produção
await page.goto(`${BASE}/laboratorio/producao`);
await page.fill("#codigo", "sta0005");
await page.getByRole("button", { name: "Buscar", exact: true }).click();
await page.fill("#kg", "25");
await checa("T10 kg 11,000 / 7,125 / 6,875", async () => { await texto("11,000"); await texto("7,125"); await texto("6,875"); });
await page.screenshot({ path: SHOTS + "producao.png" });

// Tomada 11d — código incompleto
await page.fill("#codigo", "0005");
await page.getByRole("button", { name: "Buscar", exact: true }).click();
await checa("T11d mensagem do código incompleto", async () => { await texto('Nenhuma cor encontrada com o código "0005".'); });

await browser.close();
console.log(`OK (${ok.length}):\n  ` + ok.join("\n  "));
console.log(falhas.length ? `FALHAS (${falhas.length}):\n  ` + falhas.join("\n  ") : "Nenhuma falha.");
