# CMPBook 챕터 작성 가이드

CMPBook은 SemiBooks 서가(`semi.euiyun.com`)의 한 권이다. 배포 주소는 `https://semi.euiyun.com/cmp/`.
빌드 과정 없는 정적 사이트다. `cmp/index.html` + `cmp/chapters/<slug>.html` + 공통 `cmp/css/style.css`, `cmp/js/common.js`.
로컬 실행: 저장소 루트에서 `python3 -m http.server 8000` → http://localhost:8000/cmp/ (file://로 열어도 동작하게 classic script만 쓴다. ES module 금지.)

InfraBook(`../infra`)의 구조와 컴포넌트를 그대로 물려받았다. 전역 객체 이름만 `IB` → `CB`, 클래스 접두사만 `ib-` → `cb-`로 바뀌었다.

## 원칙
- **한국어**, 대상은 공대 학부생과 신입 공정 엔지니어(일반화학·역학·재료 기초가 있다고 가정). 영어 원어는 `<span class="en">(Chemical Mechanical Planarization)</span>`처럼 병기.
- 개념 → 직관 그림(SVG) → 수식(KaTeX) → 시뮬레이터 → 실제 수치 예 → 요약/퀴즈 순서.
- **시각 자료와 인터랙티브 요소가 이 책의 핵심이다.** 한 장에 **시뮬레이터 7개 이상, 그림(figure) 7개 이상, 퀴즈 6문항 이상**. 글로 길게 설명할 것은 그림·애니메이션으로 보여 준다. 태그에 `3d`가 있는 장은 three.js 3D 시뮬레이터를 최소 1개 둔다.
- 시뮬레이터는 장식이 아니라 **계산하는 모델**이어야 한다(프레스턴 식, 상대 속도장 적분, 접촉 역학, DLVO, 패턴 밀도 모델, 스트리벡 곡선 등). 입력을 끝까지 움직였을 때 물리적으로 말이 되는지(음수 두께, 0으로 나누기, NaN) 확인한다. 쓰는 식은 본문에 적는다. 단면이 시간에 따라 깎이는 애니메이션, 입자 운동, 궤적 그리기처럼 **움직이는 그림**을 적극 쓴다.
- 수치는 공개 자료(교과서, 학회 논문, IRDS 등)에서 합리적인 범위를 쓴다. 확실하지 않은 수치는 '약', '~'로 표기한다. 특정 회사의 내부 값처럼 쓰지 않는다. 상표명 대신 일반 명칭(예: "경질 폴리우레탄 패드")을 쓴다.
- 외부 라이브러리는 아래 head 템플릿에 있는 것만(KaTeX, three.js r147). 이미지 파일 대신 인라인 SVG/canvas로 그린다.
- 색은 하드코딩하지 말고 CSS 변수나 `CB.palette()`를 쓴다. 라이트/다크 둘 다 읽혀야 한다. 3D 모델의 물리적 재질색(스테인리스, 다이아몬드 등)은 고정색 가능.
- 모바일(폭 360px)에서 가로 스크롤이 생기면 안 된다. SVG는 `viewBox`만 주고 width/height 속성 생략. viewBox 폭은 900 이하로.
- 수식에서 `\(`·`\)`·`$$`를 쓴다. HTML 안에서 `<`는 `\lt`, `&`는 `&amp;`로 쓰고, 렌더링이 깨지지 않는지 확인한다.

## 재료 색 코드
책 전체에서 같은 재료는 같은 색으로 그린다. 단면도에서 SVG 면 클래스 `.m-oxide .m-nitride .m-cu .m-barrier .m-w .m-si .m-slurry .m-pad`, 선 클래스 `.ms-*`, 캔버스는 `CB.palette().oxide` 등, 범례는 `<span class="m-key cu">구리</span>`.

| 키 | 뜻 |
|---|---|
| oxide | 산화막(SiO₂, ILD) |
| nitride | 질화막(Si₃N₄, 정지막) |
| cu | 구리 |
| barrier | 배리어·라이너(Ta/TaN, Ti/TiN) |
| w | 텅스텐·기타 금속(Co, Ru, Mo) |
| si | 실리콘 기판·폴리실리콘 |
| slurry | 슬러리·연마입자 |
| pad | 연마 패드 |

## 교육용 기준 공정 CP-300 (가상)
모든 장이 같은 가상 장비·공정을 예로 든다. 실제 특정 장비가 아니다. 장마다 `<div class="callout fab"><strong>제목</strong>...</div>` 로 "CP-300 노트"를 1~3개 둔다(접두어는 CSS가 붙인다).

