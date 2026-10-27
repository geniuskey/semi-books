# EtchBook 챕터 작성 가이드

빌드 과정 없는 정적 사이트다. `index.html` + `chapters/<slug>.html` + 공통 `css/style.css`, `js/common.js`, `js/etch.js`.
로컬 실행: `python -m http.server 8000` → http://localhost:8000 (file://로 열어도 동작하게 classic script만 쓴다. ES module 금지.)
같은 시리즈의 [LithoBook](https://github.com/geniuskey/lithobook)과 구조·문체·컴포넌트가 같다. 막히면 그 저장소의 장을 본보기로 삼는다.

## 기여물의 라이선스
실행 코드는 MIT, 본문·그림·문제·해설 등 교육 콘텐츠는 CC BY 4.0. 구분은 [라이선스 안내](LICENSE.md)를 따른다.

## 원칙
- **한국어**, 대상은 공대 학부생(반도체 공정 기초가 있다고 가정. 공정 전반은 [ProcessBook](https://semi.euiyun.com/process/), 노광은 [LithoBook](https://semi.euiyun.com/litho/)을 참조로 건다). 영어 원어는 `<span class="en">(Aspect-ratio dependent etching)</span>`처럼 병기.
- 이 책의 뼈대는 **만져 보며 배우기**다(Bartosz Ciechanowski의 글이 본보기). 설명을 읽고 그림을 보는 책이 아니라, 요소 하나하나를 직접 끌고 돌리고 바꿔 보면서 "아, 이래서"를 얻는 책이다.
  - 개념 하나에 조작 가능한 그림 하나. 정적인 SVG는 조작으로 대신할 수 없을 때만 쓴다(장마다 1~2개 이하).
  - 한 시뮬레이터는 **한 가지**만 보여 준다. 슬라이더는 1~3개. 큰 종합 시뮬레이터는 장 끝에 하나.
  - 앞 시뮬레이터에서 만진 것 위에 다음 것을 쌓는다. 글은 시뮬레이터 바로 앞에서 "무엇을 움직여 볼지"를, 바로 뒤에서 "무엇을 봤는지"를 말한다.
  - 슬라이더뿐 아니라 캔버스 위 직접 끌기(`EB.drag`)를 적극적으로 쓴다. 끌 수 있는 것에는 손잡이를 그린다.
  - 값을 끝까지 밀었을 때 **무너지는 모습**이 보여야 한다(마스크가 다 닳는다, 선이 끊어진다, 정지막이 뚫린다, 구멍이 막힌다). 한계가 배울 점이다.
  - 결과는 숫자(`.sim-readout`)로도 함께 보여 준다.
  - **시간에 따라 단면이 깎여 내려가는 모습**이 이 책의 얼굴이다. 식각을 다루는 장은 적어도 하나의 시뮬레이터에서 `ET.sim`이나 `ET.wet`으로 프로파일의 시간 변화를 직접 보여 준다(등고선 기록 `s.snap()` + `history: true`).
- 순서: 개념 → 조작 가능한 그림 → 수식(KaTeX) → 시뮬레이터 → 실제 수치 → 타깃 파일 → 요약/퀴즈.
- 식각의 흐름은 마스크 → 플라스마 → 수송 → 표면 반응 → 프로파일 → 종말점·계측. 각 장은 자기가 이 흐름의 어디인지 분명히 한다.
- 수치는 교과서·공개 자료의 대표값(Lieberman & Lichtenberg *Principles of Plasma Discharges and Materials Processing*, Chen & Chang *Principles of Plasma Processing*, Donnelly & Kornblit "Plasma etching: Yesterday, today, and tomorrow"(JVST A 2013), Coburn & Winters(1979), Kanarik 외 ALE 리뷰(JVST A 2015), Gottscho 외 "Microscopic uniformity in plasma etching"(JVST B 1992), 장비사 공개 자료). 확실하지 않은 수치는 '약', '~'를 붙인다. 회사 내부 수치는 쓰지 않는다.
- 시뮬레이터 수치는 교육용 모델의 값이다. 실제 공정과 같은 숫자라고 주장하지 않는다. 모델의 가정은 `.sim-note`에 밝힌다.
- 외부 라이브러리는 KaTeX, three.js r147만. 이미지 대신 인라인 SVG/canvas.
- 색은 CSS 변수(`var(--accent)`)나 `EB.palette()`를 쓴다. 재질 색은 `ET.matColor(key)` / SVG의 `.m-*`.
- 모바일(폭 360px)에서 가로 스크롤 금지. SVG는 `viewBox`만 주고 width/height 생략.
- 문체는 평서문 "~다". 이모지 금지. 다른 장을 언급할 때는 `<a href="arde.html">10장</a>`처럼 링크한다.

## head 블록
소스에는 `<title>`과 `<meta name="description">`(한 줄)만 쓴다. canonical, `theme-color`, Open Graph, Twitter 카드, JSON-LD는 루트의 `tools/build.mjs`가 `js/common.js`의 `CHAPTERS`와 `book.json`의 `meta`로 배포물에 생성하고, 수식도 빌드가 KaTeX로 미리 렌더링한다. 소스에 이 태그들이나 KaTeX 태그를 넣으면 `npm test`가 실패한다. 빌드는 정적 HTML의 수식만 렌더링하므로 스크립트가 `\(`·`\[`·`$$`가 든 문자열을 DOM에 넣지 않는다. 소스 파일을 바로 열면 `common.js`가 CDN에서 KaTeX를 불러와 미리보기를 렌더링한다. 사이트맵은 루트에서 `npm run sitemap`으로 갱신한다.
```html
<!doctype html>
<!-- Copyright (c) 2026 geniuskey and EtchBook contributors.
     Executable code: MIT (see ../LICENSE-MIT).
     Text, illustrations, questions and explanations: CC-BY-4.0 (see ../LICENSE.md). -->
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>장 제목 · EtchBook</title>
<meta name="description" content="한 문장 설명(검색 결과에 보일 120자 안팎)">
<link rel="icon" type="image/svg+xml" href="../favicon.svg">
<link rel="stylesheet" href="../css/style.css">
<script src="../js/common.js"></script>
<script src="../js/etch.js"></script>
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
  <section id="case" data-nonum><h2>타깃 파일</h2><div class="casefile">…</div></section>
  <section class="keypoints" id="summary"><h2>핵심 정리</h2><ol><li>…</li></ol></section>
  <section class="quiz-sec" id="quiz"><h2>확인 퀴즈</h2><div class="quiz"> … </div></section>
</main>
<script>(function () { "use strict"; /* 시뮬레이터 */ })();</script>
</body>
```
상단바·챕터 목록·식각 흐름 띠·오른쪽 목차·h2 번호·이전/다음·푸터·퀴즈 동작는 `common.js`가 자동으로 만든다. 직접 넣지 않는다.

## 컴포넌트
- 그림: `<figure class="diagram"><svg viewBox="0 0 720 300" role="img" aria-label="…">…</svg><figcaption><b>그림 제목.</b> 설명</figcaption></figure>`. SVG 안에서는 `.lbl`, `.lbl-dim`, `.lbl-b`, `.lbl-acc`, `.lbl-acc2`, `.lbl-bad`, `.t-mono`, `.s-line`, `.s-axis`, `.s-acc`, `.s-acc2`, `.s-dash`, `.s-bad`, `.f-surface`, `.f-elev`, `.f-acc`, `.f-acc2`, `.f-acc-soft`, `.f-acc2-soft`, `.f-ok-soft`, `.f-warn-soft`, `.f-bad-soft`, `.f-bad`, `.beam`, 재질 `.m-si .m-ox .m-nit .m-poly .m-w .m-cu .m-al .m-lowk .m-pr .m-barc .m-ac .m-sion .m-tin .m-cr .m-cfx(고분자) .m-wet(식각액) .m-plasma(플라스마 빛)` 클래스를 쓴다. 색을 직접 적지 않는다(다크 모드). 화살표 머리는 `<marker>`에 `fill="context-stroke"`.
- 시뮬레이터:
```html
<div class="sim" id="sim-x">
  <div class="sim-head"><span class="sim-tag">SIMULATOR</span><h3>제목</h3></div>
  <div class="sim-body side">
    <div class="sim-view"><canvas id="x-cv"></canvas></div>   <!-- SEM 단면처럼 실제 화면이 어두우면 class="sim-view scope" -->
    <div class="sim-controls">
      <label class="ctrl"><span>이름 <output id="x-a-out"></output></span><input type="range" id="x-a" min="0" max="10" step="0.1" value="3"></label>
      <div class="seg" id="x-mode"><button data-value="a" class="on">A</button><button data-value="b">B</button></div>
      <label class="check"><input type="checkbox" id="x-c"> 옵션</label>
      <div class="btn-row"><button class="btn primary" id="x-go">식각 시작</button><button class="btn" id="x-re">처음으로</button></div>
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
- 용어: `<span class="term">선택비</span><span class="en">(Selectivity)</span>`.
- 범례: `<div class="legend"><span><i style="background:var(--m-ox)"></i>산화막</span></div>`, `.pill`, `.ok-t` `.bad-t` `.warn-t`.
- 퀴즈: `<div class="quiz-q"><p>문제</p><div class="opts"><button class="opt">…</button><button class="opt" data-correct>정답</button></div><div class="quiz-exp">해설</div></div>` (장마다 3~4문항, 정답 위치를 섞는다).
- 타깃 파일:
```html
<div class="casefile">
  <div class="tag"><b>TARGET EB-20</b><span>타깃 파일 · 4장</span></div>
  <h4>이온은 몇 eV로, 몇 도로 들어오는가</h4>
  <p>…이 장의 방법을 타깃에 적용한 결과…</p>
  <div class="clue"><div><b>이 장에서 정한 것</b>…</div><div><b>아직 남은 문제</b>…</div><div><b>다음 단계</b>…</div></div>
</div>
```

## 이어지는 타깃: EB-20
모든 장은 같은 가상의 식각 하나를 한 걸음씩 진전시킨다. 각 장 끝(핵심 정리 앞)에 `.casefile` 하나를 넣고, **아래 표에서 자기 장에 해당하는 내용만** 다룬다. 뒤 장의 결론을 미리 말하지 않는다. 숫자는 `ET.EB20`으로 직접 계산해서 쓴다(표의 값은 엔진으로 확인한 것. 몬테카를로라 1 nm 안팎으로 흔들린다).

- 타깃: 가상의 메모리 칩 주변 회로의 산화막 트렌치. 피치 40 nm, 폭(CD) 20 nm, 깊이 160 nm(종횡비 8). 위에서부터 비정질 탄소 하드마스크 60 nm / 산화막(SiO₂) 160 nm / 질화막 정지막 15 nm / 실리콘. 실제 회사·제품과 무관하다.
- 규격(이 책이 정한 것): 정지막까지 다 열 것, 측벽 각 ≥ 88.5°, 보잉(최대 폭 − 윗 폭) ≤ 3 nm, 마이크로트렌치 ≤ 2 nm, 남은 마스크(가장 얇은 곳) ≥ 15 nm, 정지막 손실 ≤ 3 nm.
- 재현:
```js
const s = ET.EB20.build();                  // {pitch: 40, cd: 20, depth: 160, mask: 60, stop: 15}. build({cd, pitch, mask, taper, dx, seed})
s.setRecipe(ET.EB20.recipe());              // = ET.recipe("oxide"). 일부만 바꾸려면 ET.EB20.recipe({ ion: { sigma: 8 } })
s.run(400);                                 // 시간 400 = 주 식각 약 300 + 과식각 약 33%
const m = ET.measure(s, { x: 20 });         // depth, top, max, bow, angle, micro, maskLeft, maskMax …
ET.thick(s, "nit", 20);                     // 트렌치 가운데에 남은 정지막 두께
```
- 기본 레시피의 기준값(엔진으로 확인): 시간 100 → 깊이 약 62 nm, 200 → 115, 300 → 160(정지막 도달), 400 → 162. 시간 400에서 측벽 각 약 89.5~90°, 보잉 0, 마이크로트렌치 0, 마스크 가장 얇은 곳 약 34 nm(가운데 약 43 nm, 윗모서리가 패싯으로 깎인다), 정지막 손실 약 2 nm, 산화막 윗 폭 약 24 nm(마스크 바닥 바로 아래가 한쪽 2 nm쯤 넓어진다). 열린 평면의 속도비 산화막 : 탄소 : 질화막 = 1 : 0.042 : 0.011.
- 폭만 바꾼 같은 시간(200)의 깊이: 폭 10 nm 약 77, 20 nm 약 114, 40 nm 약 138, 80 nm 약 158(ARDE). 이온 각도 퍼짐 σ 3° → 8°: 보잉 약 5~7 nm. 고분자 전구체 유량 2.4 → 6.5: 측벽 각 약 86°, 위가 막혀 깊이 약 60 nm에서 멈춘다.

| 장 | 이 장에서 다루는 것 |
|---|---|
| 01 개요 | 타깃 소개. 숫자와 규격. 왜 이 트렌치를 깎기가 어려운가(종횡비 8, 폭 20 nm). 이 책 전체가 이 한 번의 식각을 여섯 단계로 따라간다는 안내. 습식으로는 왜 안 되는지는 질문으로만 던진다. |
| 02 습식 | 이 트렌치를 HF 용액으로 판다면: 등방성이라 깊이 160 nm 동안 옆으로도 160 nm 파여 피치 40 nm의 벽이 깊이 약 10 nm에서 이미 사라진다(`ET.wet`). 습식은 식각 뒤 세정과 희생막 제거에만 쓴다. |
| 03 플라스마 | C₄F₈/Ar/O₂ 플라스마의 대표값: 압력 수십 mTorr, 전자 온도 약 3 eV, 전자 밀도 10¹⁶~10¹⁷ m⁻³, 이온화율 10⁻⁴ 안팎. 데바이 길이(`ET.debye`)는 수십 µm. 라디칼이 이온보다 수백~수천 배 많다. |
| 04 시스 | 바이어스 수백 V → 이온 에너지 수백 eV. 시스 두께(mm 단위)가 트렌치 폭(20 nm)보다 압도적으로 커서 이온은 평평한 면을 보듯 수직으로 들어온다. 이온 각도 퍼짐은 \(\sqrt{T_i/eV}\) 꼴로 몇 도. 기본 레시피 σ = 3°. |
| 05 반응기 | 이온의 양(소스 전력)과 에너지(바이어스 전력)를 따로 조절해야 하는 이유. 타깃은 이중 주파수 CCP나 ICP에서 깎는다. 압력과 균일도. |
| 06 표면 | 라디칼만, 이온만, 둘 다(코번-윈터스 시너지). 덮임률 θ = Γₙs/(Γₙs + γΓᵢ). 기본 레시피의 평면 θ 약 0.62. 이온 강화 수율의 각도 의존(`ET.yIE`)과 물리 스퍼터의 각도 의존(`ET.ySP`). |
| 07 RIE | 처음으로 타깃 전체를 엔진으로 깎는다. 시간 100/200/300/400의 깊이와 단면. 시간에 따라 내려가는 등고선. 정지막에서 멈추는 모습. 측벽 보호막. |
| 08 선택비 | 마스크 예산: 탄소 60 nm → 시간 400 뒤 가장 얇은 곳 약 34 nm. 열린 평면 선택비 약 24인데 실제로는 패싯 때문에 훨씬 빨리 닳는다. 정지막 손실 약 2 nm는 질화막 위에 쌓이는 고분자 덕분이다. 산소를 늘리면(고분자 줄이면) 정지막이 뚫린다. |
| 09 프로파일 | 측벽 각의 정의와 측정(`measure.angle`). 고분자 전구체가 많으면 테이퍼, 지나치면 입구가 막혀 멈춘다. 라디칼의 자발 식각(ch)이 크면 언더컷과 휜 측벽. 기본은 약 89.5°. |
| 10 ARDE | 같은 시간 200에서 폭 10/20/40/80 nm의 깊이 77/114/138/158 nm. 크누센 수송과 이온 그림자. 그래서 과식각이 필요하고, 정지막이 그 과식각을 견딘다. |
| 11 보잉 | σ 3°에서는 보잉 0, σ 8°에서 약 5~7 nm. 마스크 패싯에서 튄 이온. 대전에 의한 휨. 규격 3 nm. |
| 12 마이크로트렌칭 | 타깃처럼 측벽이 수직이면 반사 이온이 모서리에 몰리지 않는다. 측벽이 기울면(테이퍼) 반사 이온이 바닥 모서리에 모여 홈이 생긴다. 과식각 중 정지막 위의 대전으로 바닥 옆이 패이는 노칭(`ion.charge`). |
| 13 화학 | 타깃의 앞뒤 공정: 탄소 마스크를 여는 산소 식각, 산화막의 불화탄소 식각, 정지막 질화막을 여는 식각(CH₃F/O₂ 등), 실리콘의 HBr/Cl₂. 휘발성 생성물(SiF₄, CO, CO₂)과 F/C 비. |
| 14 종말점 | 정지막에 닿는 순간(시간 약 300) CO 발광이 떨어진다. 웨이퍼 가장자리가 5% 느리면 과식각을 얼마나 둬야 하나. 기본 과식각 약 33%. |
| 15 ALE | 정지막 질화막 15 nm를 실리콘 손상 없이 걷어 내야 할 때. 한 주기에 약 0.5 nm 안팎을 떼는 자기 제한 식각. 시너지. |
| 16 고종횡비 | EB-20을 3D 낸드 채널 홀(지름 약 100 nm, 깊이 수 µm, 종횡비 50 이상)로 늘리면 무엇이 무너지는가: ARDE, 보잉, 비틀림, 마스크 예산. |
| 17 실험실 | 독자가 EB-20을 처음부터 끝까지 직접 깎고 규격을 맞춘다. 자기 마스크도 그린다. |

## JS 헬퍼 (`EB`, `js/common.js`)
LithoBook의 `LB`와 같은 것이다(이름만 `EB`).
- `EB.canvas(el|선택자, draw(ctx, w, h), {aspect, minHeight, maxHeight})` → `{redraw(), ctx, w, h, canvas}`. 리사이즈·테마 변경 시 자동으로 다시 그린다. draw 안에서 `EB.palette()`를 매번 다시 읽는다. w, h는 CSS px. 문자열은 `querySelector` 선택자이므로 `"#id"`로 넘긴다. 만들자마자 draw를 한 번 부르므로 draw가 읽는 상태와 컨트롤(`EB.range`, `EB.seg`)을 먼저 만든다. 폭에 따라 배치를 바꿔 높이가 달라져야 하면 옵션 객체에 `get height() { … }` getter를 넘긴다.
- `EB.drag(canvas|선택자, {start(x, y, e), move(x, y, e), end(), hover(x, y, e)})` 캔버스 위 끌기(마우스·터치, CSS px). draw에서 계산한 배치(상자, 축 변환)를 바깥 변수에 저장해 두고 move에서 역변환한다.
- `EB.chart(ctx, box|null, {x:[min,max], y:[min,max], logX, logY, xLabel, yLabel, xFmt, yFmt, xTicks, yTicks, series:[{data:[[x,y]], color, width, dash, fill}], vlines:[{x,color,label}], hlines:[{y,color,label}], points:[{x,y,color,r,label}], bands:[{x0,x1,color}]})` → `{X, Y, box}`.
- `EB.range(id, fmt, onInput)` → `get()`, `get.set(v)`. 출력은 `id + "-out"` 요소.
- `EB.seg(id, onChange)` → `get()`, `get.set(v)`. `EB.stat(id, html)`.
- `EB.loop(el, (dt, t) => {})` 화면에 보일 때만 도는 애니메이션. `EB.three(container, opts)`.
- `EB.palette()` → `{bg, text, dim, faint, grid, axis, border, surface, accent, accent2, ok, warn, bad, red, green, blue, series}`, `EB.color(name)`, `EB.isDark()`, `EB.onTheme(cb)`.
- 고정폭 글꼴(`EB.font(px, true)`, SVG의 `.t-mono`)은 숫자·영문에만 쓴다. 한글은 자간이 벌어진다.
- `EB.font(px, mono, weight)`, `EB.fmt(x, digits)`, `EB.si(x, unit, digits)`, `EB.erf/erfc`, `EB.rng(seed)`, `EB.randn()`, `EB.poisson(λ)`, `EB.debounce`, `EB.clamp/lerp/map`, `EB.kB`(eV/K), `EB.C`(물리 상수).
- `EB.CHAPTERS`, `EB.STAGES`.

## 식각 엔진 (`ET`, `js/etch.js`)
모든 장이 같은 단면 모델을 쓰게 하는 공통 엔진이다. 프로파일·플럭스·측정은 직접 만들지 말고 이것을 쓴다. 단위는 nm, y는 캔버스처럼 아래로 +. 가로는 주기 경계(같은 무늬가 옆으로 되풀이된다).
node에서도 돈다(그리기 빼고): `global.window = global; require("./js/etch.js");` — 장에 쓸 숫자는 이렇게 미리 돌려서 확인한다.

### 1) 입자 시뮬레이터 `ET.sim`
단면을 dx(기본 1 nm) 셀로 나누고, 셀마다 재질과 남은 양(phi 0~1)과 고분자 보호막 두께를 둔다. 한 걸음마다 세 종류의 입자를 날린다.
- **이온**: 각도 분포(가우시안 σ, 기울기 tilt)를 갖고 직선으로 날아온다. 표면 법선과 이루는 각 α에 따라 이온 강화 수율 `ET.yIE(α)`(약 60°까지 일정)와 스퍼터 수율 `ET.ySP(α)`(약 65°에서 최대)를 남긴다. 스치듯 맞으면(α > 65°) `reflect` 확률로 거울 반사한다(에너지 10% 잃음). `charge > 0`이면 바닥 근처에서 벽 쪽으로 휘는 가로 전기장을 받는다(노칭·휨).
- **라디칼**(반응성 중성종): 코사인 분포로 들어와 부딪힐 때마다 붙을 확률 `stick`만큼 반응하고 나머지는 튕긴다(크누센 수송 → ARDE).
- **고분자 전구체**: 라디칼과 같지만 표면에 고분자로 쌓인다. 이온·라디칼이 고분자를 깎는다. 1 nm를 넘으면 셀을 차지하며 자란다(재질 `cfx`) → 테이퍼, 입구 막힘.
- 셀의 식각 속도: `r = (ie·Γᵢ·θ + ch·Γₙ)·e^(−P/p0) + sp·Γₛ`, 덮임률 `θ = Γₙ/(Γₙ + γΓᵢ)`, 고분자 증감 `dP = pol·(dep·Γₚ + ion·Γᵢ) − ionRemove·Γᵢ − chem·Γₙ`.
- 시간 단위: **기본 산화막 레시피에서 열린 평면의 산화막이 1 nm 깎이는 시간**. `s.rateOf(key)` = 그 재질이 열린 평면에서 깎이는 속도(nm/시간 단위). 초로 보이려면 장 안에서 R₀(예: 400 nm/분)를 정해 환산한다.

```js
const s = ET.sim({ width: 40, height: 260, dx: 1, seed: 1, particles: 0 });   // particles 0 = 폭에 맞춰 자동(폭 × 24, 최대 6000)
s.layer("nit", 15).layer("ox", 160).layer("ac", 60);   // 아래에서 위로 평탄한 막. s.marks에 oxTop, oxBot 등 행 번호가 남는다
s.open("ac", [[10, 30]], { taper: 0 });                 // 이 구간의 마스크를 연다. taper°: 열린 폭이 위로 넓어지는 각
s.paint((x, z) => (z > 100 && Math.abs(x - 20) < 5 ? null : undefined));  // 임의 모양. z는 바닥에서 잰 높이. null=진공, "ox" 등=재질, undefined=그대로
s.setRecipe(ET.recipe("oxide", { ion: { sigma: 6 }, pol: { flux: 3 } }));
s.step();            // 입자 한 묶음 + 표면 한 번 갱신(시간은 가장 빠른 셀이 0.5칸 깎이도록 자동)
s.run(100);          // 시간 100만큼(동기, 화면이 멈춘다 — 작은 단면이나 node에서만)
s.snap();            // 지금 윤곽선을 등고선으로 저장 → ET.draw(..., {history: true})
s.save() / s.load(st) / s.clone()
s.wantTraces = 20;   // 다음 걸음에 이온·라디칼 궤적 20개씩 기록 → ET.draw(..., {traces: true})
s.flux               // 마지막 걸음의 표면 셀별 {cells, ion, neu, pol, rate}
```
레시피 (`ET.RECIPES`, `ET.recipe(name, 덮어쓸 것)`): `oxide`(C₄F₈/Ar/O₂, 기본), `silicon`(Cl₂/HBr/O₂), `sf6`(화학적·등방성), `argon`(물리 스퍼터), `oxygen`(탄소막·레지스트).
```js
{ target: "ox",
  ion: { flux, sigma(°), tilt(°), energy(수율 배수), reflect(0~1), charge(0~3) },
  neu: { flux, stick },
  pol: { flux, stick, dep, ion, ionRemove, chem, p0 },
  gamma,
  mat: { ox: { ie, ch, sp, pol }, ac: {…}, nit: {…}, si: {…}, … } }
```
재질 키: `si ox nit poly ac pr sion tin w al cu lowk cr cfx` (`ET.MAT`, `ET.matName(key)` 한국어 이름, 색은 CSS `--m-*`).

**성능**: 폭 40 nm × 높이 250 nm(셀 1만 개) 한 걸음 약 4~8 ms, 타깃 전체(시간 400)는 약 700걸음 4~5초다. 그래서
- 입자 시뮬레이터는 **페이지를 열 때 자동으로 끝까지 돌리지 않는다.** "식각 시작" 버튼이나 시간 손잡이로 돌린다. 처음 화면은 식각 전 단면이나 짧게 돌린 단면.
- 돌릴 때는 `ET.runAsync(s, t, { budget: 14, snapEvery: 20, onFrame: redraw, onDone })`(한 프레임에 14 ms만 쓰고 다음 프레임으로)로 화면이 멈추지 않게 한다. 새로 돌리기 전에 이전 것을 `stop()`한다.
- 넓은 단면(폭 100 nm 이상)이나 여러 개를 나란히 돌릴 때는 `dx: 2`로 셀을 키우고 `particles`를 줄인다.
- 슬라이더 하나 바꿀 때마다 처음부터 다시 돌려야 하면 `EB.debounce`를 쓰고 진행 중 표시를 한다.
- 시간 슬라이더로 되감기를 보여 주려면 돌리는 동안 `s.save()`를 몇 개 저장해 두고 `s.load()`로 고른다.

### 2) 습식(도달 시간) `ET.wet`
```js
const s = ET.sim({ width: 120, height: 80 }); s.layer("si", 20).layer("ox", 40).layer("pr", 10); s.open("pr", [[50, 70]]);
const w = ET.wet(s, { rates: { ox: 1 } });   // 재질별 속도(0이면 안 깎인다). 한 번 풀면(수십 ms)
w.apply(25);                                  // 어떤 시간이든 즉시 그 모습으로 바꾼다(되감기 가능)
```
등방성 식각(습식, SF₆ 순수 화학 식각)의 단면이다. 결정 방향을 따르는 KOH 식각은 엔진으로 하지 말고 장 안에서 기하로 그린다((111)면이 표면과 54.74°, (111) 속도가 (100)의 1/100 안팎).

### 3) 측정과 그리기
- `ET.measure(s, { x: 홈 가운데 nm, target: "ox", mask: "ac" })` → `{depth, maxDepth, micro, top, mid, bottom, max, bow, bowAt, angle, maskLeft, maskMax, maskOpen, undercut, widths:[{d, w, l, r}]}`. 깊이는 `target` 윗면에서 잰다.
- `ET.thick(s, key, x)` 그 열에 남은 재질 두께. `ET.surfaceY(s, x)` 그 열의 맨 위 표면 깊이(위에서부터 nm).
- `ET.draw(ctx, box, s, { x0, x1, y0, y1, keepAspect, alignTop, outline, outlineWidth, history, historyColor, poly, traces, ionColor, neuColor })` → `{X(nm), Y(nm), nmX(px), nmY(px), box, sx, sy}`. 가로는 주기라 `x0 < 0`이나 `x1 > width`면 옆 주기를 되풀이해 그린다. `keepAspect: true`를 기본으로 쓴다(세로를 늘리면 측벽 각이 거짓말을 한다). 단면이 아주 깊어 가로로 너무 가늘어지면 그때만 끄고 그림에 "세로 과장"을 적는다.
- `ET.contour(s)` 윤곽선 선분(셀 단위). `ET.matColor(key)`.

### 4) 해석 도우미
`ET.arrhenius(Ea eV, T K)`, `ET.slotView(A)`(긴 트렌치 바닥이 입구를 직접 보는 비율 √(1+A²)−A), `ET.clausing(A)`(원통 투과 확률 근사 1/(1+0.75A)), `ET.coburn(s, K)`(바닥 플럭스 비 1/(1+s(1/K−1))), `ET.debye(ne m⁻³, Te eV)`(m), `ET.bohm(Te eV, amu)`(m/s), `ET.R0`.

## 점검
- `PW_CHROMIUM=/opt/pw-browsers/chromium-1194/chrome-linux/chrome python3 tools/check.py <slug>` (playwright 필요). 넓은 화면·라이트와 360px·다크로 열어 콘솔 오류, 가로 넘침, 조작 중 예외를 보고한다. `--shots 폴더`로 스크린샷을 남겨 눈으로도 본다.
- 브라우저 콘솔에 오류가 없어야 한다. 다크·라이트 테마 모두 확인.
- 캔버스 글자는 `EB.font()`로, 색은 `EB.palette()`로. 고정 색은 SEM 화면(`.sim-view.scope`)처럼 실제로 어두운 경우에만.
