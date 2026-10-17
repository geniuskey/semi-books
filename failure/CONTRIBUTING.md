# FailureBook 챕터 작성 가이드

빌드 과정 없는 정적 사이트다. `index.html` + `chapters/<slug>.html` + 공통 `css/style.css`, `js/common.js`, `js/fa.js`.
로컬 실행: `python -m http.server 8000` → http://localhost:8000 (file://로 열어도 동작하게 classic script만 쓴다. ES module 금지.)

## 기여물의 라이선스
실행 코드는 MIT, 본문·그림·문제·해설 등 교육 콘텐츠는 CC BY 4.0. 구분은 [라이선스 안내](LICENSE.md)를 따른다.

## 원칙
- **한국어**, 대상은 공대 학부생(반도체 소자·공정 기초가 있다고 가정. 공정은 [ProcessBook](https://semi.euiyun.com/process/)을 참조로 건다). 영어 원어는 `<span class="en">(Photon emission)</span>`처럼 병기.
- 이 책의 뼈대는 **수사**다. 불량 발생 → 전기적 검출 → 위치 추적 → 층 제거 → 물리 분석 → 근본 원인. 각 장은 "이 기법이 어떤 단서를 주고, 어떤 단서는 못 주는가"를 분명히 한다.
- 개념 → 직관 그림(SVG) → 수식(KaTeX) → 시뮬레이터 → 실제 수치 → 사건 파일 → 요약/퀴즈 순서.
- 수치는 교과서·핸드북(ASM *Microelectronics Failure Analysis Desk Reference*, ISTFA 논문, JEDEC 문서)의 대표값. 확실하지 않은 수치는 '약', '~'를 붙인다. 장비 모델명·회사 내부 수치는 쓰지 않는다.
- 외부 라이브러리는 KaTeX, three.js r147만. 이미지 대신 인라인 SVG/canvas.
- 색은 CSS 변수(`var(--accent)`)나 `FB.palette()`를 쓴다. 물리적 재질색은 `--m-si`, `--m-cu` … 또는 `FA.MAT[...].color`.
- 모바일(폭 360px)에서 가로 스크롤 금지. SVG는 `viewBox`만 주고 width/height 생략.
- 문체는 평서문 "~다". 이모지 금지.

## head 블록
각 챕터 `<head>`에는 아래 표식만 두고 `python tools/head.py`를 실행한다. 제목·번호는 `js/common.js`의 `CHAPTERS`에서 읽고, canonical·OG·JSON-LD·사이트맵·`index.html`의 `hasPart`를 함께 갱신한다.
```html
<!--head:start {"desc": "한 문장 설명", "libs": ["fa", "three"]}-->
<!--head:end-->
```
`libs`의 `fa`는 `js/fa.js`, `three`는 three.js + OrbitControls를 불러온다. 쓰지 않으면 뺀다.
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
상단바·챕터 목록·수사 단계 띠·오른쪽 목차·h2 번호·이전/다음·푸터·퀴즈 동작·KaTeX 렌더는 `common.js`가 자동으로 만든다. 직접 넣지 않는다.

## 컴포넌트
- 그림: `<figure class="diagram"><svg viewBox="0 0 720 300">…</svg><figcaption><b>그림 제목.</b> 설명</figcaption></figure>`. SVG 안에서는 `.lbl`, `.lbl-dim`, `.lbl-b`, `.lbl-acc`, `.lbl-acc2`, `.lbl-bad`, `.t-mono`, `.s-line`, `.s-axis`, `.s-acc`, `.s-acc2`, `.s-dash`, `.s-bad`, `.f-surface`, `.f-elev`, `.f-acc-soft`, `.f-acc2-soft`, `.f-ok-soft`, `.f-warn-soft`, `.f-bad-soft`, `.beam`, 재질 `.m-si .m-ox .m-nit .m-poly .m-w .m-cu .m-al .m-bar .m-lowk .m-sil .m-mold .m-sub .m-au .m-sn .m-void` 클래스를 쓴다. 색을 직접 적지 않는다(다크 모드).
- 시뮬레이터:
```html
<div class="sim" id="sim-x">
  <div class="sim-head"><span class="sim-tag">SIMULATOR</span><h3>제목</h3></div>
  <div class="sim-body side">
    <div class="sim-view"><canvas id="x-cv"></canvas></div>   <!-- 현미경 영상이면 class="sim-view scope" -->
    <div class="sim-controls">
      <label class="ctrl"><span>이름 <output id="x-a-out"></output></span><input type="range" id="x-a" min="0" max="10" step="0.1" value="3"></label>
      <div class="seg" id="x-mode"><button data-value="a" class="on">A</button><button data-value="b">B</button></div>
      <label class="check"><input type="checkbox" id="x-c"> 옵션</label>
      <div class="btn-row"><button class="btn primary" id="x-go">실행</button><button class="btn" id="x-re">다시</button></div>
    </div>
  </div>
  <div class="sim-readout"><div class="stat"><span class="k">이름</span><span class="v" id="x-o-1">—</span></div></div>
  <div class="sim-note">해볼 것: ① … ② … ③ …</div>
</div>
```
- 수식: `<div class="formula">$$…$$<div class="where">기호 설명</div></div>`, 문장 속은 `\(…\)`.
- 강조 상자: `.callout`, `.callout.tip`, `.callout.warn`, `.callout.deep`(첫 `<strong>`이 제목).
- 표: `<div class="table-wrap"><table>…</table></div>`.
- 용어: `<span class="term">전압 대비</span><span class="en">(Voltage contrast)</span>`.
- 퀴즈: `<div class="quiz-q"><p>문제</p><div class="opts"><button class="opt">…</button><button class="opt" data-correct>정답</button></div><div class="quiz-exp">해설</div></div>` (장마다 3~4문항).
- 사건 파일(아래 "이어지는 사건" 참조):
```html
<div class="casefile">
  <div class="tag"><b>CASE FB-28</b><span>사건 파일 · 6장</span></div>
  <h4>발광점은 범인이 아니라 피해자였다</h4>
  <p>…이 장의 기법을 사건에 적용한 결과…</p>
  <div class="clue"><div><b>얻은 단서</b>…</div><div><b>아직 모르는 것</b>…</div><div><b>다음 단계</b>…</div></div>
</div>
```

## 이어지는 사건: CASE FB-28
모든 장은 같은 가상의 사건을 한 걸음씩 진전시킨다. 각 장 끝(핵심 정리 앞)에 `.casefile` 하나를 넣고, **아래 표에서 자기 장에 해당하는 사실만** 밝힌다. 뒤 장의 결론을 미리 말하지 않는다.

- 제품: 가상의 28 nm 모바일 SoC, 구리 듀얼 다마신 배선 8층. 실제 회사·제품과 무관하다.
- 한 줄 요약: 비아 식각 후 세정이 웨이퍼 가장자리에서 부족해 V2 바닥에 식각 잔류물이 남았고, 배리어가 끊겨 비아 바닥에 보이드가 생긴 **저항성 비아** 사건.

| 장 | 이 장에서 밝혀지는 것 |
|---|---|
| 01 개요 | 사건 접수. 특정 로트에서 수율이 약 6%p 떨어졌다. 불량 모드는 "저전압에서 스캔 테스트 불량". 이 책 전체가 이 사건을 따라간다는 안내. |
| 02 메커니즘 | 용의자 목록. 저전압·고주파에서만 나타나는 불량은 완전한 단선·단락이 아니라 저항성 결함(저항성 비아·콘택, 가는 배선)에서 흔하다. 온도를 올리면 오히려 불량이 줄어드는 것도 단서(금속 경로가 아닌 접촉 저항 성격). |
| 03 검출 | 웨이퍼 맵에서 불량 다이가 가장자리 고리(반지름 약 130 mm 바깥)에 몰린다. 슈무 플롯은 1.0 V 정상, 0.85 V 아래와 고주파 모서리에서 불량. IDDQ는 정상(단락 아님). |
| 04 진단 | 스캔 진단이 불량 다이 20개 중 17개에서 같은 종류의 넷을 지목. 후보 넷은 M2–M3를 잇는 V2를 여러 개 거치는 긴 신호선. 천이 지연 고장 모델과 잘 맞는다. |
| 05 비파괴 | X선·SAM에서 패키지 이상 없음(와이어·범프·박리 정상). 문제는 다이 안쪽. 웨이퍼 단계 불량이라 예상된 결과지만 확인하고 넘어간다. |
| 06 에미션 | 0.85 V에서 후면 포톤 에미션. 후보 넷이 구동하는 인버터에서 비정상 발광. 발광점은 결함 자체가 아니라 중간 전압에 머무는 입력 때문에 관통 전류가 흐르는 "피해자" 트랜지스터. |
| 07 레이저·열 | OBIRCH로 후보 넷을 따라 스캔. 넷 중간의 V2 한 곳에서 강한 신호. 락인 열화상은 발열이 너무 작아 검출 실패(전력 수 µW). |
| 08 동적 | SDL(soft defect localization): 레이저로 데우면 불량→정상으로 바뀌는 지점이 OBIRCH 지점과 일치. LVP 파형으로 그 지점 뒤에서 상승 시간이 약 180 ps 늦어짐을 확인. |
| 09 디프로세싱 | 후면 분석을 마치고 전면에서 M3까지 층 제거. 보호막·M8~M4를 차례로 걷어 내고 M3 표면에서 멈춘다. 너무 내려가면 V2가 사라진다. |
| 10 SEM | M3 노출 상태에서 전압 대비(PVC). 의심 V2 위의 M3 조각만 어둡게(부유) 보인다. 나노프로빙으로 그 비아의 저항 약 4.2 kΩ 측정(정상 약 3 Ω). |
| 11 FIB | 그 비아를 FIB로 단면 가공. 비아 바닥에 어두운 틈(보이드)이 보인다. SEM 분해능으로는 계면 상세가 부족해 TEM 라멜라를 제작(두께 약 80 nm). |
| 12 TEM | STEM HAADF에서 비아 바닥 배리어(Ta/TaN)가 한쪽에서 끊겨 있고 그 아래에 약 15 nm 두께의 비정질 층, 위쪽 구리에 보이드. |
| 13 성분 | EDS·EELS 선 분석: 비정질 층에서 C, F, O 검출. 불소탄소 계열 식각 잔류물(폴리머)과 일치. 구리 산화물 신호도 함께. |
| 14 근본 원인 | 공통성 분석: 불량 웨이퍼는 모두 비아 식각 후 습식 세정 장비의 2번 챔버를 지났다. 가장자리 노즐 유량 저하로 세정 부족. 시정 조치: 노즐 교체, 유량 인터록, 세정 후 가장자리 결함 검사 추가. 검증 로트에서 가장자리 고리 사라짐. |
| 15 사건 파일 | FB-28이 아닌 새 사건들을 독자가 직접 푼다. |

## JS 헬퍼 (`FB`, `js/common.js`)
- `FB.canvas(el|선택자, draw(ctx, w, h), {aspect, minHeight, maxHeight})` → `{redraw(), ctx, w, h, canvas}`. 리사이즈·테마 변경 시 자동으로 다시 그린다. draw 안에서 `FB.palette()`를 매번 다시 읽는다.
- `FB.chart(ctx, box|null, {x:[min,max], y:[min,max], logX, logY, xLabel, yLabel, xFmt, yFmt, series:[{data:[[x,y]], color, width, dash, fill}], vlines:[{x,color,label}], hlines:[{y,color,label}], points:[{x,y,color,r,label}], bands:[{x0,x1,color}]})` → `{X, Y, box}`
- `FB.range(id, fmt, onInput)` → `get()`, `get.set(v)`. 출력은 `id + "-out"` 요소.
- `FB.seg(id, onChange)` → `get()`, `get.set(v)`. `FB.stat(id, html)`.
- `FB.loop(el, (dt, t) => {})` 화면에 보일 때만 도는 애니메이션. `FB.three(container, opts)`.
- `FB.palette()` → `{bg, text, dim, faint, grid, axis, border, surface, accent, accent2, ok, warn, bad, red, green, blue, series}`, `FB.color(name)`, `FB.isDark()`, `FB.onTheme(cb)`.
- `FB.font(px, mono, weight)`, `FB.fmt(x, digits)`, `FB.si(x, unit, digits)`, `FB.erf/erfc`, `FB.rng(seed)`, `FB.randn()`, `FB.poisson(λ)`, `FB.debounce`, `FB.clamp/lerp/map`, `FB.kB`(eV/K), `FB.C`(물리 상수), `FB.wl2rgb(nm)`.
- `FB.CHAPTERS`, `FB.STAGES`.

## 불량 분석 엔진 (`FA`, `js/fa.js`)
여러 장이 같은 증거물을 다른 장비로 본다는 느낌을 주려고 만든 공통 모델이다. 맞는 곳에서는 적극적으로 쓴다.
- `FA.stack({width, metals, seed, defect:{type, level, at}})` → `{W, top, bottom, shapes, levels, defect}`. 배선 단면 모델. x(nm)는 왼쪽 0, y(nm)는 실리콘 표면 0·위가 +. `defect.type`: `"void" | "open" | "bridge" | "particle" | "gox"`. `levels`는 `[{name:"M3", kind:"metal"|"via"|"contact"|"feol"|"pass", lv, y0, y1}]`(아래 → 위).
- `FA.drawStack(ctx, model, box, {mode:"color"|"sem"|"tem", x0, x1, y0, y1, removedAbove, bg, hideDefect, mark, labels, grain, seed})` → `{X, Y, s}`. `removedAbove`(nm)보다 위는 그리지 않는다(층 제거·연마 표현).
- `FA.MAT`(재질 이름·색·SEM/TEM 밝기), `FA.DEFECTS`(결함 이름·전기적 증상), `FA.legend(["cu","bar","lowk"])` → `.mat-legend`에 넣을 HTML.
- `FA.wafer({n, pattern, base, strength, seed})` → `{n, dies:[{i,j,x,y,r,fail,cause,p}], total, fails, yield}`. `pattern`: `"none" | "edge" | "center" | "donut" | "scratch" | "cluster" | "reticle" | "half"`.
- `FA.drawWafer(ctx, wafer, box, {fill:(die)=>색, sel:{i,j}})` → `{cx, cy, R, at(px,py)}`.
- `FA.layout({seed, tracks, levels})` → `{levels:[{dir, w, segs:[{t,a,b}]}], vias:[{lv,x,y}]}`(0~1 좌표), `FA.drawLayout(ctx, lay, box, {show, mono, alpha, bg, colors})` → `{X, Y}`.
- `FA.heat(ctx, box, fn(u,v)→0~1, {nx, map:"gray"|"hot"|"thermal"|"emi", overlay, threshold, noise, seed})`, `FA.colormap(name, t)`, `FA.grain(ctx, box, amount, seed)`, `FA.scaleBar(ctx, box, pxPerUnit, unit)`.

## 점검
- 브라우저 콘솔에 오류가 없어야 한다. 다크·라이트 테마 모두 확인.
- 캔버스 글자는 `FB.font()`로, 색은 `FB.palette()`로. 고정 색은 현미경 영상(`.sim-view.scope`)처럼 실제 장비 화면이 어두운 경우에만.