| 항목 | 값(교육용 가정) |
|---|---|
| 웨이퍼 | 300 mm, 가장자리 제외(EE) 3 mm |
| 장비 | 회전형 연마기, 정반(platen) 3개 + 통합 세정기(브러시 2단 + 메가소닉 + IPA 건조), 처리량 약 60 WPH |
| 정반·패드 | 패드 지름 762 mm(30″), 정반 93 rpm. 경질 폴리우레탄 상부 패드(두께 약 2 mm, 쇼어 D 약 55–60, 기공 30–50 µm, 동심원 그루브 피치 3 mm·깊이 0.75 mm) + 연질 하부 패드 |
| 헤드 | 87 rpm, 4구역 멤브레인(중심·중간·외곽·가장자리) + 리테이너 링(산화막 3 psi일 때 링 약 3.5–4.5 psi). 웨이퍼 중심이 정반 중심에서 약 180 mm, 스윕 ±20 mm |
| 상대 속도 | 약 1.75 m/s (= 2π·93/60·0.18) |
| 압력 | 산화막 3 psi(20.7 kPa), Cu 벌크 2 psi, Cu 클리어 1.2 psi, 배리어 1.5 psi (1 psi = 6.895 kPa) |
| 슬러리 | 유량 200 mL/min. 산화막: 흄드 실리카 약 12 wt%, pH ~11. STI: 세리아 약 0.5–1 wt%. Cu: 콜로이달 실리카 + H₂O₂ + BTA, pH ~3–7 |
| 프레스턴 계수 | 산화막(실리카 슬러리) \(k_p \approx 1.0\times10^{-13}\,\text{Pa}^{-1}\) → 3 psi에서 약 220 nm/min. Cu 벌크 약 600–800 nm/min(2 psi에서 약 700 nm/min, \(k_p \approx 4.8\times10^{-13}\,\text{Pa}^{-1}\)) |
| 컨디셔너 | 지름 100 mm 다이아몬드 디스크, 하중 약 30–45 N, 인시투, 패드 절삭률 약 20–40 µm/h. 패드 수명 약 1,000–1,500장 |
| 목표 | WIWNU 3 % 이하(1σ), Cu 디싱 20 nm 이하(10 µm 배선), 이로전 15 nm 이하(밀도 50 %), 추가 결함 ≥45 nm 30개 이하/웨이퍼 |
| CMP 후 세정 | PVA 브러시 2단(약 200–400 rpm, 압입 약 1 mm), 메가소닉 약 1 MHz, IPA 마랑고니 건조 |

계산 결과가 이 표와 어긋나면 표가 맞는 쪽으로 맞추거나 본문에 이유를 쓴다.

## 이어지는 책
본문에서 자연스러울 때 서가 안의 책을 상대 경로로 링크한다(챕터에서 `../../process/`): ProcessBook(`process/`), LithoBook(`litho/`), EtchBook(`etch/`), YieldBook(`yield/`), FailureBook(`failure/`), InfraBook(`infra/` — 케미컬·슬러리 공급은 `infra/chapters/chemical.html`, 폐수는 `infra/chapters/water.html`), PackagingBook(`packaging/`), MemoryBook(`memory/`).

## head 템플릿
```html
<!doctype html>
<!-- Copyright (c) 2026 geniuskey and CMPBook contributors.
     Executable code: MIT (see ../../LICENSE-MIT).
     Text, illustrations, questions and explanations: CC-BY-4.0 (see ../../LICENSE.md). -->
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>프레스턴 방정식과 재료 제거 · CMPBook</title>
<meta name="description" content="한 문장 설명">
<link rel="icon" type="image/svg+xml" href="../favicon.svg">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
<link rel="stylesheet" href="../css/style.css">
<script src="../js/common.js"></script>
<!-- 3D가 필요한 페이지만 -->
<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/controls/OrbitControls.js"></script>
</head>
<body data-chapter="preston">
<main class="chapter">
  <header class="chapter-hero">
    <div class="eyebrow">Chapter 02</div>
    <h1>프레스턴 방정식과 재료 제거</h1>
    <p class="lead">...</p>
    <ul class="objectives"><li>...</li></ul>
  </header>

  <section id="intro"><h2>제목</h2> ... </section>   <!-- h2 번호와 우측 목차는 자동 생성 -->
  ...
  <section class="keypoints" id="summary"><h2>핵심 정리</h2><ol><li>...</li></ol></section>
  <section class="quiz-sec" id="quiz"><h2>확인 퀴즈</h2><div class="quiz"> ... </div></section>
</main>
<script> /* 페이지 스크립트: 여기서 IB 사용. 시뮬레이터마다 (function(){ ... })(); 로 감싼다 */ </script>
</body>
</html>
```
소스에는 `<title>`과 `<meta name="description">`만 쓴다. canonical, `theme-color`, Open Graph, Twitter 카드, JSON-LD는 `tools/build.mjs`가 파일 경로, `<title>`·description, `js/common.js`의 `CHAPTERS`(장 이름과 순서), `cmp/book.json`의 `meta`(사이트 이름, 테마 색, 책 소개), 그리고 git 마지막 커밋 날짜(`dateModified`)로 배포물에 생성한다. 소스에 이 태그들이 남아 있으면 `npm test`와 빌드가 실패한다. description은 `<meta>` 한 줄에 쓴다. Analytics beacon은 넣지 않는다(빌드가 넣는다).
상단바, 챕터 서랍, 목차, 이전/다음, 푸터, 테마 토글, 퀴즈 동작, KaTeX 렌더, 검색은 `common.js`가 자동 처리한다.

