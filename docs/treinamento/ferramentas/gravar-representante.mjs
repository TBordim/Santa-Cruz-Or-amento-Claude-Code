// Grava, numa passada só, o fluxo do vídeo do Representante (login → Novo Orçamento → enviar), no ritmo da voz.
//
//   node gravar-representante.mjs <pasta-de-saída>            grava e ENVIA a solicitação (cria um orçamento na demo)
//   DRY=1 node gravar-representante.mjs <pasta-de-saída>      ensaio: faz tudo, confere o formulário, mas NÃO envia
//   DEMO_URL=http://localhost:3003 (padrão)
//
// Saída: rep-tomada-01.webm e rep-marcas.json (instantes, em segundos de vídeo, usados na montagem).
//
// Tempo: depois do login, o formulário aparece e esse instante vira o "tv = 10,48 s" da narração (início da cena 3,
// "Comece pelo cliente"). Daí em diante h.ate(tv) espera o instante certo da voz (tempos tirados da transcrição de
// narracao-representante.mp3). O login é gravado em tempo real e acelerado na montagem para caber na cena 2.
import { chromium } from "playwright-core";
import os from "node:os";
import fs from "node:fs";
import { CURSOR } from "./cursor-gravacao.mjs";

const BASE = process.env.DEMO_URL ?? "http://localhost:3003";
const DRY = process.env.DRY === "1";
const OUT = process.argv[2];
if (!OUT) throw new Error("Uso: node gravar-representante.mjs <pasta-de-saída>");
fs.mkdirSync(OUT, { recursive: true });
const exe = `${os.homedir()}/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe`;
const W = 1280, H = 720;
const TV_BASE = 10.48; // início da cena 3 na narração

const browser = await chromium.launch({ executablePath: exe });
const ctx = await browser.newContext({
  viewport: { width: W, height: H }, colorScheme: "light", locale: "pt-BR",
  recordVideo: { dir: OUT, size: { width: W, height: H } },
});
await ctx.addInitScript(CURSOR, 1);
const page = await ctx.newPage();
page.setDefaultTimeout(30000);
const T0 = Date.now();
const marcas = {};
const marca = (nome) => { marcas[nome] = +((Date.now() - T0) / 1000).toFixed(2); };
let TB = 0; // instante (ms) em que tv = TV_BASE

const pausa = (ms) => page.waitForTimeout(ms);
async function ate(tv) {
  const falta = TB + (tv - TV_BASE) * 1000 - Date.now();
  if (falta > 0) await pausa(falta);
  else if (falta < -400) console.log(`  atraso de ${(-falta / 1000).toFixed(1)} s em tv=${tv}`);
}
async function vaiAte(loc) {
  await loc.scrollIntoViewIfNeeded();
  const b = await loc.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
  await pausa(80);
}
async function clica(loc) { await vaiAte(loc); await page.mouse.down(); await page.mouse.up(); await pausa(120); }
async function digita(loc, texto, delay = 90) { await clica(loc); await page.keyboard.type(texto, { delay }); await pausa(90); }
async function rola(loc) { await loc.evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "center" })); await pausa(750); }
// Rola a página devagar, em passos pequenos, durante `ms` milissegundos.
async function desce(px, ms) {
  const passos = Math.max(1, Math.round(ms / 60));
  for (let i = 0; i < passos; i++) { await page.mouse.wheel(0, px / passos); await pausa(60); }
}

// ---------- cena 2: entrar (gravado em tempo real; a montagem acelera) ----------
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.mouse.move(W / 2, H / 2);
await pausa(900);
marca("login_ini");
await clica(page.getByRole("button", { name: "Sou colaborador da Santa Cruz" }));
await clica(page.locator("#usuarioId"));
await pausa(300);
await clica(page.getByRole("option", { name: "Rafael Representante", exact: true }));
await digita(page.locator("#pin"), "4444", 130);
await clica(page.getByRole("button", { name: "Entrar" }));
await page.getByRole("heading", { name: "Novo Orçamento" }).waitFor({ timeout: 60000 });
if (!new URL(page.url()).pathname.startsWith("/novo")) throw new Error(`Depois do login a URL é ${page.url()} (esperava /novo)`);
await pausa(700); // o formulário fica visível um instante antes de a cena 3 começar
TB = Date.now();
marca("form_ok");

