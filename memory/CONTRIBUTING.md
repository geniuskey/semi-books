# MemoryBook 챕터 작성 가이드

빌드 과정 없는 정적 사이트다. `index.html` + `chapters/<slug>.html` + 공통 `css/style.css`, `js/common.js`.
로컬 실행: `python3 -m http.server 8000` → http://localhost:8000 (file://로 열어도 동작하게 classic script만 사용한다. ES module 금지.)

## 기여물의 라이선스

기여하는 실행 코드는 MIT, 본문·그림·문제·해설 등 교육 콘텐츠는 CC BY 4.0으로 제공합니다. 혼합 파일과 코드 예제의 구분은 [라이선스 안내](LICENSE.md)를 따릅니다. 외부 자료를 추가할 때는 원저작자·출처·라이선스를 명시하고 원래 고지를 유지하세요.

## 원칙
- **한국어**, 대상은 공대 학부생(전자회로·반도체 소자·컴퓨터 구조 기초가 있다고 가정). 영어 원어는 `<span class="en">(Sense Amplifier)</span>`처럼 병기.
- 개념 → 직관 그림(SVG) → 수식(KaTeX) → 시뮬레이터 → 실제 수치 예 → 요약/퀴즈 순서.
- 수치는 실제 제품에서 합리적인 범위를 쓴다(예: DRAM 셀 커패시턴스 8~25 fF, 비트라인 60~120 fF, tRCD ≈ 14 ns, 리프레시 64 ms/32 ms, HBM3E 스택당 ~1.2 TB/s, 3D NAND 200~300단, TLC P/E 1k~3k회). 확실하지 않은 최신 수치는 '약', '~' 로 표기하고 연도를 적는다.
- 외부 라이브러리는 아래 head 템플릿에 있는 것만(KaTeX, three.js r147). 이미지 파일 대신 인라인 SVG/canvas로 그린다.
- 색은 하드코딩하지 말고 CSS 변수(`var(--accent)` 등)나 `MB.palette()`를 쓴다. 라이트/다크 둘 다 읽혀야 한다. 단, 물리적 재질색(구리, 실리콘, 산화막 등 3D 모델)은 고정색 가능.
- 모바일(폭 360px)에서 가로 스크롤이 생기면 안 된다. SVG는 `viewBox`만 주고 width/height 속성 생략.

## head 템플릿
```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>DRAM 셀과 어레이 · MemoryBook</title>
<meta name="description" content="한 문장 설명">
<!-- canonical · Open Graph · JSON-LD: 기존 챕터의 블록을 복사해 URL·제목·설명만 바꾼다 -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
<link rel="stylesheet" href="../css/style.css">
<script src="../js/common.js"></script>
<!-- 3D가 필요한 페이지만 -->
<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/controls/OrbitControls.js"></script>
</head>
<body data-chapter="dram-cell">
<main class="chapter">
  <header class="chapter-hero">
    <div class="eyebrow">Chapter 04</div>
    <h1>DRAM 셀과 어레이</h1>
    <p class="lead">...</p>
    <ul class="objectives"><li>...</li></ul>
  </header>

  <section id="intro"><h2>제목</h2> ... </section>   <!-- h2 번호와 우측 목차는 자동 생성 -->
  ...
  <section class="keypoints" id="summary"><h2>핵심 정리</h2><ol><li>...</li></ol></section>
  <section class="quiz-sec" id="quiz"><h2>확인 퀴즈</h2><div class="quiz"> ... </div></section>
</main>
<script> /* 페이지 스크립트: 여기서 MB 사용 */ </script>
</body>
</html>
```
상단바, 챕터 서랍, 목차, 이전/다음, 푸터, 테마 토글, 퀴즈 동작, KaTeX 렌더는 `common.js`가 자동 처리한다.

챕터를 추가할 때는 `js/common.js`의 `CHAPTERS`, `sitemap.xml`, `index.html`의 JSON-LD `hasPart`, `chapters/glossary.html`의 챕터 칩(`#gl-ch`)과 `TERMS`에도 함께 등록한다.

