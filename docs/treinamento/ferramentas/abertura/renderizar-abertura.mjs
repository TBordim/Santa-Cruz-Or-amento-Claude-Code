// Renderiza previa.html quadro a quadro (30 fps) em JPEGs, pra depois juntar com o áudio no ffmpeg.
import { chromium } from "playwright-core";
import os from "node:os";
import { pathToFileURL } from "node:url";
import path from "node:path";

const dir = process.argv[3];
const fala = process.argv[2] || "11.36";
const fps = 30;
const b = await chromium.launch({ executablePath: `${os.homedir()}/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe`, args: ["--allow-file-access-from-files"] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto(pathToFileURL(path.join(dir, "previa.html")).href + `?fala=${fala}`);
await p.waitForFunction(() => document.getElementById("santinho").complete && document.fonts.check('700 92px "Fredoka"'), null, { timeout: 30000 });
const fim = await p.evaluate(() => window.FIM);
const n = Math.ceil(fim * fps);
for (let i = 0; i < n; i++) {
  await p.evaluate((t) => window.render(t), i / fps);
  await p.screenshot({ path: path.join(dir, "quadros", `${String(i).padStart(4, "0")}.jpg`), type: "jpeg", quality: 92 });
}
await b.close();
console.log(`${n} quadros (${fim.toFixed(2)} s)`);
