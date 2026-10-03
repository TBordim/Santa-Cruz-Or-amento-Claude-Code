// Renderiza abertura-express.html quadro a quadro (30 fps) em JPEGs.
//   node renderizar-express.mjs <pasta-com-santinho.svg> [fim-em-segundos]
// A pasta precisa ter o santinho.svg (docs/treinamento/assets/santinho.svg); os quadros saem em <pasta>/quadros.
import { chromium } from "playwright-core";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const dir = process.argv[2];
const fim = process.argv[3] || "8.92";
const fps = 30;
fs.copyFileSync(new URL("./abertura-express.html", import.meta.url), path.join(dir, "abertura-express.html"));
fs.mkdirSync(path.join(dir, "quadros"), { recursive: true });
const b = await chromium.launch({ executablePath: `${os.homedir()}/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe`, args: ["--allow-file-access-from-files"] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto(pathToFileURL(path.join(dir, "abertura-express.html")).href + `?fim=${fim}`);
await p.waitForFunction(() => document.getElementById("santinho").complete && document.fonts.check('700 92px "Fredoka"'), null, { timeout: 30000 });
const n = Math.ceil(Number(fim) * fps);
for (let i = 0; i < n; i++) {
  await p.evaluate((t) => window.render(t), i / fps);
  await p.screenshot({ path: path.join(dir, "quadros", `${String(i).padStart(4, "0")}.jpg`), type: "jpeg", quality: 92 });
}
await b.close();
console.log(`${n} quadros (${fim} s)`);
