# ChipIndustryBook 챕터 작성 가이드

빌드 과정 없는 정적 사이트다. `index.html` + `sims.html`(시뮬레이터 갤러리) + `chapters/<slug>.html` + 공통 `css/style.css`, `js/common.js`(전역 `CB`), `js/industry.js`(전역 `IND`).
로컬 실행: `python -m http.server 8000` → http://localhost:8000 (file://로 열어도 동작하게 classic script만 쓴다. ES module 금지.)

## 기여물의 라이선스
실행 코드는 MIT, 본문·그림·문제·해설·데이터 표 등 교육 콘텐츠는 CC BY 4.0. 구분은 [라이선스 안내](LICENSE.md)를 따른다.

## 이 책이 무엇인가
반도체 시리즈(ProcessBook, LithoBook, MemoryBook, PackagingBook, YieldBook, FailureBook, SensorBook, TCADBook)의 마지막 권이다. 앞 책들이 칩을 **어떻게 만드는가**를 다뤘다면, 이 책은 칩을 **누가, 어디서, 왜, 얼마에 만드는가**를 다룬다. 설계 도구·IP → 칩 설계 → 장비·소재 → 웨이퍼 제조 → 패키징·테스트 → 시장으로 이어지는 가치사슬 전체의 지도다.

대상은 공대생·직장인·투자자·정책 관심자. 공정 지식은 가정하지 않는다. 공정 세부가 필요하면 시리즈 책으로 링크를 건다.

## 최우선 원칙: 시뮬레이터가 주인공이다
**글을 읽지 않고 시뮬레이터만 쓰는 사람이 많다.** 상단바의 "시뮬레이터만" 버튼을 누르면 글·퀴즈·요약이 모두 숨고 h2 제목과 `.sim`만 남는다. `sims.html` 갤러리에서 시뮬레이터 하나로 바로 들어오는 사람도 많다. 그러므로:
- **모든 시뮬레이터는 혼자서 이해되어야 한다.** 앞 문단을 읽지 않아도 무엇을 보는지 알 수 있게, 캔버스 안에 축 이름·단위·범례·핵심 숫자를 직접 그린다. `.sim-note`는 "해볼 것: ① … ② … ③ …"과 모델의 가정을 담는다(이것만 읽어도 쓸 수 있게).
- 각 `.sim`에는 `id`와 `data-desc="갤러리 카드에 들어갈 한 문장"`이 반드시 있다. 장의 대표 시뮬레이터(장 끝의 큰 종합 시뮬레이터 등)에는 `data-big`을 붙인다.
- 장마다 시뮬레이터 **6~9개**. 정적 SVG 그림은 장마다 1~3개 이하. 표는 필요할 때만.
- 시각적 밀도를 높인다: 지도, 트리맵, 생키(흐름) 도표, 버블 차트, 웨이퍼 맵, 타임라인, 애니메이션(`CB.loop`), 호버하면 뜨는 정보 상자(`CB.tip`), 클릭하면 아래 정보 패널(`.info-panel`)이 바뀌는 상호작용을 적극적으로 쓴다. 슬라이더만 있는 시뮬레이터보다 **캔버스를 직접 누르고 끌고 고르는** 시뮬레이터를 우선한다.
- 한 시뮬레이터는 **한 가지 질문**에 답한다. 컨트롤은 1~4개. 큰 종합 시뮬레이터는 장 끝에 하나.
- 값을 끝까지 밀었을 때 **무너지는 모습**이 보여야 한다(적자로 돌아선다, 공급이 끊긴다, 가격이 폭락한다, 칩 원가가 폭증한다). 한계가 배울 점이다.
- 결과는 숫자(`.sim-readout`)로도 함께 보여 준다.
- 글은 짧게. 시뮬레이터 바로 앞에서 "무엇을 움직여 볼지", 바로 뒤에서 "무엇을 봤는지"를 2~4문장으로 말한다. 한 절(section)에 문단 3~6개 정도.

