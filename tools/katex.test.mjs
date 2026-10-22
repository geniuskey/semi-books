/* Copyright (c) 2026 geniuskey and SemiBooks contributors. MIT. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMath } from './katex.mjs';

test('renders inline and display math like auto-render', () => {
  const { html, count, errors } = renderMath('<p>A \\(x^2\\) and $$y$$ and \\[z\\].</p>', 't');
  assert.equal(count, 3); assert.deepEqual(errors, []);
  assert.match(html, /^<p>A <span><span class="katex">/);
  assert.equal((html.match(/class="katex-display"/g) || []).length, 2);
  assert.match(html, /\.<\/p>$/);
});

test('decodes entities inside math only', () => {
  const { html } = renderMath('<p>a &amp; b \\(a &lt; b\\)</p>', 't');
  assert.match(html, /^<p>a &amp; b <span>/);
  assert.match(html, /<annotation encoding="application\/x-tex">a &lt; b<\/annotation>/);
});

test('leaves scripts, code, attributes and no-math subtrees alone', () => {
  const source = '<script>if (a < b) s = "\\\\(x\\\\)";</script><code>\\(c\\)</code><div class="box no-math"><div>\\(d\\)</div></div>' +
    '<p title="\\(e\\)">\\(f\\)</p>';
  const { html, count } = renderMath(source, 't');
  assert.equal(count, 1);
  assert.ok(html.startsWith('<script>if (a < b) s = "\\\\(x\\\\)";</script><code>\\(c\\)</code><div class="box no-math"><div>\\(d\\)</div></div><p title="\\(e\\)"><span>'));
});

test('rejects a raw "<" that a browser would read as a tag', () => {
  const { errors } = renderMath('<p>\\(\\sum_{j<k} g_j\\) and \\(a < b\\)</p>', 'page.html');
  assert.equal(errors.length, 1);
  assert.match(errors[0], /raw "<"/);
});

test('reports parse errors and keeps the source text', () => {
  const { html, count, errors } = renderMath('<p>\\(\\frac{1}\\)</p>', 'page.html');
  assert.equal(count, 0); assert.equal(errors.length, 1);
  assert.match(errors[0], /^page\.html: \\\(\\frac\{1\}\\\)/);
  assert.equal(html, '<p>\\(\\frac{1}\\)</p>');
});
