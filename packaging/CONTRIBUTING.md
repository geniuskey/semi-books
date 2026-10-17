# PackagingBook 챕터 작성 가이드

빌드 과정 없는 정적 사이트다. `index.html` + `chapters/<slug>.html` + 공통 `css/style.css`, `js/common.js`, `js/pkg.js`.
로컬 실행: `python3 -m http.server 8000` → http://localhost:8000 (file://로 열어도 동작하게 classic script만 쓴다. ES module 금지.)

## 기여물의 라이선스
실행 코드는 MIT, 본문·그림·문제·해설 등 교육 콘텐츠는 CC BY 4.0. 구분은 [라이선스 안내](LICENSE.md)를 따른다.

## 원칙
- **한국어**, 대상은 공대 학부생(반도체 공정 기초가 있다고 가정). 영어 원어는 `<span class="en">(Underfill)</span>`처럼 병기. 핵심 용어 첫 등장은 `<span class="term">언더필</span>`.
- 개념 → 직관 그림(SVG) → 수식(KaTeX) → 시뮬레이터 → 실제 수치 → 요약/퀴즈 순서.
- 수치는 교과서 대표값(Tummala, Lau, Harper)과 JEDEC 규격, 공개 자료의 대략값. 확실하지 않은 최신 수치는 '약', '~'를 붙이고 연도를 적는다. 특정 회사의 비공개 수치를 단정하지 않는다.
- 외부 라이브러리는 KaTeX, three.js r147만. 이미지 대신 인라인 SVG/canvas.
- 색은 CSS 변수(`var(--accent)`)나 `PB.palette()`를 쓴다. 물리적 재질색은 `--m-si`, `--m-cu` … 또는 `PKG.mat("cu")`.
- 모바일(폭 360px)에서 가로 스크롤 금지. SVG는 `viewBox`만 주고 width/height 생략.
- 문체는 평서문 "~다". 다른 장을 언급할 때는 `<a href="flipchip.html">7장</a>`처럼 링크한다.

## head 블록
각 챕터 `<head>`에는 아래 표식만 두고 `python3 tools/head.py`를 실행한다. 제목·번호는 `js/common.js`의 `CHAPTERS`에서 읽고, canonical·OG·JSON-LD·사이트맵·`index.html`의 `hasPart`를 함께 갱신한다.
```html
<!--head:start {"desc": "한 문장 설명", "libs": ["pkg", "three"]}-->
<!--head:end-->
```
챕터를 추가하면 `CHAPTERS`, `chapters/glossary.html`의 용어·문제 은행에도 등록한다.

## 페이지 뼈대
```html
<body data-chapter="slug">
<main class="chapter">
  <header class="chapter-hero"><div class="eyebrow">Chapter NN</div><h1>제목</h1><p class="lead">…</p><ul class="objectives"><li>…</li></ul></header>
  <section id="…"><h2>절 제목</h2> … </section>
  <section class="keypoints" id="summary"><h2>핵심 정리</h2><ol><li>…</li></ol></section>
  <section class="quiz-sec" id="quiz"><h2>확인 퀴즈</h2><div class="quiz">
    <div class="quiz-q"><p>질문</p><div class="opts"><button class="opt">오답</button><button class="opt" data-correct>정답</button></div><div class="quiz-exp">해설</div></div>
  </div></section>
</main>
<script>(function () { "use strict"; /* 시뮬레이터 */ })();</script>
</body>
```
h2 번호·목차·이전/다음·퀴즈 동작·KaTeX 렌더는 `common.js`가 자동 처리한다.

## 컴포넌트
- 그림: `<figure class="diagram"><svg viewBox="0 0 780 260" role="img" aria-label="…">…</svg><figcaption><b>그림 N-1.</b> …</figcaption></figure>`
  SVG 클래스: 글자 `lbl`, `lbl-dim`, `lbl-b`, `lbl-acc`, `lbl-acc2`, `t-mono` / 선 `s-line`, `s-acc`, `s-acc2`, `s-dash`, `s-bad`, `s-axis` / 면 `f-surface`, `f-elev`, `f-acc-soft`, `f-acc2-soft`, `f-ok-soft`, `f-warn-soft`, `f-bad-soft` / 재질 `m-si`, `m-beol`, `m-cu`, `m-solder`, `m-emc`, `m-uf`, `m-sub`, `m-abf`, `m-sr`, `m-au`, `m-al`, `m-pi`, `m-pr`, `m-daf`, `m-lf`, `m-tape`, `m-glass`, `m-tim`, `m-lid`, `m-pcb` … (`css/style.css` 끝부분). 와이어 `w-au`, `w-cu`.
