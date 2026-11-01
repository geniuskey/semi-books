// Render og.png (1200×630 share image for the shelf home) from catalog.js.
// Usage: node tools/og.mjs   (rerun after books, chapters or simulators change)
// Covers use the same shelf.css and covers.js as the home page; stats are counted like shared/js/shelf.js.
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(join(root, f), 'utf8');
const window = {};
new Function('window', read('catalog.js'))(window);
const books = window.SEMI_BOOKS;
const byId = new Map(books.map((b) => [b.id, b]));

const chapters = books.reduce((n, b) => n + (b.chapters || 0), 0);
const simulators = Math.floor(books.reduce((n, b) => n + (b.simulators || 0), 0) / 100) * 100;

// Five per shelf, roughly along the value chain: circuits, fab process, products.
const shelves = [
  ['devicebook', '반도체 소자'], ['digitalbook', '디지털 회로'], ['analogbook', '아날로그 회로'], ['socbook', '시스템 온 칩'], ['designbook', '반도체 설계'],
  ['processbook', '제조 공정'], ['lithobook', '노광'], ['etchbook', '식각'], ['cmpbook', 'CMP·세정'], ['packagingbook', '패키징'],
  ['memorybook', '메모리'], ['sensorbook', '이미지 센서'], ['powerbook', '전력 반도체'], ['yieldbook', '수율 분석'], ['chipindustrybook', '반도체 산업'],
];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const logo = read('favicon.svg');

const covers = shelves.map(([id, title]) => {
  const b = byId.get(id);
  if (!b) throw new Error(`og.mjs: ${id} is not in catalog.js`);
  return `<div class="book"><div class="book-stand"><div class="book-cover" style="--c:${b.color}">
    <strong>${esc(title)}</strong><span class="book-art" data-motif="${esc(b.motif)}"></span><span class="book-foot"></span>
  </div></div></div>`;
}).join('');

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>${read('shelf.css')}</style><style>
  html, body { margin:0; width:1200px; height:630px; overflow:hidden; }
  body { position:relative; color:#e6ebf5; font-family:var(--font); word-break:keep-all;
    background: radial-gradient(ellipse 70% 90% at 78% 45%, #1a2540 0%, transparent 70%), linear-gradient(160deg, #111a2c, #0a0e17); }
  body::before { content:""; position:absolute; inset:0; opacity:.5;
    background-image:linear-gradient(#ffffff08 1px, transparent 1px), linear-gradient(90deg, #ffffff08 1px, transparent 1px); background-size:40px 40px; }
  .left { position:absolute; left:62px; top:70px; width:440px; }
  .brand { display:flex; align-items:center; gap:16px; font-size:29px; font-weight:800; letter-spacing:-.02em; }
  .brand svg { width:48px; height:48px; }
  .eyebrow { margin-top:48px; color:#ffa94d; font:600 13px var(--mono); letter-spacing:.2em; }
  h1 { margin:16px 0 0; font-size:46px; line-height:1.3; font-weight:800; letter-spacing:-.04em; }
  h1 .soft { color:#a9c4ec; } h1 .warm { color:#ffb27a; }
  .lead { margin:22px 0 0; color:#aeb8cc; font-size:17px; line-height:1.65; }
  .stats { display:flex; gap:22px; margin-top:26px; color:#aeb8cc; font-size:14px; }
  .stats b { margin-right:5px; color:#fff; font:700 21px var(--mono); }
  .url { position:absolute; left:62px; bottom:68px; color:#ffa94d; font:600 15px var(--mono); }
  .case { --gap:28px; position:absolute; left:568px; top:92px; width:578px; display:grid; grid-template-columns:repeat(5,1fr); column-gap:var(--gap); row-gap:30px; }
  .book-cover { padding:12% 9% 9% 13%; }
  .book-cover strong { margin-top:0; font-size:12.5px; white-space:nowrap; letter-spacing:-.05em; }
  .book-art { margin:6% 0 8%; }
  .book-foot { padding-top:0; }
</style></head><body>
  <div class="left">
    <div class="brand">${logo}<span>SemiBooks</span></div>
    <div class="eyebrow">INTERACTIVE SEMICONDUCTOR TEXTBOOKS</div>
    <h1>전자 하나에서 칩까지,<br><span class="soft">직접 만져 보며</span> <span class="warm">배우는<br>반도체</span></h1>
    <p class="lead">소자·회로 설계에서 공정·인프라, 패키징·테스트,<br>메모리·센서·전력과 산업까지 한 서가에서.</p>
    <div class="stats"><span><b>${books.length}</b>권</span><span><b>${chapters}</b>개 장</span><span><b>${simulators.toLocaleString('ko-KR')}+</b>시뮬레이터</span></div>
  </div>
  <div class="url">semi.euiyun.com</div>
  <div class="case">${covers}</div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.addScriptTag({ content: read('shared/js/covers.js') });
await page.evaluate(async () => {
  document.querySelectorAll('[data-motif]').forEach((el) => { el.innerHTML = window.coverArt(el.dataset.motif); });
  await document.fonts.ready;
});
await page.screenshot({ path: join(root, 'og.png') });
await browser.close();
console.log(`og.png: ${books.length} books, ${chapters} chapters, ${simulators}+ simulators`);
