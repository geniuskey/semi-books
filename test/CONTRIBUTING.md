# TestBook 챕터 작성 가이드

빌드 과정 없는 정적 사이트다. `index.html` + `chapters/<slug>.html` + 공통 `css/style.css`, `js/common.js`, `js/wafer.js`.
로컬 실행: `python3 -m http.server 8000` → http://localhost:8000 (file://로 열어도 동작하게 classic script만 쓴다. ES module 금지.)

## 기여물의 라이선스
실행 코드는 MIT, 본문·그림·문제·해설 등 교육 콘텐츠는 CC BY 4.0. 구분은 [라이선스 안내](LICENSE.md)를 따른다.

## 원칙
- **한국어**, 대상은 공대 학부생(디지털 회로·반도체 소자 기초가 있다고 가정). 영어 원어는 `<span class="en">(Fault coverage)</span>`처럼 병기.
- 이 책은 **패키징과 수율 사이를 잇는 책**이다. 공정이 만든 결함을 전기 신호로 찾아내고(테스트), 그 결과가 빈 맵이 되어 수율 분석([YieldBook](https://semi.euiyun.com/yield/))으로 돌아가며, 걸러진 좋은 다이만 패키지([PackagingBook](https://semi.euiyun.com/packaging/))로 간다. 장비(ATE) → 설계(DFT·BIST) → 측정과 한계 → 스크리닝(번인·빈) → 비용과 흐름 순서로 진행한다.
- 각 장은 "이 테스트는 어떤 결함을 잡고, 무엇을 놓치며, 얼마의 시간·돈이 드는가"를 분명히 한다. 테스트는 언제나 **품질(DPPM) · 수율(과잉 불량) · 비용(테스트 시간)** 의 삼각 맞바꿈이다.
- 개념 → 직관 그림(SVG) → 수식(KaTeX) → 시뮬레이터 → 실제 수치 → TB-7 테스트 계획 → 요약/퀴즈 순서.
- 수치는 교과서·공개 자료의 대표값(Bushnell & Agrawal *Essentials of Electronic Testing*, Wang·Wu·Wen *VLSI Test Principles and Architectures*, Burns & Roberts *An Introduction to Mixed-Signal IC Test and Measurement*, IEEE 1149.1/1500/1687/1838, JEDEC JESD22·JESD47, AEC-Q100/Q001 등). 확실하지 않은 수치는 '약', '~'를 붙인다. 특정 장비 모델명·회사 내부 수치는 쓰지 않는다.
- 외부 라이브러리는 KaTeX, three.js r147만. 이미지 대신 인라인 SVG/canvas.
- 색은 CSS 변수(`var(--accent)`)나 `TB.palette()`를 쓴다. 웨이퍼 맵의 합격·불량·빈 색은 `WM`이 정한다. 라이트/다크 둘 다 읽혀야 한다.
- 모바일(폭 360px)에서 가로 스크롤 금지. SVG는 `viewBox`만 주고 width/height 생략.
- 문체는 평서문 "~다". 이모지 금지. 다른 장을 언급할 때는 `<a href="scan.html">6장</a>`처럼 링크한다.
- 시각 정보와 상호작용을 최대한 많이: 장마다 **그림(SVG) 4개 이상, 시뮬레이터 4개 이상**. 시뮬레이터는 슬라이더만 있는 그래프보다 "직접 눌러 보고 결과가 바뀌는" 것(폴트 주입, 상태 기계 클릭, 애니메이션 단계 실행, 게임처럼 목표 맞추기)을 우선한다.

## head 블록
소스에는 `<title>`과 `<meta name="description">`(한 줄)만 쓴다. canonical, `theme-color`, Open Graph, Twitter 카드, JSON-LD는 루트의 `tools/build.mjs`가 `js/common.js`의 `CHAPTERS`와 `book.json`의 `meta`로 배포물에 생성하고, 수식도 빌드가 KaTeX로 미리 렌더링한다. 소스에 이 태그들이나 KaTeX 태그를 넣으면 `npm test`가 실패한다. 빌드는 정적 HTML의 수식만 렌더링하므로 스크립트가 `\(`·`\[`·`$$`가 든 문자열을 DOM에 넣지 않는다. 소스 파일을 바로 열면 `common.js`가 CDN에서 KaTeX를 불러와 미리보기를 렌더링한다. 사이트맵은 루트에서 `npm run sitemap`으로 갱신한다.
챕터를 추가하면 `CHAPTERS`, `chapters/glossary.html`의 용어 목록에도 등록한다.

## 페이지 골격
```html
<!doctype html>
<!-- Copyright (c) 2026 geniuskey and TestBook contributors.
     Executable code: MIT (see ../LICENSE-MIT).
     Text, illustrations, questions and explanations: CC-BY-4.0 (see ../LICENSE.md). -->
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>장 제목 · TestBook</title>
<meta name="description" content="한 문장 설명(검색 결과에 보일 120자 안팎)">
<link rel="icon" type="image/svg+xml" href="../favicon.svg">
<link rel="stylesheet" href="../css/style.css">
<script src="../js/common.js"></script>
<script src="../js/wafer.js"></script>
<style> /* 이 장에서만 쓰는 스타일(최소한으로) */ </style>
</head>
<body data-chapter="slug">
<main class="chapter">
  <header class="chapter-hero">
    <div class="eyebrow">Chapter NN</div><h1>제목</h1><p class="lead">…</p>
    <ul class="objectives"><li>…</li></ul>
  </header>
  <section id="영문-id"><h2>절 제목</h2> … </section>
  …
  <section id="plan" data-nonum><h2>TB-7 테스트 계획</h2> <div class="casefile">…</div></section>   <!-- 또는 마지막 절 안에 casefile만 -->
  <section class="keypoints" id="summary"><h2>핵심 정리</h2><ol><li>…</li></ol></section>
  <section class="quiz-sec" id="quiz"><h2>확인 퀴즈</h2><div class="quiz"> … </div></section>
</main>
<script>(function () { "use strict"; /* 시뮬레이터 */ })();</script>
</body>
</html>
```
상단바·챕터 목록·테스트 흐름 단계 띠·오른쪽 목차·h2 번호·이전/다음·푸터·퀴즈 동작는 `common.js`가 자동으로 만든다. 직접 넣지 않는다.

## 컴포넌트
- 그림: `<figure class="diagram"><svg viewBox="0 0 720 300" role="img" aria-label="…">…</svg><figcaption><b>그림 제목.</b> 설명</figcaption></figure>`. SVG 안에서는 `.lbl`, `.lbl-dim`, `.lbl-b`, `.lbl-acc`, `.lbl-acc2`, `.lbl-bad`, `.t-mono`, `.s-line`, `.s-axis`, `.s-acc`, `.s-acc2`, `.s-dash`, `.s-bad`, `.f-surface`, `.f-elev`, `.f-acc`, `.f-acc2`, `.f-acc-soft`, `.f-acc2-soft`, `.f-ok-soft`, `.f-warn-soft`, `.f-bad-soft`, `.f-bad`, `.beam`, 재질 `.m-si .m-ox .m-nit .m-poly .m-w .m-cu .m-al .m-bar .m-lowk .m-au .m-n .m-sil` 클래스를 쓴다. 색을 직접 적지 않는다(다크 모드). 화살표 머리는 `<marker>`에 `fill="context-stroke"`. SVG `<defs>`의 id는 페이지 안에서 겹치지 않게 장 접두사를 붙인다(예: `ate-arr`).
- 시뮬레이터:
```html
<div class="sim" id="sim-x">
  <div class="sim-head"><span class="sim-tag">SIMULATOR</span><h3>제목</h3></div>   <!-- 3D는 <span class="sim-tag three">3D</span>, 게임은 GAME -->
  <div class="sim-body side">
    <div class="sim-view"><canvas id="x-cv"></canvas></div>   <!-- 오실로스코프·로직 분석기 화면처럼 어두운 장비 화면이면 class="sim-view scope" -->
    <div class="sim-controls">
      <label class="ctrl"><span>이름 <output id="x-a-out"></output></span><input type="range" id="x-a" min="0" max="10" step="0.1" value="3"></label>
      <div class="ctrl"><span>모드</span><div class="seg" id="x-mode"><button data-value="a" class="on">A</button><button data-value="b">B</button></div></div>
      <label class="check"><input type="checkbox" id="x-c"> 옵션</label>
      <div class="btn-row"><button class="btn primary" id="x-go">실행</button><button class="btn" id="x-re">다시</button></div>
    </div>
  </div>
  <div class="sim-readout"><div class="stat"><span class="k">이름</span><span class="v" id="x-o-1">—</span></div></div>
  <div class="sim-note">해볼 것: ① … ② … ③ … (모델의 가정)</div>
</div>
```
  `sim-body side`는 넓은 화면에서 컨트롤을 오른쪽에 둔다. 컨트롤이 많거나 캔버스가 넓어야 하면 `side`를 뺀다.
- 수식: `<div class="formula">$$…$$<div class="where">기호 설명</div></div>`, 문장 속은 `\(…\)`.
- 강조 상자: `.callout`, `.callout.tip`, `.callout.warn`, `.callout.deep`(첫 `<strong>`이 제목).
- 표: `<div class="table-wrap"><table>…</table></div>`. 숫자 칸은 `class="num"`.
- 용어: `<span class="term">고착 폴트</span><span class="en">(Stuck-at fault)</span>`.
- 범례: `<div class="legend"><span><i style="background:var(--bad)"></i>불량</span></div>`, `.pill`, `.ok-t`.
- 퀴즈: `<div class="quiz-q"><p>문제</p><div class="opts"><button class="opt">…</button><button class="opt" data-correct>정답</button></div><div class="quiz-exp">해설</div></div>` (장마다 4문항, 정답 위치를 섞는다).
- TB-7 테스트 계획(장마다 하나, 핵심 정리 앞):
```html
<div class="casefile">
  <div class="tag"><b>TB-7 TEST PLAN</b><span>테스트 계획서 · 6장</span></div>
  <h4>스캔 체인 5,000개, 압축 100배</h4>
  <p>…이 장의 방법을 TB-7에 적용해 내린 결정과 근거 숫자…</p>
  <div class="clue"><div><b>이 장의 결정</b>…</div><div><b>근거 숫자</b>…</div><div><b>남은 문제</b>…(다음 장으로 넘기는 질문)</div></div>
</div>
```

## JS 헬퍼 (`js/common.js`, 전역 `TB`)
- `TB.canvas(el, (ctx,w,h)=>{}, {aspect:0.5, height, minHeight, maxHeight})` → `{ctx,w,h,redraw()}` HiDPI, 리사이즈/테마 시 자동 redraw(배경 `--canvas-bg`로 칠해 줌, `.sim-view.scope` 안이면 검은 배경).
- `TB.chart(ctx, box|null, {x:[a,b], y:[a,b], logX, logY, xLabel, yLabel, series:[{data:[[x,y]],color,width,dash,fill}], vlines, hlines, points, bands, xFmt, yFmt, xTicks, yTicks})` → `{X,Y,box}`.
- `TB.loop(el, (dt,t)=>{})` 화면에 보일 때만 도는 rAF 루프 `{start,stop,toggle,running}`.
- `TB.range(id, fmt, onInput)` → getter `get()`, `get.set(v)`. `TB.seg(id, onChange)` → getter. `TB.stat(id, html)`.
- `TB.palette()` 테마 색(`bg,text,dim,faint,grid,axis,border,surface,accent,accent2,ok,warn,bad,red,green,blue,series[]`), `TB.color('accent')`, `TB.onTheme(cb)`, `TB.isDark()`, `TB.font(px, mono, weight)`.
- `TB.randn()`, `TB.poisson(λ)`, `TB.rng(seed)`(재현 가능한 난수), `TB.erf/erfc`, `TB.fmt(x, digits)`, `TB.si(x,'s')`, `TB.clamp/lerp/map`, `TB.debounce`, `TB.kB`(eV/K), `TB.C = {h,c,q,k,…}`.
- `TB.three(el, {...})` three.js 씬 헬퍼(필요할 때만 three.js를 불러온다).
- 웨이퍼 맵(`js/wafer.js`, 전역 `WM`): `WM.wafer({dieW, dieH, shot:[c,r], edge})`, `WM.map(W, {d0, seed, layers:[{p:"edge"|"center"|"donut"|"cluster"|"scratch"|"repeater"|…, s, bin}]})` → `{fail, bin, yield}`, `WM.draw(ctx, W, box, {map, bins:true, values, fill:(d,k)=>색, sel, hi, shots})` → `{at(px,py)}`, `WM.pos(canvas, e)`, `WM.BINS`(1 합격, 2 연속성, 3 누설, 4 기능·스캔, 5 속도, 6 메모리, 7 파라메트릭, 8 전원 단락), `WM.binColor(id)`, `WM.passColor()`, `WM.Y.poisson(λ)` 등. 자세한 설명은 `js/wafer.js` 머리 주석.

## 이어지는 예제: 제품 TB-7
모든 장은 같은 가상의 제품 하나의 **테스트 계획서**를 한 장씩 채워 간다. 각 장 끝(핵심 정리 앞)에 `.casefile` 하나를 넣고 아래 표에서 자기 장에 해당하는 결정만 다룬다. 숫자는 아래 값을 그대로 쓴다(필요한 파생값은 이 값에서 계산).

- **제품**: 가상의 모바일 SoC TB-7. 5 nm급 공정, 다이 9 × 9 mm(0.81 cm²), 300 mm 웨이퍼, 가장자리 제외 3 mm, 온전한 다이 780개(`WM.wafer({dieW: 9, dieH: 9, shot: [3, 3]})`). 실제 회사·제품과 무관하다.
- **내용물**: 로직 약 1.5억 게이트, 스캔 플립플롭 1,000만 개, 내장 SRAM 24 MB(메모리 인스턴스 약 2,000개, 여분 행·열 있음), CPU 클러스터 최고 3.2 GHz, LPDDR5X 메모리 인터페이스, 16 Gb/s 고속 직렬 링크(SerDes) 4레인, 12비트 SAR ADC(온도·전압 감시), PLL 4개, 온칩 온도 센서 12개.
- **전원**: 코어 공칭 0.75 V(사용 범위 0.70~0.80 V), I/O 1.8 V. 대기 누설 전류 상온 약 30 mA(코어 전체).
- **패키지**: 플립칩 CSP 12 × 12 mm, 볼 900개. 웨이퍼 테스트 프로브 접촉 약 2,800개(패드·범프).
- **수율**: 결함 밀도 D₀ ≈ 0.2개/cm² → 웨이퍼 테스트 수율 약 85%(`WM.map(W, {d0: 0.2, seed})`), 메모리 리페어 전 약 82%. 파이널 테스트 수율 약 97%.
- **품질 목표**: 고객 출하 불량 50 DPPM 이하. 연간 출하 1,000만 개.
- **테스트 셀**: 웨이퍼 테스트 4 사이트 병렬(터치다운당 약 4 s), 파이널 테스트 8 사이트 핸들러(삽입당 약 8 s). 테스트 셀(ATE + 프로버/핸들러) 시간당 원가 약 $250(감가상각·인건비·소모품 포함, 약 $0.07/s). SLT는 저가 랙(슬롯당 시간당 약 $2), 개당 약 120 s.
- **스캔**: 내부 스캔 체인 5,000개 × 체인당 2,000 FF, 압축 100배(스캔 채널 50개), 시프트 100 MHz. 고착 패턴 15,000개 + 천이 패턴 25,000개 → 스캔 시간 약 0.8 s.
- **속도 등급**: Fmax 분포 평균 3.0 GHz, 표준편차 0.18 GHz. 빈 A 3.2 GHz, 빈 B 2.8 GHz, 빈 C 2.4 GHz, 그 아래는 불량.
- **번인/신뢰성 조건**: 사용 조건 55 °C·0.75 V, 번인 125 °C·0.90 V. 활성화 에너지 Ea = 0.7 eV(온도 가속 약 78배), 전압 가속 계수 γ ≈ 10 /V(약 4.5배) → 전체 약 350배.
- **현장 불량 비용(10배 법칙)**: 웨이퍼 테스트에서 잡으면 다이 원가 약 $3, 파이널 테스트에서 잡으면 약 $5(패키지 포함), 고객의 보드에서 발견되면 약 $50, 완제품(스마트폰) 현장 고장이면 약 $500.

| 장 | 이 장에서 결정하는 것 |
|---|---|
| 01 개요 | 계획서 시작. 목표 50 DPPM과 수율 85%를 윌리엄스–브라운 식에 넣으면 필요한 결함 커버리지는 \(1-\ln(1-50\times10^{-6})/\ln 0.85 \approx 99.97\%\). 한 가지 폴트 모델로는 불가능하므로 여러 테스트를 겹쳐야 한다는 결론. 테스트 흐름 초안: 웨이퍼 테스트 → 조립 → 파이널 테스트 → 시스템 레벨 테스트(SLT). |
| 02 ATE | 장비 사양. 사이트당 디지털 채널 약 256개(스캔 채널 50쌍 + 기능 I/O + JTAG + 클록), 데이터 레이트 최대 1.6 Gb/s, 엣지 배치 정확도 ±100 ps, 사이트당 DPS(전원) 채널 8개(코어 전류 최대 약 10 A), 패턴 메모리 사이트당 약 1 Gvector 이상. |
| 03 인터페이스 | 웨이퍼 테스트는 수직형(MEMS) 프로브 카드, 2,800핀 × 4사이트, 오버드라이브 약 75 µm, 접촉 저항 < 1 Ω 관리, 터치다운 수 약 200회/웨이퍼(780 ÷ 4). 파이널 테스트는 8사이트 핸들러, 인덱스 시간 약 0.4 s. 클리닝 주기를 접촉 저항 추이로 정한다. |
| 04 DC | 연속성(오픈·쇼트) → 누설 → 전원 전류 순서. 5 nm 누설이 커서 절대 IDDQ 한계는 판별력이 없고, 벡터 간 차이 ΔIDDQ와 온도 보정을 쓴다. DC 블록 전체 약 50 ms. |
| 05 폴트 | 고착 폴트 커버리지 99.2%, 천이 폴트 92%, 셀 인식(cell-aware) 패턴을 더해 결함 커버리지를 끌어올린다. 남은 폴트 중 테스트 불가 폴트를 분리해 실효 커버리지를 계산한다. |
| 06 스캔 | 체인 5,000개, 압축 100배, 스캔 채널 50개, 시프트 100 MHz, 패턴 4만 개 → 약 0.8 s. 시프트 전력 때문에 시프트 주파수를 더 올리지 못한다. 실속도는 LOC로 2.8 GHz 경로를 검사. |
| 07 BIST | SRAM 24 MB는 MBIST(March C−, 10N)로 웨이퍼 테스트에서 검사·리페어. 여분 행·열로 리페어해 웨이퍼 수율 82% → 85%(약 +3%p). 로직 BIST는 현장 자가 진단(전원 켤 때)에 쓴다. |
| 08 JTAG | IEEE 1149.1 TAP 하나로 IEEE 1687(IJTAG) 네트워크에 연결: MBIST 제어기 40개, PLL 4개, 온도 센서 12개, ADC. 보드 연결 테스트용 경계 스캔 셀은 일반 I/O에만. |
| 09 혼성 신호 | 12비트 ADC는 사인파 히스토그램 테스트로 INL·DNL을 잰다(코드당 평균 약 32개 샘플 → 약 13만 샘플). SerDes는 내부 루프백 + PRBS로 BER 10⁻¹² 확인(신뢰도 95%에 약 3×10¹² 비트 → 16 Gb/s에서 약 190 s라 불가능 → 지터 주입·아이 마진 측정으로 대체). |
| 10 한계 | 셔무로 Vmin을 찾는다(2.8 GHz에서 약 0.66 V). 측정 반복성 σ ≈ 5 mV, 가드밴드 15 mV(3σ). 그 대가로 과잉 불량 약 0.6%. 게이지 R&R은 공차의 10% 이하. |
| 11 번인 | 모바일 제품이라 전수 번인은 비용이 너무 크다. 125 °C·0.90 V 가속 약 350배로 번인 2시간 ≈ 사용 약 700시간(약 1개월)의 초기 고장을 걷어 낸다. 양산 안정 후에는 고전압 스트레스 테스트(HVST)와 표본 번인으로 대체. |
| 12 빈 | 하드 빈 8개(WM.BINS)와 소프트 빈. 속도 등급 빈 A(≥3.2 GHz) 약 13%, 빈 B(2.8~3.2) 약 74%, 빈 C(2.4~2.8) 약 13%(평균 3.0, σ 0.18 GHz 정규분포로 계산). IDDQ·Vmin에 DPAT(±6σ 견고 통계), 웨이퍼 맵에 GDBN을 적용해 잠재 불량 후보를 걸러 낸다. |
| 13 비용 | 개당 테스트 비용 목표 약 $0.25: 웨이퍼 테스트 터치다운당 4 s(4사이트) ≈ 양품 다이당 $0.08, 파이널 삽입당 8 s(8사이트) ≈ $0.07, SLT 120 s ≈ $0.07, 나머지는 프로브 카드·소켓·로드보드 상각. 멀티 사이트 효율 약 90%. 유출 비용과 커버리지의 최적점을 계산. |
| 14 흐름 | 최종 흐름: 웨이퍼 테스트(DC·스캔·MBIST·리페어) → 조립 → 파이널(실속도·혼성 신호·속도 등급) → SLT(OS 부팅·실사용 작업량, 초기엔 전수, 안정 후 표본) → 출하. STDF 데이터를 YieldBook의 수율 분석으로 되돌린다. |
| 15 실험실 | 위 결정을 독자가 직접 바꿔 보는 샌드박스. 50 DPPM·수율·개당 비용 목표를 동시에 맞추기. |
