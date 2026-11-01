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
    out.push({ t: 's', b: book, c: chapter.slug, i: id, h: heading, k: [keys(body), sub].filter(Boolean).join(' · '), body: clip(text(body.replace(h2[0], '')), BODY) });
    for (const [, simId, tag, h3] of sims) {
      const note = part.match(new RegExp(`id="${simId}"[\\s\\S]*?<div class="sim-note"[^>]*>([\\s\\S]*?)</div>`))?.[1] || '';
      out.push({ t: 'm', b: book, c: chapter.slug, i: simId, h: text(h3), g: (tag || '').trim(), body: clip(text(note).replace(/^해볼 것:\s*/, ''), SIM) });
    }
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
      h: term.ko, e: term.en || '', a: term.abbr || '', x: term.def || '' };
  });
}

export async function buildSearchIndex(root) {
  const series = JSON.parse(await readFile(join(root, 'book.json'), 'utf8'));
  const books = [], entries = [];
  for (const entry of series.books) {
    const slug = dirname(entry);
    const js = await readFile(join(root, slug, 'js/common.js'), 'utf8');
    const field = (obj, name) => obj.match(new RegExp(`\\b${name}:\\s*"((?:[^"\\\\]|\\\\.)*)"`))?.[1];
    const chapters = [...js.matchAll(/\{\s*slug:\s*"[^"]+"[^\n]*/g)].map(([obj]) => ({ slug: field(obj, 'slug'), num: field(obj, 'num'), title: field(obj, 'title'), desc: field(obj, 'desc') }))
      .filter((c) => c.title);
    books.push({ slug, chapters: Object.fromEntries(chapters.map((c, i) => [c.slug, [c.num || String(i + 1).padStart(2, '0'), c.title]])) });
    for (const chapter of chapters) {
      const file = join(root, slug, 'chapters', `${chapter.slug}.html`);
      if (existsSync(file)) entries.push(...chapterEntries(await readFile(file, 'utf8'), slug, chapter));
    }
    entries.push(...await glossary(root, slug));
  }
  // Section and simulator bodies move to their own file, aligned by position with entries ("" for the rest).
  const texts = entries.map((e) => { const body = e.body || ''; delete e.body; return body; });
  for (const e of entries) for (const k of Object.keys(e)) if (e[k] === '') delete e[k];
  return { index: { v: 1, books, entries }, text: { v: 1, n: entries.length, texts } };
}

export async function writeSearchIndex(root, output) {
  const { index, text } = await buildSearchIndex(root);
  const files = { 'search-index.json': JSON.stringify(index), 'search-text.json': JSON.stringify(text) };
  for (const [name, json] of Object.entries(files)) await writeFile(join(output, name), json);
  const count = (t) => index.entries.filter((e) => e.t === t).length;
  return `search: ${count('c')} chapters, ${count('s')} sections, ${count('m')} simulators, ${count('g')} terms · `
    + Object.entries(files).map(([name, json]) => `${name} ${(Buffer.byteLength(json) / 1024).toFixed(0)} KB`).join(', ');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  console.log(await writeSearchIndex(root, root));
}
