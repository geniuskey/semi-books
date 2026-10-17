# InfraBook 챕터 작성 가이드

InfraBook은 SemiBooks 서가(`semi.euiyun.com`)의 한 권이다. 배포 주소는 `https://semi.euiyun.com/infra/`.
빌드 과정 없는 정적 사이트다. `infra/index.html` + `infra/chapters/<slug>.html` + 공통 `infra/css/style.css`, `infra/js/common.js`.
로컬 실행: 저장소 루트에서 `python3 -m http.server 8000` → http://localhost:8000/infra/ (file://로 열어도 동작하게 classic script만 쓴다. ES module 금지.)

MemoryBook(`../memorybook`)의 구조와 컴포넌트를 그대로 물려받았다. 전역 객체 이름만 `MB` → `IB`, 클래스 접두사만 `mb-` → `ib-`로 바뀌었다.

## 원칙
- **한국어**, 대상은 공대 학부생과 신입 엔지니어(열역학·유체·전기회로 기초가 있다고 가정). 영어 원어는 `<span class="en">(Fan Filter Unit)</span>`처럼 병기.
- 개념 → 직관 그림(SVG) → 수식(KaTeX) → 시뮬레이터 → 실제 수치 예 → 요약/퀴즈 순서.
- 한 장에 **시뮬레이터 6개 이상, 그림(figure) 6개 이상, 퀴즈 6문항 이상**. 태그에 `3d`가 있는 장은 three.js 3D 시뮬레이터를 최소 1개 둔다.
- 시뮬레이터는 장식이 아니라 **계산하는 모델**이어야 한다. 입력을 끝까지 움직였을 때 물리적으로 말이 되는지(음수 유량, 0으로 나누기, NaN) 확인한다. 쓰는 식은 본문에 적는다.
- 수치는 공개 자료에서 합리적인 범위를 쓴다. 확실하지 않은 수치는 '약', '~'로 표기하고 기준 연도를 적는다. 특정 회사·팹의 내부 값처럼 쓰지 않는다. 규격은 이름을 정확히 쓴다(ISO 14644-1:2015, SEMI F47, SEMI S2, SEMI F57, IEST-RP-CC012 VC 곡선, ASHRAE, ITRS/IRDS Yield Enhancement 표 등).
- 외부 라이브러리는 아래 head 템플릿에 있는 것만(KaTeX, three.js r147). 이미지 파일 대신 인라인 SVG/canvas로 그린다.
- 색은 하드코딩하지 말고 CSS 변수나 `IB.palette()`를 쓴다. 라이트/다크 둘 다 읽혀야 한다. 3D 모델의 물리적 재질색(스테인리스, 콘크리트 등)은 고정색 가능.
- 모바일(폭 360px)에서 가로 스크롤이 생기면 안 된다. SVG는 `viewBox`만 주고 width/height 속성 생략. 넓은 SVG는 `figure.diagram` 안에서 글자가 너무 작아지지 않게 viewBox 폭을 900 이하로.

## 유틸리티 색 코드
책 전체에서 같은 유틸리티는 같은 색으로 그린다. SVG 선 클래스 `.u-water .u-gas .u-chem .u-exhaust .u-power .u-cool .u-air .u-waste`, 캔버스는 `IB.palette().water` 등, 범례는 `<span class="u-key water">초순수</span>`.

| 키 | 뜻 |
|---|---|
| water | 초순수·용수 |
| gas | 가스(질소·특수가스) |
| chem | 케미컬·슬러리 |
| exhaust | 배기(점선) |
| power | 전력 |
| cool | 냉각수·냉수 |
| air | 공조 공기 |
| waste | 폐수 |

## 교육용 기준 팹 FAB-E (가상)
모든 장이 같은 가상 팹을 예로 든다. 실제 팹이 아니다. 장마다 `<div class="callout fab"><strong>제목</strong>...</div>` 로 "FAB-E 노트"를 1~3개 둔다(접두어는 CSS가 붙인다).