챕터를 추가할 때는 `js/common.js`의 `CHAPTERS`, 루트 `sitemap.xml`, `chapters/glossary.html`의 챕터 칩과 `TERMS`에도 함께 등록한다.

## 컴포넌트
```html
<figure class="diagram"><svg viewBox="0 0 800 300" role="img" aria-label="...">...</svg><figcaption><b>그림 2-1.</b> 설명</figcaption></figure>
```
SVG 안 유틸 클래스: `.t .t-dim .t-mono .t-acc`(텍스트), `.s-line .s-axis .s-acc .s-acc2`(선), `.f-surface .f-elev .f-acc .f-acc-soft .f-acc2 .f-acc2-soft .f-ok-soft .f-warn-soft .f-bad-soft`(면), 재료 면 `.m-*`, 재료 선 `.ms-*`.
SVG `<marker>`/`<linearGradient>` id는 페이지 안에서 겹치지 않게 그림마다 접두사를 붙인다.

```html
<div class="sim" id="sim-rr">
  <div class="sim-head"><span class="sim-tag">SIMULATOR</span><h3>제목</h3></div>   <!-- 3D는 <span class="sim-tag three">3D</span> -->
  <div class="sim-body side">                                    <!-- side: 넓은 화면에서 컨트롤을 오른쪽에 -->
    <div class="sim-view"><canvas id="cv-rr"></canvas></div>       <!-- 3D는 <div class="sim-view three" id="v3d"></div> -->
    <div class="sim-controls">
      <label class="ctrl"><span>압력 <output id="v-out"></output></span><input type="range" id="v" min="0.1" max="0.6" step="0.01" value="0.4"></label>
      <div class="ctrl"><span>모드</span><div class="seg" id="mode"><button data-value="a" class="on">A</button><button data-value="b">B</button></div></div>
      <label class="check"><input type="checkbox" id="showx"> 옵션</label>
      <button class="btn primary" id="run">실행</button>
    </div>
  </div>
  <div class="sim-readout">
    <div class="stat"><span class="k">제거율</span><span class="v" id="o-rr">—</span></div>
  </div>
  <div class="sim-note">해볼 것: ...</div>
</div>
```
콜아웃: `<div class="callout">`, `.tip`, `.warn`, `.deep`(심화), `.fab`(CP-300 노트). 수식: `<div class="formula">$$...$$<div class="where">여기서 ...</div></div>`, 인라인 `\( ... \)`.
표: `<div class="table-wrap"><table>...</table></div>`. 퀴즈:
```html
<div class="quiz-q"><p>질문?</p><div class="opts">
  <button class="opt">보기</button><button class="opt" data-correct>정답</button>
</div><div class="quiz-exp">해설</div></div>
```

## JS 헬퍼 (`js/common.js`)
- `CB.canvas(el, (ctx,w,h)=>{}, {aspect:0.5, height, minHeight, maxHeight})` → `{ctx,w,h,redraw()}` HiDPI, 리사이즈/테마 시 자동 redraw(배경 `--canvas-bg`로 칠해 줌).
- `CB.chart(ctx, box|null, {x:[a,b], y:[a,b], logX, logY, xLabel, yLabel, series:[{data:[[x,y]],color,width,dash,fill}], vlines, hlines, points, bands, xFmt, yFmt})` → `{X,Y,box}`.
- `CB.loop(el, (dt,t)=>{})` 화면에 보일 때만 도는 rAF 루프 `{start,stop,toggle}`.
- `CB.range(id, fmt, onInput)` → getter `get()`, `get.set(v)`. `CB.seg(id, onChange)` → getter. `CB.stat(id, html)`.
- `CB.palette()` 테마 색(+ 재료 색 `oxide nitride cu barrier w si slurry pad`), `CB.color('accent')`, `CB.onTheme(cb)`, `CB.isDark()`.
- `CB.randn()`, `CB.poisson(λ)`, `CB.fmt(x, digits)`, `CB.si(x,'W')`, `CB.clamp/lerp/map`, `CB.C = {h,c,q,k,...}`, `CB.bytes`, `CB.bin`.
- `CB.three(el, {camera:[x,y,z], target:[x,y,z], fov, autoRotate, minDistance, maxDistance})` → `T = {THREE, scene, camera, renderer, controls, onFrame(cb), label(html, Vector3|[x,y,z]), material(color, opts)}`. 조명/리사이즈/화면밖 정지 포함. 라벨의 `L.obj = mesh`로 두면 로컬 좌표를 따라감.

정확한 시그니처는 `js/common.js`를 직접 읽어 확인한다.
