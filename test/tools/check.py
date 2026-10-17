#!/usr/bin/env python3
# Copyright (c) 2026 geniuskey and TestBook contributors. MIT (see ../LICENSE-MIT).
"""페이지 점검기 (playwright 필요: pip install playwright && playwright install chromium).

각 페이지를 넓은 화면·라이트와 좁은 화면(360px)·다크로 열어
콘솔 오류, 가로 넘침, 조작(슬라이더·세그먼트·체크·버튼) 중 예외를 보고한다.
실행: python tools/check.py index overview sem      (인자 없으면 전체)
      python tools/check.py sem --shots 폴더        (전체 페이지 스크린샷 저장)
"""
import sys, re, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
args = [a for a in sys.argv[1:] if not a.startswith("--")]
shots = None
if "--shots" in sys.argv:
    raw = sys.argv[sys.argv.index("--shots") + 1]
    args.remove(raw); shots = pathlib.Path(raw); shots.mkdir(parents=True, exist_ok=True)
if not args:
    src = (ROOT / "js/common.js").read_text(encoding="utf-8")
    args = ["index"] + re.findall(r'slug: "([\w-]+)"', src)

POKE = """async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (const el of document.querySelectorAll('input[type=range]')) {
    for (const v of [el.min, el.max, (Number(el.min) + Number(el.max)) / 2]) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }
    el.value = el.defaultValue; el.dispatchEvent(new Event('input', { bubbles: true }));
  }
  for (const el of document.querySelectorAll('.seg button, .sim .btn, .sim input[type=checkbox], .sim select option')) {
    if (el.tagName === 'OPTION') { el.parentElement.value = el.value; el.parentElement.dispatchEvent(new Event('change', { bubbles: true })); }
    else if (!el.disabled) el.click();
    await sleep(15);
  }
  for (const q of document.querySelectorAll('.quiz-q')) { const b = q.querySelector('button.opt'); if (b && !b.disabled) b.click(); }
  await sleep(400);
  const de = document.documentElement;
  const wide = [...document.querySelectorAll('main *, section *')].filter((e) => e.getBoundingClientRect().right > innerWidth + 1 && !e.closest('.table-wrap, .formula, .katex, .tb-drawer, .steps-list, [data-scroll]')).slice(0, 5).map((e) => e.tagName + (e.id ? '#' + e.id : '') + '.' + String(e.className.baseVal ?? e.className).split(' ')[0]);
  return { overflow: de.scrollWidth - innerWidth, wide, sims: document.querySelectorAll('.sim').length, figs: document.querySelectorAll('figure.diagram').length,
           quiz: document.querySelectorAll('.quiz-q').length, case_: document.querySelectorAll('.casefile').length,
           blank: [...document.querySelectorAll('canvas')].filter((c) => c.width < 10 || c.height < 10).map((c) => c.id) };
}"""

bad = 0
with sync_playwright() as pw:
    import os
    br = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or ('/opt/pw-browsers/chromium' if os.path.exists('/opt/pw-browsers/chromium') else None))
    for name in args:
        f = ROOT / ("index.html" if name == "index" else f"chapters/{name}.html")
        if not f.exists():
            print(f"[{name}] 파일 없음"); bad += 1; continue
        for tag, w, h, scheme in (("wide-light", 1280, 900, "light"), ("narrow-dark", 360, 740, "dark")):
            ctx = br.new_context(viewport={"width": w, "height": h}, color_scheme=scheme)
            page = ctx.new_page()
            errs = []
            page.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" else None)
            page.on("pageerror", lambda e: errs.append("exception: " + str(e)))
            page.goto(f.as_uri(), wait_until="load")
            page.wait_for_timeout(700)
            r = page.evaluate(POKE)
            if shots:
                page.screenshot(path=str(shots / f"{name}-{tag}.png"), full_page=True)
            errs = [e for e in errs if "net::ERR" not in e and "Failed to load resource" not in e]
            probs = errs[:8]
            if r["overflow"] > 1: probs.append(f"가로 넘침 {r['overflow']}px: {r['wide']}")
            if r["blank"]: probs.append(f"그려지지 않은 캔버스: {r['blank']}")
            status = "OK" if not probs else "문제"
            print(f"[{name} · {tag}] {status}  sim={r['sims']} fig={r['figs']} quiz={r['quiz']} case={r['case_']}  {f.stat().st_size // 1024} KB")
            for p_ in probs: print("    - " + p_)
            bad += len(probs)
            ctx.close()
    br.close()
sys.exit(1 if bad else 0)