| 항목 | 값(교육용 가정) |
|---|---|
| 웨이퍼 | 300 mm, 월 투입 100,000장(100k WSPM), DRAM·로직 혼합 첨단 공정 |
| 클린룸 | 공정층 약 60,000 m², 볼룸 + 미니인바이런먼트(FOUP·EFEM), 베이 ISO 5, 장비 내부 ISO 3 이하 |
| 층 구조 | 지붕층 공조(MAU·FFU 플레넘) / 클린룸(FAB) / 와플 슬래브 / 서브팹(펌프·스크러버·칠러 이외 보조 장치) / 유틸리티동(CUB) |
| 온습도 | 23 ± 0.5 °C, 45 ± 5 %RH (노광 구역 ±0.1 °C) |
| 전력 | 평균 약 200 MW, 피크 약 250 MW, 154 kV 2회선 수전. 연간 약 1.8 TWh(웨이퍼당 약 1.5 MWh) |
| 초순수 | 약 25,000 m³/일(웨이퍼당 약 7.5 m³), 원수 약 40,000 m³/일, 재이용 목표 50 % 이상 |
| 질소 | 약 60,000 Nm³/h, 현장 공기분리장치(ASU) |
| 냉동 | 칠러 용량 약 60,000 RT(1 RT = 3.517 kW), 냉수 7 °C, 공정 냉각수(PCW) 공급 약 18 °C |
| 장비 | 공정 장비 약 1,500대, OHT 차량 약 1,000대 |

계산 결과가 이 표와 어긋나면 표가 맞는 쪽으로 맞추거나 본문에 이유를 쓴다.

