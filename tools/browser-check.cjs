#!/usr/bin/env node
/* Copyright (c) 2026 geniuskey and SemiBooks contributors. SPDX-License-Identifier: MIT */
/* 브라우저 검사: 모든 페이지를 데스크톱(1280)·모바일(360) 폭에서 열어 콘솔 오류와 가로 넘침을 확인한다.
   Playwright가 필요하다: 이 저장소 또는 ../book 에 설치된 것을 쓴다.
   사용: node tools/browser-check.cjs [--shots DIR] [페이지 경로 필터...] */
"use strict";
const fs = require("fs");
const path = require("path");
const http = require("http");

const ROOT = path.resolve(__dirname, "..");
let playwright;
for (const p of [process.env.PW_PATH, "playwright", path.join(ROOT, "../book/node_modules/playwright")].filter(Boolean)) { try { playwright = require(p); break; } catch (e) {} }
if (!playwright) { console.error("playwright not found (npm i -D playwright, or keep ../book checked out)"); process.exit(2); }

const args = process.argv.slice(2);
const importedOnly = args.includes("--imported");
if (importedOnly) args.splice(args.indexOf("--imported"), 1);
const offline = args.includes("--offline");
if (offline) args.splice(args.indexOf("--offline"), 1);
const shotIdx = args.indexOf("--shots");
const shots = shotIdx >= 0 ? path.resolve(args.splice(shotIdx, 2)[1]) : null;
const filters = args;

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

function pages() {
  const list = ["index.html"];
  for (const book of JSON.parse(fs.readFileSync(path.join(ROOT, "book.json"), "utf8")).books.map((p) => path.dirname(p))) {
    if (importedOnly && (book === "infra" || book === "cmp")) continue;
    list.push(`${book}/index.html`);
    for (const f of fs.readdirSync(path.join(ROOT, book, "chapters")).filter((f) => f.endsWith(".html")).sort()) list.push(`${book}/chapters/${f}`);
  }
  return filters.length ? list.filter((p) => filters.some((f) => p.includes(f))) : list;
}

(async () => {
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await playwright.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  if (shots) fs.mkdirSync(shots, { recursive: true });
  let bad = 0;
  for (const rel of pages()) {
    for (const [name, width] of [["desktop", 1280], ["mobile", 360]]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errs = [];
      page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
      page.on("console", (m) => { if (m.type() === "error" && !/cloudflareinsights|favicon|Failed to load resource/.test(m.text())) errs.push("console: " + m.text()); });
      if (offline) await page.route(/^https?:\/\//, (route) => route.request().url().startsWith(base) ? route.continue() : route.abort());
      await page.goto(base + rel, { waitUntil: "networkidle", timeout: 60000 }).catch((e) => errs.push("goto: " + e.message));
      await page.waitForTimeout(600);
      // 모든 range 입력을 끝까지 밀어 보며 예외가 나는지 본다
      await page.evaluate(() => {
        document.querySelectorAll('input[type="range"]').forEach((el) => {
          for (const v of [el.min || 0, el.max || 100, el.defaultValue]) { el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); }
        });
        document.querySelectorAll(".seg button").forEach((b) => b.click());
      }).catch((e) => errs.push("controls: " + e.message));
      await page.waitForTimeout(300);
      const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, nan: [...document.querySelectorAll(".stat .v, output")].filter((e) => /NaN|Infinity|undefined/.test(e.textContent)).map((e) => e.id || e.textContent).slice(0, 5) }));
      if (m.sw > m.iw + 1) errs.push(`horizontal overflow ${m.sw} > ${m.iw}`);
      if (m.nan.length) errs.push("NaN/Infinity in readouts: " + m.nan.join(", "));
      if (shots) await page.screenshot({ path: path.join(shots, rel.replace(/\//g, "__").replace(/\.html$/, "") + `.${name}.png`), fullPage: false });
      if (errs.length) { bad++; console.log(`FAIL ${rel} [${name}]\n  ` + [...new Set(errs)].slice(0, 8).join("\n  ")); }
      else console.log(`ok   ${rel} [${name}]`);
      await page.close();
    }
  }
  await browser.close();
  server.close();
  process.exit(bad ? 1 : 0);
})();
