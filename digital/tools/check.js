// Copyright (c) 2026 geniuskey and DigitalBook contributors. MIT (see ../LICENSE-MIT).
// 페이지 점검: 콘솔 오류, 360px 가로 넘침, 스크린샷.
// 실행: node tools/check.js [slug ...]   (기본: 전체 챕터 + index)
// 환경 변수 SHOT=dir 이면 스크린샷 저장, CDN 차단 환경에서도 동작하도록 외부 요청은 무시한다.
const { chromium } = require(process.env.PW_PATH || "playwright");
const path = require("path"), fs = require("fs");
const ROOT = path.resolve(__dirname, "..");
const src = fs.readFileSync(path.join(ROOT, "js/common.js"), "utf8");
const all = [...src.matchAll(/slug: "([\w-]+)"/g)].map((m) => m[1]);
const slugs = process.argv.slice(2).length ? process.argv.slice(2) : ["index", ...all];
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  let bad = 0;
  for (const slug of slugs) {
    const file = slug === "index" ? path.join(ROOT, "index.html") : path.join(ROOT, "chapters", slug + ".html");
    if (!fs.existsSync(file)) { console.log("MISSING", slug); bad++; continue; }
    for (const width of [1280, 360]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errs = [];
      page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
      page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|net::ERR/.test(m.text())) errs.push("console: " + m.text()); });
      await page.route(/^https?:\/\//, (r) => r.abort());
      await page.goto("file://" + file);
      await page.waitForTimeout(700);
      // 모든 range를 끝까지 움직여 보고, seg 버튼을 눌러 본다 (예외 잡기)
      if (width === 1280) {
        await page.evaluate(() => {
          document.querySelectorAll('input[type="range"]').forEach((r) => { for (const v of [r.min, r.max, (Number(r.min) + Number(r.max)) / 2]) { r.value = v; r.dispatchEvent(new Event("input", { bubbles: true })); } });
          document.querySelectorAll(".seg button, .sim button, figure.play button").forEach((b) => { if (!/자동|재생|▶|play/i.test(b.textContent)) { try { b.click(); } catch (e) {} } });
          document.querySelectorAll(".sim select, figure.play select").forEach((s) => { [...s.options].forEach((o) => { s.value = o.value; s.dispatchEvent(new Event("change", { bubbles: true })); s.dispatchEvent(new Event("input", { bubbles: true })); }); });
        });
        await page.waitForTimeout(600);
      }
      const ov = await page.evaluate(() => {
        const W = document.documentElement.clientWidth, out = [];
        if (document.documentElement.scrollWidth > W + 1) {
          document.querySelectorAll("main *").forEach((el) => { const r = el.getBoundingClientRect(); if (r.right > W + 1 && r.width > 0 && !el.closest(".table-wrap,.formula,.katex-display,.steps-list,[data-scroll]")) out.push(el.tagName + "." + el.className + "#" + el.id + " right=" + Math.round(r.right)); });
          return [document.documentElement.scrollWidth, out.slice(0, 6)];
        }
        return null;
      });
      const n = await page.evaluate(() => ({ sim: document.querySelectorAll(".sim").length, play: document.querySelectorAll("figure.play").length, canvas: document.querySelectorAll("canvas").length, quiz: document.querySelectorAll(".quiz-q").length, predict: document.querySelectorAll(".predict").length, chars: (document.querySelector("main") || document.body).innerText.length }));
      if (process.env.SHOT) { fs.mkdirSync(process.env.SHOT, { recursive: true }); await page.screenshot({ path: path.join(process.env.SHOT, slug + "-" + width + ".png"), fullPage: true }); }
      const ok = !errs.length && !ov;
      if (!ok) bad++;
      console.log((ok ? "ok  " : "FAIL") + " " + slug + " @" + width + (width === 1280 ? ` sims=${n.sim} play=${n.play} canvas=${n.canvas} quiz=${n.quiz} predict=${n.predict} chars=${n.chars}` : ""));
      errs.slice(0, 8).forEach((e) => console.log("     " + e));
      if (ov) console.log("     overflow scrollWidth=" + ov[0] + " " + ov[1].join(" | "));
      await page.close();
    }
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
