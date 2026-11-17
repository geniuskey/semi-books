#!/usr/bin/env node
/* Copyright (c) 2026 geniuskey and SemiBooks contributors. SPDX-License-Identifier: MIT */
/* 브라우저 검사: 모든 페이지를 데스크톱(1280)·모바일(360) 폭에서 열어 콘솔 오류와 가로 넘침을 확인한다.
   Playwright가 필요하다: 이 저장소 또는 ../book 에 설치된 것을 쓴다.
   사용: node tools/browser-check.cjs [--dist] [--mobile] [--shots DIR] [페이지 경로 필터...] */
"use strict";
const fs = require("fs");
const path = require("path");
const http = require("http");

const ROOT = path.resolve(__dirname, "..");
let playwright;
for (const p of [process.env.PW_PATH, "playwright", path.join(ROOT, "../book/node_modules/playwright")].filter(Boolean)) { try { playwright = require(p); break; } catch (e) {} }
if (!playwright) { console.error("playwright not found (npm i -D playwright, or keep ../book checked out)"); process.exit(2); }

const args = process.argv.slice(2);
const built = args.includes("--dist");
if (built) args.splice(args.indexOf("--dist"), 1);
const mobileOnly = args.includes("--mobile");
if (mobileOnly) args.splice(args.indexOf("--mobile"), 1);
const serveRoot = built ? path.join(ROOT, ".book-dist") : ROOT;
const importedOnly = args.includes("--imported");
// book.json에 meta가 있는 책은 이 저장소에서 집필한다(--imported에서 제외, 용어 툴팁까지 검사).
const BOOKS = JSON.parse(fs.readFileSync(path.join(ROOT, "book.json"), "utf8")).books.map((p) => path.dirname(p));
const WRITTEN = new Set(BOOKS.filter((book) => JSON.parse(fs.readFileSync(path.join(ROOT, book, "book.json"), "utf8")).meta));
if (importedOnly) args.splice(args.indexOf("--imported"), 1);
const offline = args.includes("--offline");
if (offline) args.splice(args.indexOf("--offline"), 1);
const shotIdx = args.indexOf("--shots");
const shots = shotIdx >= 0 ? path.resolve(args.splice(shotIdx, 2)[1]) : null;
const filters = args;

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const file = path.join(serveRoot, p);
  if (!file.startsWith(serveRoot + path.sep) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

function pages() {
  const list = ["index.html"];
  for (const rel of ['terms.html', '404.html']) if (fs.existsSync(path.join(serveRoot, rel))) list.push(rel);
  for (const book of BOOKS) {
    if (importedOnly && WRITTEN.has(book)) continue;
    list.push(`${book}/index.html`);
    for (const f of fs.readdirSync(path.join(serveRoot, book)).filter((f) => f.endsWith('.html') && !['index.html', 'terms.html'].includes(f)).sort()) list.push(`${book}/${f}`);
    for (const f of fs.readdirSync(path.join(ROOT, book, "chapters")).filter((f) => f.endsWith(".html")).sort()) list.push(`${book}/chapters/${f}`);
    // 찾아보기 is generated (tools/search-index.mjs): there after npm run build (--dist) or a local index run.
    if (fs.existsSync(path.join(serveRoot, book, "terms.html"))) list.push(`${book}/terms.html`);
  }
  return filters.length ? list.filter((p) => filters.some((f) => p.includes(f))) : list;
}

(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await playwright.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  if (shots) fs.mkdirSync(shots, { recursive: true });
  let bad = 0;
  for (const rel of pages()) {
    for (const [name, width] of mobileOnly ? [["mobile", 360]] : [["desktop", 1280], ["mobile", 360]]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errs = [];
      page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
      page.on("console", (m) => { if (m.type() === "error" && !/cloudflareinsights|favicon|Failed to load resource/.test(m.text())) errs.push("console: " + m.text()); });
      if (offline) await page.route(/^https?:\/\//, (route) => {
        const url = route.request().url();
        if (url.startsWith(base)) return route.continue();
        // 배포 수식은 미리 렌더링되어 있다. CSS까지 차단하면 숨겨야 할
        // MathML과 HTML이 동시에 나타나 가로 넘침을 잘못 보고한다.
        const asset = url.match(/^https:\/\/cdn\.jsdelivr\.net\/npm\/katex@[^/]+\/dist\/(katex\.min\.css|fonts\/[\w.-]+)$/);
        if (asset) {
          const file = path.join(path.dirname(require.resolve('katex')), asset[1]);
          if (fs.existsSync(file)) return route.fulfill({ path: file, contentType: TYPES[path.extname(file)] });
        }
        return route.abort();
      });
      await page.goto(base + rel, { waitUntil: "networkidle", timeout: 60000 }).catch((e) => errs.push("goto: " + e.message));
      await page.waitForTimeout(600);
      if (!offline && await page.locator('script[src*="/three@0."]').count()) {
        await page.evaluate(() => {
          if (!window.THREE || !window.THREE.OrbitControls) throw new Error('3D libraries did not load');
          if (!document.querySelector('canvas[data-engine]')) throw new Error('3D renderer did not initialize');
        }).catch((e) => errs.push('three: ' + e.message));
        for (const canvas of await page.locator('canvas[data-engine]').all()) {
          await canvas.scrollIntoViewIfNeeded();
          await page.waitForTimeout(250);
        }
      }
      if (WRITTEN.has(rel.split("/")[0]) && rel.includes("/chapters/")) {
        await page.evaluate(async () => {
          if (!window.BookGlossary) throw new Error("glossary tooltips did not load");
          const { count } = await window.BookGlossary.ready;
          if (!count) throw new Error("no glossary terms annotated");
          if (document.querySelector(".katex .gl-term, .quiz .gl-term, .sim-controls .gl-term")) {
            throw new Error("glossary annotated an excluded component");
          }
        }).catch((e) => errs.push("glossary: " + e.message));
        const term = page.locator(".gl-term").first();
        if (await term.count()) {
          await term.focus();
          const tooltip = page.locator("#book-glossary-tooltip");
          if (!await tooltip.isVisible()) errs.push("glossary: focus did not open tooltip");
          const box = await tooltip.boundingBox();
          if (box && (box.x < 0 || box.x + box.width > width)) errs.push("glossary: tooltip overflows viewport");
          await page.keyboard.press("Escape");
          if (await tooltip.isVisible()) errs.push("glossary: Escape did not close tooltip");
          await term.click();
          if (!await tooltip.isVisible()) errs.push("glossary: click did not open tooltip");
          await page.keyboard.press("Escape");
          await page.mouse.move(0, 0);
          await term.hover();
          if (!await tooltip.isVisible()) errs.push("glossary: hover did not open tooltip");
          await page.keyboard.press("Escape");
        }
      }
      // 슬라이더 경계와 선택 메뉴·체크박스·모드 전환까지 조작한다.
      const controlErrors = await page.evaluate(() => {
        const errors = new Set();
        const checkReadouts = (trigger) => {
          for (const el of document.querySelectorAll('.stat .v, output')) {
            if (/NaN|Infinity|undefined/.test(el.textContent) && el.textContent.trim() !== el.dataset.expectedNonfinite) {
              errors.add(`${trigger}: ${el.id || el.textContent} = ${el.textContent.trim()}`);
            }
          }
        };
        checkReadouts('initial');
        const fire = (el) => {
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
          checkReadouts(`${el.id || el.tagName}=${el.value}`);
        };
        document.querySelectorAll('input[type="range"]').forEach((el) => {
          for (const v of [el.min || 0, el.max || 100, el.defaultValue]) { el.value = v; fire(el); }
        });
        document.querySelectorAll("select").forEach((el) => {
          if (el.disabled) return;
          const original = el.value;
          const values = [...el.options].filter((o) => !o.disabled).map((o) => o.value);
          for (const value of values) {
            // 프리셋 선택으로 옵션이 다시 만들어지는 메뉴도 있다.
            if (![...el.options].some((o) => o.value === value && !o.disabled)) continue;
            el.value = value;
            fire(el);
          }
          if ([...el.options].some((o) => o.value === original)) { el.value = original; fire(el); }
        });
        document.querySelectorAll('.sim input[type="checkbox"]').forEach((el) => {
          if (el.disabled) return;
          const original = el.checked;
          el.click();
          checkReadouts(`${el.id || 'checkbox'}=${el.checked}`);
          if (el.checked !== original) el.click();
        });
        document.querySelectorAll(".seg button").forEach((b) => {
          b.click();
          checkReadouts(`${b.parentElement.id || 'mode'}=${b.dataset.value || b.textContent.trim()}`);
        });
        return [...errors];
      }).catch((e) => { errs.push("controls: " + e.message); return []; });
      errs.push(...controlErrors.map((e) => 'readout: ' + e));
      await page.waitForTimeout(300);
      const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, nan: [...document.querySelectorAll(".stat .v, output")].filter((e) => /NaN|Infinity|undefined/.test(e.textContent) && e.textContent.trim() !== e.dataset.expectedNonfinite).map((e) => e.id || e.textContent).slice(0, 5) }));
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
