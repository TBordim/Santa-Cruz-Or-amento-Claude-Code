// Confere, SÓ POR LEITURA, se a demo (DEMO_URL, padrão http://localhost:3003) está pronta para a gravação:
// página de entrada, lista com 5 cores, filtro de status e a cor sem rodadas. Não cria nem altera nada.
import { chromium } from "playwright-core";
import os from "node:os";

const BASE = process.env.DEMO_URL ?? "http://localhost:3003";
const exe = `${os.homedir()}/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe`;
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const res = [];
const checa = async (nome, fn) => {
  try { res.push(`OK    ${nome}${(await fn()) ? ` (${await fn()})` : ""}`); } catch (e) { res.push(`FALHA ${nome}: ${e.message.split("\n")[0]}`); }
};
const escolhe = async (trigger, opcao) => { await trigger.click(); await page.getByRole("option", { name: opcao, exact: true }).click(); };

await page.goto(`${BASE}/login`);
await page.getByRole("button", { name: "Sou colaborador da Santa Cruz" }).click();
await escolhe(page.locator("#usuarioId"), "Ana Laboratório");
await page.fill("#pin", "1111");
await page.getByRole("button", { name: "Entrar" }).click();

await checa("página de entrada com 2 cadeados", async () => {
  await page.getByText("Para onde você vai hoje?").waitFor({ timeout: 30000 });
  const n = await page.getByText("Sem acesso no seu perfil").count();
  if (n !== 2) throw new Error(`${n} cadeados`);
});
await page.goto(`${BASE}/laboratorio/cor`);
await checa("lista com 5 cores", async () => {
  await page.getByText("Cores cadastradas").waitFor({ timeout: 30000 });
  return (await page.getByText(/\(\d+\)/).first().textContent()).trim();
});
await checa("ordem STA0004 ... 91801663", async () => {
  const l = await page.locator("tbody tr td:first-child a").allTextContents();
  if (l[0] !== "STA0004" || l.at(-1) !== "91801663") throw new Error(l.join(", "));
  return l.join(", ");
});
await checa("filtro de status existe", async () => { await page.getByRole("combobox", { name: "Filtrar por status" }).waitFor({ timeout: 5000 }); });
await checa("próximo código será STA0005", async () => {
  const v = await page.locator("#codigo").inputValue();
  if (v !== "STA0005") throw new Error(v);
});
await page.getByRole("link", { name: "STA0004" }).click();
await checa("bancada da STA0004 mostra 'Como começar'", async () => { await page.getByText("Como começar").waitFor({ timeout: 30000 }); });
await browser.close();
console.log(res.join("\n"));
