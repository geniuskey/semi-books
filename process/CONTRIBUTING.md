# ProcessBook 챕터 작성 가이드

빌드 과정 없는 정적 사이트다. `index.html` + `chapters/<slug>.html` + 공통 `css/style.css`, `js/common.js`, `js/xsec.js`, `js/optics.js`.
로컬 실행: `python3 -m http.server 8000` → http://localhost:8000 (file://로 열어도 동작하게 classic script만 쓴다. ES module 금지.)

## 기여물의 라이선스
실행 코드는 MIT, 본문·그림·문제·해설 등 교육 콘텐츠는 CC BY 4.0. 구분은 [라이선스 안내](LICENSE.md)를 따른다.

## 원칙
- **한국어**, 대상은 공대 학부생(반도체 물리·소자 기초가 있다고 가정). 영어 원어는 `<span class="en">(Step coverage)</span>`처럼 병기.
- 개념 → 직관 그림(SVG) → 수식(KaTeX) → 시뮬레이터 → 실제 수치 → 요약/퀴즈 순서.
- 수치는 교과서 대표값(Plummer·Deal·Griffin, Sze, Campbell)과 공개 자료의 대략값. 확실하지 않은 최신 수치는 '약', '~'를 붙이고 연도를 적는다.
- 외부 라이브러리는 KaTeX, three.js r147만. 이미지 대신 인라인 SVG/canvas.
- 색은 CSS 변수(`var(--accent)`)나 `PB.palette()`를 쓴다. 물리적 재질색은 `--m-si`, `--m-ox` … 또는 `XS.MATS[...].color`.
- 모바일(폭 360px)에서 가로 스크롤 금지. SVG는 `viewBox`만 주고 width/height 생략.

## head 블록
각 챕터 `<head>`에는 아래 표식만 두고 `python3 tools/head.py`를 실행한다. 제목·번호는 `js/common.js`의 `CHAPTERS`에서 읽고, canonical·OG·JSON-LD·사이트맵·`index.html`의 `hasPart`를 함께 갱신한다.
```html
<!--head:start {"desc": "한 문장 설명", "libs": ["xsec", "optics", "three"]}-->
<!--head:end-->
```
챕터를 추가하면 `CHAPTERS`, `chapters/glossary.html`의 챕터 칩·`TERMS`·`SHORT`에도 등록한다.

## 컴포넌트
본문 컴포넌트(`figure.diagram`, `.sim`, `.callout`, `.formula`, `.table-wrap`, `.quiz-q`)는 MemoryBook과 같다. 퀴즈 동작·목차·이전/다음·KaTeX 렌더는 `common.js`가 자동 처리한다.

## JS 헬퍼 (`PB`, `js/common.js`)
- `PB.canvas(el, draw, {aspect, minHeight, maxHeight})`, `PB.chart(ctx, box, opts)`, `PB.range(id, fmt, cb)`, `PB.seg(id, cb)`, `PB.stat(id, html)`, `PB.loop`, `PB.three`.
- `PB.palette()`, `PB.color(name)`, `PB.font(px, mono, weight)`, `PB.fmt`, `PB.si`, `PB.erf/erfc`, `PB.rng(seed)`, `PB.debounce`, `PB.clamp/lerp/map`.

## 단면 엔진 (`XS`, `js/xsec.js`)
- `new XS.Sim({W, H, dx, surf, substrate, bgType, bgConc})` — 셀 격자. x(nm)는 왼쪽 0, y(nm)는 초기 실리콘 표면 0·아래가 +.
- 단계 객체를 `sim.run(step)`(동기) 또는 `sim.stepGen(step)`(제너레이터)로 적용:
  - `{op:"depo", mat, mode:"cvd"|"ald"|"pvd"|"epi", thick, stick, cosn}`
  - `{op:"etch", sel:{mat:상대속도}, rate, time, ion, sigma, tilt, wet}`
  - `{op:"litho", thick, wl, NA, sigma, dose, focus, clear|chrome:[[x0,x1]], swing, peb, dev, tone}` (도포 + 노광 + Mack 현상)
  - `{op:"implant", species:"B"|"BF2"|"P"|"As", E, dose, tilt, channel}`, `{op:"anneal", T, time, ambient}`, `{op:"ox", T, time(분), ambient}`
  - `{op:"cmp", stop|level, over, dish:{mat:nm}}`, `{op:"strip", mat}`, `{op:"coat", mat, thick}`, `{op:"silicide", depth}`, `{op:"rect", ...}`, `{op:"fn", fn}`
- `XS.draw(ctx, sim, box, {y0nm, y1nm, doping, junction})` — 부드러운 재질 경계 렌더.
- `XS.stepper(el, {title, make, steps:[{...step, k, label, desc}], legend, view, overlay, editable, below})` — 단계별 단면 위젯(목록·재생·커서 읽기).
- 셀 크기는 보통 2~10 nm. 계산이 무거우면 영역을 줄이거나 셀을 키운다.

## 결상 엔진 (`OPT`, `js/optics.js`)
- `OPT.image({pitch, cd, type:"binary"|"att"|"alt", tone, wl, NA, n, focus}, OPT.source({type:"conv"|"annular"|"dipole"|"quad", ...}))` → `{x, I, P}`
- `OPT.cd(img, threshold)`, `OPT.contrast(img)`, `OPT.nils(img, th, w)`, `OPT.TOOLS`
