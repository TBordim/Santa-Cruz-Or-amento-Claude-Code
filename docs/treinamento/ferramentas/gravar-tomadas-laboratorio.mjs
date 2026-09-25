// Grava as tomadas do docs/treinamento/laboratorio/gravacao.md na demo publicada.
// Um .webm por tomada, 1920x1080, com cursor visível e destaque de clique.
import { chromium } from "playwright-core";
import os from "node:os";
import fs from "node:fs";

const BASE = "https://santa-cruz-or-amento-claude-code-git-demo-tbordim.vercel.app";
const OUT = process.argv[2];
const SO = process.argv[3] ? process.argv[3].split(",") : null; // ex.: "01,02" pra regravar só algumas
fs.mkdirSync(OUT, { recursive: true });
const exe = `${os.homedir()}/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe`;
const W = 1280, H = 720; // HD: a interface ocupa o quadro inteiro e fica 1,5x maior que numa tela 1920 — legível no celular
const ZOOM = 1;

// Cursor falso (headless não desenha o do sistema) + anel ao clicar.
const CURSOR = (zoom) => {
  const init = () => {
    if (document.getElementById("__cur")) return;
    const c = document.createElement("div");
    c.id = "__cur";
    c.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24"><path d="M3 2l7 19 2.5-7.5L20 11z" fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
    Object.assign(c.style, { position: "fixed", left: "0", top: "0", zIndex: 2147483647, pointerEvents: "none", transform: "translate(-3px,-2px)" });
    document.documentElement.appendChild(c);
    const st = document.createElement("style");
    st.textContent = `.__ring{position:fixed;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:3px solid #F47216;pointer-events:none;z-index:2147483646;animation:__r .5s ease-out forwards}@keyframes __r{from{transform:scale(.3);opacity:1}to{transform:scale(1.4);opacity:0}}`;
    document.documentElement.appendChild(st);
    const ult = JSON.parse(sessionStorage.getItem("__pos") || "null");
    if (ult) { c.style.left = ult[0] + "px"; c.style.top = ult[1] + "px"; }
    addEventListener("mousemove", (e) => { c.style.left = e.clientX + "px"; c.style.top = e.clientY + "px"; sessionStorage.setItem("__pos", JSON.stringify([e.clientX, e.clientY])); }, true);
    addEventListener("mousedown", (e) => {
      const r = document.createElement("div"); r.className = "__ring";
      r.style.left = e.clientX + "px"; r.style.top = e.clientY + "px";
      document.documentElement.appendChild(r); setTimeout(() => r.remove(), 600);
    }, true);
  };
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", init); else init();
};

const browser = await chromium.launch({ executablePath: exe });
let estado = null; // sessão logada da Ana, reaproveitada a partir da tomada 2
const feitas = [];

async function tomada(id, inicio, logado, passos) {
  if (SO && !SO.includes(id)) return;
  const ctx = await browser.newContext({
    viewport: { width: W, height: H }, colorScheme: "light", locale: "pt-BR",
    recordVideo: { dir: OUT, size: { width: W, height: H } },
    ...(logado && estado ? { storageState: estado } : {}),
  });
  await ctx.addInitScript(CURSOR, ZOOM);
  const page = await ctx.newPage();
  await page.goto(BASE + inicio, { waitUntil: "networkidle" });
  await page.mouse.move(W / 2, H / 2);
  const h = helpers(page);
  await h.pausa(1500);
  await passos(page, h);
  await h.pausa(1500);
  if (id === "01") estado = await ctx.storageState();
  const video = page.video();
  await ctx.close();
  const destino = `${OUT}/lab-tomada-${id}.webm`;
  await video.saveAs(destino);
  await video.delete();
  feitas.push(destino);
  console.log("gravada", id);
}