## 글쓰기 원칙
- **한국어**. 회사·용어의 영어 원어는 `<span class="en">(Foundry)</span>`처럼 병기. 회사 이름은 처음 나올 때 `<span class="co"><i class="tw"></i>TSMC</span>`처럼 지역 점을 붙여도 좋다(i의 클래스: us tw kr jp cn eu sea).
- 문체는 평서문 "~다". 이모지 금지. 다른 장은 `<a href="foundry.html">9장</a>`처럼 링크한다. 시리즈 책 링크: ProcessBook https://semi.euiyun.com/process/, LithoBook https://semi.euiyun.com/litho/, MemoryBook https://semi.euiyun.com/memory/, PackagingBook https://semi.euiyun.com/packaging/, YieldBook https://semi.euiyun.com/yield/, FailureBook https://semi.euiyun.com/failure/, SensorBook https://semi.euiyun.com/sensor/, TCADBook https://semi.euiyun.com/tcad/.
- 순서: 질문 → 시뮬레이터 → 해석 → (필요하면) 수식 → 실제 사례·숫자 → 타깃 파일 → 핵심 정리 → 퀴즈.
- **숫자 정책**: 공개 자료(WSTS, SIA·BCG, SEMI, 각 사 연차 보고서·실적 발표, IBS, CSET, TrendForce 등 언론 보도치)의 대표값을 반올림해 쓰고 '약', '~'를 붙인다. 연도를 밝힌다("2024년 매출 약 900억 달러"). 확실하지 않으면 범위로 쓰거나 쓰지 않는다. 회사 내부 정보·루머·주가 전망은 쓰지 않는다. 투자 권유로 읽힐 표현을 피한다. 모든 시뮬레이터 수치는 교육용 모델이라는 점을 `.sim-note`에 밝힌다.
- 같은 숫자는 `IND`에서 읽는다(`IND.COMPANIES`, `IND.MARKET`, `IND.SEGMENTS`, `IND.NODES`, `IND.CHOKEPOINTS`, `IND.AX1` …). 장마다 따로 다른 숫자를 지어내지 않는다. `IND`에 없는 데이터는 그 장의 인라인 스크립트 안에 상수로 두고 출처 성격을 주석에 적는다. **공통 파일(`js/*.js`, `css/style.css`)은 고치지 않는다.** 장 전용 스타일은 그 장 `<head>`의 `<style>`에.
- 실존 회사는 사실 위주로 중립적으로 쓴다. 이어지는 타깃(AX-1, 노바실리콘)은 가상이다.

## head 블록

모든 HTML 페이지에는 아래 Cloudflare Web Analytics 코드를 `<head>`에 한 번 포함한다. SEO 자동 생성 블록 밖에 두며, 공통 Site Token을 유지한다.

