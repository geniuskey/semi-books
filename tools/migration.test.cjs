/* Copyright (c) 2026 geniuskey and SemiBooks contributors. MIT. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const python = process.env.PYTHON || 'python3';

test('imports preserve source repositories, normalize navigation, and refuse local overwrites', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'semi-import-'));
  try {
    const source = path.join(temporary, 'samplebook'), target = path.join(temporary, 'semi-books');
    fs.mkdirSync(source); fs.mkdirSync(path.join(target, 'tools'), { recursive: true }); fs.mkdirSync(path.join(target, 'migration')); fs.mkdirSync(path.join(target, 'infra'));
    fs.writeFileSync(path.join(target, 'infra/keep.txt'), 'another author owns this');
    fs.copyFileSync(path.join(root, 'tools/import-books.py'), path.join(target, 'tools/import-books.py'));
    const sourceHtml = '<!doctype html><html><head><link rel="canonical" href="https://samplebook.euiyun.com/"><script type="module" src="https://static.cloudflareinsights.com/beacon.min.js"></script><script>localStorage.getItem("sb-theme"); document.documentElement.setAttribute("data-theme", "dark");</script></head><body><a href="https://samplebook.euiyun.com/chapters/intro.html">Read</a><button id="sb-theme">Theme</button></body></html>';
    fs.writeFileSync(path.join(source, 'index.html'), sourceHtml);
    fs.writeFileSync(path.join(source, 'CNAME'), 'samplebook.euiyun.com'); fs.writeFileSync(path.join(source, 'package.json'), '{}');
    execFileSync('git', ['init', '-q'], { cwd: source }); execFileSync('git', ['add', '.'], { cwd: source });
    execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'fixture'], { cwd: source });
    const manifest = { version: 1, origin: 'https://semi.euiyun.com', books: [{ id: 'samplebook', slug: 'sample', sourceDirectory: '../samplebook', repository: 'https://example.invalid/sample', legacyUrl: 'https://samplebook.euiyun.com/', title: 'SampleBook', description: 'Example' }] };
    fs.writeFileSync(path.join(target, 'migration/books.json'), JSON.stringify(manifest));
    const run = (...args) => spawnSync(python, ['tools/import-books.py', ...args], { cwd: target, encoding: 'utf8' });
    let result = run('--write'); assert.equal(result.status, 0, result.stderr);
    const imported = path.join(target, 'sample/index.html'); const html = fs.readFileSync(imported, 'utf8');
    assert(html.includes('https://semi.euiyun.com/sample/'));
    assert(html.includes('href="/sample/chapters/intro.html"'));
    assert(html.includes('localStorage.getItem("semi-theme")'));
    assert(html.includes('setAttribute("data-theme", "dark")'));
    assert(html.includes('id="sb-theme"'));
    assert(html.includes('../shared/js/book-shell.js'));
    assert(!html.includes('cloudflareinsights')); assert(!fs.existsSync(path.join(target, 'sample/CNAME'))); assert(!fs.existsSync(path.join(target, 'sample/.git')));
    assert.equal(fs.readFileSync(path.join(source, 'index.html'), 'utf8'), sourceHtml);
    assert.equal(run('--check').status, 0);
    fs.writeFileSync(path.join(source, 'index.html'), sourceHtml.replace('Read', 'Updated upstream'));
    assert.equal(run('--check').status, 1); assert.equal(run('--write').status, 0);
    assert(fs.readFileSync(imported, 'utf8').includes('Updated upstream'));
    fs.appendFileSync(imported, '\n<!-- edited in the monorepo -->');
    fs.writeFileSync(path.join(source, 'index.html'), sourceHtml.replace('Read', 'Another update'));
    const local = fs.readFileSync(imported, 'utf8'); result = run('--write'); assert.equal(result.status, 1); assert.match(result.stderr, /local edit/);
    assert.equal(fs.readFileSync(imported, 'utf8'), local);
    assert.equal(fs.readFileSync(path.join(target, 'infra/keep.txt'), 'utf8'), 'another author owns this');
    manifest.books[0].slug = 'infra'; fs.writeFileSync(path.join(target, 'migration/books.json'), JSON.stringify(manifest));
    assert.equal(run('--write').status, 1);
    assert.equal(fs.readFileSync(path.join(target, 'infra/keep.txt'), 'utf8'), 'another author owns this');
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
});
