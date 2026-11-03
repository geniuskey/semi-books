/* Copyright (c) 2026 geniuskey and SemiBooks contributors. MIT. */
/* Builds the home page search index: every chapter, section, simulator and glossary term of all books.
   Two files: search-index.json (headings, key terms, simulators, glossary; fetched on first focus) and
   search-text.json (section body text aligned with the entries; fetched right after for full-text hits).
   The build writes both to .book-dist/; `node tools/search-index.mjs` writes them to the repo root for local preview. */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', middot: '·', ndash: '–', mdash: '—', times: '×', minus: '−', rarr: '→', larr: '←', hellip: '…', deg: '°', micro: 'µ', plusmn: '±', le: '≤', ge: '≥' };
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) =>
  e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENTITIES[e] ?? m);
// Inline TeX reads as plain text in snippets: common commands become their symbols, the rest lose the backslash.
const TEX = { approx: '≈', ll: '≪', gg: '≫', times: '×', cdot: '·', le: '≤', leq: '≤', ge: '≥', geq: '≥', propto: '∝', sqrt: '√', pm: '±', to: '→', rightarrow: '→', infty: '∞', partial: '∂', nabla: '∇', sum: 'Σ', int: '∫', neq: '≠', sim: '~', degree: '°', circ: '°',
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε', eta: 'η', theta: 'θ', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', phi: 'φ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω', hbar: 'ħ', ell: 'ℓ' };
const tex = (s) => s.replace(/\\\(|\\\)|\\\[|\\\]|\$\$?/g, ' ')
  .replace(/\\(?:mathrm|text|textrm|mathbf|mathit|mathcal|operatorname|left|right|big|Big|displaystyle|quad|qquad)\b/g, '').replace(/\\[,;:! ]/g, ' ')
  .replace(/\\frac\b/g, '').replace(/\\([a-zA-Z]+)/g, (m, name) => TEX[name] ?? name).replace(/[{}\\]/g, '').replace(/_/g, '');
