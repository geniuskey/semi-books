# OpticsBook 챕터 작성 가이드

## 기여물의 라이선스

기여하는 코드는 MIT, 교재 콘텐츠는 CC BY 4.0으로 제공하는 데 동의해야 합니다. HTML 안에 코드와 콘텐츠가 함께 있어도 각 부분에 해당하는 라이선스를 적용합니다. 적용 범위는 [라이선스 안내](LICENSE.md)를 참고하세요. 제3자 자료를 추가할 때는 재사용·배포가 허용되는지 확인하고 출처와 해당 라이선스를 명시하세요.

빌드 과정 없는 정적 사이트다. `index.html` + `chapters/<slug>.html` + 공통 `css/style.css`, `js/common.js`, 광학 수치 라이브러리 `js/optics.js`.
로컬 실행: `python3 -m http.server 8000` → http://localhost:8000 (file://로 열어도 동작하게 classic script만 사용한다. ES module 금지.)
점검: `NODE_PATH=$(npm root -g) node tools/check.cjs [slug ...]` — JS 오류, 360px 가로 넘침, 시뮬레이터/그림/퀴즈 개수를 확인한다.

OpticsBook은 [SensorBook](https://semi.euiyun.com/sensor/)의 후속 책이다. SensorBook이 이미지 센서 전체(광전 변환·회로·노이즈·ISP)를 다룬다면, OpticsBook은 그 센서 위에서 일어나는 **광학**을 깊게 다룬다. 기하광학 → 파동광학 → 전자기 경계 문제 → 박막 → 영상 품질(PSF·MTF) → 센서 광학(CRA·마이크로렌즈·픽셀 스택) → 수치 해석(TMM·RCWA·FDTD) 순서로 쌓는다. SensorBook의 관련 장을 `<a href="/sensor/chapters/pixel.html">SensorBook 3장</a>`처럼 연결해도 좋다.

## 원칙
- **한국어**, 대상은 공대 학부 고학년~신입 엔지니어(전자기학·미적분·선형대수 기초를 가정). 영어 원어는 `<span class="en">(Chief Ray Angle)</span>`처럼 병기.
- 개념 → 직관 그림(SVG) → 수식(KaTeX) → 시뮬레이터 → 실제 수치 예 → 요약/퀴즈 순서.
- 모든 장은 "이것이 이미지 센서 픽셀 개발에서 왜 중요한가"로 연결한다. 수치는 실제 모바일·차량용 센서에서 합리적인 범위를 쓴다(픽셀 0.56~3 µm, 렌즈 F/1.4~2.8, CRA 0~38°, 마이크로렌즈 높이 0.3~0.9 µm, 광학 스택 1~3 µm).
- 외부 라이브러리는 아래 head 템플릿에 있는 것만(KaTeX, three.js r147). 이미지 파일 대신 인라인 SVG/canvas로 그린다.
- 색은 하드코딩하지 말고 CSS 변수(`var(--accent)` 등)나 `SB.palette()`를 쓴다. 라이트/다크 둘 다 읽혀야 한다. 단, 물리적 색(파장색, R/G/B 필터색)과 필드 컬러맵(`OPT.cmap`)은 고정색 가능.
- 모바일(폭 360px)에서 가로 스크롤이 생기면 안 된다. SVG는 `viewBox`만 주고 width/height 속성 생략.

## head 템플릿

모든 HTML 페이지에는 아래 Cloudflare Web Analytics 코드를 `<head>`에 한 번 포함한다. SEO 자동 생성 블록 밖에 두며, 공통 Site Token을 유지한다.
```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>회절 · OpticsBook</title>
<meta name="description" content="한 문장 설명">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
<link rel="stylesheet" href="../css/style.css">
<script src="../js/common.js"></script>
<script src="../js/optics.js"></script>
<!-- 3D가 필요한 페이지만 -->
<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/controls/OrbitControls.js"></script>
<!-- Cloudflare Web Analytics -->
<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"3d6151a0abc94ede89285d462527fa80"}'></script>
<!-- End Cloudflare Web Analytics -->
</head>
<body data-chapter="diffraction">
<main class="chapter">
  <header class="chapter-hero">
    <div class="eyebrow">Chapter 06</div>
    <h1>회절</h1>
    <p class="lead">...</p>
    <ul class="objectives"><li>...</li></ul>
  </header>

  <section id="intro"><h2>제목</h2> ... </section>   <!-- h2 번호와 우측 목차는 자동 생성 -->
  ...
  <section class="keypoints" id="summary"><h2>핵심 정리</h2><ol><li>...</li></ol></section>
  <section class="quiz-sec" id="quiz"><h2>확인 퀴즈</h2><div class="quiz"> ... </div></section>
</main>
<script> /* 페이지 스크립트: 여기서 SB, OPT 사용 */ </script>
</body>
</html>
```
상단바, 챕터 서랍, 목차, 이전/다음, 푸터, 테마 토글, 퀴즈 동작, KaTeX 렌더, 검색은 `common.js`가 자동 처리한다.
새 챕터는 `common.js`의 `CHAPTERS`에 등록한 뒤 `python tools/seo.py`를 실행한다. canonical·Open Graph·JSON-LD 태그가 `<meta name="description">` 바로 아래에 삽입되고 `sitemap.xml`이 갱신된다(직접 쓰지 않는다).

## 컴포넌트
```html
<figure class="diagram"><svg viewBox="0 0 800 300">...</svg><figcaption><b>그림 6-1.</b> 설명</figcaption></figure>
```
SVG 안 유틸 클래스: `.t .t-dim .t-mono .t-acc`(텍스트), `.s-line .s-axis .s-acc`(선), `.f-surface .f-elev .f-acc .f-acc-soft .f-acc2-soft`(면).

```html
<div class="sim" id="sim-airy">
  <div class="sim-head"><span class="sim-tag">SIMULATOR</span><h3>제목</h3></div>   <!-- 3D는 <span class="sim-tag three">3D</span> -->
  <div class="sim-body side">                                    <!-- side: 넓은 화면에서 컨트롤을 오른쪽에 -->
    <div class="sim-view"><canvas id="cv-airy"></canvas></div>
    <div class="sim-controls">
      <label class="ctrl"><span>파장 <output id="wl-out"></output></span><input type="range" id="wl" min="400" max="700" value="550"></label>
      <div class="ctrl"><span>모드</span><div class="seg" id="mode"><button data-value="a" class="on">A</button><button data-value="b">B</button></div></div>
      <label class="check"><input type="checkbox" id="showx"> 옵션</label>
      <button class="btn primary" id="run">실행</button>
    </div>
  </div>
  <div class="sim-readout">
    <div class="stat"><span class="k">에어리 반경</span><span class="v" id="o-r">—</span></div>
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
- `SB.canvas(el, (ctx,w,h)=>{}, {aspect:0.5, height, minHeight, maxHeight})` → `{ctx,w,h,redraw()}` HiDPI, 리사이즈/테마 시 자동 redraw(배경 `--canvas-bg`로 칠해 줌).
- `SB.chart(ctx, box|null, {x:[a,b], y:[a,b], logX, logY, xLabel, yLabel, series:[{data:[[x,y]],color,width,dash,fill}], vlines, hlines, points, bands, xFmt, yFmt})` → `{X,Y,box}`.
- `SB.loop(el, (dt,t)=>{})` 화면에 보일 때만 도는 rAF 루프 `{start,stop,toggle}`.
- `SB.range(id, fmt, onInput)` → getter `get()`, `get.set(v)`. `SB.seg(id, onChange)` → getter. `SB.stat(id, html)`.
- `SB.palette()` 테마 색, `SB.color('accent')`, `SB.onTheme(cb)`, `SB.isDark()`.
- `SB.wl2rgb(nm, alpha)`, `SB.wl2rgbArr(nm)`, `SB.randn()`, `SB.poisson(λ)`, `SB.fmt(x, digits)`, `SB.si(x,'m')`, `SB.clamp/lerp/map`, `SB.C = {h,c,q,k}`.
- `SB.three(el, {camera, target, fov, autoRotate, minDistance, maxDistance})` → `T = {THREE, scene, camera, renderer, controls, onFrame(cb), label(html, pos), material(color, opts)}`. three.js가 없으면 `null`을 돌려주므로 `if (!T) return;`으로 처리.

## 광학 라이브러리 (`js/optics.js`, 전역 `OPT`)
파장은 nm, 각도는 라디안(`OPT.deg(30)`), 복소수는 `{re, im}`이고 굴절률은 `n + ik`(k>0 흡수) 규약이다.
- 복소수: `OPT.C.of/add/sub/mul/div/scale/conj/abs/abs2/arg/exp/cis/sqrt/inv`, `OPT.cx(실수)`.
- 유틸: `OPT.linspace`, `OPT.interp(table, x)`, `OPT.sinc`(정규화), `OPT.deg/rad2deg`.
- 특수 함수: `OPT.besselJ0/J1`, `OPT.airy(v)`(v = πr/(λN)), `OPT.airyRadius(λ,N)`, `OPT.mtfDiff(ν, νc)`, `OPT.mtfPixel(ν, a)`, `OPT.zernike(j, ρ, θ)`(Noll 1~11, `OPT.ZERNIKE_NAMES`).
- FFT: `OPT.fft(re, im, inverse)`(Float64Array, 2ⁿ), `OPT.fft2(re, im, n, inverse)`, `OPT.fftshift(a, n, twoD)`.
- 재료: `OPT.n(mat, nm)` → `{re, im}`. `mat`은 `"air" "Si" "SiO2" "Si3N4" "HfO2" "Ta2O5" "TiO2" "Al2O3" "MgF2" "BK7" "polymer" "lowN" "CF_R" "CF_G" "CF_B" "Al" "W"` 또는 숫자/복소수. 이름은 `OPT.MATERIALS[mat].name`. 실리콘: `OPT.siAlpha(nm)`(1/cm), `OPT.siDepth(nm)`(µm).
- 경계면: `OPT.fresnel(n1, n2, θ)` → `{rs, rp, ts, tp, Rs, Rp, Ts, Tp, R, T}`. `OPT.forwardCos(n, β)`.
- TMM: `OPT.tmm([{m:"air"}, {m:"SiO2", d:100}, ..., {m:"Si"}], nm, {theta, pol:'s'|'p'|'u'})` → `{R, T, A, layerA[]}`. 깊이별: `OPT.tmmAt(res, layerIndex, z)` → `{absor(1/nm), E2}`, `OPT.tmmProfile(res, step, tail)`.
- 필터·광원: `OPT.cfT('R'|'G'|'B', nm)`, `OPT.irCutT(nm, θ, λ0, width, neff)`, `OPT.irCutEdge(λ0, θ, neff)`, `OPT.blueGlassT(nm, θ)`, `OPT.Vlambda(nm)`, `OPT.planck(nm, T)`.
- 컬러맵: `OPT.cmap('inferno'|'viridis'|'rdbu'|'gray', t)` → `[r,g,b]`, `OPT.drawField(ctx, data, nx, ny, {x,y,w,h}, v=>t, cmap)`.
