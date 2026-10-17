#!/usr/bin/env python3
# Copyright (c) 2026 geniuskey and ChipIndustryBook contributors. MIT (see ../LICENSE-MIT).
"""시뮬레이터 목록 생성기.

chapters/*.html 의 <div class="sim" id="..." data-desc="..."> 와 그 안의 <h3> 제목을 모아
js/sims.js (window.CB_SIMS) 를 만든다. sims.html 갤러리가 이것을 읽는다.
실행: python tools/sims.py
"""
import json, re, pathlib, html

ROOT = pathlib.Path(__file__).resolve().parent.parent
src = (ROOT / "js/common.js").read_text(encoding="utf-8")
CH = [dict(slug=m[0], num=m[1], title=m[2]) for m in re.findall(r'slug: "([\w-]+)",\s*num: "(\d+)",(?:\s*stage: \d+,)?\s*title: "([^"]+)"', src)]

sim_re = re.compile(r'<div class="sim"([^>]*)>(.*?)<h3>(.*?)</h3>', re.S)
attr = lambda a, k: (m.group(1) if (m := re.search(k + r'="([^"]*)"', a)) else "")
out, missing = [], []
for c in CH:
    p = ROOT / "chapters" / f"{c['slug']}.html"
    if not p.exists():
        continue
    s = p.read_text(encoding="utf-8")
    for m in sim_re.finditer(s):
        a = m.group(1)
        sid, desc = attr(a, "id"), attr(a, "data-desc")
        title = html.unescape(re.sub(r"<[^>]+>", "", m.group(3))).strip()
        if not sid:
            missing.append(f"{c['slug']}: id 없음 ({title})"); continue
        if not desc:
            missing.append(f"{c['slug']}#{sid}: data-desc 없음")
        out.append({"ch": c["slug"], "num": c["num"], "id": sid, "title": title, "desc": html.unescape(desc), "big": "data-big" in a})

(ROOT / "js/sims.js").write_text(
    "/* 자동 생성: python tools/sims.py — 직접 고치지 않는다. MIT (see ../LICENSE-MIT) */\nwindow.CB_SIMS = " +
    json.dumps(out, ensure_ascii=False, indent=0).replace("\n", "") + ";\n", encoding="utf-8")
print(f"{len(out)} simulators")
for x in missing:
    print("  -", x)
