# YieldBook 챕터 작성 가이드

빌드 과정 없는 정적 사이트다. `index.html` + `chapters/<slug>.html` + 공통 `css/style.css`, `js/common.js`, `js/wafer.js`.
로컬 실행: `python -m http.server 8000` → http://localhost:8000 (file://로 열어도 동작하게 classic script만 쓴다. ES module 금지.)

## 기여물의 라이선스
실행 코드는 MIT, 본문·그림·문제·해설 등 교육 콘텐츠는 CC BY 4.0. 구분은 [라이선스 안내](LICENSE.md)를 따른다.

## 원칙
- **한국어**, 대상은 공대 학부생(반도체 공정 기초가 있다고 가정. 공정은 [ProcessBook](https://semi.euiyun.com/process/), 다이 안쪽의 물리 분석은 [FailureBook](https://semi.euiyun.com/failure/)을 참조로 건다). 영어 원어는 `<span class="en">(Defect density)</span>`처럼 병기.
- 이 책의 뼈대는 **추리**다. 웨이퍼 → 다이 → 불량 맵 → 공간 패턴 → 근본 원인. 각 장은 "이 데이터가 어떤 단서를 주고, 어떤 단서는 못 주는가"를 분명히 한다. FailureBook이 칩 하나를 열어 보는 책이라면, 이 책은 칩을 열지 않고 수천 개 다이의 통계와 지리로 범인을 좁히는 책이다.
- 개념 → 직관 그림(SVG) → 수식(KaTeX) → 시뮬레이터 → 실제 수치 → 사건 파일 → 요약/퀴즈 순서.
- 수치는 교과서·공개 자료의 대표값(May & Spanos *Fundamentals of Semiconductor Manufacturing and Process Control*, Stapper의 수율 모델 논문, SEMI 표준, WM-811K 공개 데이터셋 등). 확실하지 않은 수치는 '약', '~'를 붙인다. 장비 모델명·회사 내부 수치는 쓰지 않는다.
- 외부 라이브러리는 KaTeX, three.js r147만. 이미지 대신 인라인 SVG/canvas.
- 색은 CSS 변수(`var(--accent)`)나 `YB.palette()`를 쓴다. 웨이퍼 맵의 합격·불량·빈 색은 `WM`이 정한다.
- 모바일(폭 360px)에서 가로 스크롤 금지. SVG는 `viewBox`만 주고 width/height 생략.
- 문체는 평서문 "~다". 이모지 금지. 다른 장을 언급할 때는 `<a href="models.html">4장</a>`처럼 링크한다.

## head 블록
소스에는 `<title>`과 `<meta name="description">`(한 줄)만 쓴다. canonical, `theme-color`, Open Graph, Twitter 카드, JSON-LD는 루트의 `tools/build.mjs`가 `js/common.js`의 `CHAPTERS`와 `book.json`의 `meta`로 배포물에 생성하고, 수식도 빌드가 KaTeX로 미리 렌더링한다. 소스에 이 태그들이나 KaTeX 태그를 넣으면 `npm test`가 실패한다. 빌드는 정적 HTML의 수식만 렌더링하므로 스크립트가 `\(`·`\[`·`$$`가 든 문자열을 DOM에 넣지 않는다. 소스 파일을 바로 열면 `common.js`가 CDN에서 KaTeX를 불러와 미리보기를 렌더링한다. 사이트맵은 루트에서 `npm run sitemap`으로 갱신한다.
필요한 장만 `js/wafer.js`와 three.js + OrbitControls를 `<script>`로 불러온다. 쓰지 않으면 뺀다.
챕터를 추가하면 `CHAPTERS`, `chapters/glossary.html`의 용어 목록에도 등록한다.

## 페이지 골격
```html
<body data-chapter="slug">
<main class="chapter">
  <header class="chapter-hero">
    <div class="eyebrow">Chapter NN</div><h1>제목</h1><p class="lead">…</p>
    <ul class="objectives"><li>…</li></ul>
  </header>
  <section id="영문-id"><h2>절 제목</h2> … </section>
  <section class="keypoints" id="summary"><h2>핵심 정리</h2><ol><li>…</li></ol></section>
  <section class="quiz-sec" id="quiz"><h2>확인 퀴즈</h2><div class="quiz"> … </div></section>
</main>
<script>(function () { "use strict"; /* 시뮬레이터 */ })();</script>
</body>
```
상단바·챕터 목록·추리 단계 띠·오른쪽 목차·h2 번호·이전/다음·푸터·퀴즈 동작는 `common.js`가 자동으로 만든다. 직접 넣지 않는다.

## 컴포넌트
- 그림: `<figure class="diagram"><svg viewBox="0 0 720 300" role="img" aria-label="…">…</svg><figcaption><b>그림 제목.</b> 설명</figcaption></figure>`. SVG 안에서는 `.lbl`, `.lbl-dim`, `.lbl-b`, `.lbl-acc`, `.lbl-acc2`, `.lbl-bad`, `.t-mono`, `.s-line`, `.s-axis`, `.s-acc`, `.s-acc2`, `.s-dash`, `.s-bad`, `.f-surface`, `.f-elev`, `.f-acc`, `.f-acc2`, `.f-acc-soft`, `.f-acc2-soft`, `.f-ok-soft`, `.f-warn-soft`, `.f-bad-soft`, `.f-bad`, `.beam`, 재질 `.m-si .m-ox .m-nit .m-poly .m-w .m-cu .m-al .m-bar .m-lowk` 클래스를 쓴다. 색을 직접 적지 않는다(다크 모드). 화살표 머리는 `<marker>`에 `fill="context-stroke"`.
- 시뮬레이터:
```html
<div class="sim" id="sim-x">
  <div class="sim-head"><span class="sim-tag">SIMULATOR</span><h3>제목</h3></div>
  <div class="sim-body side">
    <div class="sim-view"><canvas id="x-cv"></canvas></div>   <!-- 검사 영상이면 class="sim-view scope" -->
    <div class="sim-controls">
      <label class="ctrl"><span>이름 <output id="x-a-out"></output></span><input type="range" id="x-a" min="0" max="10" step="0.1" value="3"></label>
      <div class="seg" id="x-mode"><button data-value="a" class="on">A</button><button data-value="b">B</button></div>
      <label class="check"><input type="checkbox" id="x-c"> 옵션</label>
      <div class="btn-row"><button class="btn primary" id="x-go">실행</button><button class="btn" id="x-re">다시</button></div>
    </div>
  </div>
  <div class="sim-readout"><div class="stat"><span class="k">이름</span><span class="v" id="x-o-1">—</span></div></div>
  <div class="sim-note">해볼 것: ① … ② … ③ … (모델의 가정)</div>
</div>
```
- 수식: `<div class="formula">$$…$$<div class="where">기호 설명</div></div>`, 문장 속은 `\(…\)`.
- 강조 상자: `.callout`, `.callout.tip`, `.callout.warn`, `.callout.deep`(첫 `<strong>`이 제목).
- 표: `<div class="table-wrap"><table>…</table></div>`. 숫자 칸은 `class="num"`.
- 용어: `<span class="term">결함 밀도</span><span class="en">(Defect density)</span>`.
- 범례: `<div class="legend"><span><i style="background:var(--bad)"></i>불량</span></div>`, `.pill`, `.ok-t` `.bad-t` `.warn-t`.
- 퀴즈: `<div class="quiz-q"><p>문제</p><div class="opts"><button class="opt">…</button><button class="opt" data-correct>정답</button></div><div class="quiz-exp">해설</div></div>` (장마다 3~4문항, 정답 위치를 섞는다).
- 사건 파일(아래 "이어지는 사건" 참조):
```html
<div class="casefile">
  <div class="tag"><b>CASE YB-12</b><span>사건 파일 · 6장</span></div>
  <h4>빛으로는 멀쩡한 콘택</h4>
  <p>…이 장의 방법을 사건에 적용한 결과…</p>
  <div class="clue"><div><b>얻은 단서</b>…</div><div><b>아직 모르는 것</b>…</div><div><b>다음 단계</b>…</div></div>
</div>
```

## 이어지는 사건: CASE YB-12
모든 장은 같은 가상의 사건을 한 걸음씩 진전시킨다. 각 장 끝(핵심 정리 앞)에 `.casefile` 하나를 넣고, **아래 표에서 자기 장에 해당하는 사실만** 밝힌다. 뒤 장의 결론을 미리 말하지 않는다. 숫자는 아래 값을 그대로 쓴다.

- 제품: 가상의 28 nm급 로직 칩. 다이 6.5 × 8 mm(0.52 cm²), 300 mm 웨이퍼, 가장자리 제외 3 mm, 온전한 다이 1,228개. 노광 샷은 다이 4 × 4개(26 × 32 mm). 한 로트는 25장. 실제 회사·제품과 무관하다.
- 한 줄 요약: 평소 수율 약 88%이던 제품의 한 로트가 약 78%로 떨어졌다. 범인은 **둘**이다. ① M1 레티클의 오염이 만든 **반복 결함**(샷마다 같은 자리의 다이 하나, 모든 웨이퍼, 손실 약 6%p) ② 콘택 식각 장비 **챔버 B**의 정전척 바깥 온도 구역 이상이 만든 **도넛**(반지름 약 95~120 mm 띠의 콘택 미개구, 짝수 슬롯 12장만, 그 웨이퍼에서 추가 손실 약 10%p). 두 무늬가 겹쳐 있어 한 장의 맵에서는 어느 쪽도 또렷하지 않다.
- 맵 재현(시뮬레이터에서 사건 맵이 필요하면 이 값을 쓴다):
```js
const W = WM.wafer({ dieW: 6.5, dieH: 8, shot: [4, 4] });               // 1,228 다이
const base = WM.map(W, { d0: 0.25, seed });                              // 평소: 약 88%
const A = WM.map(W, { d0: 0.25, seed, layers: [{ p: "repeater", pos: 6, s: 0.97, bin: 8 }] });   // 홀수 슬롯(챔버 A): 약 83%
const B = WM.map(W, { d0: 0.25, seed, layers: [{ p: "repeater", pos: 6, s: 0.97, bin: 8 }, { p: "donut", r0: 107, width: 9, s: 0.5, bin: 4 }] });   // 짝수 슬롯(챔버 B): 약 73%
```
  `pos: 6`은 샷 안에서 왼쪽에서 3번째 열, 아래에서 2번째 행(fx = 2, fy = 1)이다.

| 장 | 이 장에서 밝혀지는 것 |
|---|---|
| 01 개요 | 사건 접수. 평소 약 88%이던 웨이퍼 테스트 수율이 한 로트에서 약 78%로 떨어졌다. 이 책 전체가 이 사건을 따라간다는 안내. |
| 02 웨이퍼 | 사건의 지리. 다이 1,228개, 샷 4 × 4, 로트 25장. 수율 1%p는 웨이퍼당 약 12개 다이. 10%p 손실은 로트 전체로 약 3,000개 다이. |
| 03 결함 | 용의자 목록. 무작위 파티클이 늘었다면 맵 전체가 고르게 나빠져야 한다. 계통 결함이라면 무늬가 있어야 한다. 아직 맵을 보지 않았다. |
| 04 모델 | 평소 88%는 푸아송 모델로 D₀ ≈ 0.25개/cm². 78%를 무작위 결함만으로 설명하려면 D₀ ≈ 0.48이 필요한데(거의 두 배), 인라인 검사의 결함 밀도는 약 10% 늘었을 뿐이다. 무작위가 아니라 계통 손실이다(Y_sys ≈ 0.89). |
| 05 광학 | M1 식각 후 명시야 검사 기록을 다시 본다. 웨이퍼당 결함 수는 관리 한계 안이어서 경보가 울리지 않았다. 그러나 결함 좌표를 샷 하나로 접어 겹치면 한 자리에 점이 쌓인다. 콘택 층의 암시야 검사는 이상 없음. |
| 06 전자빔 | 콘택 층에 전압 대비 검사를 추가로 돌린다. 2번 슬롯 웨이퍼에서 반지름 약 95~120 mm 띠에 어두운(끊긴) 콘택이 몰려 있다. 1번 슬롯 웨이퍼는 깨끗하다. 겉모양이 정상이라 광학 검사가 놓친 것이다. |
| 07 분류 | 리뷰 SEM과 분류. 샷에 접혀 쌓이던 M1 결함은 모두 같은 모양의 배선 브리지(같은 자리, 같은 모양 → 마스크에서 왔을 가능성). 어두운 콘택은 바닥이 덜 열린 식각 부족. 결함 파레토의 1, 2위가 된다. |
| 08 빈 맵 | 웨이퍼 테스트 빈 맵. 빈 8(전원 단락)이 샷마다 한 다이씩 격자로, 빈 4(기능·스캔)가 고리 모양으로 나온다. 인라인 결함과 겹치면 브리지가 있는 다이는 약 97%가 불량. |
| 09 도감 | 한 장의 합격/불합격 맵에서는 무늬가 흐리지만 빈별로 나누면 반복 무늬와 도넛 두 개로 갈라진다. 무늬가 둘이면 원인도 둘이다. |
| 10 통계 | 25장을 겹치면 반복 자리의 불량률은 약 97%, 도넛 띠는 약 25%로 흐리다. 웨이퍼별로 나누면 도넛은 짝수 슬롯 12장에만 있다. 반지름 프로파일의 봉우리는 약 107 mm. |
| 11 반복 | 반복 자리(3열 2행)를 M1 레티클 좌표로 옮긴다. 레티클 검사에서 그 자리의 성장성 오염(헤이즈)을 확인. 이 레티클을 쓴 로트에만 나타난다. 레티클 세정 후 반복 결함이 사라진다. 첫 번째 범인. |
| 12 지문 | 도넛의 반지름 95~120 mm는 콘택 식각 장비 정전척의 바깥 온도 구역과 맞는다. CMP 헤드 구역도 후보였지만 전압 대비 검사가 식각 직후 층을 가리킨다. 짝수 슬롯에만 있으므로 챔버가 둘인 장비다. |
| 13 공통성 | 로트 이력 대조. 도넛 웨이퍼는 전부 콘택 식각 챔버 B를 지났다(다른 로트도 마찬가지). 원인은 정전척 바깥 구역의 헬륨 냉각 누설로 인한 온도 상승과 식각률 저하. 시정 조치: 정전척 교체, 구역 온도 인터록, 콘택 층 전압 대비 샘플링 추가. 검증 로트에서 수율 약 88% 회복. 두 번째 범인. |
| 14 경제성 | 사건의 값. 발견까지 지나간 로트 수와 잃은 다이 수, 검사 샘플링을 늘렸다면 얼마나 일찍 잡았을지. |
| 15 탐정 | YB-12가 아닌 새 사건들을 독자가 직접 푼다. |

## JS 헬퍼 (`YB`, `js/common.js`)
- `YB.canvas(el|선택자, draw(ctx, w, h), {aspect, minHeight, maxHeight})` → `{redraw(), ctx, w, h, canvas}`. 리사이즈·테마 변경 시 자동으로 다시 그린다. draw 안에서 `YB.palette()`를 매번 다시 읽는다. w, h는 CSS px. 문자열은 `querySelector` 선택자이므로 `"#id"`로 넘긴다. 만들자마자 draw를 한 번 부르므로 draw가 읽는 상태와 컨트롤(`YB.range`, `YB.seg`)을 먼저 만든다. 폭에 따라 배치를 바꿔 높이가 달라져야 하면 옵션 객체에 `get height() { … }` getter를 넘긴다.
- `YB.chart(ctx, box|null, {x:[min,max], y:[min,max], logX, logY, xLabel, yLabel, xFmt, yFmt, xTicks, yTicks, series:[{data:[[x,y]], color, width, dash, fill}], vlines:[{x,color,label}], hlines:[{y,color,label}], points:[{x,y,color,r,label}], bands:[{x0,x1,color}]})` → `{X, Y, box}`. 막대그래프는 반환된 `X`, `Y`로 직접 그린다.
- `YB.range(id, fmt, onInput)` → `get()`, `get.set(v)`. 출력은 `id + "-out"` 요소.
- `YB.seg(id, onChange)` → `get()`, `get.set(v)`. `YB.stat(id, html)`.
- `YB.loop(el, (dt, t) => {})` 화면에 보일 때만 도는 애니메이션. `YB.three(container, opts)`.
- `YB.palette()` → `{bg, text, dim, faint, grid, axis, border, surface, accent, accent2, ok, warn, bad, red, green, blue, series}`, `YB.color(name)`, `YB.isDark()`, `YB.onTheme(cb)`.
- 고정폭 글꼴(`YB.font(px, true)`, SVG의 `.t-mono`)은 숫자·영문에만 쓴다. 한글은 자간이 벌어진다.
- `YB.font(px, mono, weight)`, `YB.fmt(x, digits)`, `YB.si(x, unit, digits)`, `YB.erf/erfc`, `YB.rng(seed)`(0~1 난수 함수), `YB.randn()`, `YB.poisson(λ)`, `YB.debounce`, `YB.clamp/lerp/map`, `YB.wl2rgb(nm)`.
- `YB.CHAPTERS`, `YB.STAGES`.

## 웨이퍼 맵 엔진 (`WM`, `js/wafer.js`)
모든 장이 같은 웨이퍼를 같은 방식으로 그리게 하는 공통 모델이다. 웨이퍼 맵, 무늬, 검사 영상은 직접 만들지 말고 이것을 쓴다. 좌표는 웨이퍼 중심이 원점, x 오른쪽 +, **y 위쪽 +**, 단위 mm, 노치는 아래.

### 격자와 맵
- `WM.wafer({diam: 300, dieW, dieH, edge: 3, shot: [cols, rows], ox, oy})` → `W = {R, edge, dieW, dieH, area(cm²), shot:{cols, rows}, n, dies, at(x, y) → k|-1, pt(x, y), k(i, j) → k|-1}`.
  `dies[k] = {k, i, j, x, y, r, th, sx, sy, fx, fy, fpos}`. i·j는 격자 번호(j는 위로 +), sx·sy는 샷 번호, fx·fy는 샷 안 자리, `fpos = fy·cols + fx`.
- `WM.gdw(diam, w, h, edge)` 웨이퍼당 다이 수 근사식.
- `WM.map(W, {d0, alpha, base, layers: [{p, s, bin, …}], seed})` → `m = {W, fail, bin, cause, p, n, fails, yield}` (다이별 배열, 인덱스 k).
  `d0`는 무작위 치명 결함 밀도(개/cm²), `base`를 주면 그 확률을 직접 쓴다. `layers[].p`는 패턴 키, `s`는 무늬가 가장 센 곳의 불량 확률, `bin`은 그 무늬의 빈. `cause[k]`는 −1 합격, 0 무작위, n = n번째 층.
- 패턴 키(`WM.PATTERNS[key] = {name, en, kind, cause, f}`):
  장비 무늬(웨이퍼마다 같은 자리) `edge{width, soft}` `center{sigma}` `donut{r0, width}` `half{angle, start}` `swirl{arms, twist}` `pins{r0, rot, sigma}`
  웨이퍼마다 자리가 다른 무늬 `cluster{n, sigma}` `scratch{width}` `arc{width}`
  샷 기준 무늬 `repeater{pos}` `field{side}` `checker`
  사용자 무늬는 `{f: (p, W) => 0~1, s}`. p는 `{x, y, r, th, sx, sy, fx, fy, fpos}`.
- `WM.draw(ctx, W, box, {map, bins, values, fill:(die, k) => 색|null, sel, hi, shots, rings, edgeLine, notch, pad})` → `view = {cx, cy, s, X, Y, at(px, py) → k|-1}`.
  `map`만 주면 합격/불합격, `bins: true`면 빈 색, `values`(다이별 0~1)면 불량률 색. `WM.pos(canvas, event)` → `[x, y]`로 클릭 좌표를 얻어 `view.at`에 넣는다.
- 색: `WM.passColor()`, `WM.rate(t)`, `WM.binColor(id)`, `WM.BINS[id] = {name, en, color}`(1 합격, 2 연속성, 3 누설, 4 기능·스캔, 5 속도, 6 메모리, 7 파라메트릭, 8 전원 단락), `WM.mix(a, b, t)`.

### 통계
- `WM.stack(maps)` → 다이 자리별 불량률 `Float32Array`.
- `WM.radial(W, m|values, nb)` → `[{r0, r1, rm, n, f, rate}]`, `WM.angular(W, m|values, nb, rmin)` → `[{a0, a1, am, n, f, rate}]`.
- `WM.joins(m)` → `{joins, ff, expected, sd, z, ratio}` 이웃 쌍 통계. 무작위면 z ≈ 0, ratio ≈ 1.
- `WM.shotStat(m)` → `{pos: [{fx, fy, n, f, rate, z}], best, cols, rows}` 샷 안 자리별 불량률.
- `WM.components(m)` → 맞닿은 불량 덩어리 `[{ks, size, cx, cy, len, wid, elong, ang}]`.
- `WM.local(m)` → `{line: {z, x, y, ang}, blob: {z, x, y}}` 스크래치·군집 국소 탐색.
- `WM.classify(m)` → `[{key, name, score}]` 규칙 기반 패턴 분류(점수 3 이상이면 유의. 무늬가 없으면 첫 항목이 `none`). 호 스크래치는 `scratch`로 나온다.
- `WM.Y.poisson(l)`, `.murphy(l)`, `.seeds(l)`, `.negbin(l, alpha)`, `.moore(l)` — `l = A·D₀`.

### 결함 좌표 맵(인라인 검사)
- `WM.defects(W, {d0, nuisance, layers: [{p, n, type, …}], seed})` → `[{x, y, r, k, type, size(µm), killer, src}]`. `d0`·`nuisance`는 개/cm², `layers[].n`은 그 무늬가 더하는 결함 수(cluster 층의 덩어리 개수는 `blobs`). 같은 시드면 개수와 좌표가 같다. repeater 층은 `ux`, `uy`(0~1)로 다이 안 자리를 고정하면 웨이퍼(시드)가 달라도 같은 자리에 찍힌다. `src`는 0 무작위, n 층, −1 뉴슨스.
- `WM.drawDefects(ctx, view, defects, {color:(d) => 색|null, r, alpha})`. `WM.DTYPES[type] = {name, en, color, kill}`: `particle scratch residue bridge open missing pit nuisance`.

### 검사 영상 (`WM.img`)
영상은 n × n `Float32Array`(0~1). 다이 대 다이 비교, 문턱값, 명시야·암시야·SEM·전압 대비의 차이를 같은 장면으로 보여 준다.
- `WM.img.scene({type: "lines"|"contacts"|"logic"|"blank", pitch: 16, n: 128, seed, layout, ler: 0.4, color: 0.02})` → 장면. `seed`가 다르면 선 가장자리 거칠기와 막 색이 달라진다(다이마다 다른 것). `layout`은 설계.
- `WM.img.defect(scene, {type, x, y, size, ang, seed})` → 결함을 심은 새 장면. type: `particle bridge open scratch residue pit missing vcopen`. x·y는 0~1, size는 화소. `vcopen`(전기적으로 끊긴 콘택)은 `vc` 모드에서만 보인다.
- `WM.img.render(scene, {mode: "bf"|"df"|"sem"|"vc", res, noise, gain, filter, seed})` → 영상. `res`는 번짐(화소), `filter`는 암시야의 주기 패턴 제거(0~1, `logic`은 잘 안 걸러진다).
- `WM.img.diff(a, b)`, `WM.img.detect(diff, n, thr, minArea)` → `[{x, y, area, max}]`, `WM.img.blur(a, n, sigma)`.
- `WM.img.put(ctx, box, img, n, {map: "gray"|"hot"|"cool", gain, smooth, mask, thr})`. 검사 영상을 담는 `.sim-view`에는 `scope` 클래스를 붙인다.

## 점검
- `python tools/check.py <slug>` (playwright 필요). 넓은 화면·라이트와 360px·다크로 열어 콘솔 오류, 가로 넘침, 조작 중 예외를 보고한다.
- 브라우저 콘솔에 오류가 없어야 한다. 다크·라이트 테마 모두 확인.
- 캔버스 글자는 `YB.font()`로, 색은 `YB.palette()`로. 고정 색은 검사 영상(`.sim-view.scope`)처럼 실제 장비 화면이 어두운 경우에만.