function helpers(page) {
  const pausa = (ms) => page.waitForTimeout(ms);
  async function vaiAte(loc) {
    await loc.scrollIntoViewIfNeeded();
    const b = await loc.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 30 });
    await pausa(250);
  }
  async function clica(loc) { await vaiAte(loc); await page.mouse.down(); await page.mouse.up(); await pausa(400); }
  async function digita(loc, texto, { limpa = false, delay = 90 } = {}) {
    await clica(loc);
    if (limpa) { await page.keyboard.press("Control+A"); await page.keyboard.press("Backspace"); }
    await page.keyboard.type(texto, { delay });
    await pausa(300);
  }
  async function escolhe(trigger, opcao) {
    await clica(trigger);
    await pausa(600);
    await clica(page.getByRole("option", { name: opcao, exact: true }));
  }
  async function rola(loc) { await loc.evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "center" })); await pausa(1200); }
  return { pausa, vaiAte, clica, digita, escolhe, rola };
}

const pct = (page, i) => page.locator('input[name="percentual"]').nth(i);

// Tomada 1 — chegando ao módulo (cena 3)
await tomada("01", "/login", false, async (page, h) => {
  await h.pausa(1000);
  await h.clica(page.getByRole("button", { name: "Sou colaborador da Santa Cruz" }));
  await h.escolhe(page.locator("#usuarioId"), "Ana Laboratório");
  await h.digita(page.locator("#pin"), "1111", { delay: 220 });
  await h.clica(page.getByRole("button", { name: "Entrar" }));
  await page.waitForURL(/\/painel/, { timeout: 60000 });
  await h.pausa(2000);
  await h.clica(page.getByRole("combobox", { name: "Trocar de módulo" }).first());
  await h.pausa(1000);
  await h.clica(page.getByRole("option", { name: "Laboratório", exact: true }));
  await page.waitForURL(/\/laboratorio$/, { timeout: 60000 });
  await h.pausa(3000);
});

// Tomada 2 — lista de cores (cena 4)
await tomada("02", "/laboratorio", true, async (page, h) => {
  await h.clica(page.getByRole("link", { name: "Cor", exact: true }).first());
  await page.waitForURL(/\/laboratorio\/cor$/);
  await h.pausa(3000);
  await h.digita(page.locator('input[name="q"]'), "café", { delay: 150 });
  await h.clica(page.getByRole("button", { name: "Buscar", exact: true }));
  await page.getByText("encontradas").first().waitFor();
  await h.pausa(2000);
  await h.clica(page.getByRole("link", { name: "Limpar" }));
  await page.getByText("(4)").first().waitFor();
  await h.pausa(2000);
});

// Tomada 3 — nova cor (cena 5)
await tomada("03", "/laboratorio/cor", true, async (page, h) => {
  await h.vaiAte(page.locator("#codigo"));
  await h.pausa(2000);
  await h.digita(page.locator("#cliente"), "Doces Serra Azul Ltda.");
  await h.digita(page.locator("#referenciaDeclarada"), "LARANJA P. 1665");
  await h.escolhe(page.locator("#tipoReferencia"), "Amostra do cliente");
  await h.digita(page.getByLabel("L* alvo"), "52", { delay: 200 });
  await h.digita(page.getByLabel("a* alvo"), "58", { delay: 200 });
  await h.digita(page.getByLabel("b* alvo"), "32", { delay: 200 });
  await h.pausa(2000);
  await h.digita(page.locator("#substrato"), "Cartão duplex 300 g/m²");
  await h.digita(page.locator("#acabamento"), "Verniz UV brilho");
  await h.pausa(1000);
  await h.clica(page.getByRole("button", { name: "Criar cor" }));
  await page.waitForURL(/\/laboratorio\/cor\/.+/, { timeout: 60000 });
  await h.pausa(3000);
  fs.writeFileSync(`${OUT}/.url-sta0005`, new URL(page.url()).pathname);
});
const bancada = () => (fs.existsSync(`${OUT}/.url-sta0005`) ? fs.readFileSync(`${OUT}/.url-sta0005`, "utf8") : "/laboratorio/cor");

