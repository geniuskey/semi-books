# TCADBook 챕터 작성 가이드

빌드 과정 없는 정적 사이트다. `index.html` + `chapters/<slug>.html` + 공통 `css/style.css`, `js/common.js`, 그리고 TCAD 엔진 `js/tcad.js`(코어) · `js/process.js`(공정) · `js/device1d.js`(1D 소자) · `js/device2d.js`(2D 소자).
로컬 실행: `python -m http.server 8000` → http://localhost:8000 (file://로 열어도 동작하게 classic script만 쓴다. ES module 금지.)

## 기여물의 라이선스
실행 코드는 MIT, 본문·그림·문제·해설 등 교육 콘텐츠는 CC BY 4.0. 구분은 [라이선스 안내](LICENSE.md)를 따른다.

## 원칙
- **한국어**, 대상은 공대 학부 고학년·대학원 초년생(반도체 소자 물리와 공정의 기초가 있다고 가정. 소자 물리는 [DeviceBook](https://semi.euiyun.com/device/), 공정은 [ProcessBook](https://semi.euiyun.com/process/)을 참조로 건다). 영어 원어는 `<span class="en">(Drift-diffusion)</span>`처럼 병기.
- TCAD 교과서이므로 **책 전체가 브라우저 안의 작은 TCAD**다. 시뮬레이터는 그림을 흉내 내는 애니메이션이 아니라, 엔진이 실제로 방정식을 푸는 결과를 보여 준다(포아송·드리프트-확산·확산 방정식을 격자 위에서 푼다). 결과가 해석식과 맞는지 함께 보여 주면 더 좋다.
- 이 책의 뼈대는 **만져 보며 배우기**다(Bartosz Ciechanowski의 글이 본보기). 설명을 읽고 그림을 보는 책이 아니라, 요소 하나하나를 직접 끌고 돌리고 바꿔 보면서 "아, 이래서"를 얻는 책이다.
  - 개념 하나에 조작 가능한 그림 하나. 정적인 SVG는 조작으로 대신할 수 없을 때만 쓴다(장마다 1~2개 이하).
  - 한 시뮬레이터는 **한 가지**만 보여 준다. 슬라이더는 1~3개. 큰 종합 시뮬레이터는 장 끝에 하나.
  - 앞 시뮬레이터에서 만진 것 위에 다음 것을 쌓는다. 글은 시뮬레이터 바로 앞에서 "무엇을 움직여 볼지"를, 바로 뒤에서 "무엇을 봤는지"를 말한다.
  - 슬라이더뿐 아니라 캔버스 위 직접 끌기(`TB.drag`)를 적극적으로 쓴다(도핑 프로파일 꼭짓점, 격자 점, 바이어스 점, 경계 위치). 끌 수 있는 것에는 손잡이를 그린다.
  - TCAD다운 장면을 보여 준다: 2D 필드 맵(전위·전자 농도·전계·전류 밀도)과 컬러바, 격자 겹쳐 보기, 반복마다 줄어드는 잔차(수렴 곡선), 바이어스 스윕 곡선, 모델 A/B 비교, 해석식 대 수치해.
  - 값을 끝까지 밀었을 때 **무너지는 모습**이 보여야 한다(격자가 성기면 해가 틀린다, 바이어스 간격이 크면 뉴턴이 발산한다, 채널이 짧으면 문턱 전압이 무너진다, 전계가 크면 항복한다). 한계가 배울 점이다.
  - 결과는 숫자(`.sim-readout`)로도 함께 보여 준다.
  - 무거운 계산(2D 풀이, 스윕)은 슬라이더에 직접 묶지 말고 `TB.debounce`나 "풀기" 버튼을 쓰고, 가능하면 반복을 프레임에 나눠(`requestAnimationFrame`) 수렴 과정을 보여 준다. 한 번의 갱신이 화면을 200 ms 이상 멈추게 하지 않는다.
- 순서: 개념 → 조작 가능한 그림 → 수식(KaTeX) → 시뮬레이터 → 실제 수치 → 타깃 파일 → 요약/퀴즈.
- TCAD 흐름은 공정 모사 → 구조·격자 → 물리 모델 → 수치 해 → 소자 특성 → 보정·활용. 각 장은 자기가 이 흐름의 어디인지 분명히 한다.
- 수치는 교과서·공개 자료의 대표값(Sze & Ng *Physics of Semiconductor Devices*, Selberherr *Analysis and Simulation of Semiconductor Devices*, Vasileska·Goodnick·Klimeck *Computational Electronics*, Plummer·Deal·Griffin *Silicon VLSI Technology*, Taur & Ning *Fundamentals of Modern VLSI Devices*, 상용 TCAD 매뉴얼에 공개된 모델 기본값). 확실하지 않은 수치는 '약', '~'를 붙인다. 회사 내부 수치는 쓰지 않는다. 상용 도구(Sentaurus, Silvaco, COMSOL 등)는 사실 위주로 소개하고 특정 제품을 홍보하지 않는다.
- 외부 라이브러리는 KaTeX, three.js r147만. 이미지 대신 인라인 SVG/canvas.
- 색은 CSS 변수(`var(--accent)`)나 `TB.palette()`를 쓴다. 재질 색은 `TC.matColor()` / SVG의 `.m-*`. 필드 맵은 `TC.putField`의 컬러맵(viridis·inferno·turbo·div·doping)을 쓰고 반드시 컬러바(`TC.colorbar`)와 단위를 붙인다.
- 모바일(폭 360px)에서 가로 스크롤 금지. SVG는 `viewBox`만 주고 width/height 생략.
- 문체는 평서문 "~다". 이모지 금지. 다른 장을 언급할 때는 `<a href="mesh.html">4장</a>`처럼 링크한다.

## head 블록
소스에는 `<title>`과 `<meta name="description">`(한 줄)만 쓴다. canonical, `theme-color`, Open Graph, Twitter 카드, JSON-LD는 루트의 `tools/build.mjs`가 `js/common.js`의 `CHAPTERS`와 `book.json`의 `meta`로 배포물에 생성하고, 수식도 빌드가 KaTeX로 미리 렌더링한다. 소스에 이 태그들이나 KaTeX 태그를 넣으면 `npm test`가 실패한다. 빌드는 정적 HTML의 수식만 렌더링하므로 스크립트가 `\(`·`\[`·`$$`가 든 문자열을 DOM에 넣지 않는다. 소스 파일을 바로 열면 `common.js`가 CDN에서 KaTeX를 불러와 미리보기를 렌더링한다. 사이트맵은 루트에서 `npm run sitemap`으로 갱신한다.
```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>장 제목 · TCADBook</title>
<meta name="description" content="한 문장 설명(검색 결과에 보일 120자 안팎)">
<link rel="icon" type="image/svg+xml" href="../favicon.svg">
<link rel="stylesheet" href="../css/style.css">
<script src="../js/common.js"></script>
<script src="../js/tcad.js"></script>
<script src="../js/device1d.js"></script>
<script src="../js/device2d.js"></script>
</head>
```
엔진 코어 `js/tcad.js`는 항상 불러온다. 필요한 장만 `js/process.js`(공정), `js/device1d.js`(1D 소자), `js/device2d.js`(2D 소자), three.js + OrbitControls를 `<script>`로 불러온다. 쓰지 않는 것은 뺀다.

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
- 그림: `<figure class="diagram"><svg viewBox="0 0 720 300" role="img" aria-label="…">…</svg><figcaption><b>그림 제목.</b> 설명</figcaption></figure>`. SVG 안에서는 `.lbl`, `.lbl-dim`, `.lbl-b`, `.lbl-acc`, `.lbl-acc2`, `.lbl-bad`, `.t-mono`, `.s-line`, `.s-axis`, `.s-acc`, `.s-acc2`, `.s-dash`, `.s-bad`, `.f-surface`, `.f-elev`, `.f-acc`, `.f-acc2`, `.f-acc-soft`, `.f-acc2-soft`, `.f-ok-soft`, `.f-warn-soft`, `.f-bad-soft`, `.f-bad`, `.beam`, 재질 `.m-si .m-ox .m-nit .m-poly .m-hk .m-sige .m-ge .m-w .m-cu .m-al .m-tin .m-sil .m-pr .m-sp`, 도핑 `.m-n .m-p`(반투명) 클래스를 쓴다. 색을 직접 적지 않는다(다크 모드). 화살표 머리는 `<marker>`에 `fill="context-stroke"`.
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
  <div class="tag"><b>TARGET TN-45</b><span>타깃 파일 · 4장</span></div>
  <h4>문턱 전압을 처음 계산하다</h4>
  <p>…이 장의 방법을 타깃에 적용한 결과(엔진으로 계산한 숫자)…</p>
  <div class="clue"><div><b>이 장에서 정한 것</b>…</div><div><b>아직 남은 문제</b>…</div><div><b>다음 단계</b>…</div></div>
</div>
```

## 이어지는 타깃: TN-45
모든 장은 같은 가상의 트랜지스터 하나를 TCAD 흐름을 따라 한 걸음씩 진전시킨다. 각 장 끝(핵심 정리 앞)에 `.casefile` 하나를 넣고, **아래 표에서 자기 장에 해당하는 내용만** 다룬다. 뒤 장의 결론을 미리 말하지 않는다. 숫자는 엔진(`TC.TN45`, `TC.tn45Process`, `TC.mos2d` 등)으로 직접 계산해서 쓴다.

- 타깃: 가상의 45 nm급 평면 벌크 n형 MOSFET. 게이트 길이 45 nm, 등가 산화막 두께(EOT) 1.2 nm, n⁺ 다결정 실리콘 게이트, 질화막 스페이서, 비소 소스/드레인 확장부(얕은 접합)와 깊은 소스/드레인, 붕소 p-웰과 할로(포켓) 주입, 전원 전압 1.0 V. 실제 회사·제품과 무관하다.
- 정확한 치수·도핑·특성값은 아래 "TCAD 엔진" 절의 `TC.TN45` 표를 따른다.

| 장 | 이 장에서 다루는 것 |
|---|---|
| 01 개요 | 타깃 소개. 웨이퍼를 만들기 전에 문턱 전압, 켜짐/꺼짐 전류를 알 수 있는가. 이 책 전체가 TN-45를 공정 레시피에서 I-V 곡선까지 계산하는 과정이라는 안내. |
| 02 재료 | 채널(p, 약 6×10¹⁸ cm⁻³)과 소스/드레인(n⁺, 10²⁰ cm⁻³ 이상)의 페르미 준위, n·p, 볼츠만 대 페르미-디랙 차이, 밴드갭 좁아짐. |
| 03 방정식 | 채널 중앙을 지나는 수직 1D 단면에서 평형 포아송 방정식. TN-45의 네 전극(소스·드레인·게이트·기판)과 각 경계 조건. |
| 04 격자 | TN-45의 2D 격자. 어디를 촘촘히 하는가(게이트 산화막, 채널 표면, 접합). 격자를 성기게 하면 문턱 전압이 얼마나 틀리는가. |
| 05 수치 해 | 게이트 전압 램프에서 뉴턴 반복 횟수와 잔차. 드레인 바이어스 간격을 너무 크게 잡으면 발산한다. |
| 06 이온 주입 | 웰·할로·확장부·소스/드레인 주입 조건과 주입 직후 프로파일. |
| 07 확산 | 스파이크 어닐 뒤 접합 깊이(확장부·소스/드레인), TED가 접합을 얼마나 깊게 만드는가. |
| 08 형상 | 게이트 산화와 스페이서(등각 증착 + 에치백). 스페이서 폭이 소스/드레인 위치를 정한다. |
| 09 PN 접합 | 드레인-웰 접합을 다이오드로 본다. 내부 전위, 공핍 폭, 접합 누설, 접합 용량. |
| 10 모델 | 이동도 모델 선택(상수/도핑/표면/속도 포화)에 따라 TN-45의 켜짐 전류가 얼마나 달라지는가. |
| 11 MOS-C | 게이트 스택의 C-V. Cox, 게이트 공핍, 양자 보정 → EOT 1.2 nm인데 전기적 두께(CET)는 더 두껍다. |
| 12 MOSFET | 2D 풀이로 Id-Vg·Id-Vd. 문턱 전압, 문턱 아래 기울기, DIBL, 켜짐/꺼짐 전류. 게이트 길이를 줄이면 무너진다. |
| 13 고전계 | Vd = 1.0 V에서 드레인 끝 최대 전계, 충돌 이온화로 생기는 기판 전류, 자기 발열 추정. |
| 14 수송 | 드리프트-확산이 45 nm 채널에서 무엇을 놓치는가(속도 과도, 탄도 한계). 양자 구속에 의한 반전층 중심 이동. |
| 15 과도·AC | 게이트 용량 Cgg-Vg, TN-45와 짝 pMOS로 만든 인버터의 지연. |
| 16 보정 | 합성 "측정" Id-Vg에 TN-45 모델을 맞춘다. 할로 도즈·스페이서 폭에 대한 민감도와 반응 표면. |
| 17 변동성 | 무작위 도펀트에 의한 문턱 전압 산포(폭에 따른 펠그롬 관계), 선 가장자리 거칠기. 같은 게이트 길이의 FinFET·GAA와 비교. |
| 18 실험실 | 독자가 TN-45 레시피를 처음부터 끝까지 직접 돌린다. 자기 레시피로 목표 사양을 맞추는 임무. |

## JS 헬퍼 (`TB`, `js/common.js`)
- `TB.canvas(el|선택자, draw(ctx, w, h), {aspect, minHeight, maxHeight})` → `{redraw(), ctx, w, h, canvas}`. 리사이즈·테마 변경 시 자동으로 다시 그린다. draw 안에서 `TB.palette()`를 매번 다시 읽는다. w, h는 CSS px. 문자열은 `querySelector` 선택자이므로 `"#id"`로 넘긴다. 만들자마자 draw를 한 번 부르므로 draw가 읽는 상태와 컨트롤(`TB.range`, `TB.seg`)을 먼저 만든다. 폭에 따라 배치를 바꿔 높이가 달라져야 하면 옵션 객체에 `get height() { … }` getter를 넘긴다.
- `TB.drag(canvas|선택자, {start(x, y, e), move(x, y, e), end(), hover(x, y, e)})` 캔버스 위 끌기(마우스·터치, CSS px). draw에서 계산한 배치(상자, 축 변환)를 바깥 변수에 저장해 두고 move에서 역변환한다.
- `TB.chart(ctx, box|null, {x:[min,max], y:[min,max], logX, logY, xLabel, yLabel, xFmt, yFmt, xTicks, yTicks, series:[{data:[[x,y]], color, width, dash, fill}], vlines:[{x,color,label}], hlines:[{y,color,label}], points:[{x,y,color,r,label}], bands:[{x0,x1,color}]})` → `{X, Y, box}`. 막대그래프·등고선은 반환된 `X`, `Y`로 직접 그린다.
- `TB.range(id, fmt, onInput)` → `get()`, `get.set(v)`. 출력은 `id + "-out"` 요소.
- `TB.seg(id, onChange)` → `get()`, `get.set(v)`. `TB.stat(id, html)`.
- `TB.loop(el, (dt, t) => {})` 화면에 보일 때만 도는 애니메이션. `TB.three(container, opts)`.
- `TB.palette()` → `{bg, text, dim, faint, grid, axis, border, surface, accent, accent2, ok, warn, bad, red, green, blue, series}`, `TB.color(name)`, `TB.isDark()`, `TB.onTheme(cb)`.
- 고정폭 글꼴(`TB.font(px, true)`, SVG의 `.t-mono`)은 숫자·영문에만 쓴다. 한글은 자간이 벌어진다.
- `TB.font(px, mono, weight)`, `TB.fmt(x, digits)`, `TB.si(x, unit, digits)`, `TB.erf/erfc`, `TB.rng(seed)`(0~1 난수 함수), `TB.randn()`, `TB.poisson(λ)`, `TB.debounce`, `TB.clamp/lerp/map`, `TB.wl2rgb(nm)(빛 색), `TB.C`(SI 물리 상수)`.
- `TB.CHAPTERS`, `TB.STAGES`.

## TCAD 엔진
모든 장이 같은 모델을 쓰게 하는 공통 엔진이다. 도핑 프로파일·전위·캐리어·I-V·C-V는 직접 만들지 말고 이것을 쓴다(한 장에서만 쓰는 작은 모형은 페이지 스크립트에 둬도 된다).
단위: API의 길이는 nm, 농도 cm⁻³, 전압 V, 온도 K, 에너지 eV, 이동도 cm²/V·s, 전계 V/cm, 전류 밀도 A/cm², 2D 소자 전류 A/µm, 시간 s. 2D 좌표는 x가 가로(게이트 중심 0), y가 깊이(실리콘 표면 0, 아래로 +).

### 코어 (`js/tcad.js`, 항상 로드)
- 상수: `TC.q`, `TC.kB`(eV/K), `TC.eps0`(F/cm), `TC.h`, `TC.hbar`, `TC.m0`, `TC.NM`(1 nm = 1e-7 cm), `TC.vt(T)` 열전압(300 K 0.02585 V).
- 재질: `TC.MAT[key]` = `{name, en, eps, Eg, chi, semi?, metal?, wf?}`. 키 `si ge sige gaas sic ox nit hk poly tin al w cu`.
- 실리콘 통계: `TC.Eg(T)`(Varshni, 300 K 1.124 eV), `TC.Nc(T)` 2.86e19, `TC.Nv(T)` 3.10e19, `TC.ni(T)`(300 K에서 정확히 1.0e10), `TC.bgn(N)` 밴드갭 좁아짐(Slotboom, 1e20에서 0.092 eV), `TC.niEff(N, T)`, `TC.EiOffset(T)`, `TC.fd12(η)`(Nc로 정규화한 F₁/₂, η=0에서 0.765), `TC.nFD(η)`, `TC.nMB(η)`, `TC.fermi(E, Ef, T)`, `TC.ionFrac(N, T, dE, g)` 불완전 이온화 비율(인 1e17 0.96, 1e19 0.39), `TC.equil(net, T)` → `{n, p, psi}`(net = Nd − Na, psi는 Ei 기준), `TC.vbi(Na, Nd, T)`.
- 이동도: `TC.mobCT(N, "n"|"p", T)` Caughey-Thomas(전자 1e15 1362, 1e18 277), `TC.mobMasetti(N, c, T)`(1e20 전자 61), `TC.mobSurface(mu0, Eperp, N, c, T)` Lombardi 표면 감소(3e17, 1 MV/cm에서 약 204), `TC.vsat(c, T)`(전자 1.07e7 cm/s), `TC.mobField(mu0, E, c, T)` Canali 속도 포화, `TC.einstein(mu, T)`, 계수 표 `TC.MOB`.
- 재결합·생성: `TC.tauSRH(N, tauMax, Nref)`, `TC.srh(n, p, ni, taun, taup, Et, T)`, `TC.auger(n, p, ni)`, `TC.radiative(n, p, ni)`, `TC.alphaII(E, c, T)` 충돌 이온화 계수(van Overstraeten, 전자 3e5 V/cm에서 약 1.2e4 /cm), `TC.bbt(E)` 밴드 간 터널링 생성률(Kane).
- 수치: `TC.bern(x)` 베르누이 함수, `TC.tridiag(a, b, c, d)`, `TC.bandSolve(n, bw, band, rhs)`(띠 행렬, `band[i·(2bw+1) + (j−i+bw)]`, 제자리에서 망가뜨린다), `TC.linspace`, `TC.logspace(e0, e1, n)`, `TC.interp(xs, ys, x)`, `TC.trapz(x, y)`, `TC.bisect(f, a, b)`, `TC.mesh1d([[x, h], …])` 구간별 간격 지정 비균일 격자, `TC.minmax(a)`, `TC.slog(x, floor)`.
- 그리기:
  - `TC.putField(ctx, box, data, nx, ny, {xs, ys, view: {x0, x1, y0, y1}, map, lo, hi, log, fn, mask, alpha, res})` 격자 필드(`data[j·nx + i]`, i가 x)를 겹선형 보간해 칠한다. 비균일 격자면 `xs`, `ys`를 넘긴다. `log: true`면 lo, hi는 log10 값.
  - `TC.colorbar(ctx, box, {map, lo, hi, loLabel, hiLabel, ticks: [[t, "문자"]], label, horizontal})`.
  - `TC.contour(data, nx, ny, level, xs, ys)` → 선분, `TC.drawContours(ctx, box, data, nx, ny, levels, {xs, ys, view, color, width, dash})`.
  - `TC.cmap(name, t)` → [r,g,b], `TC.cmapCss(name, t, alpha)`, `TC.CMAPS`(viridis, inferno, turbo, div, doping, gray), `TC.dopingColor(net)` p형 빨강 – n형 파랑.
  - `TC.matColor(key)`(CSS `--m-key`), `TC.drawStruct(ctx, box, regions, view, {outline, alpha})` 재질 단면(`regions: [{m, x0, x1, y0, y1} | {m, poly}]`, nm) → `{X, Y}`.

### 공정 (`js/process.js`)
단위: 길이 nm, 농도 cm⁻³, 도즈 cm⁻², 이온 에너지 keV, 공정 온도 °C(산화·어닐), 시간 s(`TC.MIN` = 60, `TC.HR` = 3600을 곱해 쓴다), 확산 계수 cm²/s. 2D 배열은 `[j·nx + i]`(i: x, j: 깊이 y). 수치는 node로 검증한 값이다.
- 주입 표: `TC.IMPLANT[ion]`(B, BF2, P, As, Sb, In; 비정질 Si의 LSS/Gibbons 계열 Rp·ΔRp·왜도 γ, 1~500 keV log-log 보간), `TC.implantMoments(ion, E)` → `{Rp, dRp, gamma, beta, lat}`. β는 피어슨 IV 영역이 되도록 자동으로 올린다. BF2는 B 원자 몫 에너지(E·11/49). 대표값: B 10 keV Rp 35 nm·ΔRp 18 nm·γ −0.3, B 30 keV 99/37, B 100 keV 300/71, BF2 25 keV(= B 5.6 keV) 22/12.8, P 30 keV 38/17, As 2 keV 3.8/1.6, As 20 keV 15.9/5.9, As 40 keV 27/9.9, Sb 50 keV 24.4/8.1. 1e15 cm⁻²의 정점: B 10 keV 2.4e20, As 20 keV 7.2e20, As 2 keV 2.7e21.
- `TC.pearson4(x, Rp, dRp, γ, β)` 정규화 밀도(1/nm, 평균·표준편차·왜도가 입력과 일치). γ=0, β=3이면 가우시안.
- `TC.implant1d({ion, E, dose, model: "gauss"|"pearson"|"dual", tilt(°), screen(산화막 nm, 그 안에 멈춘 몫은 잃는다), channel(이중 피어슨 채널링 몫, 기본 0.1), x})` → `{x, C, Rp, dRp, gamma, beta, lat, peak, dose}`. 화면 산화막이 없으면 ∫C dx = dose(6이온×3모델 모두 오차 < 1%). 기울이면 Rp·cosθ, 세로·측면 산포가 섞인다.
- `TC.implant2d({grid: {xs, ys}, …implant1d 옵션, mask: [[x0, x1]] 열린 창, blocks: [{x0, x1, h}] 표면 위 차단물, rot: 2(+θ/−θ로 도즈 반씩)})` → Float64Array. 측면 가우시안을 열린 구간에서 erf로 적분, 깊이 y에서 y·tanθ만큼 밀린다. 차단물 높이 h가 기울인 빔의 그림자(h·tanθ)를 만든다(게이트 50 nm, 30°면 29 nm). 2D 도즈 보존 정확.
- `TC.mcIon(ion, E, {n(기본 300), seed, tilt, crystal, ntraj(기본 40)})` 장난감 이진 충돌 몬테카를로(비정질 Si, ZBL 만능 퍼텐셜 산란 적분, Se = k√E) → `{z, x(멈춘 위치), traj: [[[x, z]…]], Rp, dRp, gamma, lat, back(후방 산란 몫), vac(1 nm 칸당 이온 하나의 KP 변위), nd, hist(bin) → {x, C(도즈 1 cm⁻²당)}}`. 표와 비교(1000 이온): B 10 keV Rp 41 nm(표 35, +18%)·ΔRp 18.2(18), B 100 keV 319(300), P 30 keV 44(38), As 20 keV 19.8(15.9, +25%), Sb 50 keV 32(24). 무거운 이온일수록 표(LSS)보다 20~30% 깊다(ZBL과 LSS 퍼텐셜 차이). B 10 keV 후방 산란 약 4%. 300 이온에 B 10 keV 약 60 ms, B 100 keV 약 300 ms. `crystal: true`는 장난감 <100> 채널링(B 10 keV Rp 41 → 54 nm).
- `TC.damage(ion, E, dose, x, {surv, crit})` Kinchin-Pease(+Lindhard 분배) 변위 밀도, 손상 중심 0.75·Rp → `{x, N, nd(이온당 변위), amorph: [x0, x1]|null, critDose}`. 임계 밀도 1.15e22, 살아남는 몫(동적 어닐) 기본 B 0.05·BF2 0.3·P 0.4·As/Sb/In 1. 비정질화 임계 도즈: As 20 keV 약 4e13, Sb 50 keV 2.2e13, P 30 keV 2.3e14, BF2 25 keV 2.8e14, B 10 keV 7.5e15. As 20 keV 1e14면 4~20 nm가 비정질.
- 확산 계수: `TC.DIFF[sp]`(Fair 공공 모델, Plummer 표 7-5: D⁰·D⁺·D⁻·D=, 격자간 몫 fI B 1·P 1·As 0.4·Sb 0.02, 활성 한계 Cs), `TC.diffCoef(sp, Tc, n/ni = 1)`, `TC.niT(Tc)`(1000 °C 7.1e18, 1050 °C 9.3e18), `TC.solubility(sp, Tc)`(1050 °C: B 1.5e20, As 3.6e20, P 1.1e21, Sb 5.6e19), `TC.activate(C, sp, Tc)` 부드러운 포화. 진성 D(1000 °C): B 1.5e-14, P 1.3e-14, As 2.7e-15, Sb 1.8e-15. 1050 °C: B 5.0e-14, As 9.7e-15.
- 해석식: `TC.predep(x, Cs, D, t)`(erfc), `TC.drivein(x, Q, D, t)`(가우시안), `TC.Dt(sp, T, t)` 열 예산 ∫D dt(cm², T는 숫자·함수·이력). `TC.spike({peak 1050, up 150, down 75 (°C/s), start 700, hold 0})` → 이력 `[[t, T]…]`. 기본 스파이크는 7 s, 붕소 진성 √Dt 약 2.0 nm, 비소 0.9 nm.
- `TC.diffuse1d(x, C, {species, T(°C | 함수 | 이력), t, model: "const"|"fermi"(기본: n/ni 의존 + 전계 증강)|"ted", ted: {factor, tau(1000 °C 기준 s), Ea(4 eV)}, background(다른 도펀트 순 도핑), cluster(활성 한계 위 원자 고정), surface: "reflect"|"outdiffuse"(h nm/s)|"sink"|"fixed"(Cs)|"segregation"(vox 산화 속도 nm/s, TC.SEG), steps(60)})` → Float64Array. 음해법(뒤쪽 오일러, D는 단계마다 갱신), 열 예산 균등 시간 분할. 반사 경계 질량 보존 정확. 붕소 1100 °C 1 h 드라이브인: 해석해와 최대 오차 정점의 0.4%, √Dt 233 nm. P 950 °C 30 min 선확산(Cs 1e20): xj(1e16) 137 nm(해석 136). 160점 60단계 약 1~4 ms.
  - TED: D·(1 + fI·factor·e^(−∫dt/τ(T))). 예) As 3 keV 1e15(배경 B 2e18) 주입 직후 xj 17.9 nm → 스파이크 1050 °C 페르미 20.4, +클러스터 18.8, +TED 3배 21.0, TED 30배 35 nm. B 2 keV 1e15(배경 1e17): 주입 42.8 → 스파이크 44.7, 스파이크+TED 3배 56, 1000 °C 10 s 59, +TED 30배 151 nm.
- 단계 실행형: `TC.diffuser1d(x, C, opts)` → `{c(제자리 갱신), t, T, step(dt), run(tEnd, n)}`. 다종 동시: `TC.anneal1d(x, {B, As}, opts)`, `TC.anneal2d(grid, fields, opts)` → 새 fields, `TC.annealer2d(grid, fields, opts)` 단계 실행형, `TC.diffuse2d(grid, C, {species, …})`(LOD 음해법). 2D 100×80, 40단계 약 45 ms(한 단계 약 1~6 ms), 질량 보존 정확.
- `TC.junctionDepth(x, net)` 표면 부호가 처음 바뀌는 깊이, `TC.junctionDepth(x, C, Nb)` C = 배경. 없으면 NaN. `TC.sheetRes(x, net, T)` 면저항 Ω/□(TC.mobCT로 q∫μN dx).
- 산화: `TC.dealGrove({T, t(s), wet, orient: "100"|"111", x0, P, model: "massoud"(건식 기본)|"tau"(25 nm 관례)|"dg"(습식 기본)})` → `{x(nm), A, B(nm²/s), BA(nm/s), tau, rate, at(t), curve(n)}`, `TC.oxTime(x, opts)` 역산, 상수 `TC.DG`(Plummer 표 6-2, (100)은 B/A ÷ 1.68). (100) 1 h: 건식 1000 °C 순수 DG 38.5 nm·Massoud 51 nm·τ 관례 58 nm, 건식 900 °C 21 nm, 건식 1100 °C 108 nm, 습식 1000 °C 388 nm, 습식 1100 °C 642 nm. 1000 °C 건식 A 233 nm, B 1.04e4 nm²/h, B/A 44.9 nm/h. 습식 1000 °C로 100 nm에 약 10분.
- 편석 `TC.SEG`(B 0.3, P·As·Sb 10, In 0.1), `TC.SI_CONSUME` = 0.44.
- `TC.locos({tox 500, pad 20, nit 150, open: [[x0, x1]], x0, x1, Lbb})` → `{regions, Lbb, t(x)}`(장난감 해석식, 성장분의 44%가 아래로). 기본값에서 새부리 Lbb 약 308 nm, 마스크 끝 두께 369 nm(74%).
- 형상: `TC.topo({x0, x1, y0(위, 음수), y1, dx})` 셀 모델(y 아래로 +, 실리콘 표면 0). `rect(m, x0, x1, y0, y1)`, `poly(m, pts)`, `deposit(m, t, {mode: "conformal"|"directional"|"isotropic"(시야 가중 → 오버행·보이드), sc})`, `etch(d, {mode: "anisotropic"|"isotropic", rates: {재질: 속도}, ratio})`, `strip(m)`, `cmp(y)`, `regions()` → `[{m, poly}]`(TC.drawStruct), `runs(m, y)`, `top()`, `voids()` → `{n, area}`, `clone()`. 폭 30 nm·깊이 120 nm 트렌치(종횡비 4)에 40 nm 등방 증착(dx 2) → 보이드 약 3300 nm²(약 50 ms), 등각 증착·폭 60 nm는 보이드 없음. 등방 식각 20 nm → 마스크 밑 언더컷 19 nm. 등방 증착은 dx 2 nm를 권한다(dx 1이면 수백 ms).
- `TC.spacerFlow({Lg 45, H 50, tox 1.2, w 25, over 0.1, dx 1})` 등각 질화막 → 이방성 에치백 → `{topo, width(바닥 폭), stages: [{name, regions}]}`. 바닥 폭 = 증착 두께(w 10·20·25·35 → 10·20·25·35 nm), 위로 갈수록 좁다(y −45 nm에서 12 nm). 약 40 ms.
- TN-45: `TC.TN45_RECIPE` 단계 배열 `{id, name, kind, …}`: sub(B 1e16) → well(B 50 keV 3e13) → vt(BF2 10 keV 1e13) → wellAnneal(1000 °C 10 s) → gox(1.2 nm, 800 °C 30 s) → gate(Lg 45, H 50) → offset(오프셋 스페이서 2 nm) → halo(BF2 15 keV 8e13, 30°, rot 2) → ext(As 4 keV 1e15, 이중 피어슨) → spacer(25 nm, 게이트 끝부터) → sd(As 40 keV 3e15) → spike(1050 °C, 150/75 °C/s, TED 3배). 할로·문턱 조절 도즈는 `TC.tn45Device`의 해석식 TN-45와 문턱 전압이 맞도록 정했다.
- `TC.tn45Process(overrides, grid)` → `{xs, ys, nx, ny, net(활성 Nd−Na), Na, Nd(활성), NaChem, NdChem, fields, xjExt(게이트 끝 +2 nm), xjSD(스페이서 끝 +35 nm), Leff(y = 1 nm 표면 접합 간격), Nch(채널 중앙 표면 p), steps: [{id, name, kind, Na, Nd, net(화학), regions}], regions, recipe, cut(x), cutY(y), dopingFn(x, y), totalFn(x, y)(Na+Nd), ms}`. overrides: `{단계 id: {…}, Lg, spacer, offset}`(예: `{halo: {dose: 4e13}, spike: {peak: 1000, ted: null}, Lg: 30}`). 기본 격자 x −120~120 nm 121점 × y 0~150 nm 67점(표면 0.5 nm), node에서 약 230~350 ms, 브라우저 첫 실행은 0.5~0.9 s까지 걸린다(슬라이더에 직접 묶지 말고 스파이크를 빼거나 단계별로 나눠 돌린다). 2D 소자로 넘길 때: `TC.tn45Device({doping: R.dopingFn, total: R.totalFn})`.
  - 기본 결과: 확장부 xj 18.9 nm(주입 직후 13.6), 깊은 S/D xj 76 nm, Leff 24.7 nm, 채널 중앙 p 표면 5.6e18·정점 6.3e18(깊이 12 nm), 웰 70 nm에서 4.6e17·140 nm에서 2e18(레트로그레이드), S/D 면저항 약 54 Ω/□, 스페이서 밑 확장부 약 119 Ω/□.
  - 2D 소자(device2d, 기본 격자): Vt,lin 0.34 V, Vt,sat 0.255 V, SS 80 mV/dec, DIBL 90 mV/V, Ion 0.70 mA/µm, Ioff 2 nA/µm(해석식 TN-45: 0.356, 0.259, 79, 101, 0.715, 1.5 nA).
  - 민감도: TED 끄면 xjExt 16.1·Leff 29.7, 스파이크 1000 °C면 14.9·33.2, 1100 °C면 43·13(확장부가 S/D 꼬리와 이어진다). Lg 30이면 Leff 10 nm, Lg 60이면 40 nm. 할로 없으면 xjExt 45 nm(웰만으로는 확장부가 깊어진다), 스페이서 15 nm면 S/D 측면 꼬리가 게이트 끝까지 와서 xjExt 62 nm. 깊은 S/D As 20 keV면 xjSD 50 nm.

### 1D 소자 (`js/device1d.js`)
실제로 방정식을 푸는 1D 풀이기 모음이다. API의 x는 nm(내부 cm), 농도 cm⁻³, 전압 V, 에너지 eV, 전계 V/cm, 전류 밀도 A/cm². 전위 ψ는 진성 준위 기준(n = ni·e^{(ψ−φn)/Vt}), 밴드 에너지는 접지 전극의 평형 페르미 준위 = 0 eV. 드리프트-확산은 볼츠만 통계만(포아송·MOS는 `stats: "fd"` 가능). 아래 수치는 node에서 직접 돌려 확인한 값이고 시간은 데스크톱 node 기준(브라우저도 비슷하다).
- 공통 수치: `TC.geoMesh(x0, x1, h0, r, hmax)` 기하급수 격자(nm 배열), `TC.blockTri(N, m, L, D, U, R)` 블록 삼중 대각 풀이(m×m 블록, 행 평형 + 블록 안 부분 피벗, `TC.blockTri.res` = 평형 후 잔차), `TC.schrod1d(x, V(eV), mEff, nStates)` → `{E: [eV], psi: [∫ψ²dx = 1, nm⁻¹]}`(양 끝 ψ = 0, 비균일 격자 대칭화 + 스투름 이분법 + 역반복. 10 nm 무한 우물 m0: 3.76·15.04·33.84 meV로 해석해와 5자리 일치, 300점 10준위 2.5 ms), `TC.VALLEYS` (100) 계곡(Δ2: mz 0.916·md 0.19·g 2, Δ4: mz 0.19·md 0.417·g 4, 정공 HH/LH는 근사).
- 포아송: `TC.poisson1d({x(nm 배열 | mesh1d 사양) | L, nodes, net(배열 | fn(x)), T, stats:"mb"|"fd", bgn, phin, phip(배열 | 스칼라), bc:{left:{type:"ohmic"|"dirichlet"|"neumann", V}, right}, regions:[{x0, x1, eps | m}](절연막), sheets:[{x, Q(cm⁻²)}], damping:"log"|"clamp"|"none", dmax, init:"neutral"|"zero"|배열, tol, maxIter})` → `{x, psi, n, p, E(노드), Ee(구간), rho(C/cm³), Ec, Ev, Ei, Efn, Efp(eV), iters, history:[{it, res, upd}], converged, diverged}`. 오믹 경계는 국소 중성 전위. pn 1e17/1e17(182점): 13회 뉴턴, 약 5 ms, Vbi 0.8334 V(해석 0.8334), Emax 1.083e5 V/cm(공핍 근사 1.135e5, 2kT/q 보정 1.100e5). 1e16/1e16: Emax 3.19e4(보정 3.20e4). 한쪽이 고농도인 접합(1e18/1e16, 1e20/1e17)은 다수 캐리어 꼬리 때문에 접합면 전계가 공핍 근사보다 25%~ 이상 높게 나온다(볼츠만 해의 실제 차이).
- 한 걸음 포아송: `TC.poissonSolver1d(opts)` → `{x, psi, history, step() → {it, res, upd(max|Δψ|/Vt), diverged}, run(tol, maxIter), result()}`. `method: "picard"`(전하를 얼린 선형 풀이, `omega` 이완). pn 1e18/1e18(600 nm): 감쇠 없는 뉴턴 + 중성 초기값 7회(갱신 1e1 → 6 → 1 → 0.2 → 4e-3 → 4e-6 → 4e-12, 2차 수렴), 감쇠 없는 뉴턴 + ψ = 0 초기값은 2회째 발산(NaN), 로그 감쇠(`"log"`) + ψ = 0은 12회 수렴, 피카르(ω = 1)는 3회 만에 1e291로 발산.
- 드리프트-확산: `TC.dd1d({x | mesh, net, Ntot, T, bgn, mobility:"const"|"ct"|"masetti", mun, mup, field(Canali 속도 포화, 미분 포함), tau(s | {n, p, doping, Nref}), Et, recomb:{srh(기본 켬), auger(켬), rad, ii(충돌 이온화), bbt}, Va(왼쪽 전극, 오른쪽 접지) | contacts:{left:{V, Rs(Ω·cm²)}, right}, contact:"left"|"right", method:"newton"|"gummel", tol(1e-9), maxIter, dmax(1 V), raw, init(이전 결과)})` → `{x, xe(구간 중점), psi, n, p, phin, phip, Jn, Jp(구간 A/cm²), J(단자 전류, 반올림 잡음이 가장 작은 구간에서), Jcontact, Jerr(Jn+Jp의 구간 간 최대 상대 편차), E, Ee, R(재결합), G(생성), mun, mup, Ec, Ev, Vdev, iters, history, ok, ms, state}`. 변수 (ψ, n, p), 샤페터-거멜 전류, 노드마다 3×3 블록 뉴턴(ψ 갱신 상한 dmax + n·p 양수 보호), 수렴 뒤 한 번 더 다듬는다. 순방향 J > 0.
- 한 걸음 DD: `TC.ddSolver1d(opts)` → `{S, x, step(method) → {it, res, upd}, solve(), setBias(VL, VR), solveTo(VL, VR, {maxStep(0.5 V), adaptive}) → ok(실패하면 간격을 반으로), totalIters, result(), ac(freqs)}`. `raw: true`면 감쇠·양수 보호를 끈다(발산 시연: pn 1e17에서 0 → −5 V 한 번에 1회째 실패, 0 → 1.3 V 3회째 실패. 감쇠 뉴턴은 0 → −20 V를 32회, 0 → 0.9 V를 10회에 푼다). 거멜은 0 → 0.6 V 13회(뉴턴 7회), 0 → 1.0 V 38회.
- 스윕: `TC.sweep1d(opts, biasList, {keep, adaptive, maxStep, stopOnFail})` → `{V, J, iters(점마다 반복 합), ok, sols, solver}`(앞 점에서 이어 푼다).
- 다이오드 구조: `TC.diode1d({kind:"pn"|"np"|"pin"|"nnn", Na, Nd, length(nm, 2000), xj(nm), profile:"abrupt"|"linear"|"erfc", grad(nm), Li(pin i층·nnn 가운데 폭), Nlow, hj, hc, …나머지는 dd1d 옵션})` → dd1d 옵션(`x`, `net`, `meta`). 왼쪽이 p(양극). 1e17/1e17·2 µm 148점, 1e20/1e17 268점, pin(1e19/i 1 µm/1e19) 413점.
- 해석식: `TC.abrupt({Na, Nd, Va, T})` → `{Vbi, W, xn, xp(nm), Emax, Cj(F/cm²), Wc(2kT/q 보정 W)}`, `TC.shockley({Na, Nd, wp, wn(중성 폭 nm), taun, taup, T})` → `{J0, Ln, Lp(µm), Dn, Dp, Jgen(Wnm, τ) = q·ni·W/2τ}`(coth 식), `TC.ideality(V, J)` → n(V).
- 다이오드 검증(1e17/1e17, 2 µm, τ = 1e-7 s, SRH + 오제): 0~0.9 V 46점 스윕 35~70 ms(점당 뉴턴 약 5회, 한 번의 0.60 → 0.62 V 풀이 0.4 ms). J(0.6 V) = 0.538 A/cm², 쇼클리(J0 4.65e-11 A/cm²) 대비 0.96. 이상 계수 n: 0.1~0.2 V 약 1.6(공핍 영역 SRH), 0.4 V 1.04, 0.5~0.7 V 1.00~1.02, 0.8 V 1.34, 0.9 V 2.5(고주입 + 중성 영역 저항). SRH를 끄면 n = 1.002, J/J쇼클리 0.97~0.98. 전류 연속: 순방향 Jerr 약 1e-9. 역방향 −1/−5/−10/−20 V: −6.1e-8/−2.0e-7/−3.1e-7/−4.8e-7 A/cm²(q·ni·Wc/2τ 1.7e-7/3.1e-7/4.2e-7/5.9e-7과 같은 차수). 역방향에서는 고농도 중성 영역의 다수 캐리어 플럭스 상쇄 때문에 구간별 Jn+Jp가 반올림 잡음으로 약 1% 흔들린다(그래서 `J`는 가장 조용한 구간에서 읽는다).
- 소신호 AC: `sv.ac(freqs)` / `TC.ac1d(opts, V, freqs)` → `[{f, G(S/cm²), C(F/cm²), Y}]`((J − jωM)δu = −∂F/∂V를 6×6 실수 블록으로, 변위 전류 포함, 왼쪽 전극). 1e17/1e17: C(0 V) 7.29e-8, C(−2 V) 3.86e-8, C(−10 V) 1.96e-8 F/cm²로 2kT/q 보정 계단 접합 식(7.29e-8, 3.86e-8, 1.96e-8)과 일치, 순방향 G는 dJ/dV 유한 차분과 0.2% 안에서 같다. 한 번 1~5 ms.
- 항복: `TC.ionIntegral(x, E, {T})` → `{Ip, In(1이면 항복), Mp, Mn, intAn, intAp}`(정공은 E 방향으로 움직인다고 본다), `TC.bvIonization(opts, {Vmax, dV})` → `{BV, V, I}`(충돌 이온화를 끈 DD 역방향 스윕의 전계로 I = 1 교차). p⁺(1e20)/n: Nd 1e16 → BV 50.9 V, 1e17 → 13.7 V, 1e18 → 5.8 V(van Overstraeten 계수, Sze 근사식 60·(N/1e16)^−0.75은 60/10.7 V). 1e20/1e17 DD에 `recomb: {ii: true}`: 증배 M = J/J(ii 없음) = 1.11(−5 V), 1.99(−10 V), 2.58(−11 V), −12 V부터 뉴턴이 무너진다(전압 경계로는 M → ∞ 근처를 따라갈 수 없다). ii 생성은 소수 캐리어 플럭스와 단자 전류로 계산한다.
- 과도: `TC.dd1dTransient(opts, {V0, Vs: 숫자 | fn(t), Rs(Ω·cm²), times | {tEnd, steps}, every})` → `{t, J(변위 포함), Vs, Vd(소자 전압), iters, snaps:[{t, n, p, psi}], ok}`(후진 오일러, 직렬 저항은 뉴턴 안에 포함, 실패하면 시간 간격을 반으로). 역회복: p⁺ 1e18 / n 1e16, 10 µm, τ = 1e-7 s, Vs +5 → −5 V, Rs = 1 Ω·cm²: IF 4.33 A/cm², 저장 구간 IR −5.66 A/cm², 저장 시간(소자 전압 0 교차) 17 ns(15장은 전류가 IR에서 벗어나기 시작하는 시점으로 정의해 약 10.5 ns, 짧은 베이스 Q_F/I_R 추정과 맞는다), 0.1 µs 뒤 −1.3e-2 A/cm²로 감쇠. 370점 200단계 약 0.4 s(프레임마다 몇 단계씩 나눠 돈다).
- MOS 커패시터: `TC.moscap({sub:"p"|"n", N, tox(nm) | EOT, epsOx, gate:"n+poly"|"p+poly"|{wf}, Npoly(주면 다결정 공핍, 없으면 일함수 4.05/5.17 eV 이상 게이트), tpoly, Qox(cm⁻²), Dit(cm⁻²eV⁻¹, 중성 준위 midgap), T, stats, bgn, qm:"none"|"dg"|"sp", mDG(0.15), qbox(nm, 20), nStates, depth, Vg, mode:"lf"|"dd"})` → `{x(Si/SiO₂ 계면 0, 산화막 [−tox, 0], 실리콘 +), psi, n, p, Ec, Ev(산화막 포함), Ei, Ef, psiS, Qg, Qs, Qinv, Qdep(C/cm²), Ninv(cm⁻²), centroid(nm), Cox, Vfb, subbands:[{valley, E, N, psi}], iters, ms}`. `TC.mosCV(opts, vgList, {mode:"lf"|"hf"|"dd", keep})` → `{Vg, C(F/cm²), CCox, Qg, psiS, Ninv, centroid, iters, Cox, EOT, Vfb}`(lf·dd는 선형화 dQg/dVg, hf는 소수 캐리어와 계면 트랩을 얼린 선형화, sp는 Qg 차분). `TC.mosAnalytic(opts)` → `{phiF, Vfb, Vt(ψs = 2φF + Qd/Cox), Cox, Cfb, Cmin, Wdmax, LD(nm), Qdmax, phiMS}`, `TC.mosExtract(cv, {…, vgCET | ninvCET})` → `{Cox, Cfb, Vfb(C = Cfb), Vt(Ninv 외삽), VtPsi(ψs = 2φF), CET(nm), Vcet, Cinv}`. 밀도 기울기(dg)는 산화막까지(장벽 3.1 eV) 푸는 (ψ, w = ½ln(n/ni)) 결합 뉴턴, sp는 계면 hard wall 상자에서 Δ2·Δ4 부띠 + 예측-보정 자기 일관 반복.
- MOS 검증: tox 10 nm, p 1e17, 이상 n⁺ 게이트: Cox 3.45e-7 F/cm²(= εox/tox), Vfb −0.980 V(추출 −0.980), Vt 해석 0.335 V vs 수치 ψs = 2φF 0.336 V, HF Cmin/Cox 0.215(공핍 근사 0.224), LF 강반전 0.982, 깊은 공핍 3 V에서 0.132. Dit 1e12는 0 V C/Cox를 0.261 → 0.454로 키운다. TN-45 스택(p 2e18, EOT 1.2 nm, n⁺ poly 1e20): Cox 2.878e-6 F/cm², 해석 Vfb −1.089 V·Vt 0.180 V, 수치 ψs = 2φF 기준 Vt 0.223 V(다결정 공핍), C/Cox 축적(−1.5 V) 0.80, 반전 1 V 0.68. 반전 전하 1e13 cm⁻²에서 CET: 고전 1.80 nm(EOT 1.2 + 다결정 공핍 + 고전 반전층), 밀도 기울기 2.01 nm(+0.21), 슈뢰딩거–포아송 2.10 nm(+0.30). 반전층 중심: 고전 0.23 nm, DG 1.18 nm, SP 1.13 nm(Vg = 1 V에서 1.19 nm, 첫 Δ2 부띠가 Ef 아래 26 meV에 반전 전자 6.0e12 중 5.45e12). 시간: 고전 C-V 61점 40 ms, DG 57 ms, SP 0.4 s(한 점 3.5/16/37 ms).
- 앙상블 몬테카를로: `TC.mcBulk({E(V/cm, 숫자 | fn(t)), T, n(2000), steps(300), dt(5e-15 s), seed, Eprev, warmup})` → `{t, v(cm/s), energy(eV), vSteady, eSteady, G}`(벌크 Si 전자, 비포물선 단일 계곡 α 0.5/eV, 음향 + Jacoboni–Reggiani 밸리 간 포논 6종, 자기 산란, 시드 고정이라 재현된다). `TC.mcVelocityField(Elist, opts)` → `[{E, v, energy}]`. v(E): 1e3 V/cm 1.21e6(Canali 1.29e6), 1e4 6.8e6(6.5e6), 3e4 9.8e6(9.0e6), 1e5 1.03e7(1.02e7) cm/s, 저전계 이동도 약 1400. 0에서 전계를 계단으로 올리면 속도 과도: 3e4 V/cm 0.19 ps에 1.59e7(정상의 1.56배), 5e4 0.13 ps에 1.99e7(1.89배), 1e5 0.08 ps에 2.61e7(2.57배). 전계 한 점 60~180 ms. 단일 계곡이라 2e5 V/cm 위에서는 속도가 떨어진다(3e5에서 8.9e6). 기본값에서 1 kV/cm 잡음은 약 ±10%.
- 에너지 균형: `TC.hydro1d({Nplus(5e17), Nminus(2e15), Lch(400 nm), Lc(200 nm), Va, T, tauW(0.4 ps), model:"eb"|"dd", nodes(401), dV})` → `{x, psi, n, Tn(K), v(cm/s), E, J(A/cm², Va > 0이면 음수), iters, converged}`(전자만, 바이어스 램프 + 거멜, Baccarani–Wordeman 이동도라 균일 영역에서 vsat로 포화). 기본 구조 Va = 1 V: EB 최대 속도 1.73e7 cm/s(x ≈ 564 nm, Tn 최대 1429 K), Canali DD는 9.5e6. Va 0.5/2 V: EB 1.28e7/1.85e7 대 DD 8.3e6/1.01e7. 한 번에 45~170 ms.
- 탄도 MOSFET: `TC.ballistic({Vg, Vd, T, Vt(0.3), Cox | EOT(1.2), n(1.2), dibl, mt, ml, valleys:"2f"|"all", dE4, m, gv})` → `{I(A/µm), N(cm⁻²), vinj(cm/s), vT, Ef_minus_Ec, etaS}`(장벽 꼭대기 모델, 2D 부띠, FD 통계), `TC.ballisticIV(opts, VgList, VdList)` → `{Vg, Vd, I[iVg][iVd]}`. EOT 1.2 nm, Vg − Vt 0.7 V, Vd 1 V: 3.40 mA/µm, N 9.9e12, vinj 2.15e7(축퇴, 문턱 아래에서는 1.24e7 = 열속도), 모든 계곡을 넣으면 2.63 mA/µm. 한 번 0.3 ms. 후방 산란·DIBL(기본 0)은 없다.
- NEGF 투과: `TC.transmission1d({x(균일 nm 배열) | {L, dx}, U(eV 배열 | fn), m(0.067), E(배열 | {e0, e1, n}), eta})` → `{E, T, t0}`(강결합 + 반무한 리드 자기 에너지, 재귀 그린 함수), `TC.barrier1d({kind:"single"|"double", height, width, well, lead, L, dx})` → `{x, U}`. 0.3 eV × 2 nm 단일 장벽이 해석해와 0.07% 안에서 일치, 이중 장벽(1.5/5/1.5 nm)은 0.084·0.371 eV에서 T = 1.000 공명. 200 에너지 × 301점 0.7 ms.
- 열: `TC.heat1d({x | {L, n}, k(W/cm·K, 1.5), C(J/cm³·K, 1.63), Q(W/cm³), bc:{left, right: {type:"T", T} | {type:"flux", q} | {type:"conv", h, T}}, T0, transient:{dt, steps, every}})` → `{x, T, Tmax, t, Thist, TmaxHist}`(유한 체적, 후진 오일러). 균일 발열 양끝 고정: 상승량 QL²/8k와 1e-7까지 일치, 시정수 1.11e-9 s(L²/π²α 1.10e-9). 양 끝이 모두 flux이면 정상 해가 없다.

### 2D 소자와 TN-45 (`js/device2d.js`)
텐서곱 비균일 격자 위 박스 적분(유한 체적) + 샤페터-거멜 전류. 볼츠만 통계, ψ는 진성 준위 기준(n = ni·e^{(ψ−φn)/Vt}, p = ni·e^{(φp−ψ)/Vt}). 양자 보정·밴드갭 좁아짐·재결합은 넣지 않았다(전자 연속 방정식은 R = 0). 기본은 전자만 풀고 정공은 φp = Vb로 고정(holes: true면 정공도 푼다). n⁺ poly 게이트는 포아송만 풀어 게이트 공핍이 생긴다. 배열은 모두 `data[j·nx + i]`(TC.putField 순서), 좌표 nm, 단자 전류 A/µm(들어가는 방향 +).

- TN-45 타깃
  - `TC.TN45` 매개변수: `Lg 45, eot 1.2, spacer 25, hPoly 50`(그림용), `hStack 6`(계산 영역에 넣는 게이트 스택 높이), `lCont 30`(스페이서 밖 접촉 길이), `depth 150`, `Npoly 2e20, polyDep true, gateWf null`(숫자를 주면 그 일함수(eV)의 금속 게이트), `VDD 1.0`. 도핑(cm⁻³, nm): 웰 `Nsub 5e17` + `Nwell 2.5e18 @ Rwell 150, dWell 45`, Vt 조정 `Nch 2.7e18 @ Rch 12, dCh 6.3`, 할로 `Nhalo 1.9e19`(게이트 끝에서 안쪽 `xHalo 3.5`, 깊이 `yHalo 10.5`, `sxHalo 11.5, dHalo 5.7`, 바깥쪽은 평탄), 확장부 `Next 1.5e20`(가로 erfc 끝 = 게이트 끝 − `ovl 5`, `sxExt 3.4`, 세로 가우시안은 `xjExt 28`에서 `Nref 2e18`이 되도록), 깊은 S/D `Nsd 2e20`(끝 = 스페이서 바깥 − `offSD 5`, `sxSD 8`, `xjSD 70`). `muScale 1, vsatScale 1`은 전자 이동도·포화 속도 배수(보정 장용, 기본은 표준 모델 그대로). `TC.TN45.domain` = `{x0: −77.5, x1: 77.5, y0: −7.2, y1: 150}`.
  - `TC.tn45Doping(x, y, p)` 순 도핑 Nd − Na, `TC.tn45DopingParts(x, y, p)` → `{nd, na}`(해석식: 가로 erfc × 세로 가우시안, 가우시안 할로 포켓, 레트로그레이드 웰).
  - `TC.tn45Junctions(p, dopingFn?)` → `{xjLat (표면 금속학적 접합 |x|), leff = 2·xjLat, xjExt (게이트 끝 + 2 nm 위치 접합 깊이), xjSD}`.
  - `TC.tn45Regions(p)` → `TC.drawStruct`용 영역(si, ox, nit D자형 스페이서, poly, sil 접촉). `TC.tn45Domain(p)`.
  - `TC.tn45Device(over)` → dev. `over`: TN45 덮어쓰기 + `{density: "coarse"|"normal"|"fine"|"xfine"|간격 배수, hs (표면 첫 간격), mesh: {xs, ys}, doping, total}`. `doping`은 `(x, y) → net` 함수 또는 격자 `{xs, ys, net, total?}`(겹선형). 공정 모사 결과는 `TC.tn45Device({doping: {xs: P.xs, ys: P.ys, net: P.net, total: Na+Nd}})` 또는 `{doping: P.dopingFn}`(이때 이동도용 총 도핑은 |net|).
- 격자
  - `TC.mesh2d({xSpec, ySpec} | {xs, ys})` → `{xs, ys, nx, ny}`(TC.mesh1d 형식 구간 간격).
  - `TC.tn45Mesh(p, {density, hs})`: 게이트 끝·스페이서 끝은 반드시 격자선. 산화막 3칸(0.4 nm), 실리콘 표면 0.4 nm에서 시작, 접합 1.5 nm. coarse 29×26 = 754, normal 49×41 = 2009, fine 79×68 = 5372 노드.
  - `TC.device2d({xs, ys, mat(xc, yc) → "si"|"ox"|"nit"|"poly"|"gate"|"src"|"drn", doping, total, gateOff, Npoly, L, muScale, vsatScale})`: 셀 재질 → 박스 적분 기하(변 결합 계수 ε·면/길이, 실리콘 제어 체적). 반환 dev: `{nx, ny, N, xs, ys, kind (0 비활성·1 Si·2 절연체·3 poly), dir, cont (−1 | 0 게이트 | 1 S | 2 D | 3 기판), C, Ctot, area, regions, L, ...}`. 기판 접촉은 맨 아래 행, poly 게이트 접촉은 맨 위 행, S/D 접촉은 스페이서 바깥 실리사이드.
  - 삼각 격자(4장): `TC.delaunay(points)` → `[[i, j, k], ...]`(Bowyer–Watson, 반시계), `TC.circumcenters(points, tris)`, `TC.voronoiCells(points, tris)` → `[{i, poly, closed, area}]`(박스 적분 제어 체적), `TC.meshQuality(points, tris)` → `{minAngle, maxAngle, obtuse, obtuseList, badEdges, badEdgeList}`(비들로네 변 = 마주 보는 두 각의 합 > 180°, 결합 계수가 음수).
- 풀이
  - `TC.poisson2d(dev, {vg, vd, vs, vb}, {phin, phip, init})` 비선형 포아송(뉴턴, 노드마다 로그 감쇠). φn, φp는 스칼라/노드 배열(생략 시 소스·드레인 쪽 접촉 전압, φp = vb). 모든 바이어스 0(또는 vg만)이면 평형 해. 반환 sol(전류 0).
  - `TC.mos2d(dev, {vg, vd, vs, vb}, {init, mobility: "const"|"doping"|"surface"|"field"|"full"(기본), holes, method: "newton"|"gummel", tol (V, 1e-5), maxIter, maxStep (V, 0.3), dvMax, onIter})` 정상 상태 드리프트-확산. init.bias에서 목표까지 maxStep 간격으로 걷고 실패하면 반으로(자동 연속법). 반환 sol `{psi, n, p, phin, phip, Ex, Ey, Emag (V/cm), Jnx, Jny, Jpx, Jpy (A/cm²), Id, Is, Ib (A/µm), muH, muV, iters, history: [{iter, dPsi, dN, res, damp}], converged, bias}`.
  - 결합 뉴턴(ψ, n[, p]): 띠 LU(`TC.bandLU`, 피벗 없음, 작은 쪽 차원으로 번호를 매겨 띠 폭 = 2·ny). 이동도는 변마다: CT 도핑 → Lombardi 표면(x 방향 변, 1/μ += D/μac + D/μsr, D = e^{−y/10 nm}) → Canali 속도 포화(구동력 |∇φn|). 속도 포화 미분은 직전 |Δψ| < 10 mV일 때만 야코비안에 넣는다(멀면 피카르). 그래서 해 근처에서는 2차 수렴한다.
  - `TC.mosSolver(dev, bias, opt)` 단계형: `.step()` → `{iter, dPsi, dN, res, damp}`, `.done`, `.converged`, `.failed`, `.history`, `.run()`, `.solution()`. init에서 한 번에 뛴다(5장: `dvMax: 100`으로 감쇠를 끄고 평형 → Vg = Vd = 1 V로 뛰면 수렴하지 못하고 진동한다. 기본 감쇠(0.5 V)로는 19회 만에 수렴한다). `method: "gummel"`: 포아송(φ 고정) → 연속 방정식(ψ 고정)을 번갈아 푼다(같은 해, 반복은 더 많다).
  - `TC.sweep2d(dev, {vg: [...], vd} | {vd: [...], vg}, opt)` 생성기: `.next()` → `{done, value: {vg, vd, id, is, ib, iters, converged, sol?}}`(opt.keep이면 점마다 sol), `.run()`, `.points`, `.last`. 앞의 두 해로 ψ, ln n을 외삽해 예측값으로 쓴다(점당 약 4회). `TC.idvg(dev, {vd, vg: [...]}, opt)`, `TC.idvd(dev, {vg, vd: [...]}, opt)` → `{vg, vd, id, points, last}`.
- 추출·후처리
  - `TC.extractVt(vg, id, {method: "cc"|"gm", icc, L, vd})`: cc는 Id = icc(A/µm)인 Vg(로그 보간), icc 기본 1e-7·W/L A → 1e-7·1000/L[nm] A/µm(L = 45에서 2.22 µA/µm). gm은 최대 gm 외삽(vd를 주면 − vd/2). `TC.ss(vg, id, {imin 1e-13, imax 1e-6})` 최소 mV/dec. `TC.dibl(vtLin, vtSat, 0.05, 1)` mV/V(또는 `{vt, vd}`). `TC.gm(vg, id)`.
  - `TC.cutline(field, dev, {x} | {y})` → `{s, v}`. `TC.surfaceField(dev, sol, y = 0.5)` → `{s, v, max, xAt}`(표면 가로 전계).
  - `TC.impact2d(dev, sol, {relax: 50})` → `{G (cm⁻³s⁻¹), Eeff, Isub (A/µm), Gmax, at}`. G = αn(Eeff)·|Jn|/q(TC.alphaII), 가열 전계 E·Ĵn을 전자 진행 방향으로 에너지 이완 길이 relax(nm)만큼 지연한다(비국소 보정). relax: 0이면 국소 전계 모델이고, TN-45에서 Isub/Id ≈ 9%로 과대해진다. 해에 되먹이지 않는다.
- 압축 모델·변동성
  - `TC.mosCompactParams(p, {cal})` → `{leff, naEff, wdep, lambda, tinv, cinv, vtLong, vt0, dibl, n, mu, vx0, rs, ...}`. 물리: Na_eff(Leff × Wdep 상자의 거듭제곱 평균, 할로를 반영)로 Vt,long = VFB + 2φF + Qdep/Cox, 단채널 ΔVt ∝ (Vbi − 2φF)·e^{−Leff/2λ}, DIBL ∝ e^{−Leff/2λ'}, λ = √(εsi/εox·tox·Wdep). Leff는 도핑에서 직접 구하므로 `p.dopingFn`(공정 결과)도 받는다. 보정 상수 `TC.COMPACT_CAL`(2D TN-45 Lg 30~200 nm에 맞춤).
  - `TC.mosCompact(p | params, vg, vd)` → Id(A/µm). 가상 소스형 전하·속도 + Rs. 매개변수를 미리 구해 두면 호출당 약 2 µs.
  - `TC.pelgrom(p | {na, wdep, tinv}, W, L)` → `{sigma (V), avt (mV·µm), ...}`, σVt = (q·tinv/εox)·√(Na·Wdep/(3WL)). TN-45: Avt ≈ 1.2 mV·µm, W = L = 45 nm에서 σ ≈ 26 mV.
  - `TC.rdfSample(dev, seed, {W (nm, 기본 Lg), region})` → 새 dev(채널 주변 노드의 도너·억셉터 개수를 제어 체적 × W에서 푸아송 추출). 2D라 도펀트 하나가 폭 W에 번진 전하가 된다. `TC.mos2d`에 그대로 넣는다.
- 그리기(브라우저)
  - `TC.drawDevice2d(ctx, box, dev, sol, {field: "psi"|"phin"|"n"|"p"|"Emag"|"Ex"|"Ey"|"J"|"G"|"doping", data, map, lo, hi, log, decades, label, view {x0,x1,y0,y1}, struct (기본 true), mesh, junction (점선, 기본 true), contours: [...], arrows (전자 흐름 화살표: true | 가로 개수), colorbar: {x,y,w,h}, res})` → `{X, Y, toNm(px, py), view, lo, hi, map, log, label}`. 캐리어·전계·도핑은 실리콘만, ψ는 산화막·poly까지 칠한다. 컬러바는 단위가 붙은 라벨로 자동으로 그린다. doping은 sol 없이 `null`.

TN-45 검증값 (normal 격자, 300 K, mobility "full", 전자만, Vt는 cc 1e-7·W/L = 2.22 µA/µm. 계산 과정을 재현할 수 있다)

| 항목 | 값 |
|---|---|
| 구조 | Lg 45 nm, EOT 1.2 nm(SiO₂), n⁺ poly 2e20(공핍 포함), 스페이서 25 nm, 계산 영역 155 × 157 nm |
| 채널 중앙 Na(깊이 0 / 5 / 10 / 20 / 30 / 80 nm) | 1.8e18 / 5.0e18 / 7.9e18 / 3.0e18 / 6.3e17 / 1.3e18 cm⁻³ |
| 접합 | 표면 금속학적 접합 x = ±11.0 nm → Leff ≈ 22 nm, 확장부 접합(게이트 끝 + 2 nm) ≈ 39 nm(완만), S/D 약 74 nm |
| Vt,lin(Vd 0.05) / Vt,sat(Vd 1.0) | 0.356 V / 0.259 V (gm 외삽 Vt,lin 0.390 V) |
| SS (sat / lin) | 79 / 84 mV/dec |
| DIBL | 101 mV/V |
| Ion (Vg = Vd = 1.0 V) | 0.715 mA/µm (Vd 0.05 V: 0.159 mA/µm, 최대 gm 1.43 mS/µm) |
| Ioff (Vg 0, Vd 1.0 V) | 1.5 nA/µm |
| Id-Vd (Vg 1.0 V, Vd 0.2/0.4/0.6/0.8/1.0/1.2) | 0.44 / 0.56 / 0.62 / 0.67 / 0.72 / 0.75 mA/µm |
| 이동도 모델별 Ion(ch10) | const 25.5, doping 2.49, surface 1.76, field 0.83, full 0.715 mA/µm |
| 최대 가로 전계(표면 0.5 nm, Vd 1.0 V) | Vg 1.0 V: 8.4e5 V/cm(x = 13.5 nm, 드레인 접합 근처), Vg 0: 1.15e6 V/cm. 실리콘 최대 |E|(수직 포함) 1.6e6 V/cm |
| 기판 전류(relax 50 nm) | Vg = Vd = 1.0 V: Isub 5.1e-7 A/µm(Isub/Id 7e-4), Vg 0.6 V·Vd 1.2 V: 5.7e-7 A/µm. 국소 모델이면 Isub/Id 9% |
| 반전층(Vg 1 V, 중앙) | 표면 n 2.8e20, 0.4 nm 2.7e19, 0.9 nm 2.6e18 cm⁻³(고전적, 양자 보정 없음) |
| 게이트 길이 Lg 30/35/40/45/50/60/80/120/200 nm: Vt,sat | 붕괴 / 0.04 / 0.18 / 0.26 / 0.30 / 0.32 / 0.31 / 0.29 / 0.27 V |
| 같은 순서 Vt,lin | 0.06 / 0.23 / 0.32 / 0.36 / 0.36 / 0.35 / 0.33 / 0.31 / 0.30 V |
| 같은 순서 DIBL, SS(sat) | — , 193, 147, 101, 69, 38, 27, 25, 24 mV/V / —, 164, 86, 79, 80, 80, 79, 79, 78 mV/dec |
| 같은 순서 Ion, Ioff | 1.61, 1.13, 0.88, 0.72, 0.62, 0.53, 0.46, 0.38, 0.27 mA/µm / 93 µA, 1.1 µA, 23 nA, 1.5 nA, 0.42, 0.21, 0.21, 0.21, 0.19 nA/µm |
| 할로 효과 | Lg 60 nm 근처에서 Vt 최대(역단채널 효과), 45 nm 아래에서 급락. Lg 20·25 nm는 문턱이 사라져도 수렴한다(Lg 20 nm는 Vd 1.2 V, Vg −0.2~1.2 V에서도 수렴) |
| 격자 수렴(coarse / normal / fine) | Vt,lin 0.331 / 0.356 / 0.369 V, Vt,sat 0.231 / 0.259 / 0.271 V, SS 80 / 79 / 79, Ion 0.79 / 0.72 / 0.67 mA/µm, Ioff 4.2 / 1.5 / 1.1 nA/µm |
| 압축 모델 대 2D(Lg 45) | Vt,lin 0.358 대 0.356, Vt,sat 0.246 대 0.259 V, SS 79 대 79, Ion 0.700 대 0.715, Ioff 1.9 대 1.5 nA/µm, Id-Vd ±12% 이내. Lg 40~200 nm에서 Vt ±15 mV, Ion ±5% |
| 공정 모사 도핑을 넣으면(`TC.tn45Process()` 기본, `TC.tn45Device({doping: R.dopingFn, total: R.totalFn})`) | Vt,lin 0.340, Vt,sat 0.255 V, SS 80.5, DIBL 90, Ion 0.70 mA/µm, Ioff 약 2 nA/µm(해석식 TN-45와 거의 같다) |
| RDF(W = L = 45 nm, 표본 6개) | σVt,lin ≈ 21 mV(펠그롬 식 26 mV) |

엔진 자체 검증
- 평형: Vd = Vs = 0에서 |Id| ~1e-15 A/µm, 실리콘 전체 |φn| < 3e-12 V, 중성 영역 ψ = Vt·asinh(N/2ni)와 0.1 mV 이내.
- 전류 연속: |Id + Is + Ib|/Id ≈ 1e-11(켜짐) ~ 1e-6(꺼짐). holes: true여도 Id가 같다(nMOS).
- 장채널(Lg 1 µm, 균일 Na 3e18, 금속 게이트 = n⁺ poly 일함수): 문턱 아래 ψs(Vg)가 1D 해석식과 1.2 mV 이내. 고전 Vt 0.240 V 대 2D cc Vt 0.268, gm Vt 0.301 V. SS 71.9 대 60·(1 + Cdep/Cox) = 71.4 mV/dec.
- 거멜과 뉴턴: 같은 Id(상대 1e-4). 거멜 14회, 뉴턴은 해 근처에서 2차 수렴.
- 시간(노트북 CPU, Node 22, 단일 스레드): normal은 뉴턴 1회 약 28 ms, 평형 65 ms, 평형에서 Vg = Vd = 1 V 0.8 s(27회), 웜 스타트 0.05 V 한 점 약 150 ms(6회), Id-Vg 25점 2.9 s(포화)·2.1 s(선형). coarse는 웜 한 점 25 ms, Id-Vg 0.5 s. fine은 웜 한 점 1.3 s, Id-Vg 약 28 s. 무거운 계산은 `TC.sweep2d`로 프레임마다 한 점씩 돌린다.

주의
- 표준 모델(Canali vsat 1.07e7 cm/s)의 드리프트-확산 Ion은 약 0.7 mA/µm다. 속도 과도·응력 효과가 없어서 실제 45 nm 소자(약 1 mA/µm 이상)보다 낮다(14장의 주제). 보정 장에서는 `muScale`, `vsatScale`로 맞춘다(muScale 1.3이면 Ion 약 +11%).
- 양자 보정이 없으므로 같은 Vt를 얻으려고 채널 도핑이 실제보다 높다. 반전층이 0.1 nm 규모로 얇아 강반전에서 ψs는 격자에 민감하다(전하는 정확).
- normal 격자의 Vt는 fine보다 약 12 mV 낮고 Ion은 약 6% 높다. 장에서 인용하는 숫자는 normal 기준이다.
- SS는 Vg 간격 0.05 V 스윕의 최소값이다. 문턱이 무너진 짧은 채널(Lg ≤ 35)에서는 의미가 없다.

## 점검
- `python tools/check.py <slug>` (playwright 필요). 넓은 화면·라이트와 360px·다크로 열어 콘솔 오류, 가로 넘침, 조작 중 예외를 보고한다. `--shots 폴더`로 스크린샷을 남겨 눈으로도 본다.
- 브라우저 콘솔에 오류가 없어야 한다. 다크·라이트 테마 모두 확인.
- 캔버스 글자는 `TB.font()`로, 색은 `TB.palette()`로. 고정 색은 공간상 영상(`TC.put`)과 SEM 화면(`.sim-view.scope`)처럼 실제로 어두운 경우에만.
