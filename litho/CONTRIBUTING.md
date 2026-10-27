# LithoBook 챕터 작성 가이드

빌드 과정 없는 정적 사이트다. `index.html` + `chapters/<slug>.html` + 공통 `css/style.css`, `js/common.js`, `js/litho.js`.
로컬 실행: `python -m http.server 8000` → http://localhost:8000 (file://로 열어도 동작하게 classic script만 쓴다. ES module 금지.)

## 기여물의 라이선스
실행 코드는 MIT, 본문·그림·문제·해설 등 교육 콘텐츠는 CC BY 4.0. 구분은 [라이선스 안내](LICENSE.md)를 따른다.

## 원칙
- **한국어**, 대상은 공대 학부생(반도체 공정 기초가 있다고 가정. 공정 전반은 [ProcessBook](https://semi.euiyun.com/process/)을 참조로 건다). 영어 원어는 `<span class="en">(Depth of focus)</span>`처럼 병기.
- 이 책의 뼈대는 **만져 보며 배우기**다(Bartosz Ciechanowski의 글이 본보기). 설명을 읽고 그림을 보는 책이 아니라, 요소 하나하나를 직접 끌고 돌리고 바꿔 보면서 "아, 이래서"를 얻는 책이다.
  - 개념 하나에 조작 가능한 그림 하나. 정적인 SVG는 조작으로 대신할 수 없을 때만 쓴다(장마다 1~2개 이하).
  - 한 시뮬레이터는 **한 가지**만 보여 준다. 슬라이더는 1~3개. 큰 종합 시뮬레이터는 장 끝에 하나.
  - 앞 시뮬레이터에서 만진 것 위에 다음 것을 쌓는다(광선 하나 → 차수 두 개 → 렌즈 → 상). 글은 시뮬레이터 바로 앞에서 "무엇을 움직여 볼지"를, 바로 뒤에서 "무엇을 봤는지"를 말한다.
  - 슬라이더뿐 아니라 캔버스 위 직접 끌기(`LB.drag`)를 적극적으로 쓴다. 끌 수 있는 것에는 손잡이를 그린다.
  - 값을 끝까지 밀었을 때 **무너지는 모습**이 보여야 한다(선이 붙는다, 끊어진다, 쓰러진다). 한계가 배울 점이다.
  - 결과는 숫자(`.sim-readout`)로도 함께 보여 준다.
- 순서: 개념 → 조작 가능한 그림 → 수식(KaTeX) → 시뮬레이터 → 실제 수치 → 타깃 파일 → 요약/퀴즈.
- 공정 흐름은 layout → OPC → mask → exposure → resist → develop → etch transfer. 각 장은 자기가 이 흐름의 어디인지 분명히 한다.
- 수치는 교과서·공개 자료의 대표값(Mack *Fundamental Principles of Optical Lithography*, Levinson *Principles of Lithography*, Bakshi *EUV Lithography*, IRDS 로드맵, 장비사 공개 자료). 확실하지 않은 수치는 '약', '~'를 붙인다. 회사 내부 수치는 쓰지 않는다. 노드 이름(2 nm, 1c)과 실제 치수가 다르다는 점을 헷갈리지 않게 쓴다.
- 외부 라이브러리는 KaTeX, three.js r147만. 이미지 대신 인라인 SVG/canvas.
- 색은 CSS 변수(`var(--accent)`)나 `LB.palette()`를 쓴다. 재질 색은 `LT.matColor()` / SVG의 `.m-*`.
- 모바일(폭 360px)에서 가로 스크롤 금지. SVG는 `viewBox`만 주고 width/height 생략.
- 문체는 평서문 "~다". 이모지 금지. 다른 장을 언급할 때는 `<a href="focus.html">5장</a>`처럼 링크한다.

## head 블록
소스에는 `<title>`과 `<meta name="description">`(한 줄)만 쓴다. canonical, `theme-color`, Open Graph, Twitter 카드, JSON-LD는 루트의 `tools/build.mjs`가 `js/common.js`의 `CHAPTERS`와 `book.json`의 `meta`로 배포물에 생성하고, 수식도 빌드가 KaTeX로 미리 렌더링한다. 소스에 이 태그들이나 KaTeX 태그를 넣으면 `npm test`가 실패한다. 빌드는 정적 HTML의 수식만 렌더링하므로 스크립트가 `\(`·`\[`·`$$`가 든 문자열을 DOM에 넣지 않는다. 소스 파일을 바로 열면 `common.js`가 CDN에서 KaTeX를 불러와 미리보기를 렌더링한다. 사이트맵은 루트에서 `npm run sitemap`으로 갱신한다.
```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>장 제목 · LithoBook</title>
<meta name="description" content="한 문장 설명(검색 결과에 보일 120자 안팎)">
<link rel="icon" type="image/svg+xml" href="../favicon.svg">
<link rel="stylesheet" href="../css/style.css">
<script src="../js/common.js"></script>
<script src="../js/litho.js"></script>
</head>
```

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
상단바·챕터 목록·공정 흐름 띠·오른쪽 목차·h2 번호·이전/다음·푸터·퀴즈 동작는 `common.js`가 자동으로 만든다. 직접 넣지 않는다.

## 컴포넌트
- 그림: `<figure class="diagram"><svg viewBox="0 0 720 300" role="img" aria-label="…">…</svg><figcaption><b>그림 제목.</b> 설명</figcaption></figure>`. SVG 안에서는 `.lbl`, `.lbl-dim`, `.lbl-b`, `.lbl-acc`, `.lbl-acc2`, `.lbl-bad`, `.t-mono`, `.s-line`, `.s-axis`, `.s-acc`, `.s-acc2`, `.s-dash`, `.s-bad`, `.f-surface`, `.f-elev`, `.f-acc`, `.f-acc2`, `.f-acc-soft`, `.f-acc2-soft`, `.f-ok-soft`, `.f-warn-soft`, `.f-bad-soft`, `.f-bad`, `.beam`, 재질 `.m-si .m-ox .m-nit .m-poly .m-w .m-cu .m-al .m-lowk .m-pr .m-barc .m-ac .m-sion .m-tin .m-sp .m-sp2 .m-abs .m-ml .m-qz .m-cr .m-ru .m-pel` 클래스를 쓴다. 색을 직접 적지 않는다(다크 모드). 화살표 머리는 `<marker>`에 `fill="context-stroke"`.
- 시뮬레이터:
```html
<div class="sim" id="sim-x">
  <div class="sim-head"><span class="sim-tag">SIMULATOR</span><h3>제목</h3></div>
  <div class="sim-body side">
    <div class="sim-view"><canvas id="x-cv"></canvas></div>   <!-- SEM 영상처럼 실제 화면이 어두우면 class="sim-view scope" -->
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
  컨트롤이 없거나 캔버스를 직접 끄는 시뮬레이터는 `.sim-body`에서 `side`를 빼고 `.sim-view` 안에 `<span class="hint">끌어서 움직인다</span>`를 둔다.
- 수식: `<div class="formula">$$…$$<div class="where">기호 설명</div></div>`, 문장 속은 `\(…\)`.
- 강조 상자: `.callout`, `.callout.tip`, `.callout.warn`, `.callout.deep`(첫 `<strong>`이 제목).
- 표: `<div class="table-wrap"><table>…</table></div>`. 숫자 칸은 `class="num"`.
- 용어: `<span class="term">초점 심도</span><span class="en">(Depth of focus)</span>`.
- 범례: `<div class="legend"><span><i style="background:var(--bad)"></i>불량</span></div>`, `.pill`, `.ok-t` `.bad-t` `.warn-t`.
- 퀴즈: `<div class="quiz-q"><p>문제</p><div class="opts"><button class="opt">…</button><button class="opt" data-correct>정답</button></div><div class="quiz-exp">해설</div></div>` (장마다 3~4문항, 정답 위치를 섞는다).
- 타깃 파일(아래 "이어지는 타깃" 참조):
```html
<div class="casefile">
  <div class="tag"><b>TARGET LB-28</b><span>타깃 파일 · 4장</span></div>
  <h4>수직 조명으로는 찍히지 않는다</h4>
  <p>…이 장의 방법을 타깃에 적용한 결과…</p>
  <div class="clue"><div><b>이 장에서 정한 것</b>…</div><div><b>아직 남은 문제</b>…</div><div><b>다음 단계</b>…</div></div>
</div>
```

## 이어지는 타깃: LB-28
모든 장은 같은 가상의 패턴 하나를 공정 흐름을 따라 한 걸음씩 진전시킨다. 각 장 끝(핵심 정리 앞)에 `.casefile` 하나를 넣고, **아래 표에서 자기 장에 해당하는 내용만** 다룬다. 뒤 장의 결론을 미리 말하지 않는다. 숫자는 `LT.LB28`로 직접 계산해서 쓴다(표의 값은 엔진으로 확인한 것).

- 타깃: 가상의 2 nm급 로직 칩의 최소 피치 금속 배선 클립. 피치 28 nm, 선폭(CD) 14 nm, 선 끝과 끝 사이(tip-to-tip) 24 nm. 224 × 224 nm 창에 세로 선 8줄, 그중 4줄이 끊겨 있다. 실제 회사·제품과 무관하다. 이 책에서는 "선 = 레지스트가 남는 곳"으로 본다.
- 재현:
```js
const T = LT.LB28;                                   // {L: 224, n: 128, pitch: 28, cd: 14, t2t: 24, rects, tone: "line", euv, arfi, thr: 0.335, blur: 3, dose: 60(mJ/cm²), range: 6, frag: 14}
const mask = LT.raster(T.rects, T);                  // 웨이퍼 치수 기준 마스크(실제 마스크는 4배)
const I = LT.blur(LT.aerial(mask, T.euv), mask, T.blur);   // EUV 0.33 NA, x 방향 쌍극 조명 → 대비 약 0.72, 선폭 약 14.0 nm (문턱 0.335, 상대 노광량 1)
const g = LT.grating(28, 14);                        // 1D 단면만 볼 때. LT.aerial(g, T.euv) → 번짐 3 nm 뒤 대비 약 0.63, NILS 약 2.0
```

| 장 | 이 장에서 다루는 것 |
|---|---|
| 01 개요 | 타깃 소개. 피치 28 nm, 선폭 14 nm, 끝-끝 24 nm. 질문: 어떤 빛으로, 몇 번에 찍을 것인가. 이 책 전체가 이 패턴을 일곱 단계로 옮기는 과정이라는 안내. |
| 02 회절 | 피치 28 nm 격자의 1차 회절각 sinθ = λ/p. ArF(193 nm)는 6.9로 1을 넘어 회절광이 아예 전파하지 못한다. EUV(13.5 nm)는 0.482. NA 0.33보다 커서 수직으로 비추면 1차가 동공 밖으로 나간다. |
| 03 해상도 | k₁ = CD·NA/λ. ArF 액침 0.098(한계 0.25 아래, 한 번에는 불가능), EUV 0.33 NA 0.342, High-NA 0.57. 최소 피치 λ/(2NA): 71.5 / 20.5 / 12.3 nm. |
| 04 조명 | σ가 작은 수직 조명에서는 대비 0. x 방향 쌍극 조명(σ 0.55~0.9)이 0차와 1차를 함께 동공에 넣는다. 극의 이상적 위치 σ = λ/(2p·NA) ≈ 0.73. |
| 05 초점 | 두 빔이 광축에 대칭이라 선/간격 부분은 초점에 둔감하다. 끝-끝 부분은 y 방향 회절광이 얽혀 초점에 더 민감하다. 초점 예산은 수십 nm. |
| 06 마스크 | EUV 마스크는 4배 축소 반사형. 마스크 위 선폭 56 nm. MEEF를 엔진으로 계산해 마스크 CD 오차가 웨이퍼에서 얼마가 되는지. |
| 07 OPC | OPC 전 EPE rms 약 0.6 nm. 선 끝이 양쪽에서 약 0.55 nm씩 물러나 끝-끝 간격이 약 25.1 nm로 벌어진다. 모델 OPC 뒤 rms 약 0.2 nm. 선 끝 바로 옆 측면 조각이 약 4 nm 바깥으로 나가 해머헤드 모양이 되고, 그 대신 끝 조각은 약 2.3 nm 안으로 들어간다. `LT.opc(T.rects, T.euv, Object.assign({}, T, {dose: 1, iters: 10, gain: 0.5, maxMove: 8}))` |
| 08 레지스트 | 문턱 0.335, 산 확산 번짐 3 nm. 번짐을 키우면 대비와 NILS가 얼마나 떨어지는지. 번짐이 피치의 1/4쯤 되면 무늬가 사라진다. |
| 09 현상 | 선폭 14 nm에 레지스트 두께 30 nm면 종횡비 약 2.1. 두껍게 쓰면 쓰러진다. 얇은 레지스트가 강제되고, 그래서 15장의 하드마스크가 필요해진다. |
| 10 공정 윈도 | 1D 격자의 ED 윈도(CD ±10%)와 노광량 여유도를 `LT.fem1d` + `LT.window`로 계산. 끝-끝을 함께 넣은 겹침 윈도는 더 좁다. |
| 11 CD | CD 예산 ±10% = ±1.4 nm. 이것을 노광량·초점·마스크·거칠기에 나눈다. |
| 12 오버레이 | 14 nm 선 위에 비아를 얹는다. 가장자리 배치 오차 예산은 선폭의 1/4쯤(약 3.5 nm), 오버레이는 약 2 nm 이하가 필요하다. |
| 13 EUV | 주광선 입사각 6°, 흡수체 두께 약 60 nm면 그림자 약 6.3 nm(마스크) = 약 1.6 nm(웨이퍼). 거울 10여 장을 지나면 빛의 약 2~3%만 남는다. |
| 14 확률론 | 노광량 60 mJ/cm² → 입사 광자 약 41개/nm²(`LT.photons`). 14 × 14 nm 영역에 흡수되는 광자는 약 2,000개(흡수율 25% 가정). 노광량을 줄이면 선이 끊긴다. |
| 15 전사 | 30 nm 레지스트 → SiARC → 탄소 하드마스크 → 저유전막 트렌치. 선택비와 식각 바이어스. |
| 16 멀티 패터닝 | EUV가 없다면: ArF 액침 SAQP(맨드릴 피치 112 nm → 28 nm) + 컷 마스크 여러 장. EUV 한 장과 마스크 수·공정 수 비교. |
| 17 노드 | LB-28이 2 nm 로직의 어느 층에 해당하고, 1c DRAM에서는 어떤 층이 비슷한 난이도인가. |
| 18 실험실 | 독자가 LB-28을 처음부터 끝까지 직접 돌린다. 자기 레이아웃도 그린다. |

## JS 헬퍼 (`LB`, `js/common.js`)
- `LB.canvas(el|선택자, draw(ctx, w, h), {aspect, minHeight, maxHeight})` → `{redraw(), ctx, w, h, canvas}`. 리사이즈·테마 변경 시 자동으로 다시 그린다. draw 안에서 `LB.palette()`를 매번 다시 읽는다. w, h는 CSS px. 문자열은 `querySelector` 선택자이므로 `"#id"`로 넘긴다. 만들자마자 draw를 한 번 부르므로 draw가 읽는 상태와 컨트롤(`LB.range`, `LB.seg`)을 먼저 만든다. 폭에 따라 배치를 바꿔 높이가 달라져야 하면 옵션 객체에 `get height() { … }` getter를 넘긴다.
- `LB.drag(canvas|선택자, {start(x, y, e), move(x, y, e), end(), hover(x, y, e)})` 캔버스 위 끌기(마우스·터치, CSS px). draw에서 계산한 배치(상자, 축 변환)를 바깥 변수에 저장해 두고 move에서 역변환한다.
- `LB.chart(ctx, box|null, {x:[min,max], y:[min,max], logX, logY, xLabel, yLabel, xFmt, yFmt, xTicks, yTicks, series:[{data:[[x,y]], color, width, dash, fill}], vlines:[{x,color,label}], hlines:[{y,color,label}], points:[{x,y,color,r,label}], bands:[{x0,x1,color}]})` → `{X, Y, box}`. 막대그래프·등고선은 반환된 `X`, `Y`로 직접 그린다.
- `LB.range(id, fmt, onInput)` → `get()`, `get.set(v)`. 출력은 `id + "-out"` 요소.
- `LB.seg(id, onChange)` → `get()`, `get.set(v)`. `LB.stat(id, html)`.
- `LB.loop(el, (dt, t) => {})` 화면에 보일 때만 도는 애니메이션. `LB.three(container, opts)`.
- `LB.palette()` → `{bg, text, dim, faint, grid, axis, border, surface, accent, accent2, ok, warn, bad, red, green, blue, series}`, `LB.color(name)`, `LB.isDark()`, `LB.onTheme(cb)`.
- 고정폭 글꼴(`LB.font(px, true)`, SVG의 `.t-mono`)은 숫자·영문에만 쓴다. 한글은 자간이 벌어진다.
- `LB.font(px, mono, weight)`, `LB.fmt(x, digits)`, `LB.si(x, unit, digits)`, `LB.erf/erfc`, `LB.rng(seed)`(0~1 난수 함수), `LB.randn()`, `LB.poisson(λ)`, `LB.debounce`, `LB.clamp/lerp/map`, `LB.wl2rgb(nm)`.
- `LB.CHAPTERS`, `LB.STAGES`.

## 노광 엔진 (`LT`, `js/litho.js`)
모든 장이 같은 광학 모델을 쓰게 하는 공통 엔진이다. 공간상·CD·공정 윈도·OPC·박막 반사·단면은 직접 만들지 말고 이것을 쓴다. 단위는 nm, 수차는 파장 단위(waves), y는 캔버스처럼 아래로 +.
모델은 **스칼라 아베 결상 + 얇은 마스크 근사 + 문턱 레지스트**다. 편광·마스크 3D·레지스트 현상 동역학은 없다. 시뮬레이터 주석(`.sim-note`)에 가정을 밝힌다.

### 마스크
- `LT.mask1d({L, n: 128, feats: [{c: 중심, w: 폭}], type: "binary"|"att"|"alt", att: 0.06, tone: "line"|"space"})` → `{n, L, re, im, d: 1}`. 주기 L. `tone: "line"`은 도형이 차광부(레지스트 선으로 남는다), `"space"`는 도형이 투광부(트렌치·홀). `att`는 감쇠 PSM(차광부 진폭 −√att), `alt`는 교번 PSM(투광부 위상이 번갈아 0/180°. 도형 개수가 짝수여야 한다).
- `LT.grating(pitch, cd, {type, tone, n: 64, periods})` → 선/간격 격자 한 주기의 mask1d (alt는 두 주기). 고립선은 `LT.mask1d({L: 2000, n: 256, feats: [{c: 1000, w: cd}]})`처럼 큰 주기에 도형 하나를 둔다.
- `LT.raster(rects, {L, n: 128, type, tone, att})` → 2D 마스크 `{n, L, re, cov, d: 2}`. `rects: [{x, y, w, h, sub?}]`(왼쪽 위 기준). 면적 비율로 안티에일리어싱하므로 화소보다 작은 이동도 반영된다. n은 2의 거듭제곱.
- 마스크 객체는 스펙트럼을 캐시한다. `re`를 직접 고쳤으면 새 객체를 만든다.

### 결상
- `LT.source({shape: "conv"|"annular"|"dipole"|"quasar"|"cquad"|"point", sigma, sigmaIn, sigmaOut, open(극 벌림각 °), orient: "x"|"y", n: 13})` → 광원점 `[{sx, sy, w}]`. dipole의 `orient: "x"`는 극이 x축 위(세로 선, 즉 x 방향 피치에 유리).
- `LT.aerial(mask, {wl, na, source(광원점 배열 또는 옵션 객체), defocus(nm), zern: {z5…z11: waves}, nMedium, obscuration, flare})` → 세기 `Float32Array`(1D면 n, 2D면 n·n, 맑은 곳 1). 1D n=64는 1 ms 미만, 2D n=128·광원점 25개는 약 50 ms. 슬라이더에 직접 묶을 때 2D는 n=64나 광원 `n: 9`로 줄이거나 `LB.debounce`를 쓴다.
- `LT.orders(mask1d, {wl, na}, mMax)` → `[{m, f, re, im, amp, phase, rho}]` 회절 차수. `rho = m·λ/(L·NA)`가 동공 좌표(수직 조명에서 |rho| ≤ 1이면 렌즈를 통과). 광원점 (sx, sy)에서는 `rho + sx`.
- `LT.pupilPhase(rx, ry, {wl, na, defocus, zern, nMedium})` 동공 위상(rad). `LT.ZERNIKE` 이름표.
- `LT.SCANNERS` = `{g, i, krf, arf, arfi, euv, hna}` 각각 `{name, wl, na, nMedium, k1min, year}`.

### 레지스트와 측정
- `LT.blur(I, mask, sigma)` 가우시안 번짐(산 확산). 문턱 모델: 양성 레지스트는 `dose·I > thr`인 곳이 녹는다. 즉 문턱을 `thr/dose`로 낮추는 것과 같다.
- `LT.cd1d(I, L, thr, x0, tone)` → `{cd, xl, xr, nils, ils, merged}`. x0를 포함하는 도형의 폭. 도형이 사라지면 `cd: 0`, 옆과 붙으면 `merged: true`.
- `LT.contrast(I)` → `{min, max, contrast}`. `LT.sample(I, n, L, x, y)` 2D 겹선형 표본.
- `LT.contours(I, n, L, thr)` → 선분 배열(nm). `LT.drawContour(ctx, box, I, n, L, thr, {color, width, dash})`.
- `LT.put(ctx, box, I, n, {map: "aerial"|"gray"|"heat"|"div", lo, hi})` 세기 영상. `LT.putResist(ctx, box, I, n, T, {color, alpha})` 남는 레지스트(I < T인 곳)를 칠한다.
- `LT.drawRects(ctx, box, rects, L, {fill, stroke, subFill, dash})`, `LT.drawSource(ctx, cx, cy, R, pts, {color})`.

### 공정 윈도
- `LT.fem1d(mask1d, opt, {focus: [nm…], dose: [상대…], thr, blur, x0, tone})` → `{focus, dose, cd[fi][di], nils[fi]}`.
- `LT.window(fem, target, tol = 0.1)` → `{lo[], hi[], ctr[], rects: [{dof, el, f0, f1, d0, d1}], dofAt(el%)}`. `lo/hi`는 초점마다 규격 안에 드는 노광량 구간, `rects`는 그 안에 들어가는 직사각형(DOF별 최대 노광량 여유도 %).
- 대칭 쌍극 조명의 밀집 격자는 스칼라 모델에서 초점에 거의 무관하다(실제 물리이기도 하다). 초점 의존을 보여 주려면 원형·환형 조명이나 고립선, 반밀집 피치를 쓴다.

### OPC
- `LT.fragments(rects, frag, L)` → 가장자리 조각 `[{x0, y0, x1, y1, nx, ny, cx, cy, d, epe, end}]`. `LT.applyFragments(rects, frags)` → 마스크 도형.
- `LT.measureEPE(frags, I, n, L, T, tone, range)` → `{rms, max}` (frags[].epe 채움. 양수면 목표보다 바깥으로 찍혔다).
- `LT.opc(rects, opt, {L, n, type, tone, thr, dose, blur, frag, iters, gain, maxMove, range, extra, frags})` → `{frags, rects, mask, image, epe, history}`. 한 번에 한 단계씩 보여 주려면 `iters: 1`과 이전 결과의 `frags`를 넘겨 이어 돌린다.
- `LT.opcRule(rects, {bias, serif, hammer, ext})`, `LT.sraf(rects, {dist, width})`.
- OPC 전후 차이가 크게 보이는 연습 클립: `LT.DUV` = `{L: 1024, n: 128, cd: 90, rects(밀집선 3 + 고립선 + ㄴ자), opt(ArF 건식 0.93 NA 환형), thr: 0.3, blur: 15, range: 40, frag: 60}`. 보정 전 EPE rms 약 25 nm(밀집선 87 nm, 고립선 61 nm, 선 끝 줄어듦) → `LT.opc(D.rects, D.opt, Object.assign({}, D, {dose: 1, iters: 10, gain: 0.6, maxMove: 40}))` 뒤 약 0.6 nm. 약 300 ms 걸리므로 버튼으로 돌리거나 한 단계씩 애니메이션한다.

### 확률론
- `LT.photons(dose mJ/cm², wl)` → 입사 광자 수/nm² (EUV 30 mJ/cm² ≈ 20개, ArF는 약 290개).
- `LT.shot(I, mask, {dose, wl, absorb: 0.25, seed})` → 화소마다 푸아송 잡음이 낀 세기(같은 단위). 그 뒤 `LT.blur`로 산 확산을 주고 문턱을 적용하면 거친 가장자리와 끊어진 선이 나온다.

### 박막 광학
- `LT.tmm(layers: [{n, k, d}](위→아래), {wl, angle, pol: "s"|"p"|"u", n0: [n, k], ns: [n, k]})` → `{R, T, A}`.
- `LT.multilayer({wl: 13.5, angle, pairs: 40, period: 6.95, gamma: 0.4, cap: 2.5})` → Mo/Si 거울 `{R}`. 13.5 nm에서 약 0.73, 13.0·14.0 nm에서 약 0.12. 12.6~14.4 nm 범위에서만 쓴다.
- `LT.standing({wl, resist: {n, k, d}, under: [{n, k, d}], substrate: [n, k]})` → `{I(깊이별 세기), R, Rsub, absorbed}`. 193 nm 실리콘 위 맨 레지스트는 Rsub 약 0.57, BARC 35 nm면 약 0.04.
- `LT.NK[193|248|365|13.5]` 굴절률 표(`si`, `resist`, `barc`, `sio2`, `mo`, `ru`, `tabn` …).

### 단면 (`LT.xs`)
식각 전사·스페이서 패터닝을 그리는 기둥 모델. 가로는 주기 경계.
```js
const xs = LT.xs({ width: 224, n: 448, stack: [{ m: "si", h: 20 }, { m: "lowk", h: 40 }, { m: "tin", h: 15 }] });
xs.fill("ac", 60).fill("sion", 15).fill("pr", 30);          // 평탄 도포
xs.pattern("pr", [[7, 21], [35, 49]]);                      // 이 구간의 레지스트만 남긴다(현상)
xs.etch({ sion: 1, pr: 0.5 }, 18);                          // 수직 식각. 값은 상대 식각 속도, 표에 없는 재질에서 멈춘다
xs.deposit("sp", 14).etch("sp", 14).strip("ac");            // 등각 증착 → 에치백 → 맨드릴 제거 = 스페이서
xs.trim("pr", 3);  xs.cmp(y);  xs.lines("sp");  xs.topOf("ox");  xs.clone();
const v = xs.draw(ctx, box, { yMax: 160, outline: P.axis }); // v.X(nm), v.Y(nm) → px
```
재질 키: `si ox nit poly ac sion barc pr tin lowk cu w sp sp2` (`LT.MAT`에 이름, 색은 CSS `--m-*`).

## 점검
- `python tools/check.py <slug>` (playwright 필요). 넓은 화면·라이트와 360px·다크로 열어 콘솔 오류, 가로 넘침, 조작 중 예외를 보고한다. `--shots 폴더`로 스크린샷을 남겨 눈으로도 본다.
- 브라우저 콘솔에 오류가 없어야 한다. 다크·라이트 테마 모두 확인.
- 캔버스 글자는 `LB.font()`로, 색은 `LB.palette()`로. 고정 색은 공간상 영상(`LT.put`)과 SEM 화면(`.sim-view.scope`)처럼 실제로 어두운 경우에만.