export const text = (html) => tex(decode(html
  .replace(/<(script|style|svg|canvas|math|template|select|button|noscript)\b[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<(?:br|\/p|\/li|\/h\d|\/div|\/td|\/th|\/dd|\/dt)\b[^>]*>/gi, ' ')
  .replace(/<[^>]+>/g, ''))).replace(/\s+/g, ' ').trim();
const clip = (s, n) => (s.length > n ? s.slice(0, n).replace(/\s\S*$/, '') + '…' : s);
// Bold and emphasised words are the section's key terms; they rank above plain body text.
const keys = (html) => [...new Set([...html.matchAll(/<(strong|b|em|dfn)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((m) => text(m[2])).filter((k) => k.length > 1 && k.length < 40 && !/^[약±~≈\d.(\s-]/.test(k)))].join(' · ');

// Body text is capped to keep search-text.json near 2 MB gzipped.
const BODY = 900, LEAD = 300, SIM = 300;

function chapterEntries(html, book, chapter) {
  const out = [];
  const main = html.slice(html.search(/<body\b/i));
  const h1 = text(main.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '') || chapter.title;
  const lead = text(main.match(/<p class="lead"[^>]*>([\s\S]*?)<\/p>/i)?.[1] || '') || chapter.desc || '';
  out.push({ t: 'c', b: book, c: chapter.slug, h: h1, x: clip(lead, LEAD) });
  const parts = main.split(/(?=<section\b[^>]*\bid=")/i).slice(1);
  for (const part of parts) {
    const id = part.match(/^<section\b[^>]*\bid="([^"]+)"/i)[1];
    const h2 = part.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i);
    if (!h2) continue;
    const sims = [...part.matchAll(/<div class="sim\b[^"]*"[^>]*\bid="([^"]+)"[^>]*>[\s\S]*?(?:<span class="sim-tag">([^<]*)<\/span>)?\s*<h3\b[^>]*>([\s\S]*?)<\/h3>/gi)];
    // Simulator notes ("해볼 것") describe what the reader can do; keep them with the simulator, not the section.
    const body = part.replace(/<div class="sim-(?:note|controls|readout)"[^>]*>[\s\S]*?<\/div>|<span class="sim-tag">[^<]*<\/span>/gi, ' ');
    const sub = [...body.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi)].map((m) => text(m[1])).join(' · ');
    const heading = text(h2[1]);
    if (/^(확인 퀴즈|퀴즈|핵심 정리|정리|요약)$/.test(heading)) continue;
    const full = text(body.replace(h2[0], ''));
    out.push({ t: 's', b: book, c: chapter.slug, i: id, h: heading, k: [keys(body), sub].filter(Boolean).join(' · '), body: clip(full, BODY), full });
    for (const [, simId, tag, h3] of sims) {
      const note = part.match(new RegExp(`id="${simId}"[\\s\\S]*?<div class="sim-note"[^>]*>([\\s\\S]*?)</div>`))?.[1] || '';
      out.push({ t: 'm', b: book, c: chapter.slug, i: simId, h: text(h3), g: (tag || '').trim(), body: clip(text(note).replace(/^해볼 것:\s*/, ''), SIM) });
    }
  }
  // Figures, for the in-book search only. Ids follow the top bar runtime: a captioned figure without an id
  // becomes search-fig-N, counted over the chapter's captioned figures.
  let n = 0;
  for (const [, attrs, inner] of main.matchAll(/<figure\b([^>]*)>([\s\S]*?)<\/figure>/gi)) {
    const caption = inner.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i);
    if (!caption) continue;
    n++;
    const h = clip(text(caption[1]), 140);
    if (h) out.push({ t: 'f', b: book, c: chapter.slug, i: attrs.match(/\bid="([^"]+)"/)?.[1] || `search-fig-${n}`, h });
  }
  return out;
}

async function glossary(root, slug) {
  const file = join(root, slug, 'js/glossary-data.js');
  if (!existsSync(file)) return [];
  const window = {};
  vm.runInNewContext(await readFile(file, 'utf8'), { window });
  const terms = window.BOOK_GLOSSARY?.terms || [];
  return terms.map((term) => {
    const [chapter, hash] = (term.chapters?.[0] || 'glossary').split('#');
    return { t: 'g', b: slug, c: chapter, i: hash || '',
      h: term.ko, e: term.en || '', a: term.abbr || '', x: term.def || '', defined: term.chapters || [] };
  });
}

export async function buildSearchIndex(root) {
  const series = JSON.parse(await readFile(join(root, 'book.json'), 'utf8'));
  const books = [], entries = [], chaptersOf = new Map();
  for (const entry of series.books) {
    const slug = dirname(entry);
    const js = await readFile(join(root, slug, 'js/common.js'), 'utf8');
    const field = (obj, name) => obj.match(new RegExp(`\\b${name}:\\s*"((?:[^"\\\\]|\\\\.)*)"`))?.[1];
    const chapters = [...js.matchAll(/\{\s*slug:\s*"[^"]+"[^\n]*/g)].map(([obj]) => ({ slug: field(obj, 'slug'), num: field(obj, 'num'), title: field(obj, 'title'), desc: field(obj, 'desc') }))
      .filter((c) => c.title);
    books.push({ slug, chapters: Object.fromEntries(chapters.map((c, i) => [c.slug, [c.num || String(i + 1).padStart(2, '0'), c.title]])) });
    chaptersOf.set(slug, new Map(chapters.map((c) => [c.slug, c.title])));
    for (const chapter of chapters) {
      const file = join(root, slug, 'chapters', `${chapter.slug}.html`);
      if (existsSync(file)) entries.push(...chapterEntries(await readFile(file, 'utf8'), slug, chapter));
    }
    entries.push(...await glossary(root, slug));
  }
  // Each book's own search (<book>/search.json) and index page (<book>/terms.html) are cut from the same entries.
  const own = new Map(books.map((b) => [b.slug, { info: b, entries: [], titles: chaptersOf.get(b.slug) }]));
  for (const e of entries) own.get(e.b).entries.push(e);
  const terms = [...own.values()].map((b) => termIndex(b));
  const perBook = [...own.values()].map(({ info, entries: list }) => {
    const items = list.map(({ full, defined, ...e }) => e);
    const texts = items.map((e) => { const body = e.body || ''; delete e.body; return body; });
    for (const e of items) for (const k of Object.keys(e)) if (e[k] === '') delete e[k];
    return { slug: info.slug, search: { v: 1, books: [info], entries: items, texts } };
  });
  // The home search leaves figures to the books. Section and simulator bodies move to their own file,
  // aligned by position with entries ("" for the rest).
  const home = entries.filter((e) => e.t !== 'f').map(({ full, defined, ...e }) => e);
  const texts = home.map((e) => { const body = e.body || ''; delete e.body; return body; });
  for (const e of home) for (const k of Object.keys(e)) if (e[k] === '') delete e[k];
  return { index: { v: 1, books, entries: home }, text: { v: 1, n: home.length, texts }, perBook, terms };
}

/* ------------------------------------------------------------------ 찾아보기 (back-of-book index) */
const escHtml = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Forms of a glossary term to look for in the prose: Korean names without their (gloss), each half of "A / B",
// the English name when it is one phrase, and abbreviations of two or more characters.
function forms(term) {
  const out = [];
  const bare = (s) => s.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  for (const ko of bare(term.h).split(/\s+\/\s+/)) {
    const f = ko.trim();
    if (f.length < 2 || /[=\\^_$]/.test(f)) continue;
    // Latin names (FinFET) keep word edges; Korean names may run together or be spaced (결정 격자 · 결정격자).
    out.push(/^[\x20-\x7e]+$/.test(f) ? new RegExp(`(?<![A-Za-z0-9])${reEsc(f).replace(/\s+/g, '[\\s-]*')}(?![A-Za-z0-9])`, 'i')
      : new RegExp(reEsc(f).replace(/\s+/g, '\\s*')));
  }
  const en = bare(term.e || '');
  if (en.length >= 4 && !en.includes('/')) out.push(new RegExp(`(?<![A-Za-z])${reEsc(en).replace(/\s+/g, '[\\s-]+')}(?:e?s)?(?![A-Za-z])`, 'i'));
  for (const a of (term.a || '').split(/\s*[/,]\s*/)) {
    if (/^[A-Za-z][A-Za-z0-9⁺⁻₀-₉+-]{1,11}$/.test(a) && /[A-Z]/.test(a)) out.push(new RegExp(`(?<![A-Za-z0-9])${reEsc(a)}(?![A-Za-z0-9])`));
  }
  return out;
}
// Text fragment for the first match in a section, with the words around it so it lands in that section.
function fragment(text, m) {
  const words = text.split(' '), at = text.slice(0, m.index).split(' ').length - 1;
  const clean = (w) => (w || '').replace(/^[("'“‘[]+|[)"'”’\],.;:!?…]+$/g, '');
  const ok = (w) => w && w.length <= 40 && !/[−₀-₉⁰-⁹^\\…]/.test(w);
  const word = clean(words[at]), before = clean(words[at - 1]), after = clean(words[at + 1]);
  if (!ok(word)) return '';
  const enc = (w) => encodeURIComponent(w).replace(/-/g, '%2D');
  return ':~:text=' + (ok(before) ? enc(before) + '-,' : '') + enc(word) + (ok(after) ? ',-' + enc(after) : '');
}
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ', BASE = 'ㄱㄱㄴㄷㄷㄹㅁㅂㅂㅅㅅㅇㅈㅈㅊㅋㅌㅍㅎ';
function groupOf(name) {
  const c = name.normalize('NFC').replace(/^[^0-9A-Za-z가-힣]+/, '')[0] || '#';
  if (/[가-힣]/.test(c)) return BASE[Math.floor((c.charCodeAt(0) - 0xac00) / 588)];
  if (/[A-Za-z]/.test(c)) return c.toUpperCase();
  return '#';
}
function termIndex({ info, entries, titles }) {
  const sections = entries.filter((e) => e.t === 's' && e.c !== 'glossary');
  const ord = new Map(), seen = new Map();
  for (const s of sections) { const k = (seen.get(s.c) || 0) + 1; seen.set(s.c, k); ord.set(s, k); }
  const num = (c) => info.chapters[c]?.[0] || '';
  const terms = entries.filter((e) => e.t === 'g').map((g) => {
    const res = forms(g);
    const defined = new Set(g.defined.map((d) => d.split('#')[0]));
    const definedAt = new Set(g.defined.filter((d) => d.includes('#')).map((d) => d.replace('#', ' ')));
    // A qualified name, 공핍 (MOS) or 격자 (메시), is one sense of a common word: look only where it is explained.
    const qualified = /\([^)]*\)/.test(g.h);
    const loc = [];
    for (const s of sections) {
      if (qualified && !defined.has(s.c)) continue;
      let m = null;
      for (const re of res) { const hit = re.exec(s.full); if (hit && (!m || hit.index < m.index)) m = hit; }
      if (!m) continue;
      loc.push({ c: s.c, label: `${num(s.c)}·${ord.get(s)}`, title: `${num(s.c)} ${titles.get(s.c) || ''} · ${s.h}`,
        href: `chapters/${s.c}.html#${s.i}${fragment(s.full, m)}`, def: definedAt.size ? definedAt.has(`${s.c} ${s.i}`) : false });
    }
    // The section that explains the term is bold: the one its glossary entry names, else its first use in that chapter.
    for (const c of defined) {
      if (c === 'glossary') continue;
      if (loc.some((l) => l.def && l.c === c)) continue;
      const first = loc.find((l) => l.c === c);
      if (first) first.def = true;
      else if (info.chapters[c]) loc.push({ c, label: num(c), title: `${num(c)} ${titles.get(c) || ''}`, href: `chapters/${c}.html`, def: true });
    }
    const order = Object.keys(info.chapters);
    loc.sort((a, b) => order.indexOf(a.c) - order.indexOf(b.c) || parseInt(a.label.split('·')[1] || 0) - parseInt(b.label.split('·')[1] || 0));
    return { ko: g.h, en: g.e || '', abbr: g.a || '', group: groupOf(g.h), loc, found: loc.length > 0 && loc.some((l) => l.href.includes('#')) };
  });
  // Same name twice (a term listed in two chapters) becomes one line.
  const byName = new Map();
  for (const t of terms) {
    const prev = byName.get(t.ko);
    if (!prev) { byName.set(t.ko, t); continue; }
    for (const l of t.loc) { const same = prev.loc.find((p) => p.href.split(':~:')[0] === l.href.split(':~:')[0]); if (same) same.def ||= l.def; else prev.loc.push(l); }
    prev.found ||= t.found;
  }
  const list = [...byName.values()].sort((a, b) => {
    const ka = /^[A-Za-z]/.test(a.group) ? 1 : a.group === '#' ? 2 : 0, kb = /^[A-Za-z]/.test(b.group) ? 1 : b.group === '#' ? 2 : 0;
    return ka - kb || a.ko.localeCompare(b.ko, 'ko');
  });
  return { slug: info.slug, list };
}

const SHOW = 10;
function termsPage(meta, index) {
  const name = meta.meta?.siteName || meta.title.split(' ')[0] || index.slug;
  const groups = [...new Set(index.list.map((t) => t.group))];
  const loc = (l) => `<a href="${escHtml(l.href)}" title="${escHtml(l.title)}"${l.def ? ' class="def"' : ''}>${escHtml(l.label)}</a>`;
  const item = (t) => {
    const keyText = [t.ko, t.en, t.abbr].join(' ').toLowerCase();
    // A long list folds after SHOW; one or two more are not worth a toggle.
    const cut = t.loc.length > SHOW + 2 ? SHOW : t.loc.length;
    const first = t.loc.slice(0, cut).map(loc).join(', '), rest = t.loc.slice(cut);
    return `<li data-k="${escHtml(keyText)}"><span class="tx-term">${escHtml(t.ko)}</span>`
      + (t.en ? ` <span class="tx-en">${escHtml(t.en)}</span>` : '') + (t.abbr ? ` <span class="tx-abbr">${escHtml(t.abbr)}</span>` : '')
      + ` <span class="tx-loc">${first || '<span class="tx-none">용어집</span>'}${rest.length ? `<details><summary>외 ${rest.length}곳</summary>, ${rest.map(loc).join(', ')}</details>` : ''}</span></li>`;
  };
  const body = groups.map((g) => `<section class="tx-group" id="tx-${escHtml(g)}"><h2>${escHtml(g)}</h2><ul>${index.list.filter((t) => t.group === g).map(item).join('')}</ul></section>`).join('\n');
  return `<!doctype html>
<!-- Generated by tools/search-index.mjs from js/glossary-data.js and the chapters. Do not edit. -->
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>찾아보기 · ${escHtml(name)}</title>
<meta name="description" content="${escHtml(name)}의 용어 ${index.list.length}개를 가나다·ABC 순으로 모은 색인. 용어마다 그 용어가 나오는 장과 절로 바로 이동한다.">
<link rel="icon" type="image/svg+xml" href="favicon.svg">
<link rel="stylesheet" href="css/style.css">
<link rel="stylesheet" href="../shared/css/terms.css">
<script src="js/common.js"></script>
<link rel="stylesheet" href="../shared/css/book-ui.css">
<script defer src="../shared/js/book-ui.js"></script>
<script defer src="../shared/js/book-shell.js" data-book="${escHtml(index.slug)}"></script>
<script defer src="../shared/js/terms.js"></script>
</head>
<body data-root="" data-page="terms">
<main class="tx-wrap">
  <div class="eyebrow">Index</div>
  <h1>찾아보기</h1>
  <p class="tx-lead">${escHtml(name)}에 나오는 용어 ${index.list.length}개입니다. 번호는 <b>장·절</b>이고, 누르면 그 절의 해당 문장으로 갑니다. <b class="tx-def-sample">굵은 번호</b>는 용어를 설명하는 곳입니다. 정의는 <a href="chapters/glossary.html">용어집</a>에 있습니다.</p>
  <div class="tx-tools">
    <input id="tx-q" type="search" placeholder="용어 거르기: 한글·영어·약어" aria-label="찾아보기 용어 거르기" autocomplete="off">
    <span class="tx-count" id="tx-count">${index.list.length}개</span>
  </div>
  <nav class="tx-jump" aria-label="첫 글자로 이동">${groups.map((g) => `<a href="#tx-${escHtml(g)}">${escHtml(g)}</a>`).join('')}</nav>
  <div class="tx-cols" id="tx-list">
${body}
  </div>
  <p class="tx-empty" id="tx-empty" hidden>맞는 용어가 없습니다. 위 검색창(이 책 검색)은 본문까지 찾습니다.</p>
</main>
</body>
</html>
`;
}

export async function writeSearchIndex(root, output) {
  const { index, text, perBook, terms } = await buildSearchIndex(root);
  const files = { 'search-index.json': JSON.stringify(index), 'search-text.json': JSON.stringify(text) };
  for (const [name, json] of Object.entries(files)) await writeFile(join(output, name), json);
  let bytes = 0, located = 0, listed = 0;
  for (const b of perBook) { const json = JSON.stringify(b.search); bytes += Buffer.byteLength(json); await writeFile(join(output, b.slug, 'search.json'), json); }
  for (const t of terms) {
    const meta = JSON.parse(await readFile(join(root, t.slug, 'book.json'), 'utf8'));
    await writeFile(join(output, t.slug, 'terms.html'), termsPage(meta, t));
    listed += t.list.length; located += t.list.filter((x) => x.found).length;
  }
  const count = (t) => index.entries.filter((e) => e.t === t).length;
  return `search: ${count('c')} chapters, ${count('s')} sections, ${count('m')} simulators, ${count('g')} terms · `
    + Object.entries(files).map(([name, json]) => `${name} ${(Buffer.byteLength(json) / 1024).toFixed(0)} KB`).join(', ')
    + ` · ${perBook.length} book search.json ${(bytes / 1024).toFixed(0)} KB · terms.html ${listed} terms, ${located} found in the prose`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  console.log(await writeSearchIndex(root, root));
}
