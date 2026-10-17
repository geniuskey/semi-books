// 챕터 점검: JS 오류, 모바일(360px) 가로 넘침, 시뮬레이터/그림/퀴즈 개수.
// 사용: NODE_PATH=$(npm root -g) node tools/check.cjs [slug ...]
// CDN(KaTeX, three.js) 로드 실패는 무시한다(오프라인 환경 대비).
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".json": "application/json" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});

(async () => {
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const js = fs.readFileSync(path.join(root, "js/common.js"), "utf8");
  let slugs = process.argv.slice(2);
  if (!slugs.length) slugs = ["index", ...[...js.matchAll(/\{ slug: "(\w+)"/g)].map((m) => m[1])];
  const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  let bad = 0;
  for (const slug of slugs) {
    const url = slug === "index" ? `http://localhost:${port}/index.html` : `http://localhost:${port}/chapters/${slug}.html`;
    if (slug !== "index" && !fs.existsSync(path.join(root, "chapters", slug + ".html"))) { console.log(`✗ ${slug}: 파일 없음`); bad++; continue; }
    const out = [];
    for (const width of [1280, 360]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errs = [];
      page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
      page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|net::ERR|ERR_TUNNEL|cloudflareinsights/.test(m.text())) errs.push("console: " + m.text()); });
      await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
      await page.goto(url, { waitUntil: "load" });
      // 시뮬레이터 컨트롤을 조금씩 움직여 본다
      await page.evaluate(async () => {
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        window.scrollTo(0, document.body.scrollHeight); await sleep(150); window.scrollTo(0, 0);
        for (const el of document.querySelectorAll('input[type="range"]')) {
          const v = el.value;
          el.value = el.min; el.dispatchEvent(new Event("input", { bubbles: true }));
          el.value = el.max; el.dispatchEvent(new Event("input", { bubbles: true }));
          el.value = v; el.dispatchEvent(new Event("input", { bubbles: true }));
        }
        for (const b of document.querySelectorAll(".seg button, .sim-controls button")) b.click();
        for (const c of document.querySelectorAll('.sim input[type="checkbox"]')) { c.click(); c.click(); }
        for (const s of document.querySelectorAll(".sim select")) { for (const o of s.options) { s.value = o.value; s.dispatchEvent(new Event("change", { bubbles: true })); } }
        await sleep(400);
      });
      const info = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        sims: document.querySelectorAll(".sim").length,
        figs: document.querySelectorAll("figure.diagram").length,
        quiz: document.querySelectorAll(".quiz-q").length,
        h2: document.querySelectorAll("main section > h2").length,
        wide: [...document.querySelectorAll("main *")].filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1 && !e.closest(".table-wrap, .chain, pre, .katex-display")).slice(0, 3).map((e) => e.tagName.toLowerCase() + (e.id ? "#" + e.id : e.className && typeof e.className === "string" ? "." + e.className.split(" ")[0] : "")),
      }));
      out.push({ width, errs, info });
      await page.close();
    }
    const errs = [...new Set(out.flatMap((o) => o.errs))];
    const mob = out[1].info;
    const ok = !errs.length && mob.overflow <= 0;
    if (!ok) bad++;
    console.log(`${ok ? "✓" : "✗"} ${slug}: sim ${out[0].info.sims}, fig ${out[0].info.figs}, quiz ${out[0].info.quiz}, h2 ${out[0].info.h2}${mob.overflow > 0 ? `, 360px 넘침 ${mob.overflow}px ${mob.wide.join(" ")}` : ""}`);
    errs.slice(0, 8).forEach((e) => console.log("    " + e));
  }
  await browser.close();
  server.close();
  process.exit(bad ? 1 : 0);
})();
