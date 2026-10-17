/* Copyright (c) 2026 geniuskey and SemiBooks contributors. MIT. */
/* Static monorepo build. Directory home canonicals use /memory/, rather than /memory/index.html. */
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, '.book-dist');
const book = JSON.parse(await readFile(join(root, 'book.json'), 'utf8'));
const domain = (await readFile(join(root, 'CNAME'), 'utf8')).trim();
if (book.domain !== domain) throw new Error('CNAME and book.json domain disagree');
const origin = `https://${domain}`;
const excluded = new Set(['.git', '.github', '.book-dist', 'node_modules', 'tools', 'scripts', 'migration', 'package.json', 'package-lock.json', 'pnpm-lock.yaml', '.DS_Store']);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const item of await readdir(root, { withFileTypes: true })) {
  if (excluded.has(item.name) || item.name.startsWith('.')) continue;
  await cp(join(root, item.name), join(output, item.name), { recursive: true,
    filter: (source) => !relative(root, source).split(sep).some((part) => excluded.has(part)) });
}
const beacon = /<script\b(?=[^>]*\bsrc\s*=\s*["']https:\/\/static\.cloudflareinsights\.com\/beacon\.min\.js["'])[^>]*>\s*<\/script>\s*/gi;
const tag = '<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon=\'{"token":"3d6151a0abc94ede89285d462527fa80"}\'></script>';
const urls = [];
async function pages(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, item.name);
    if (item.isDirectory()) { await pages(file); continue; }
    if (!item.name.endsWith('.html')) continue;
    const rel = relative(output, file).split(sep).join('/');
    const url = `${origin}/${rel.replace(/(^|\/)index\.html$/, '$1')}`;
    let html = (await readFile(file, 'utf8')).replace(beacon, '');
    if (!/<\/head>/i.test(html)) throw new Error(`Missing </head>: ${rel}`);
    const existing = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i)?.[1];
    if (existing && existing !== url) throw new Error(`Wrong canonical in ${rel}: ${existing} (expected ${url})`);
    const additions = (!existing ? `<link rel="canonical" href="${url}">\n` : '') + tag + '\n';
    html = html.replace(/<\/head>/i, additions + '</head>');
    await writeFile(file, html);
    urls.push(url);
  }
}
await pages(output);
await writeFile(join(output, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.sort().map((url) => `  <url><loc>${url}</loc></url>`).join('\n') + '\n</urlset>\n');
await writeFile(join(output, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
await writeFile(join(output, '.nojekyll'), '');
console.log(`Built ${urls.length} pages across ${book.books.length} books for ${domain}`);