## 이어지는 책
본문에서 자연스러울 때 링크한다: ProcessBook(https://processbook.euiyun.com/), LithoBook(https://lithobook.euiyun.com/), EtchBook(https://etchbook.euiyun.com/), YieldBook(https://yieldbook.euiyun.com/), FailureBook(https://failurebook.euiyun.com/), MemoryBook(https://memorybook.euiyun.com/), ChipIndustryBook(https://chipindustrybook.euiyun.com/).

## head 템플릿
```html
<!doctype html>
<!-- Copyright (c) 2026 geniuskey and InfraBook contributors.
     Executable code: MIT (see ../../LICENSE-MIT).
     Text, illustrations, questions and explanations: CC-BY-4.0 (see ../../LICENSE.md). -->
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>클린룸과 입자 · InfraBook</title>
<meta name="description" content="한 문장 설명">
<link rel="canonical" href="https://semi.euiyun.com/infra/chapters/cleanroom.html">
<link rel="icon" type="image/svg+xml" href="../favicon.svg">
<meta name="theme-color" content="#2f5f96">
<meta property="og:type" content="article">
<meta property="og:site_name" content="InfraBook">
<meta property="og:locale" content="ko_KR">
<meta property="og:title" content="클린룸과 입자 · InfraBook">
<meta property="og:description" content="한 문장 설명">
<meta property="og:url" content="https://semi.euiyun.com/infra/chapters/cleanroom.html">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":["Chapter","LearningResource"],"@id":"https://semi.euiyun.com/infra/chapters/cleanroom.html#chapter","name":"클린룸과 입자","headline":"클린룸과 입자 · InfraBook","description":"한 문장 설명","url":"https://semi.euiyun.com/infra/chapters/cleanroom.html","position":2,"inLanguage":"ko","isAccessibleForFree":true,"learningResourceType":"인터랙티브 교재","educationalLevel":"공대 학부","dateModified":"2026-10-17","isPartOf":{"@type":"Book","@id":"https://semi.euiyun.com/infra/#book","name":"InfraBook · 반도체 인프라 교과서","url":"https://semi.euiyun.com/infra/"}}]}</script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
<link rel="stylesheet" href="../css/style.css">
<script src="../js/common.js"></script>
<!-- 3D가 필요한 페이지만 -->
<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/controls/OrbitControls.js"></script>
</head>
<body data-chapter="cleanroom">
<main class="chapter">
  <header class="chapter-hero">
    <div class="eyebrow">Chapter 02</div>
    <h1>클린룸과 입자</h1>
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
canonical은 빌드 도구가 파일 경로로 계산한 URL과 정확히 같아야 한다(다르면 빌드 실패). Analytics beacon은 넣지 않는다(빌드가 넣는다).
상단바, 챕터 서랍, 목차, 이전/다음, 푸터, 테마 토글, 퀴즈 동작, KaTeX 렌더, 검색은 `common.js`가 자동 처리한다.

챕터를 추가할 때는 `js/common.js`의 `CHAPTERS`, 루트 `sitemap.xml`, `infra/index.html`의 JSON-LD `hasPart`, `chapters/glossary.html`의 챕터 칩과 `TERMS`에도 함께 등록한다.

## 컴포넌트
```html
<figure class="diagram"><svg viewBox="0 0 800 300" role="img" aria-label="...">...</svg><figcaption><b>그림 2-1.</b> 설명</figcaption></figure>
```
SVG 안 유틸 클래스: `.t .t-dim .t-mono .t-acc`(텍스트), `.s-line .s-axis .s-acc .s-acc2`(선), `.f-surface .f-elev .f-acc .f-acc-soft .f-acc2 .f-acc2-soft .f-ok-soft .f-warn-soft .f-bad-soft`(면), 유틸리티 선 `.u-*`.
SVG `<marker>`/`<linearGradient>` id는 페이지 안에서 겹치지 않게 그림마다 접두사를 붙인다.

```html
<div class="sim" id="sim-ach">
  <div class="sim-head"><span class="sim-tag">SIMULATOR</span><h3>제목</h3></div>   <!-- 3D는 <span class="sim-tag three">3D</span> -->
  <div class="sim-body side">                                    <!-- side: 넓은 화면에서 컨트롤을 오른쪽에 -->
    <div class="sim-view"><canvas id="cv-ach"></canvas></div>       <!-- 3D는 <div class="sim-view three" id="v3d"></div> -->
    <div class="sim-controls">
      <label class="ctrl"><span>풍속 <output id="v-out"></output></span><input type="range" id="v" min="0.1" max="0.6" step="0.01" value="0.4"></label>
      <div class="ctrl"><span>모드</span><div class="seg" id="mode"><button data-value="a" class="on">A</button><button data-value="b">B</button></div></div>
      <label class="check"><input type="checkbox" id="showx"> 옵션</label>
      <button class="btn primary" id="run">실행</button>
    </div>
  </div>
  <div class="sim-readout">
    <div class="stat"><span class="k">환기 횟수</span><span class="v" id="o-ach">—</span></div>
  </div>
  <div class="sim-note">해볼 것: ...</div>
</div>
```
콜아웃: `<div class="callout">`, `.tip`, `.warn`, `.deep`(심화), `.fab`(FAB-E 노트). 수식: `<div class="formula">$$...$$<div class="where">여기서 ...</div></div>`, 인라인 `\( ... \)`.
표: `<div class="table-wrap"><table>...</table></div>`. 퀴즈:
```html
<div class="quiz-q"><p>질문?</p><div class="opts">
  <button class="opt">보기</button><button class="opt" data-correct>정답</button>
</div><div class="quiz-exp">해설</div></div>
```

## JS 헬퍼 (`js/common.js`)
- `IB.canvas(el, (ctx,w,h)=>{}, {aspect:0.5, height, minHeight, maxHeight})` → `{ctx,w,h,redraw()}` HiDPI, 리사이즈/테마 시 자동 redraw(배경 `--canvas-bg`로 칠해 줌).
- `IB.chart(ctx, box|null, {x:[a,b], y:[a,b], logX, logY, xLabel, yLabel, series:[{data:[[x,y]],color,width,dash,fill}], vlines, hlines, points, bands, xFmt, yFmt})` → `{X,Y,box}`.
- `IB.loop(el, (dt,t)=>{})` 화면에 보일 때만 도는 rAF 루프 `{start,stop,toggle}`.
- `IB.range(id, fmt, onInput)` → getter `get()`, `get.set(v)`. `IB.seg(id, onChange)` → getter. `IB.stat(id, html)`.
- `IB.palette()` 테마 색(+ 유틸리티 색 `water gas chem exhaust power cool air waste`), `IB.color('accent')`, `IB.onTheme(cb)`, `IB.isDark()`.
- `IB.randn()`, `IB.poisson(λ)`, `IB.fmt(x, digits)`, `IB.si(x,'W')`, `IB.clamp/lerp/map`, `IB.C = {h,c,q,k,...}`, `IB.bytes`, `IB.bin`.
- `IB.three(el, {camera:[x,y,z], target:[x,y,z], fov, autoRotate, minDistance, maxDistance})` → `T = {THREE, scene, camera, renderer, controls, onFrame(cb), label(html, Vector3|[x,y,z]), material(color, opts)}`. 조명/리사이즈/화면밖 정지 포함. 라벨의 `L.obj = mesh`로 두면 로컬 좌표를 따라감.

정확한 시그니처는 `js/common.js`를 직접 읽어 확인한다.
