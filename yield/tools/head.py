#!/usr/bin/env python3
# Copyright (c) 2026 geniuskey and YieldBook contributors. MIT (see ../LICENSE-MIT).
"""챕터 <head> 블록 생성기.

각 chapters/<slug>.html 에는 다음 표식이 있다.
  <!--head:start {"desc": "한 문장 설명", "libs": ["wm", "three"]}-->
  ... (이 사이는 스크립트가 덮어쓴다)
  <!--head:end-->
제목·장 번호는 js/common.js 의 CHAPTERS 에서 읽는다. 사이트맵과 index.html JSON-LD hasPart 도 갱신한다.
실행: python3 tools/head.py
"""
import json, re, pathlib, datetime

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://semi.euiyun.com/yield/"
BOOK = "YieldBook · 반도체 수율 분석 교과서"
TODAY = datetime.date.today().isoformat()

src = (ROOT / "js/common.js").read_text(encoding="utf-8")
CH = [dict(slug=m[0], num=m[1], title=m[2]) for m in re.findall(r'slug: "([\w-]+)",\s*num: "(\d+)",(?:\s*stage: \d+,)?\s*title: "([^"]+)"', src)]

def head(c, meta):
    url = f"{SITE}chapters/{c['slug']}.html"
    title = f"{c['title']} · YieldBook"
    desc = meta["desc"]
    libs = meta.get("libs", [])
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": ["Chapter", "LearningResource"], "@id": url + "#chapter", "name": c["title"], "headline": title,
         "description": desc, "url": url, "position": int(c["num"]), "inLanguage": "ko", "isAccessibleForFree": True,
         "learningResourceType": "인터랙티브 교재", "educationalLevel": "공대 학부", "image": SITE + "og.png", "dateModified": TODAY,
         "isPartOf": {"@type": "Book", "@id": SITE + "#book", "name": BOOK, "url": SITE}},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "YieldBook", "item": SITE},
            {"@type": "ListItem", "position": 2, "name": f"{int(c['num'])}. {c['title']}", "item": url}]}]}
    e = lambda s: s.replace("&", "&amp;").replace('"', "&quot;")
    out = f'''<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{url}">
<link rel="icon" type="image/svg+xml" href="../favicon.svg">
<meta name="theme-color" content="#3b5bdb">
<meta property="og:type" content="article">
<meta property="og:site_name" content="YieldBook">
<meta property="og:locale" content="ko_KR">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False, separators=(",", ":"))}</script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
<link rel="stylesheet" href="../css/style.css">
<script src="../js/common.js"></script>
'''
    if "wm" in libs:
        out += '<script src="../js/wafer.js"></script>\n'
    if "three" in libs:
        out += '<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js"></script>\n<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/controls/OrbitControls.js"></script>\n'
    return out

pat = re.compile(r"(<!--head:start (\{.*?\})-->\n)(.*?)(<!--head:end-->)", re.S)
for c in CH:
    p = ROOT / "chapters" / f"{c['slug']}.html"
    if not p.exists():
        print("missing", p.name); continue
    s = p.read_text(encoding="utf-8")
    m = pat.search(s)
    if not m:
        print("no marker", p.name); continue
    meta = json.loads(m.group(2))
    s = s[:m.start()] + m.group(1) + head(c, meta) + m.group(4) + s[m.end():]
    p.write_text(s, encoding="utf-8")
    print("ok", p.name)

# sitemap
urls = [SITE] + [f"{SITE}chapters/{c['slug']}.html" for c in CH]
(ROOT / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    "".join(f"  <url><loc>{u}</loc><lastmod>{TODAY}</lastmod></url>\n" for u in urls) + "</urlset>\n", encoding="utf-8")

# index.html JSON-LD hasPart
ip = ROOT / "index.html"
if ip.exists():
    s = ip.read_text(encoding="utf-8")
    parts = json.dumps([{"@type": "Chapter", "name": c["title"], "position": int(c["num"]), "url": f"{SITE}chapters/{c['slug']}.html"} for c in CH], ensure_ascii=False, separators=(",", ":"))
    s2 = re.sub(r'"hasPart":\[.*?\]\}\]\}</script>', '"hasPart":' + parts + '}]}</script>', s, flags=re.S)
    s2 = re.sub(r'"dateModified":"[\d-]+"', f'"dateModified":"{TODAY}"', s2)
    ip.write_text(s2, encoding="utf-8")
    print("index", "updated" if s2 != s else "unchanged")
