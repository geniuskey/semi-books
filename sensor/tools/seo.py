import io, re, json, os, html, datetime
BASE = 'https://semi.euiyun.com/sensor/'
SITE = 'SensorBook'
TODAY = datetime.date.today().isoformat()
js = io.open('js/common.js', encoding='utf-8').read()
chs = re.findall(r'\{ slug: "(\w+)",\s*num: "(\d+)", title: "([^"]+)"', js)
DROP = re.compile(r'^\s*<(link rel="canonical"|meta property="og:|meta name="twitter:|meta name="robots"|meta name="theme-color")[^\n]*\n|^\s*<script type="application/ld\+json">.*?</script>\n', re.M | re.S)
def attr(s): return html.escape(html.unescape(s), quote=True)
def inject(path, url, kind, ld):
    s = io.open(path, encoding='utf-8').read()
    s = DROP.sub('', s)
    title = html.unescape(re.search(r'<title>(.*?)</title>', s).group(1))
    m = re.search(r'<meta name="description" content="(.*?)">\n', s)
    desc = html.unescape(m.group(1))
    for node in ld:
        if node['@type'] in ('TechArticle', 'Book'): node['description'] = desc
    block = '\n'.join([
        f'<link rel="canonical" href="{url}">',
        f'<meta property="og:type" content="{kind}">',
        f'<meta property="og:site_name" content="{SITE}">',
        f'<meta property="og:title" content="{attr(title)}">',
        f'<meta property="og:description" content="{attr(desc)}">',
        f'<meta property="og:url" content="{url}">',
        f'<meta property="og:image" content="{BASE}og.png">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        '<meta property="og:locale" content="ko_KR">',
        '<meta name="twitter:card" content="summary_large_image">',
        '<script type="application/ld+json">' + json.dumps({'@context': 'https://schema.org', '@graph': ld}, ensure_ascii=False, separators=(',', ':')).replace('</', '<\/') + '</script>',
    ]) + '\n'
    s = s[:m.end()] + block + s[m.end():]
    io.open(path, 'w', encoding='utf-8', newline='').write(s)
book = {'@type': 'Book', '@id': BASE + '#book', 'name': 'SensorBook — 인터랙티브 이미지 센서 교과서', 'url': BASE, 'inLanguage': 'ko', 'isAccessibleForFree': True, 'educationalLevel': '대학 학부', 'about': ['CMOS 이미지 센서', '이미지 신호 처리', '광학'], 'image': BASE + 'og.png'}
urls = [BASE]
home = dict(book, hasPart=[{'@type': 'Chapter', 'position': int(n), 'name': t, 'url': f'{BASE}chapters/{s}.html'} for s, n, t in chs])
inject('index.html', BASE, 'website', [{'@type': 'WebSite', '@id': BASE + '#site', 'name': SITE, 'alternateName': '이미지 센서 교과서', 'url': BASE, 'inLanguage': 'ko'}, home])
for s, n, t in chs:
    p = f'chapters/{s}.html'
    if not os.path.exists(p): print('missing', p); continue
    u = BASE + p
    urls.append(u)
    inject(p, u, 'article', [
        {'@type': 'TechArticle', 'headline': t, 'name': f'{t} · {SITE}', 'url': u, 'mainEntityOfPage': u, 'inLanguage': 'ko', 'isAccessibleForFree': True, 'learningResourceType': 'interactive textbook chapter', 'position': int(n), 'image': BASE + 'og.png', 'dateModified': TODAY, 'isPartOf': {'@type': 'Book', '@id': BASE + '#book', 'name': book['name'], 'url': BASE}, 'publisher': {'@type': 'Organization', 'name': SITE, 'url': BASE}},
        {'@type': 'BreadcrumbList', 'itemListElement': [{'@type': 'ListItem', 'position': 1, 'name': SITE, 'item': BASE}, {'@type': 'ListItem', 'position': 2, 'name': f'{n} {t}', 'item': u}]},
    ])
io.open('sitemap.xml', 'w', encoding='utf-8', newline='').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(f'  <url><loc>{u}</loc><lastmod>{TODAY}</lastmod></url>\n' for u in urls) + '</urlset>\n')
print(len(urls), 'urls')