각 챕터 `<head>`에는 아래 표식만 두고 `python tools/head.py <slug>`를 실행한다(인자를 주면 그 장만 고친다). 제목·번호는 `js/common.js`의 `CHAPTERS`에서 읽는다.
```html
<!doctype html>
<!-- Copyright (c) 2026 geniuskey and ChipIndustryBook contributors.
     Executable code: MIT (see ../LICENSE-MIT).
     Text, illustrations, questions and explanations: CC-BY-4.0 (see ../LICENSE.md). -->
<html lang="ko">
<head>
<!--head:start {"desc": "한 문장 설명(검색 결과에 보일 120자 안팎)", "libs": ["ind"]}-->
<!--head:end-->
<style> /* 이 장 전용 */ </style>
<!-- Cloudflare Web Analytics -->
<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"3d6151a0abc94ede89285d462527fa80"}'></script>
<!-- End Cloudflare Web Analytics -->
</head>
```
`libs`의 `ind`는 `js/industry.js`, `three`는 three.js r147 + OrbitControls를 불러온다.

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
상단바·챕터 목록·가치사슬 띠·오른쪽 목차·h2 번호·이전/다음·푸터·퀴즈 동작·KaTeX 렌더·"시뮬레이터만" 모드·시뮬레이터 바로가기(#) 링크는 `common.js`가 자동으로 만든다. 직접 넣지 않는다.
"시뮬레이터만" 모드에서는 `section` 바로 아래의 `h2`, `.sim`, `.sim-group`만 보인다. 시뮬레이터를 `figure`나 다른 `div`로 감싸지 않는다(숨겨진다).

## 컴포넌트
- 시뮬레이터:
```html
<div class="sim" id="sim-x" data-desc="갤러리 카드용 한 문장: 무엇을 바꾸면 무엇이 보이는가">
  <div class="sim-head"><span class="sim-tag">SIMULATOR</span><h3>제목(질문형도 좋다)</h3></div>
  <div class="sim-body side">
    <div class="sim-view"><canvas id="x-cv"></canvas></div>
    <div class="sim-controls">
      <label class="ctrl"><span>이름 <output id="x-a-out"></output></span><input type="range" id="x-a" min="0" max="10" step="0.1" value="3"></label>
      <div class="seg" id="x-mode"><button data-value="a" class="on">A</button><button data-value="b">B</button></div>
      <label class="check"><input type="checkbox" id="x-c"> 옵션</label>
      <label class="ctrl"><span>선택</span><select id="x-s"><option value="a">A</option></select></label>
      <div class="btn-row"><button class="btn primary" id="x-go">실행</button><button class="btn" id="x-re">다시</button></div>
    </div>
  </div>
  <div class="info-panel" id="x-info">클릭한 대상의 설명(선택)</div>
  <div class="sim-readout"><div class="stat"><span class="k">이름</span><span class="v" id="x-o-1">—</span></div></div>
  <div class="sim-note">해볼 것: ① … ② … ③ … (모델의 가정과 수치의 성격)</div>
</div>
```
  컨트롤이 없거나 캔버스를 직접 누르는 시뮬레이터는 `.sim-body`에서 `side`를 빼고 `.sim-view` 안에 `<span class="hint">눌러서 고른다</span>`를 둔다. 범례는 `<div class="map-legend"><span><i style="background:var(--rg-tw)"></i>대만</span></div>`(`.sim-body` 다음). 3D면 `<span class="sim-tag three">3D</span>`, `.sim-view.three`.
- 그림: `<figure class="diagram"><svg viewBox="0 0 720 300" role="img" aria-label="…">…</svg><figcaption><b>그림 제목.</b> 설명</figcaption></figure>`. SVG 안에서는 `.lbl .lbl-dim .lbl-b .lbl-acc .lbl-acc2 .lbl-bad .t-mono .s-line .s-axis .s-acc .s-acc2 .s-dash .s-bad .f-surface .f-elev .f-acc .f-acc2 .f-acc-soft .f-acc2-soft .f-ok-soft .f-warn-soft .f-bad-soft .f-bad`, 가치사슬 색 `.seg-ip .seg-design .seg-equip .seg-mat .seg-fab .seg-mem .seg-atp .seg-mkt`, 지역 색 `.rg-us .rg-tw .rg-kr .rg-jp .rg-cn .rg-eu .rg-sea .rg-other` 클래스를 쓴다. 색을 직접 적지 않는다(다크 모드). 화살표 머리는 `<marker>`에 `fill="context-stroke"`. SVG는 `viewBox`만 주고 width/height 생략.
- 수식: `<div class="formula">$$…$$<div class="where">기호 설명</div></div>`, 문장 속은 `\(…\)`.
- 강조 상자: `.callout`, `.callout.tip`, `.callout.warn`, `.callout.deep`(첫 `<strong>`이 제목).
- 표: `<div class="table-wrap"><table>…</table></div>`. 숫자 칸은 `class="num"`.
- 용어: `<span class="term">파운드리</span><span class="en">(Foundry)</span>`. 회사: `<span class="co"><i class="kr"></i>SK하이닉스</span>`.
- 범례: `.legend`, `.pill`, `.ok-t` `.bad-t` `.warn-t`.
- 퀴즈: `<div class="quiz-q"><p>문제</p><div class="opts"><button class="opt">…</button><button class="opt" data-correct>정답</button></div><div class="quiz-exp">해설</div></div>` (장마다 4문항, 정답 위치를 섞는다).
- 타깃 파일:
```html
<div class="casefile">
  <div class="tag"><b>TARGET AX-1</b><span>타깃 파일 · 9장</span></div>
  <h4>웨이퍼 한 장에서 좋은 다이 29개</h4>
  <p>…이 장의 방법을 AX-1에 적용한 결과…</p>
  <div class="clue"><div><b>이 장에서 정한 것</b>…</div><div><b>아직 남은 문제</b>…</div><div><b>다음 단계</b>…</div></div>
</div>
```

## 이어지는 타깃: AX-1
모든 장은 같은 가상의 칩 하나를 가치사슬을 따라 한 걸음씩 진전시킨다. 각 장 끝(핵심 정리 앞)에 `.casefile` 하나를 넣고, **아래 표에서 자기 장에 해당하는 내용만** 다룬다. 뒤 장의 결론을 미리 말하지 않는다. 숫자는 `IND.AX1`과 엔진으로 직접 계산해서 쓴다.

- 타깃: 가상의 팹리스 **노바실리콘**(미국)이 설계하는 데이터센터용 AI 가속기 **AX-1**. 다이 26 × 31 mm(806 mm², 레티클 한계 26 × 33 mm 안), 3 nm급 공정, HBM 6스택(스택당 24 GB, 총 144 GB), 2.5D 인터포저 패키지, 소비 전력 약 1,000 W, 판매가 25,000달러, 첫해 목표 40만 개. 실제 회사·제품과 무관하다.
- 엔진으로 확인한 값:
```js
const A = IND.AX1, area = A.die.w * A.die.h;                       // 806 mm²
const c = IND.dieCost({ w: 26, h: 31, waferCost: A.waferCost, D0: A.D0, model: A.yieldModel });
// c.gross 61(근사식), c.yield ≈ 0.471, c.good ≈ 28.8, c.dieCost ≈ 696달러
// 격자로 직접 세면(IND.waferMap(26, 31).gross) 68개 — 근사식은 가장자리를 보수적으로 뺀다
const hbm = A.hbm.stacks * A.hbm.gb * A.hbm.usdPerGB;               // 1,728달러
const unit = (c.dieCost + hbm + A.pkg.cost + A.test) / A.pkg.yield + A.board;   // ≈ 4,257달러
// 매출총이익률 ≈ 1 − 4257/25000 ≈ 83%, NRE 5억 달러 손익분기 ≈ 500e6 / (25000 − 4257) ≈ 2.4만 개
// 웨이퍼 필요량: 40만 개 / (28.8 × 0.95) ≈ 1.46만 장/년 ≈ 월 1,220장
// 수출 통제 지표: TPP = 2000 TFLOPS(FP8) × 8 bit = 16,000 (기준 4,800 초과), 성능 밀도 PD = 16000/806 ≈ 19.9
```

| 장 | 이 장에서 다루는 것 |
|---|---|
| 01 지도 | AX-1과 노바실리콘 소개. 이 칩이 거칠 여섯 단계와 관여할 나라 수에 대한 질문. 책 전체가 이 칩 하나를 시장까지 옮기는 과정이라는 안내. |
| 02 시장 | AX-1이 들어갈 시장: 데이터센터·AI 가속기가 전체 반도체 매출에서 차지하는 비중과 성장. 40만 개 × 25,000달러 = 100억 달러가 시장에서 어느 정도 크기인가. |
| 03 사이클 | 출시 타이밍. 사이클의 어느 국면에 출시하느냐에 따라 HBM·웨이퍼 조달 가격과 수요가 어떻게 달라지는가. 증설 지연(2년)이 만드는 위험. |
| 04 사업 모델 | 노바실리콘은 왜 팹을 짓지 않는가. 3 nm 팹(약 200억 달러)의 고정비와 AX-1 웨이퍼 수요(월 약 1,220장) 비교. 파운드리를 쓰면 무엇을 잃는가. |
| 05 EDA·IP | 설계에 필요한 EDA 라이선스, CPU 코어·인터페이스(HBM PHY, SerDes) IP의 라이선스비와 로열티. 직접 만들 것과 살 것. |
| 06 팹리스 | 설계비(NRE) 5억 달러를 몇 개를 팔아 회수하는가(약 2.4만 개). 다이 크기를 키우면 성능과 원가가 어떻게 달라지는가. 가격 결정. |
| 07 장비 | AX-1 웨이퍼 한 장이 지나는 장비들: 3 nm급은 EUV 층 20여 개, 공정 단계 1,000개 이상. 파운드리가 이 칩을 위해 늘려야 하는 장비 투자. |
| 08 소재 | AX-1 웨이퍼·레지스트·가스·ABF 기판의 공급원. 소재 하나가 끊기면 몇 주 뒤 무엇이 서는가. |
| 09 파운드리 | 다이 원가 계산: 806 mm², 웨이퍼 20,000달러, 결함 밀도 0.1 /cm² → 웨이퍼당 61개, 수율 약 47%, 좋은 다이 약 29개, 다이 원가 약 700달러. 결함 밀도가 내려가면 어떻게 되는가. |
| 10 메모리 | HBM 6스택(144 GB) 원가 약 1,728달러가 칩 원가의 약 40%. HBM 공급사 세 곳과 가격 협상력. DRAM 대비 HBM 프리미엄. |
| 11 패키징 | 2.5D 인터포저(약 2,400 mm²) 패키징 원가 약 900달러, 수율 95%. 패키징에서 불량이 나면 HBM까지 버린다. 칩렛으로 쪼갰다면 원가가 어떻게 되는가. 패키징 용량 병목. |
| 12 수요 | 완성 원가 약 4,257달러 vs 판매가 25,000달러, 매출총이익률 약 83%. 서버 한 대에 8개, 데이터센터 투자에서 칩이 차지하는 몫. |
| 13 지리 | AX-1이 지나는 경로(`IND.AX1.route`): 국경을 몇 번 넘고 몇 나라가 관여하는가. 한 지역이 멈추면 AX-1의 어느 단계가 막히는가. |
| 14 지정학 | 수출 통제 지표 TPP 16,000은 기준 4,800을 넘는다. 판매 가능 시장이 줄면 손익분기가 어떻게 바뀌는가. 미국 내 생산 보조금의 효과. |
| 15 한국 | AX-1 한 개에서 한국이 가져가는 몫: HBM(약 1,728달러) + 일부 소재·장비. 한국 가치사슬의 강점과 빈칸. |
| 16 실험실 | 독자가 노바실리콘 CEO가 되어 AX-1 후속작의 노드·다이 크기·출시 시점·생산 위치를 정하고 사이클을 견딘다. |

## JS 헬퍼 (`CB`, `js/common.js`)
- `CB.canvas(el|선택자, draw(ctx, w, h), {aspect, minHeight, maxHeight, height})` → `{redraw(), ctx, w, h, canvas}`. 리사이즈·테마 변경 시 자동으로 다시 그린다. draw 안에서 `CB.palette()`를 매번 다시 읽는다. w, h는 CSS px. 문자열은 `querySelector` 선택자이므로 `"#id"`로 넘긴다. 만들자마자 draw를 한 번 부르므로 draw가 읽는 상태와 컨트롤(`CB.range`, `CB.seg`)을 먼저 만든다. 폭이 좁으면(모바일 360px) 배치를 바꿔 높이를 키우고 싶을 때는 옵션에 `get height() { … }` getter를 넘긴다.
- `CB.drag(canvas|선택자, {start(x, y, e), move(x, y, e), end(), hover(x, y, e)})` 캔버스 위 누르기·끌기·호버(마우스·터치, CSS px). 누르는 순간 start와 move가 한 번씩 불린다. **클릭(선택)도 이것으로 처리한다.** draw에서 계산한 배치(상자, 축 변환, 도형 위치)를 바깥 변수에 저장해 두고 hit-test 한다.
- `CB.tip(canvas)` → `{show(x, y, html), hide()}` 캔버스 위 호버 정보 상자. hover에서 show, 빈 곳이면 hide. 캔버스에서 마우스가 나가면 `canvas.addEventListener("pointerleave", tip.hide)`.
- `CB.chart(ctx, box|null, {x:[min,max], y:[min,max], logX, logY, xLabel, yLabel, xFmt, yFmt, xTicks, yTicks, series:[{data:[[x,y]], color, width, dash, fill}], vlines:[{x,color,label}], hlines:[{y,color,label}], points:[{x,y,color,r,label}], bands:[{x0,x1,color}]})` → `{X, Y, box}`. 막대·버블·트리맵은 반환된 `X`, `Y`로 직접 그린다.
- `CB.range(id, fmt, onInput)` → `get()`, `get.set(v)`. 출력은 `id + "-out"` 요소. `CB.seg(id, onChange)` → `get()`, `get.set(v)`. `CB.stat(id, html)`.
- `CB.loop(el, (dt, t) => {})` 화면에 보일 때만 도는 애니메이션(`stop()`, `start()`, `toggle()`). `CB.three(container, opts)`.
- `CB.palette()` → `{bg, text, dim, faint, grid, axis, border, surface, accent, accent2, ok, warn, bad, red, green, blue, series}`, `CB.color(name)`, `CB.isDark()`, `CB.onTheme(cb)`.
- `CB.segColor(key)`(ip design equip mat fab mem atp mkt; dao는 design 색을 쓴다), `CB.regionColor(key)`(us tw kr jp cn eu sea other), `CB.alpha(color, a)` 투명도 입히기.
- `CB.usd(x)` 금액(입력 단위 **십억 달러**: 627 → "$627B", 0.5 → "$500M"), `CB.pct(0.23)` → "23.0%", `CB.fmt(x, digits)`, `CB.si(x, unit)`.
- `CB.rrect(ctx, x, y, w, h, r)` 둥근 사각형 경로, `CB.wrapText(ctx, text, x, y, maxW, lineH, maxLines)`.
- `CB.font(px, mono, weight)`: 고정폭(mono)은 숫자·영문에만. 한글은 자간이 벌어진다. `CB.rng(seed)`, `CB.randn()`, `CB.poisson(λ)`, `CB.debounce`, `CB.clamp/lerp/map`.
- `CB.CHAPTERS`, `CB.STAGES`.

## 산업 엔진 (`IND`, `js/industry.js`)
### 데이터
- `IND.REGIONS[key]` → `{name, en, lon, lat}`, `IND.REGION_KEYS`.
- `IND.SEGMENTS` → `[{key, name, en, stage, va(전체 부가가치 중 %), capex(산업 설비투자 중 %), rnd(산업 R&D 중 %), share: {지역: %}}]` (2019년 근사, SIA·BCG). `IND.segment(key)`, `IND.totalShare()`(지역별 전체 부가가치 점유: 미국 약 39, 일본 약 14, 한국 약 12, 유럽 약 10, 대만 약 10, 중국 약 10).
- `IND.COMPANIES` → `[{id, name, ko, rg, country, seg, model, rev(2024 매출 약, 십억 달러), note}]` 약 90개. `IND.company(id)`, `IND.bySeg(seg)`. model: fabless foundry idm osat equip mat eda ip.
- `IND.MARKET` 세계 반도체 매출 `[[연도, 십억 달러]]` 1986~2025(2025는 추정 `IND.MARKET_EST_FROM`). `IND.MEMORY` 메모리 매출 2010~2025.
- `IND.PRODUCTS` 2024 제품별 매출, `IND.END_MARKETS` 응용별 비중, `IND.SALES_BY_REGION` 지역별 구매 비중.
- `IND.NODES` → `[{node, year, wafer(웨이퍼 가격 추정 $), design(설계비 추정 백만 $), density(MTr/mm²), masks, maskSet(백만 $)}]` 90 nm~2 nm. `IND.node("3 nm")`.
- `IND.CHOKEPOINTS` → `[{key, name, seg, shares: [[회사, %]]}]` 품목별 점유(EUV, 식각, 웨이퍼, 레지스트, ABF, 파운드리, DRAM, HBM, NAND, EDA, OSAT …).
- `IND.HUBS` → `[{name, rg, lon, lat, kind, note}]` 세계 주요 거점 약 35곳. kind: fab mem equip design atp.
- `IND.AX1` 이어지는 타깃(위 참조). `IND.AX1.route` 가치사슬 경로 10단계.

### 모델
- `IND.waferMap(w, h, {d: 300, edge: 3, scribe: 0.1, offset})` → `{dies: [{x, y, w, h, full}], gross, partial, R, Rin}` 다이 격자를 실제로 배치(mm, 웨이퍼 중심 기준, y 위 +). 웨이퍼 맵 그림은 이것으로.
- `IND.dpw(area mm², {d, edge})` 근사식. `IND.yield(area cm², D0, model, alpha)` model: poisson murphy negbin seeds (`IND.YIELD_MODELS` 이름표).
- `IND.dieCost({w, h | area, waferCost, D0, model, test, pkg, pkgYield, exact})` → `{area, gross, yield, good, dieCost, chipCost}`. `exact: true`면 waferMap으로 센다.
- `IND.fab({capex(십억 $), wspm, depYears: 5, equipShare: 0.75, opex($/장), fixedOpex, util, price($/장)})` → `{wafersYear, depYear, fixed, varCost, costPerWafer, revenue, profit, margin, breakevenUtil}`. 예: 200억 달러, 월 10만 장, 가동률 90%, 변동비 3,000달러, 판매가 17,000달러 → 장당 원가 약 6,750달러, 손익분기 가동률 약 24%.
- `IND.chiplet({area, n, overhead: 0.1, waferCost, D0, model, bondYield: 0.99, pkgBase, pkgPer: 20, kgd: true})` → `{mono: {...}, chiplet: {...}, saving}`. 800 mm²를 4개로 쪼개면(웨이퍼 2만 달러, D0 0.1, 기본 패키지 200달러) 약 23% 싸진다.
- `IND.hhi(shares%)` 0~10000(2500 이상 고집중), `IND.cr(shares, n)`.
- `IND.cycle({quarters: 60, growth: 0.02, lag: 6, aggress: 1.2, steep: 4, shock: [{t, size}], noise, seed})` → `{t, demand, capacity, price, util, inventory, orders}`. 기본값은 약하게 출렁이다 가라앉는다. `aggress: 2`나 `lag: 12`면 저절로 큰 사이클이 생긴다(주기 약 5~6년). `noise: 0.03`이면 불규칙한 실제 사이클과 비슷해진다.

### 지도
- `const P = IND.projector(box, {lon0, lon1, lat0, lat1})` 등장방형 투영. `P(lon, lat)` → `[x, y]`, `P.inv(x, y)`, `P.scale`(경도 1도의 px), `P.box`(실제 지도 영역). 기본 범위는 경도 −170~180, 위도 −50~78. 동아시아만: `{lon0: 95, lon1: 150, lat0: 0, lat1: 46}`.
- `IND.drawWorld(ctx, P, {style: "dots"|"fill", step, color, r})` 거친 대륙 윤곽. **기본 점묘(dots)를 쓴다**(윤곽이 거칠어 채움보다 점묘가 보기 좋다). 동아시아처럼 확대할 때는 `step: 0.5~1`.
- `IND.isLand(lon, lat)`, `IND.landDots(step)`.
- `IND.arc(ctx, x0, y0, x1, y1, bend)` 두 점을 잇는 활 모양 경로를 만든다(stroke는 호출한 쪽이). 반환 함수 `f(t)` → 경로 위 점(0~1), 흐름 애니메이션용.

## 점검
- `python tools/head.py <slug>` 로 head를 채운다.
- `python tools/check.py <slug>` (playwright 필요). 넓은 화면·라이트와 360px·다크로 열어 콘솔 오류, 가로 넘침, 조작 중 예외, 그려지지 않은 캔버스를 보고한다. `--shots 폴더`로 스크린샷을 남겨 눈으로도 본다. **문제가 0이 될 때까지 고친다.**
- `python tools/sims.py` 로 갤러리 목록(`js/sims.js`)을 다시 만든다(data-desc 누락을 알려 준다).
- 모바일(폭 360px)에서 가로 스크롤 금지. 캔버스 글자는 `CB.font()`로, 색은 `CB.palette()`·`CB.segColor()`·`CB.regionColor()`로. 다크·라이트 모두 확인.
