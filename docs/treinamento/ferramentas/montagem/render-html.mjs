// Renderiza uma página com window.render(t)/window.FIM quadro a quadro (30 fps) em JPEGs.
// uso: node render-html.mjs <arquivo.html> <pasta-saida> [querystring]
import { chromium } from "playwright-core";
import os from "node:os";
import fs from "node:fs";
import { pathToFileURL } from "node:url";

const [html, out, qs = ""] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: `${os.homedir()}/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe`, args: ["--allow-file-access-from-files"] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto(pathToFileURL(html).href + (qs ? "?" + qs : ""));
await p.waitForFunction(() => [...document.images].every((i) => i.complete) && document.fonts.check('700 34px "Fredoka"'), null, { timeout: 30000 });
const fim = await p.evaluate(() => window.FIM);
const n = Math.ceil(fim * 30);
for (let i = 0; i < n; i++) {
  await p.evaluate((t) => window.render(t), i / 30);
  await p.screenshot({ path: `${out}/${String(i).padStart(4, "0")}.jpg`, type: "jpeg", quality: 92 });
}
await b.close();
console.log(`${n} quadros (${fim.toFixed(2)} s)`);