- 시뮬레이터 카드:
```html
<div class="sim" id="sim-x">
  <div class="sim-head"><span class="sim-tag">SIMULATOR</span><h3>제목</h3></div>
  <div class="sim-body side">
    <div class="sim-view"><canvas id="x-cv"></canvas></div>
    <div class="sim-controls">
      <label class="ctrl"><span>이름 <output id="x-a-out"></output></span><input type="range" id="x-a" min="0" max="10" step="1" value="5"></label>
      <div class="seg" id="x-mode"><button data-value="a" class="on">A</button><button data-value="b">B</button></div>
      <label class="check"><input type="checkbox" id="x-c"> 옵션</label>
      <button class="btn" id="x-go">실행</button>
    </div>
  </div>
  <div class="sim-readout"><div class="stat"><span class="k">이름</span><span class="v" id="x-o">—</span></div></div>
  <div class="sim-note">해볼 것: ① … ② … (모델의 가정)</div>
</div>
```
- `.callout`(기본/`tip`/`warn`/`deep`), `.formula`(+`.where`), `.table-wrap > table`, `.pill`, `.mat-legend`.

## JS 헬퍼 (`PB`, `js/common.js`)
- `PB.canvas(el, draw(ctx,w,h), {aspect, minHeight, maxHeight})` → `{redraw(), ctx, w, h}`. 리사이즈·테마 변경 시 자동으로 다시 그린다.
- `PB.chart(ctx, box|null, {x:[a,b], y:[a,b], logX, logY, xLabel, yLabel, series:[{data:[[x,y]…], color, width, dash, fill}], vlines, hlines, points, bands})` → `{X, Y, box}`
- `PB.range(id, fmt, cb)` → `get()`(`.set(v)`), `PB.seg(id, cb)` → `get()`, `PB.stat(id, html)`, `PB.loop(el, fn(dt,t))`, `PB.three(el, opts)`.
- `PB.palette()`(`bg,text,dim,faint,grid,axis,accent,accent2,ok,warn,bad,series[]`), `PB.color(name)`, `PB.font(px, mono, weight)`, `PB.fmt`, `PB.si`, `PB.erf/erfc`, `PB.rng(seed)`, `PB.randn`, `PB.poisson`, `PB.debounce`, `PB.clamp/lerp/map`, `PB.isDark()`.

## 단면 엔진 (`PKG`, `js/pkg.js`)
패키지 단면을 도형 목록으로 기술한다. 월드 좌표는 x 오른쪽 +, **y 위쪽 +**, 단위 자유(보통 µm).
- `PKG.draw(ctx, shapes, box, view)` — `box={x,y,w,h}`(px), `view={x0,x1,y0,y1,stretch}`. `stretch:true`면 세로 과장.
- 도형(공통 `m` 재질 키 | `fill` 색, `a` 불투명도):
  - `{t:"rect", x, y, w, h, r}` (x,y는 왼쪽 아래), `{t:"circle", x, y, r}`, `{t:"poly", pts}`
  - `{t:"ball", x, y, w, h, k}` — y~y+h 사이의 솔더 접합(배불뚝이). `k`는 접촉 폭 비(기본 0.62)
  - `{t:"wire", pts, m:"au", lw}` — 점들을 지나는 매끄러운 곡선, `{t:"line", pts, color, lw, dash}`
  - `{t:"text", x, y, text, size, align, bold}`, `{t:"label", x, y, tx, ty, text}`(지시선), `{t:"dim", x0,y0,x1,y1, text}`(치수선), `{t:"arrow", x0,y0,x1,y1, text}`
- `PKG.rep(n, x0, pitch, (x,i) => 도형|배열)`, `PKG.spread(n, x0, x1)`, `PKG.ease(t)`, `PKG.seq(t, a, b)`, `PKG.mat(key)`, `PKG.legend(el, keys)`.
- `PKG.stepper(el, {title, view, aspect, steps:[{k, label, desc, shapes: 배열 | (t)=>배열}], note})` — 단계별 단면 위젯(목록·이전/다음·재생). `el`은 빈 `<div class="sim" id="…"></div>`. 각 단계의 `shapes`는 그 시점의 **전체 단면**을 돌려준다(누적 아님). 함수면 단계 진입 시 `t`가 0→1로 움직인다.
- 재질 키: `si beol ox nit pi pr cu al au ni ubm solder imc emc uf ncf daf ag sub abf sr lf tape glass tim lid pcb tool`.
