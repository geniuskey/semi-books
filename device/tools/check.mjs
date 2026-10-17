// Copyright (c) 2026 geniuskey and DeviceBook contributors. MIT (see ../LICENSE-MIT).
// 페이지 점검: JS 오류, 콘솔 오류, 360px 가로 넘침, 빈 캔버스, 시뮬레이터 수.
// 실행: node tools/check.mjs [chapters/pn.html ...]   (인수 없으면 index + 전체 챕터)
// CDN이 막힌 환경에서는 CDN_DIR=<katex·three 압축을 푼 폴더>를 주면 그 파일로 대신 응답한다.
//   CDN_DIR/katex/dist/..., CDN_DIR/three/build/..., CDN_DIR/three/examples/js/...
// 옵션: SHOT=1 이면 tools/shots/ 에 스크린샷 저장. WIDTHS=360,1280
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";

const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { pw = require(path.join(execSync("npm root -g").toString().trim(), "playwright")); }
const { chromium } = pw;

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const CDN = process.env.CDN_DIR;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json", ".woff2": "font/woff2" };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}/`;

let pages = process.argv.slice(2);
if (!pages.length) pages = ["index.html", ...fs.readdirSync(path.join(ROOT, "chapters")).filter((f) => f.endsWith(".html")).map((f) => "chapters/" + f)];
const widths = (process.env.WIDTHS || "360,1280").split(",").map(Number);

const browser = await chromium.launch();
let fails = 0;
for (const pg of pages) {
  for (const w of widths) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
    page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|ERR_|net::/.test(m.text())) errs.push("console: " + m.text()); });
    await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async (route) => {
      const u = route.request().url();
      const m = u.match(/cdn\.jsdelivr\.net\/npm\/(katex|three)@[^/]+\/(.*)$/);
      if (CDN && m) {
        let f = path.join(CDN, m[1], m[2]);
        if (fs.existsSync(f)) return route.fulfill({ path: f, contentType: TYPES[path.extname(f)] || "application/octet-stream" });
      }
      return route.abort();
    });
    await page.goto(base + pg, { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(1500);
    // 스크롤하며 지연 초기화된 요소도 깨운다
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
    await page.waitForTimeout(500);
    const info = await page.evaluate(() => {
      const dw = document.documentElement.scrollWidth, vw = window.innerWidth;
      const wide = [];
      if (dw > vw + 1) {
        document.querySelectorAll("body *").forEach((el) => { const r = el.getBoundingClientRect(); if (r.right > vw + 1 && r.width > 0 && getComputedStyle(el).position !== "fixed") { const sc = el.closest(".table-wrap,.formula,.katex-display,.pb-drawer,.steps-list"); if (!sc) wide.push(el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (el.className && typeof el.className === "string" ? "." + el.className.split(" ").join(".") : "") + " → " + Math.round(r.right)); } });
      }
      const cvs = [...document.querySelectorAll("canvas")];
      const empty = cvs.filter((c) => c.width === 0 || c.height === 0 || c.getBoundingClientRect().height < 20).map((c) => c.id || "(no id)");
      return { dw, vw, wide: wide.slice(0, 8), sims: document.querySelectorAll(".sim").length, canvases: cvs.length, empty, quiz: document.querySelectorAll(".quiz-q").length };
    });
    const bad = errs.length || info.dw > info.vw + 1 || info.empty.length;
    if (bad) fails++;
    console.log(`${bad ? "✗" : "✓"} ${pg} @${w}px  sims=${info.sims} canvases=${info.canvases} quiz=${info.quiz}` + (info.dw > info.vw + 1 ? `  OVERFLOW ${info.dw}>${info.vw} ${info.wide.join(", ")}` : "") + (info.empty.length ? `  EMPTY ${info.empty.join(",")}` : ""));
    errs.slice(0, 10).forEach((e) => console.log("    " + e));
    if (process.env.SHOT) {
      fs.mkdirSync(path.join(ROOT, "tools/shots"), { recursive: true });
      await page.screenshot({ path: path.join(ROOT, "tools/shots", pg.replace(/[\/]/g, "_") + "_" + w + ".png"), fullPage: true });
    }
    await ctx.close();
  }
}
await browser.close();
server.close();
process.exit(fails ? 1 : 0);
