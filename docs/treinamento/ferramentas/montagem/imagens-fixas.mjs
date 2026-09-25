import { chromium } from "playwright-core";
import os from "node:os"; import fs from "node:fs"; import { pathToFileURL } from "node:url";
const [dir] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: `${os.homedir()}/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe`, args: ["--allow-file-access-from-files"] });
// 1) Santinho pequeno com fundo transparente, pro canto das gravações de tela
let p = await b.newPage({ viewport: { width: 200, height: 200 } });
fs.writeFileSync(`${dir}/_s.html`, `<body style="margin:0;background:transparent"><img src="santinho.svg" style="width:200px;height:200px;display:block"></body>`);
await p.goto(pathToFileURL(`${dir}/_s.html`).href);
await p.waitForFunction(() => document.images[0].complete);
await p.screenshot({ path: `${dir}/santinho-200.png`, omitBackground: true });
// 2) Cartão final da prévia
p = await b.newPage({ viewport: { width: 1280, height: 720 } });
fs.writeFileSync(`${dir}/_c.html`, `<html><head><link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@700&display=block" rel="stylesheet"></head>
<body style="margin:0;width:1280px;height:720px;background:#F4EEE3;display:flex;align-items:center;justify-content:center;gap:40px;font-family:'Segoe UI',Arial">
<img src="santinho.svg" style="width:300px;height:300px">
<div><div style="font:600 18px 'Segoe UI';letter-spacing:4px;color:#9A430A">PRÉVIA PARA ANÁLISE</div>
<div style="font:700 56px Fredoka;color:#4A2208;margin:6px 0 10px">Cenas 1 a 6</div>
<div style="font:500 24px 'Segoe UI';color:#6B4A33">Módulo Laboratório · continua…</div></div></body></html>`);
await p.goto(pathToFileURL(`${dir}/_c.html`).href);
await p.waitForFunction(() => document.images[0].complete && document.fonts.check('700 56px Fredoka'), null, { timeout: 30000 });
await p.screenshot({ path: `${dir}/cartao-final.png` });
await b.close(); console.log("ok");