// ---------- cena 3: cliente (tv 10,48 a 19,88) ----------
const busca = page.getByPlaceholder("Digite parte do nome ou do CNPJ");
await ate(11.0); await clica(busca); // "Comece pelo cliente"
await ate(12.3); await digita(busca, "doce", 170); // "digite o nome ou o CNPJ"
await page.getByRole("button", { name: /Doces Serra Azul/ }).waitFor();
await ate(14.9); await vaiAte(page.getByRole("button", { name: /Docerias Vale Doce/ })); // "escolha na lista" (a lista aparece)
await ate(15.5); await vaiAte(page.getByRole("button", { name: /Doces Serra Azul/ }));
await ate(17.7); await vaiAte(page.getByRole("button", { name: /cadastrar novo/i })); // "clique em Cadastrar Novo" (sem clicar)
await ate(19.45); await clica(page.getByRole("button", { name: /Doces Serra Azul/ })); // escolhe o cliente
await page.getByText(/Cliente do cadastro/).first().waitFor();

// ---------- cena 4: entrega e produto (tv 19,88 a 27,96) ----------
await ate(20.2); await rola(page.locator('input[name="qtdEntregas"]')); // "Informe quantas entregas"
await ate(21.0); await digita(page.locator('input[name="qtdEntregas"]'), "1", 120);
await ate(22.2); await digita(page.locator('input[name="entregaDatas"]'), "30/11/2026", 110); // "e a data que o cliente pediu"
await ate(23.9); await rola(page.locator('input[name="modeloDescricao"]').first()); // "Depois, descreva o produto"
await ate(25.0); await digita(page.locator('input[name="modeloDescricao"]').first(), "Caixa para bolo 20 x 20 x 10 cm", 25);
await ate(26.3); await digita(page.locator('input[name="quantidades"]').first(), "5000", 60); // "coloque as quantidades a orçar"
await clica(page.getByRole("button", { name: /Adicionar quantidade/ }));
await digita(page.locator('input[name="quantidades"]').last(), "10000", 50);

// ---------- cena 5: detalhes técnicos (tv 27,96 a 42,9) ----------
const resumo = page.locator("summary").filter({ hasText: "Detalhes técnicos" });
await ate(28.2); await rola(resumo); // "Preencha os detalhes técnicos"
await ate(29.1); await clica(resumo);
await page.locator('input[name="medidaF"]').waitFor();
await ate(30.3); await digita(page.locator('input[name="medidaF"]'), "200", 40); // "Medidas,"
await digita(page.locator('input[name="medidaL"]'), "200", 40);
await digita(page.locator('input[name="medidaA"]'), "100", 40);
await digita(page.locator('input[name="suporteDescricao"]').first(), "Cartão duplex", 35); // "material,"
await digita(page.locator('input[name="suporteGramatura"]').first(), "300", 40);
await ate(33.0); await rola(page.getByText("Acabamento", { exact: true }).first()); // "acabamento."
await ate(34.2); await desce(900, 7000); // "Quanto mais informação, mais rápido sai o orçamento. Sem isso, a Engenharia precisa levantar, e atrasa." (rola devagar pelas seções)

// ---------- cena 6: enviar (tv 42,9 a 48,2) ----------
const enviar = page.getByRole("button", { name: "Enviar solicitação" });
await ate(42.5); await rola(enviar); // "Pronto!"
if (DRY) {
  const valido = await page.locator("form").first().evaluate((f) => f.checkValidity());
  console.log("DRY: formulário válido para envio:", valido);
  await ate(46.0);
} else {
  await ate(44.9); await clica(enviar); // "Clique em Enviar solicitação"
  await page.getByText("Solicitação enviada").first().waitFor({ timeout: 60000 });
  marca("enviada");
}
await ate(49.6); // segura a tela até o fim da fala
marca("fim");
fs.writeFileSync(`${OUT}/rep-marcas.json`, JSON.stringify({ ...marcas, tv_base: TV_BASE, dry: DRY }, null, 1));

const video = page.video();
await ctx.close();
const destino = `${OUT}/rep-tomada-${DRY ? "ensaio" : "01"}.webm`;
await video.saveAs(destino);
await video.delete();
await browser.close();
console.log("gravada:", destino, JSON.stringify(marcas));