## 컴포넌트
```html
<figure class="diagram"><svg viewBox="0 0 800 300">...</svg><figcaption><b>그림 4-1.</b> 설명</figcaption></figure>
```
SVG 안 유틸 클래스: `.t .t-dim .t-mono .t-acc`(텍스트), `.s-line .s-axis .s-acc`(선), `.f-surface .f-elev .f-acc .f-acc-soft .f-acc2-soft`(면).

```html
<div class="sim" id="sim-share">
  <div class="sim-head"><span class="sim-tag">SIMULATOR</span><h3>제목</h3></div>   <!-- 3D는 <span class="sim-tag three">3D</span> -->
  <div class="sim-body side">                                    <!-- side: 넓은 화면에서 컨트롤을 오른쪽에 -->
    <div class="sim-view"><canvas id="cv-share"></canvas></div>     <!-- 3D는 <div class="sim-view three" id="v3d"></div> -->
    <div class="sim-controls">
      <label class="ctrl"><span>셀 커패시턴스 <output id="cs-out"></output></span><input type="range" id="cs" min="5" max="30" value="15"></label>
      <div class="ctrl"><span>모드</span><div class="seg" id="mode"><button data-value="open" class="on">Open BL</button><button data-value="folded">Folded BL</button></div></div>
      <label class="check"><input type="checkbox" id="showx"> 옵션</label>
      <button class="btn primary" id="run">실행</button>
    </div>
  </div>
  <div class="sim-readout">
    <div class="stat"><span class="k">신호 전압 ΔV</span><span class="v" id="o-dv">—</span></div>
  </div>
  <div class="sim-note">해볼 것: ...</div>
</div>
```
콜아웃: `<div class="callout">`, `.tip`, `.warn`, `.deep`(심화). 수식: `<div class="formula">$$...$$<div class="where">여기서 ...</div></div>`, 인라인 `\( ... \)`.
표: `<div class="table-wrap"><table>...</table></div>`. 퀴즈:
```html
<div class="quiz-q"><p>질문?</p><div class="opts">
  <button class="opt">보기</button><button class="opt" data-correct>정답</button>
</div><div class="quiz-exp">해설</div></div>
```

## JS 헬퍼 (`js/common.js`)
- `MB.canvas(el, (ctx,w,h)=>{}, {aspect:0.5, height, minHeight, maxHeight})` → `{ctx,w,h,redraw()}` HiDPI, 리사이즈/테마 시 자동 redraw(배경 `--canvas-bg`로 칠해 줌).
- `MB.chart(ctx, box|null, {x:[a,b], y:[a,b], logX, logY, xLabel, yLabel, series:[{data:[[x,y]],color,width,dash,fill}], vlines, hlines, points, bands, xFmt, yFmt})` → `{X,Y,box}`.
- `MB.loop(el, (dt,t)=>{})` 화면에 보일 때만 도는 rAF 루프 `{start,stop,toggle}`.
- `MB.range(id, fmt, onInput)` → getter `get()`, `get.set(v)`. `MB.seg(id, onChange)` → getter. `MB.stat(id, html)`.
- `MB.palette()` 테마 색, `MB.color('accent')`, `MB.onTheme(cb)`, `MB.isDark()`.
- `MB.wl2rgb(nm, alpha)`, `MB.wl2rgbArr(nm)`, `MB.randn()`, `MB.poisson(λ)`, `MB.fmt(x, digits)`, `MB.si(x,'m')`, `MB.clamp/lerp/map`, `MB.C = {h,c,q,k}`.
- `MB.three(el, {camera:[x,y,z], target:[x,y,z], fov, autoRotate, minDistance, maxDistance})` → `T = {THREE, scene, camera, renderer, controls, onFrame(cb), label(html, Vector3|[x,y,z]) , material(color, opts)}`. 조명/리사이즈/화면밖 정지 포함. 라벨의 `L.obj = mesh`로 두면 로컬 좌표를 따라감.

- `MB.bytes(x, digits, bin=true)` → "3 GiB" / (bin=false) "3 GB". `MB.bin(n, width)` → 고정 폭 2진 문자열.
- `MB.C`에는 `eps0, hbar, me`도 있다.

## 추가 SVG 유틸
`.s-acc2`(보조 강조선), `.f-acc2`, `.f-ok-soft .f-warn-soft .f-bad-soft`(상태 면). 본문용 `.bits`(모노 비트열), `.pill`.
