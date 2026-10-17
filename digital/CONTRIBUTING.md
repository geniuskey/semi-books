# DigitalBook 챕터 작성 가이드

별도 빌드 없이도 열 수 있는 정적 사이트다. `index.html` + `chapters/<slug>.html` + 공통 `css/style.css`, `js/common.js`, `js/dig.js`.
다른 시리즈와 같은 `book.json`·`@euiyun/book` 빌드를 사용한다. `npm ci`, `npm test`, `npm run build`로 검사하며, 빌드 결과는 `.book-dist/`에 생성된다.
로컬 실행: `python3 -m http.server 8000` → http://localhost:8000 (file://로 열어도 동작하게 classic script만 쓴다. ES module 금지.)
ProcessBook·SoCBook·DesignBook과 같은 디자인 시스템과 컴포넌트를 쓰는 [euiyun books](https://books.euiyun.com/) 시리즈다.
반도체 설계를 아날로그와 디지털로 나눌 때 **디지털 회로 설계** 쪽을 맡는다. 아키텍처(SoCBook)와 RTL→마스크 흐름(DesignBook)은 링크로 넘기고,
이 책은 **트랜지스터 → 게이트 → 순차 회로 → 데이터패스 → 메모리·배선·전력** 의 회로 수준에 집중한다(Rabaey, Weste & Harris 범위).

## 기여물의 라이선스
실행 코드는 MIT, 본문·그림·문제·해설 등 교육 콘텐츠는 CC BY 4.0. 구분은 [라이선스 안내](LICENSE.md)를 따른다.

## 원칙
- **한국어**, 대상은 공대 학부생(전자회로 기초가 있으면 좋지만 필수는 아님). 영어 원어는 `<span class="en">(Noise margin)</span>`처럼 병기.
- **만지며 배운다.** 영감은 Bartosz Ciechanowski의 글이다. 개념을 설명하는 문단 바로 옆에 그 개념 하나만 떼어 낸 작은 인터랙티브 그림(`figure.play`)을 두고, 장의 핵심에는 큰 시뮬레이터(`.sim`)를 둔다. 정적인 그림은 꼭 필요할 때만.
- 장 하나에 인터랙티브 요소 7개 이상(작은 그림 + 시뮬레이터 2~3개), 예측해 보기(`.predict`) 2~3개, 퀴즈 5~6문항.
- 순서: 직관 → 만져 보기 → 수식(KaTeX) → 실제 수치 → 요약 → 퀴즈.
- 수치는 교과서(Rabaey *Digital Integrated Circuits*, Weste & Harris *CMOS VLSI Design*, Harris & Harris *Digital Design and Computer Architecture*)와 공개 자료의 대략값. 공정 수치는 책 전체가 같이 쓰는 **기준 공정 DG-7**(`DG.TECH`)을 기본으로 한다. 확실하지 않은 최신 수치는 '약', '~'를 붙이고 연도를 적는다.
- 외부 라이브러리는 KaTeX만(필요하면 three.js r147). 이미지 대신 인라인 SVG/canvas.
- 색은 CSS 변수나 `SB.palette()`. **의미가 고정된 색**을 지킨다.
  - 논리값: 1 = `--hi`(초록), 0 = `--lo`(회색), X = `--lx`(빨강·빗금), Z = `--lz`(주황·점선). 캔버스는 `DG.lv(v)`, 본문은 `<span class="lv hi">1</span>`.
  - 트랜지스터: nMOS = `--nmos`(파랑), pMOS = `--pmos`(분홍). 전원 `--vdd`, 접지 `--gnd`.
  - 강조는 `--accent`(파랑), 두 번째 강조는 `--accent-2`(주황).
- 모바일(폭 360px)에서 가로 스크롤 금지. SVG는 `viewBox`만 주고 width/height 생략. 캔버스는 `SB.canvas`로 부모 폭을 따른다.
- 끌기 조작은 `DG.pointer(el, {...}, {drag:true})`로 마우스·터치를 함께 지원한다. 끌기가 없는 캔버스에는 drag를 켜지 않는다(스크롤 보존).
- 인터랙티브 요소 안의 `button`, `select`, `input[type=range]`는 아무 순서로 눌러도 예외가 나지 않아야 한다(`tools/check.js`가 전부 눌러 본다).

## head 블록
각 챕터 `<head>`에는 아래 표식만 두고 `python3 tools/head.py`를 실행한다. 제목·번호는 `js/common.js`의 `CHAPTERS`에서 읽고, canonical·OG·JSON-LD·사이트맵·`index.html`의 `hasPart`를 함께 갱신한다.
```html
<!--head:start {"desc": "한 문장 설명"}-->
<!--head:end-->
```
그 아래에 장 전용 `<style>`을 둘 수 있다. 챕터를 추가하면 `CHAPTERS`, `chapters/glossary.html`의 `SHORT`, `tools/glossary/<slug>.json`에도 등록한다.

용어 원본은 `tools/glossary/<slug>.json`이다. `npm run generate`는 시리즈 공통 v1 형식의 `js/glossary-data.js`와 종합 퀴즈를 함께 만든다. `js/glossary-data.js`나 용어집의 `DATA` 구역을 직접 고치지 않는다. 본문 툴팁은 생성된 정의를 그대로 사용한다.

홈 카드의 배지는 `ch-tag-sim`·`ch-tag-3d`를 사용한다. `sim`은 실제 시뮬레이터 컨테이너용 클래스이므로 배지에 붙이지 않는다. 상단 검색과 공유 링크는 실습·그림의 `id`를 사용하므로 기존 `id`는 유지하고, 새 실습에도 고유한 `id`를 붙인다.

## 페이지 뼈대
```html
<!doctype html>
<!-- Copyright (c) 2026 geniuskey and DigitalBook contributors.
     Executable code: MIT (see ../LICENSE-MIT).
     Text, illustrations, questions and explanations: CC-BY-4.0 (see ../LICENSE.md). -->
<html lang="ko">
<head>
<!--head:start {"desc": "..."}-->
<!--head:end-->
<style> /* 장 전용 스타일(선택) */ </style>
</head>
<body data-chapter="inverter">
<main class="chapter">
  <header class="chapter-hero">
    <div class="eyebrow">Chapter 04</div>
    <h1>CMOS 인버터</h1>
    <p class="lead">…</p>
    <ul class="objectives"><li>…</li></ul>
    <div class="dg-ladder" data-level="gate" data-caption="…"></div>
  </header>
  <section id="vtc"><h2>…</h2> … </section>
  …
  <section class="keypoints"><h2>핵심 정리</h2><ol><li>…</li></ol></section>
  <section class="quiz-sec"><h2>확인 퀴즈</h2> <div class="quiz-q">…</div> … </section>
</main>
<script> /* 장 스크립트: (function(){ "use strict"; … })(); */ </script>
</body>
</html>
```

## 컴포넌트
- `header.chapter-hero` 안에 `.eyebrow`, `h1`, `p.lead`, `ul.objectives`, 그리고 `<div class="dg-ladder" data-level="gate"></div>`(추상화 사다리에서 이 장의 위치. `device gate seq datapath block system` 중 공백으로 여러 개).
- 본문: `section > h2`(번호 자동), `figure.diagram`(정적 SVG + `figcaption`), `figure.play`(작은 인터랙티브: `.play-view` + `.play-ctrl` + `figcaption`, 캡션은 `<span class="try">해 보기</span>`로 시작), `.sim`(큰 시뮬레이터, 아래 마크업), `.callout`(`.tip`/`.warn`/`.deep`, 첫 `<strong>`이 제목), `.predict`(`<strong>`제목 + 질문 `<p>` + `<details><summary>답 보기</summary><p>…</p></details>`), `.formula`(+ `.where` 기호 설명), `.table-wrap > table`, `table.tt`(진리표, 값 칸에 `one`/`zero` 클래스), `pre.code`(Verilog 등, `.kw` `.cm` `.nb` 하이라이트), `section.keypoints`, `section.quiz-sec` + `.quiz-q`.
- 큰 시뮬레이터:
```html
<div class="sim" id="sim-vtc">
  <div class="sim-head"><span class="sim-tag">SIMULATOR</span><h3>제목</h3></div>
  <div class="sim-view"><canvas id="cv-vtc"></canvas></div>
  <div class="sim-controls">
    <label class="ctrl"><span>공급 전압 <output id="vt-vdd-out"></output></span><input type="range" id="vt-vdd" min="0.2" max="1" step="0.01" value="0.75"></label>
    <div class="ctrl"><span>모드</span><div class="seg" id="vt-mode"><button data-value="a" class="on">A</button><button data-value="b">B</button></div></div>
    <div class="ctrl"><span>동작</span><div class="ctrl-row"><button class="btn sm primary" id="vt-run">실행</button></div></div>
  </div>
  <div class="sim-readout">
    <div class="stat"><span class="k">이름</span><span class="v" id="vt-nm">—</span></div>
  </div>
  <div class="sim-note">교육용 모델에 대한 설명…</div>
</div>
```
- 작은 그림: `<figure class="play" id="fig-x"><div class="play-view"><canvas id="cv-x"></canvas></div><div class="play-ctrl"><label class="ctrl"><span>… <output id="x-a-out"></output></span><input type="range" id="x-a" …></label></div><figcaption><span class="try">해 보기</span> …</figcaption></figure>`
- 퀴즈: `<div class="quiz-q"><p>Q1. 질문</p><div class="opts"><button class="opt">보기</button><button class="opt" data-correct>정답</button>…</div><div class="quiz-exp">해설</div></div>`. 동작·목차·이전/다음·KaTeX 렌더는 `common.js`가 자동 처리한다.
- 수식: 인라인 `\( … \)`, 블록 `<div class="formula">$$ … $$<div class="where">…</div></div>`.
- 컨트롤 바인딩: `SB.range("vt-vdd", fmt, cb)`(출력은 `id-out`), `SB.seg("vt-mode", cb)`.
- 실제 마크업 예시는 SoCBook(https://github.com/geniuskey/socbook)의 `chapters/logic.html` 등을 참고한다. 컴포넌트 클래스는 같다.

## JS 헬퍼
`SB` (`js/common.js`)
- `SB.canvas(el, draw(ctx,w,h), {aspect, height, minHeight, maxHeight})` → `{redraw, ctx, w, h, resize}`, `SB.chart(ctx, box|null, opts)`, `SB.range(id, fmt, cb)`, `SB.seg(id, cb)`, `SB.stat(id, html)`, `SB.loop(el, fn(dt))`(보일 때만 도는 애니메이션).
- `SB.palette()`(text, dim, faint, grid, axis, accent, accent2, ok, warn, bad, **hi, lo, x, z, nmos, pmos** …), `SB.color(name)`, `SB.font(px, mono, weight)`, `SB.fmt`, `SB.si(x, unit)`, `SB.bin(n, w)`, `SB.rng(seed)`, `SB.randn`, `SB.erf`, `SB.debounce`, `SB.clamp/lerp/map`, `SB.onTheme(cb)`, `SB.isDark()`.

`DG` (`js/dig.js`)
- `DG.TECH` — 기준 공정 DG-7(VDD 0.75 V, Vt 0.30 V, 알파 1.3, 75 mV/dec, 단위 nMOS 약 50 µA, τ≈1.5 ps, FO4≈7.5 ps, 배선 15 Ω/µm·0.2 fF/µm).
- `DG.ids({vgs, vds, type:"n"|"p", W, vt, tech})` — 알파 전력 법칙 + 부문턱 근사 전류. `DG.invOut(vin, {Wn, Wp, vdd, vtn, vtp})`, `DG.vtc(opts, N)`, `DG.vtcMetrics(curve)` → `{VM, VIL, VIH, VOL, VOH, NML, NMH}`.
- 그리기: `DG.gate(ctx, "NAND", x, y, w, h, {n, inV, outV, label})` → 핀 좌표, `DG.gateSVG(type, x, y, w, h, n)`(정적 SVG 문자열), `DG.mos(ctx, "n"|"p", x, y, {s, on, gateLeft})` → `{gate, top, bottom}`, `DG.vdd`, `DG.gnd`, `DG.wire(ctx, pts, v)`, `DG.dot`, `DG.arrow`, `DG.box`, `DG.roundRect`, `DG.hatch`, `DG.lv(v)`, `DG.alpha`, `DG.mix`, `DG.heat(t)`.
- `DG.wave(ctx, box, {cycles, signals:[{name, type:"clk"|"bit"|"bus"|"analog", v}], marks, shade, cursor, nameW})` — 타이밍 파형.
- `DG.truth(n, fn)`, `DG.OPS`, `DG.eval3(type, ins)`(0/1/"x" 3값 논리).
- `new DG.Circuit()` — 이벤트 구동 게이트 수준 시뮬레이터: `.input(n,v)`, `.gate(type, ins, out, delay)`, `.dff(q, d, clk, {tcq, init, en, rst})`, `.reset()`, `.set(n, v, t)`, `.clock(n, period, t0, t1)`, `.run(t)`, `.trace(n)`, `.at(n,t)`, `.sample(n, t0, dt, N)`, `.arrival()`, `.toggles`.
- `DG.pointer(el, {down, move, up, leave}, {drag})`.

## 점검
```bash
python3 tools/head.py && python3 tools/glossary.py
node tools/check.js            # playwright 필요 (전역 설치라면 PW_PATH=$(npm root -g)/playwright)
```
