/* Copyright (c) 2026 geniuskey and SemiBooks contributors. MIT. */
/* Build-time KaTeX: renders \( \) \[ \] $$ $$ the way the books' renderMathInElement call did in the browser. */
import katex from 'katex';
import splitAtDelimiters from 'katex/contrib/auto-render/splitAtDelimiters.js';

export const version = katex.version;
const DELIMITERS = [{ left: '$$', right: '$$', display: true }, { left: '\\(', right: '\\)', display: false }, { left: '\\[', right: '\\]', display: true }];
// auto-render's ignoredTags, plus the books' ignoredClasses: ["no-math"].
const IGNORED = new Set(['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option']);
const RAW = new Set(['script', 'style', 'textarea']);
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const TAG = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w:-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*(\/?)>/g;
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', thinsp: ' ', middot: '·', times: '×', minus: '−' };

function decode(text, where) {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, name) => {
    if (name[0] === '#') return String.fromCodePoint(parseInt(name[1] === 'x' || name[1] === 'X' ? name.slice(2) : name.slice(1), name[1].toLowerCase() === 'x' ? 16 : 10));
    if (name in ENTITIES) return ENTITIES[name];
    throw new Error(`${where}: unknown entity ${entity} inside math`);
  });
}

function renderText(text, where, errors) {
  const parts = splitAtDelimiters(text, DELIMITERS);
  if (parts.length === 1 && parts[0].type === 'text') return { html: text, count: 0 };
  let count = 0;
  const html = parts.map((part) => {
    if (part.type === 'text') return part.data;
    try {
      // auto-render wraps each formula in a <span>; keep the same markup so the books' CSS still applies.
      const rendered = katex.renderToString(decode(part.data, where), { displayMode: part.display, throwOnError: true, strict: 'ignore' });
      count++;
      return `<span>${rendered}</span>`;
    } catch (error) {
      if (!(error instanceof katex.ParseError)) throw error;
      errors.push(`${where}: ${part.rawData} — ${error.message}`);
      return part.rawData;
    }
  }).join('');
  return { html, count };
}

/** Returns { html, count, errors } with every formula outside ignored elements rendered. */
export function renderMath(html, where) {
  const errors = [];
  let out = '', count = 0, last = 0, skip = null, match;
  TAG.lastIndex = 0;
  while ((match = TAG.exec(html))) {
    const [tag, closing, rawName, attributes, selfClosing] = match;
    const name = rawName?.toLowerCase();
    const text = html.slice(last, match.index);
    if (skip || !text) out += text;
    else { const result = renderText(text, where, errors); out += result.html; count += result.count; }
    out += tag;
    last = match.index + tag.length;
    if (!name || VOID.has(name) || selfClosing) continue;
    if (RAW.has(name) && !closing) {
      // Script and style bodies may contain "<"; jump straight to the closing tag.
      const end = html.toLowerCase().indexOf(`</${name}`, last);
      if (end < 0) throw new Error(`${where}: unclosed <${name}>`);
      out += html.slice(last, end);
      last = end;
      TAG.lastIndex = end;
      continue;
    }
    if (skip) {
      if (name === skip.name) skip.depth += closing ? -1 : 1;
      if (!skip.depth) skip = null;
    } else if (!closing && (IGNORED.has(name) || /\bclass\s*=\s*["'][^"']*\bno-math\b/.test(attributes))) {
      skip = { name, depth: 1 };
    }
  }
  const rest = html.slice(last);
  if (skip || !rest) out += rest;
  else { const result = renderText(rest, where, errors); out += result.html; count += result.count; }
  return { html: out, count, errors };
}
