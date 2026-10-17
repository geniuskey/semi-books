#!/usr/bin/env python3
"""Update the root sitemap only. Book source files, including infra/, are read-only."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
meta = json.loads((ROOT / 'book.json').read_text())
urls = ['https://' + meta['domain'] + '/']
for entry in meta['books']:
    directory = ROOT / Path(entry).parent
    for page in sorted(directory.rglob('*.html')):
        if set(page.parts).intersection({'tools', 'scripts', 'node_modules', '.book-dist', '.git'}):
            continue
        rel = page.relative_to(ROOT).as_posix()
        if rel.endswith('/index.html'):
            rel = rel[:-10]
        urls.append('https://' + meta['domain'] + '/' + rel)
(ROOT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    ''.join('  <url><loc>' + url + '</loc></url>\n' for url in sorted(set(urls))) + '</urlset>\n')
print('Root sitemap:', len(set(urls)), 'pages')