// Tomada 4 — primeira fórmula (cena 6)
await tomada("04", bancada(), true, async (page, h) => {
  await h.rola(page.getByText("Registrar a primeira fórmula"));
  await h.escolhe(page.locator("#origem"), "Fórmula do fornecedor");
  const linhas = [["IRO21 — Orange", "45"], ["IRO33 — Warm Red", "30"], ["IRO48 — Transparent White", "25"]];
  for (const [i, [base, v]] of linhas.entries()) {
    if (i > 0) await h.clica(page.getByRole("button", { name: "Adicionar tinta" }));
    await h.escolhe(page.getByRole("combobox").filter({ hasText: "Base…" }).first(), base);
    await h.digita(pct(page, i), v, { delay: i === 2 ? 450 : 200 });
  }
  await h.pausa(2000);
  await h.clica(page.getByRole("button", { name: "Salvar rodada" }));
  await page.getByText("Rodada 1", { exact: true }).waitFor();
  await h.rola(page.getByText("Rodada 1", { exact: true }));
  await h.pausa(2000);
});

// Tomada 5 — puxada (cena 7)
await tomada("05", bancada(), true, async (page, h) => {
  await h.rola(page.getByText("Melhor LAB encontrado na puxada").first());
  await h.pausa(2000);
  await h.digita(page.locator('input[name="l"]').first(), "50,2", { delay: 180 });
  await h.digita(page.locator('input[name="a"]').first(), "61,5", { delay: 180 });
  await h.digita(page.locator('input[name="b"]').first(), "36,8", { delay: 180 });
  await h.clica(page.getByRole("button", { name: "Registrar puxada" }).first());
  await page.getByRole("button", { name: "Corrigir puxada" }).first().waitFor();
  await h.pausa(2000);
});

// Tomada 6 — ΔE e eixo LAB (cena 8)
await tomada("06", bancada(), true, async (page, h) => {
  await h.rola(page.locator('svg[aria-label^="Plano a*/b*"]'));
  await h.vaiAte(page.locator('svg[aria-label^="Plano a*/b*"]'));
  await h.pausa(3000);
  await h.vaiAte(page.getByText(/^L\* — alvo/).first());
  await h.pausa(2000);
  await h.rola(page.getByText("R1: 2,59"));
  await h.vaiAte(page.getByText("R1: 2,59"));
  await h.pausa(3000);
});

// Tomada 7 — novo ajuste (cena 9)
await tomada("07", bancada(), true, async (page, h) => {
  await h.rola(page.getByText("Novo ajuste — rodada 2"));
  await h.vaiAte(page.locator("#origem"));
  await h.pausa(2000);
  for (const [i, v] of ["44", "28,5", "27,5"].entries()) await h.digita(pct(page, i), v, { limpa: true, delay: 200 });
  await h.pausa(1000);
  await h.clica(page.getByRole("button", { name: "Salvar rodada" }));
  await page.getByText("Rodada 2", { exact: true }).waitFor();
  await h.rola(page.getByText("Rodada 2", { exact: true }));
  await h.digita(page.locator('input[name="l"]').nth(1), "51,6", { delay: 180 });
  await h.digita(page.locator('input[name="a"]').nth(1), "58,9", { delay: 180 });
  await h.digita(page.locator('input[name="b"]').nth(1), "33,1", { delay: 180 });
  await h.clica(page.getByRole("button", { name: "Registrar puxada" }).first());
  await page.getByText("R2: 0,59").waitFor();
  await h.rola(page.getByText("R2: 0,59"));
  await h.vaiAte(page.getByText("R2: 0,59"));
  await h.pausa(3000);
});

// Tomada 8 — aprovar (cena 10)
await tomada("08", bancada(), true, async (page, h) => {
  await h.rola(page.getByText("ΔE 0,59 — dentro da tolerância"));
  await h.vaiAte(page.getByText("ΔE 0,59 — dentro da tolerância"));
  await h.pausa(2000);
  await h.clica(page.getByRole("button", { name: "Aprovar esta rodada" }).nth(1));
  await page.getByText("Aprovada", { exact: true }).first().waitFor();
  await h.pausa(2000);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await h.pausa(1200);
  await h.vaiAte(page.getByText("Aprovado", { exact: true }).first());
  await h.pausa(2000);
});

