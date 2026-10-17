#!/usr/bin/env python3
# Copyright (c) 2026 geniuskey and SoCBook contributors. MIT (see ../LICENSE-MIT).
"""tools/glossary/<slug>.json → chapters/glossary.html 의 TERMS·QUIZ 생성.
JSON: {"terms":[{"ko","en","abbr","def"}], "bank":[{"q","opts":[4],"ans":0..3,"exp"}]}
실행: python3 tools/glossary.py
"""
import json, re, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
src = (ROOT / "js/common.js").read_text(encoding="utf-8")
order = re.findall(r'slug: "([\w-]+)"', src)
terms, quiz = [], []
for slug in order:
    p = ROOT / "tools/glossary" / f"{slug}.json"
    if not p.exists():
        continue
    d = json.loads(p.read_text(encoding="utf-8"))
    for t in d.get("terms", []):
        terms.append({"ko": t["ko"], "en": t.get("en", ""), "abbr": t.get("abbr", ""), "ch": slug, "def": t["def"]})
    for q in d.get("bank", []):
        assert len(q["opts"]) >= 2 and 0 <= q["ans"] < len(q["opts"]), (slug, q["q"])
        quiz.append({"ch": slug, "q": q["q"], "o": q["opts"], "a": q["ans"], "e": q["exp"]})
dump = lambda rows: "[\n" + "".join("    " + json.dumps(r, ensure_ascii=False) + ",\n" for r in rows) + "  ]"
g = ROOT / "chapters/glossary.html"
s = g.read_text(encoding="utf-8")
new = f"/*DATA:start*/\n  var TERMS = {dump(terms)};\n  var QUIZ = {dump(quiz)};\n  /*DATA:end*/"
s = re.sub(r"/\*DATA:start\*/.*?/\*DATA:end\*/", lambda m: new, s, flags=re.S)
g.write_text(s, encoding="utf-8")
print(f"terms {len(terms)}, quiz {len(quiz)}")