// Tomada 9 — corrigir sem salvar nem excluir (cena 11)
await tomada("09", bancada(), true, async (page, h) => {
  await h.clica(page.getByRole("button", { name: "Editar dados" }));
  await h.vaiAte(page.getByText("Gerado pelo sistema, não muda."));
  await h.pausa(2000);
  await h.clica(page.getByRole("button", { name: "Cancelar", exact: true }));
  await h.rola(page.getByText("Rodada 2", { exact: true }));
  await h.vaiAte(page.getByRole("button", { name: "Corrigir esta rodada" }).nth(1));
  await h.pausa(2000);
  await h.clica(page.getByRole("button", { name: "Excluir esta rodada" }).nth(1));
  await page.getByText("Excluir a rodada 2?").waitFor();
  await h.pausa(3000);
  await h.clica(page.getByRole("button", { name: "Cancelar" }));
  await h.pausa(1000);
});

// Tomada 10 — Produção (cena 12)
await tomada("10", "/laboratorio", true, async (page, h) => {
  await h.clica(page.getByRole("link", { name: "Produção", exact: true }).first());
  await page.waitForURL(/\/producao/);
  await h.pausa(2000);
  await h.digita(page.locator("#codigo"), "sta0005", { delay: 150 });
  await h.clica(page.getByRole("button", { name: "Buscar", exact: true }));
  await page.locator("#kg").waitFor();
  await h.pausa(2000);
  await h.digita(page.locator("#kg"), "25", { delay: 250 });
  await h.vaiAte(page.getByText("11,000"));
  await h.pausa(3000);
});

// Tomada 11a — LAB alvo incompleto
await tomada("11a", "/laboratorio/cor", true, async (page, h) => {
  await h.digita(page.locator("#cliente"), "Teste de erro");
  await h.digita(page.getByLabel("L* alvo"), "52", { delay: 200 });
  await h.clica(page.getByRole("button", { name: "Criar cor" }));
  await h.vaiAte(page.getByText("Preencha os 3 valores do LAB alvo").first());
  await h.pausa(3000);
});

// Tomada 11b — soma que não fecha
await tomada("11b", bancada(), true, async (page, h) => {
  await h.rola(page.getByText("Novo ajuste — rodada 3"));
  for (const [i, v] of ["44", "28", "27,5"].entries()) await h.digita(pct(page, i), v, { limpa: true, delay: 180 });
  await h.pausa(1000);
  await h.clica(page.getByRole("button", { name: "Salvar rodada" }));
  await h.vaiAte(page.getByText("A soma dos percentuais precisa fechar em 100,00%").first());
  await h.pausa(3000);
});

// Tomada 11c — mesma tinta em duas linhas
await tomada("11c", bancada(), true, async (page, h) => {
  await h.rola(page.getByText("Novo ajuste — rodada 3"));
  await h.escolhe(page.getByRole("combobox").filter({ hasText: "IRO48" }).first(), "IRO33 — Warm Red");
  await h.pausa(1000);
  await h.clica(page.getByRole("button", { name: "Salvar rodada" }));
  await h.vaiAte(page.getByText("A tinta IRO33 aparece em mais de uma linha").first());
  await h.pausa(3000);
});

// Tomada 11d — código incompleto na Produção
await tomada("11d", "/laboratorio/producao", true, async (page, h) => {
  await h.digita(page.locator("#codigo"), "0005", { delay: 200 });
  await h.clica(page.getByRole("button", { name: "Buscar", exact: true }));
  await h.vaiAte(page.getByText('Nenhuma cor encontrada com o código "0005".'));
  await h.pausa(3000);
});

await browser.close();
fs.rmSync(`${OUT}/.url-sta0005`, { force: true });
console.log(`\n${feitas.length} tomadas gravadas em ${OUT}`);
