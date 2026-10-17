# AnalogBook 챕터 작성 가이드

빌드 과정 없는 정적 사이트다. `index.html` + `sims.html`(시뮬레이터 갤러리) + `chapters/<slug>.html` + 공통 `css/style.css`, `js/common.js`(전역 `AB`), `js/analog.js`(회로 엔진, 전역 `AN`).
로컬 실행: `python -m http.server 8000` → http://localhost:8000 (file://로 열어도 동작하게 classic script만 쓴다. ES module 금지.)

## 기여물의 라이선스
실행 코드는 MIT, 본문·그림·문제·해설 등 교육 콘텐츠는 CC BY 4.0. 구분은 [라이선스 안내](LICENSE.md)를 따른다.

## 이 책이 무엇인가
반도체 시리즈(ProcessBook, LithoBook, MemoryBook, PackagingBook, YieldBook, FailureBook, SensorBook, TCADBook, ChipIndustryBook)에 이어지는 권이다. 앞 책들이 칩을 **어떻게 만드는가**를 다뤘다면, 이 책은 만든 트랜지스터로 **아날로그 회로를 어떻게 설계하는가**를 다룬다. MOSFET 하나에서 시작해 증폭기, 연산 증폭기, 기준 전압, 레귤레이터, 데이터 변환기, PLL까지 올라간다.

대상은 공대 학부생(회로이론·전자회로 1을 들었다고 가정)과 아날로그 설계에 입문하는 엔지니어. 교과서의 대표 본보기는 Razavi *Design of Analog CMOS Integrated Circuits*, Johns & Martin *Analog Integrated Circuit Design*, Gray·Hurst·Lewis·Meyer *Analysis and Design of Analog Integrated Circuits*, Sansen *Analog Design Essentials*, Jespers & Murmann *Systematic Design of Analog CMOS Circuits*(gm/ID), Schreier & Temes *Understanding Delta-Sigma Data Converters*.

## 최우선 원칙: 시뮬레이터가 주인공이다
아날로그는 수식만으로는 감이 오지 않는다. 독자는 **손으로 돌려 보며** 이득과 대역폭이 맞바뀌고, 위상 여유가 줄면 계단 응답이 울리고, 소자를 키우면 오프셋이 줄어드는 것을 "본다". 그러므로:
- **장마다 시뮬레이터 7~10개.** 정적 SVG 그림은 장마다 1~3개(회로도·블록도·단면도처럼 조작이 의미 없을 때만). 글을 읽지 않고 시뮬레이터만 쓰는 사람이 많다(상단 "시뮬레이터만" 버튼, `sims.html` 갤러리).
- **모든 시뮬레이터는 혼자서 이해되어야 한다.** 캔버스 안에 회로도·축 이름·단위·범례·핵심 숫자를 직접 그린다. `.sim-note`는 "해볼 것: ① … ② … ③ …"과 모델의 가정을 담는다.
- 각 `.sim`에는 `id`와 `data-desc="갤러리 카드에 들어갈 한 문장"`이 반드시 있다. 장 끝의 큰 종합 시뮬레이터에는 `data-big`.
- **아날로그다운 시각 언어를 쓴다.** 이 책의 시각적 무기:
  - **살아 있는 회로도**: `AN.sch`로 회로도를 그리고, 마디 옆에 동작점 전압(`S.tag`)을, 가지에는 전류에 비례하는 속도로 흐르는 점(`S.flow` + `AB.loop`)을 그린다. 소자를 누르면 그 소자의 gm·ro·영역이 `.info-panel`에 뜬다. 포화를 벗어난 소자는 `P.bad`로 칠한다.
  - **오실로스코프**: 과도 응답은 `AN.scope`로(어두운 화면 `.sim-view.scope`, 채널 색 `AB.trace(1..4)`). 입력과 출력을 겹쳐 보여 준다.
  - **보드 선도·s 평면**: `AN.bode`로 크기/위상을 위아래로. 극점·영점을 s 평면 위에서 **직접 끌어** 보드 선도와 계단 응답이 함께 바뀌게 한다.
  - **I-V 곡선 위 동작점**: 부하선과 곡선의 교점을 끌어 움직인다.
  - **스펙트럼 분석기**: FFT(`AN.spectrum`, `AN.sinad`)로 고조파·잡음 바닥·SNDR을.
  - **히스토그램·몬테카를로**: 버튼을 누르면 표본이 하나씩 쌓이는 애니메이션.
  - **레이아웃 평면도**: 공통 중심 배치, 더미, 기울기(그래디언트) 오차를 칠한 평면도.
  - 애니메이션(`AB.loop`), 호버 정보 상자(`AB.tip`), 캔버스 직접 끌기(`AB.drag`)를 적극적으로. 슬라이더만 있는 시뮬레이터보다 **캔버스를 직접 누르고 끄는** 시뮬레이터를 우선한다.
- 한 시뮬레이터는 **한 가지 질문**에 답한다. 컨트롤은 1~4개. 종합 시뮬레이터는 장 끝에 하나.
- 값을 끝까지 밀었을 때 **무너지는 모습**이 보여야 한다(트랜지스터가 선형 영역으로 빠져 이득이 꺼진다, 출력이 잘린다, 발진한다, 비트가 틀린다, 락이 풀린다). 한계가 배울 점이다.
- 결과는 숫자(`.sim-readout`)로도 함께 보여 준다. 손 계산값과 시뮬레이션 값을 나란히 보여 주면 더 좋다(손 계산이 어디서 틀리는지가 배울 점이다).
- 회로 동작은 가능하면 **`AN.circuit`(브라우저 SPICE)으로 실제로 풀어서** 보여 준다. 식으로 그리는 곡선은 개념도일 때만. 계산이 무거우면(과도 해석 수천 스텝) 버튼으로 돌리거나 `AB.debounce`.

## 글쓰기 원칙
- **한국어**. 영어 원어는 `<span class="en">(Transconductance)</span>`처럼 병기. 기호는 KaTeX(`\(g_m\)`).
- 문체는 평서문 "~다". 이모지 금지. 다른 장은 `<a href="opamp.html">9장</a>`처럼 링크한다. 시리즈 책 링크: ProcessBook https://semi.euiyun.com/process/, TCADBook https://semi.euiyun.com/tcad/(소자 물리), MemoryBook https://semi.euiyun.com/memory/(센스 앰프), SensorBook https://semi.euiyun.com/sensor/(센서 인터페이스), YieldBook https://semi.euiyun.com/yield/(산포와 수율), ChipIndustryBook https://semi.euiyun.com/industry/.
- 순서: 직관(왜 필요한가) → 시뮬레이터 → 해석 → 수식(KaTeX) → 손 계산과 시뮬레이션 비교 → 설계 지침/실제 수치 → 타깃 파일 → 핵심 정리 → 퀴즈.
- 글은 짧게. 시뮬레이터 바로 앞에서 "무엇을 움직여 볼지", 바로 뒤에서 "무엇을 봤는지"를 2~4문장으로 말한다. 한 절(section)에 문단 3~6개.
- 수식은 꼭 필요한 것만, 대신 **기호마다 단위와 대표값**을 붙인다("\(g_m\) ≈ 170 µS"). 손 계산 예제는 AB180 공정 값으로.
- **수치 정책**: 공정 수치는 가상의 교육용 공정 **AB180**(`AN.PROC`)만 쓴다. 실제 파운드리 PDK 수치·회사 내부 수치는 쓰지 않는다. 일반적인 업계 대표값(예: "180 nm 공정의 µnCox는 수백 µA/V² 수준", "최신 SAR ADC의 Walden FoM 수 fJ/step")은 '약', '~'를 붙여 쓴다.
- **공통 파일(`js/*.js`, `css/style.css`)은 고치지 않는다.** 장 전용 스타일은 그 장 `<head>`의 `<style>`에, 장 전용 함수는 그 장 인라인 스크립트에. 엔진의 버그나 부족한 기능을 발견하면 장 안에서 우회하고, 보고한다.

## head 블록
각 챕터 `<head>`에는 아래 표식만 두고 `python tools/head.py <slug>`를 실행한다(인자를 주면 그 장만 고친다). 제목·번호는 `js/common.js`의 `CHAPTERS`에서 읽는다.
```html
<!doctype html>
<!-- Copyright (c) 2026 geniuskey and AnalogBook contributors.
     Executable code: MIT (see ../LICENSE-MIT).
     Text, illustrations, questions and explanations: CC-BY-4.0 (see ../LICENSE.md). -->
<html lang="ko">
<head>
<!--head:start {"desc": "한 문장 설명(검색 결과에 보일 120자 안팎)", "libs": ["an"]}-->
<!--head:end-->
<style> /* 이 장 전용 */ </style>
</head>
```
`libs`의 `an`은 `js/analog.js`, `three`는 three.js r147 + OrbitControls를 불러온다.

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
상단바·챕터 목록·설계 계층 띠·오른쪽 목차·h2 번호·이전/다음·푸터·퀴즈 동작·KaTeX 렌더·"시뮬레이터만" 모드·시뮬레이터 바로가기(#) 링크는 `common.js`가 자동으로 만든다. 직접 넣지 않는다.
"시뮬레이터만" 모드에서는 `section` 바로 아래의 `h2`, `.sim`, `.sim-group`만 보인다. 시뮬레이터를 `figure`나 다른 `div`로 감싸지 않는다(숨겨진다).

## 컴포넌트
- 시뮬레이터:
```html
<div class="sim" id="sim-x" data-desc="갤러리 카드용 한 문장: 무엇을 바꾸면 무엇이 보이는가">
  <div class="sim-head"><span class="sim-tag">SIMULATOR</span><h3>제목(질문형도 좋다)</h3></div>
  <div class="sim-body side">
    <div class="sim-view"><canvas id="x-cv"></canvas></div>   <!-- 오실로스코프면 class="sim-view scope" -->
    <div class="sim-controls">
      <label class="ctrl"><span>이름 <output id="x-a-out"></output></span><input type="range" id="x-a" min="0" max="10" step="0.1" value="3"></label>
      <div class="seg" id="x-mode"><button data-value="a" class="on">A</button><button data-value="b">B</button></div>
      <label class="check"><input type="checkbox" id="x-c"> 옵션</label>
      <label class="ctrl"><span>선택</span><select id="x-s"><option value="a">A</option></select></label>
      <div class="btn-row"><button class="btn primary" id="x-go">실행</button><button class="btn" id="x-re">다시</button></div>
    </div>
  </div>
  <div class="info-panel" id="x-info">누른 소자의 설명(선택)</div>
  <div class="sim-readout"><div class="stat"><span class="k">이름</span><span class="v" id="x-o-1">—</span></div></div>
  <div class="sim-note">해볼 것: ① … ② … ③ … (모델의 가정)</div>
</div>
```
  컨트롤이 없거나 캔버스를 직접 누르는 시뮬레이터는 `.sim-body`에서 `side`를 빼고 `.sim-view` 안에 `<span class="hint">끌어서 움직인다</span>`를 둔다. 범례는 `<div class="map-legend"><span><i style="background:var(--tr-1)"></i>입력</span></div>`(`.sim-body` 다음). 3D면 `<span class="sim-tag three">3D</span>`, `.sim-view.three`.
- 그림: `<figure class="diagram"><svg viewBox="0 0 720 300" role="img" aria-label="…">…</svg><figcaption><b>그림 제목.</b> 설명</figcaption></figure>`. SVG 안에서는 `.lbl .lbl-dim .lbl-b .lbl-acc .lbl-acc2 .lbl-bad .t-mono .s-line .s-axis .s-acc .s-acc2 .s-dash .s-bad .f-surface .f-elev .f-acc .f-acc2 .f-acc-soft .f-acc2-soft .f-ok-soft .f-warn-soft .f-bad-soft .f-bad`, 회로도 선 `.w`(배선) `.dv`(소자 몸체) `.w-acc .w-acc2 .w-hot`(강조) `.nd`(접속 점), 채널 색 `.s-tr1~4 .f-tr1~4`, 설계 계층 색 `.seg-dev .seg-blk .seg-amp .seg-prec .seg-pwr .seg-conv .seg-clk` 클래스를 쓴다. 색을 직접 적지 않는다(다크 모드). 화살표 머리는 `<marker>`에 `fill="context-stroke"`. SVG는 `viewBox`만 주고 width/height 생략.
- 수식: `<div class="formula">$$…$$<div class="where">기호 설명</div></div>`, 문장 속은 `\(…\)`.
- 강조 상자: `.callout`, `.callout.tip`, `.callout.warn`, `.callout.deep`(첫 `<strong>`이 제목).
- 표: `<div class="table-wrap"><table>…</table></div>`. 숫자 칸은 `class="num"`.
- 용어: `<span class="term">상호 컨덕턴스</span><span class="en">(Transconductance)</span>`.
- 범례: `.legend`, `.pill`, `.ok-t` `.bad-t` `.warn-t`.
- 퀴즈: `<div class="quiz-q"><p>문제</p><div class="opts"><button class="opt">…</button><button class="opt" data-correct>정답</button></div><div class="quiz-exp">해설</div></div>` (장마다 4~5문항, 정답 위치를 섞는다. 계산 문제를 1~2개 넣는다).
- 타깃 파일:
```html
<div class="casefile">
  <div class="tag"><b>TARGET AB-1</b><span>타깃 파일 · 9장</span></div>
  <h4>2단 OTA: 71.8 dB, 23 MHz, 218 µW</h4>
  <p>…이 장의 방법을 AB-1에 적용한 결과…</p>
  <div class="clue"><div><b>이 장에서 정한 것</b>…</div><div><b>아직 남은 문제</b>…</div><div><b>다음 단계</b>…</div></div>
</div>
```

## 이어지는 타깃: AB-1
모든 장은 같은 가상의 칩 하나를 설계 계층을 따라 한 걸음씩 진전시킨다. 각 장 끝(핵심 정리 앞)에 `.casefile` 하나를 넣고, **아래 표에서 자기 장에 해당하는 내용만** 다룬다. 뒤 장의 결론을 미리 말하지 않는다. 숫자는 `AN.AB1`과 엔진으로 직접 계산해서 쓴다.

- 타깃: 가상의 공정 AB180(180 nm CMOS, 코어 1.8 V)으로 만드는 **센서 인터페이스 칩 AB-1**. 압력 센서 브리지(저항 5 kΩ)의 ±10 mV 신호(대역 10 kHz)를 PGA(이득 40)로 키우고, 스위치드 커패시터 회로로 샘플링해 **12비트 1 MS/s SAR ADC**로 디지털화한다. 따로 온도 채널은 16비트 ΔΣ ADC(OSR 128, 8 kHz). 칩 안의 **밴드갭(1.2 V, 20 ppm/°C)**, 배터리 2.5~3.6 V에서 1.8 V를 만드는 **LDO(10 mA)**, 4 MHz 기준에서 32 MHz를 만드는 **PLL**이 이를 받친다. 핵심 블록은 이 모든 곳에 쓰이는 **2단 밀러 OTA**(`AN.AB1.ota`). 실제 회사·제품과 무관하다.
- 엔진으로 확인한 값(300 K):
```js
const r = AN.ota2Open();             // AB-1 OTA 기본값: Cc 1 pF, Rz 2 kΩ, CL 2 pF, 꼬리 20 µA, 2단 80 µA
// r.a0 ≈ 71.8 dB(1단 약 102배 + 2단 약 38배), r.gbw ≈ 23.5 MHz, r.m.pm ≈ 67.5°, 이득 여유 약 52 dB
// Rz = 0이면 PM ≈ 51°, Rz = 0 & Cc 0.6 pF면 PM ≈ 40°(GBW 35 MHz), CL 5 pF면 PM ≈ 50°
// 전원 전류 약 121 µA → 약 218 µW. 슬루율 ≈ 18 V/µs (꼬리 20 µA / Cc 1 pF = 20 V/µs의 근사)
// 동작점: M1 gm ≈ 169 µS, gm/ID ≈ 17(중간 반전), M6 gm ≈ 761 µS, gm/ID ≈ 9.3. 모든 소자 포화.
// 입력 환산 잡음 ≈ 54 nV/√Hz @1 kHz(1/f, 코너 약 14 kHz), 15 @100 kHz, 14 @1 MHz
// 몬테카를로 200회(M1~M4 펠그롬 부정합) 오프셋 σ ≈ 2.1 mV → 3σ ≈ 6.2 mV (사양 5 mV 초과)
const nm = AN.mos({type: "n", W: 10e-6, L: 1e-6}, 0.65, 0.9);   // id ≈ 62 µA, gm ≈ 581 µS, gm/ID ≈ 9.4, 고유 이득 ≈ 125, fT ≈ 1.6 GHz
// 기판 PNP: Vbe(10 µA) ≈ 0.714 V @300 K, 기울기 약 −1.8 mV/K. 면적 1:8의 ΔVbe = Ut·ln 8 ≈ 53.8 mV(+0.179 mV/K)
// 12비트 1.2 V: LSB ≈ 293 µV, 이상적 SNDR 74.0 dB. kT/C ≤ 양자화 잡음이려면 C ≥ 약 0.6 pF
```

| 장 | 이 장에서 다루는 것 |
|---|---|
| 01 개요 | AB-1 소개와 블록도(센서 → PGA → SC 샘플러 → SAR ADC, 밴드갭·LDO·PLL). 사양표. 질문: ±10 mV를 12비트로 읽으려면? ADC LSB 293 µV를 센서 입력으로 환산하면(이득 40) 약 7.3 µV. 모든 블록 밑바닥에 OTA가 있다. |
| 02 MOSFET | AB180 공정 파라미터 소개(`AN.PROC`). 아날로그는 최소 L이 아니라 L = 0.5~1 µm를 쓴다는 것. NMOS 10/1 µm, VGS 0.65 V → 약 62 µA. 영역 지도. |
| 03 소신호·gm/ID | 고유 이득 gm·ro: L 1 µm·gm/ID ≈ 9.4에서 약 125(42 dB), L 0.18 µm에서는 훨씬 작다. 70 dB를 얻으려면 2단이 필요하다는 결론. 입력 쌍은 gm/ID ≈ 15~20(잡음·gm 효율), 전류원은 ≈ 10(정합·스윙)으로 정한다. |
| 04 단일단 | 저항 부하 공통 소스: 이득 약 8(15 kΩ). 저항으로는 70 dB 불가, 능동 부하·캐스코드의 필요. 출력 스윙과 이득의 맞바꿈. |
| 05 전류 미러 | AB-1 바이어스: 기준 20 µA → M8 다이오드 → M5(1:1, 꼬리 20 µA), M7(1:4, 2단 80 µA). λ 때문에 VDS가 다르면 미러 비가 어긋난다. 꼬리 전류의 정확도. |
| 06 차동 쌍 | AB-1 1단 = 5트랜지스터 OTA. gm1 ≈ 169 µS, 1단 이득 약 102(40 dB). 공통 모드 입력 범위, CMRR. |
| 07 주파수 응답 | 보상 없는 2단 OTA의 두 극점이 붙어 있다는 것. 밀러 효과로 Cc가 1단 출력에서 (1+A2)배로 보인다. |
| 08 피드백 | PGA 이득 40을 피드백으로: β = 1/40, DC 루프 이득 약 3,900/40 ≈ 97 → 이득 오차 약 1%. 폐루프 대역 ≈ GBW/40 ≈ 590 kHz ≫ 10 kHz. |
| 09 연산 증폭기 | AB-1 OTA 전체 설계를 손으로 하고 엔진으로 검증: 71.8 dB, 23.5 MHz, 약 218 µW, SR 약 18 V/µs. Rz 없이는 PM 약 51°(다음 장 문제). 시스템적 오프셋 조건 (W/L)6/(W/L)4 = 2(W/L)7/(W/L)5. |
| 10 안정도 | Rz = 2 kΩ로 우반면 영점을 옮겨 PM 약 68°. Rz 1 kΩ면 약 60°, Cc 0.6 pF·Rz 0이면 약 40°(울림). CL이 5 pF로 늘면 약 50°. 단위 이득 버퍼 계단 응답의 오버슈트. |
| 11 잡음 | OTA 입력 환산 잡음 14 nV/√Hz @1 MHz, 1/f 때문에 약 54 nV/√Hz @1 kHz. 10 kHz 대역 센서 신호에는 1/f가 문제 → 초핑 언급. 샘플링 커패시터 1 pF의 kT/C 잡음 약 64 µV rms가 12비트 LSB(293 µV)의 몇 분의 일인지. |
| 12 부정합 | 몬테카를로 오프셋 σ ≈ 2.1 mV, 3σ ≈ 6.2 mV > 사양 5 mV. M1~M4 면적을 키우면 σ ∝ 1/√(WL). 입력 쌍 공통 중심 배치. |
| 13 밴드갭 | PNP ΔVbe(1:8) 53.8 mV, +0.179 mV/K. Vbe 기울기 약 −1.8 mV/K를 상쇄하려면 ΔVbe를 약 10배 → 약 1.2 V. 목표 20 ppm/°C, 곡률. |
| 14 LDO | 배터리 2.5~3.6 V → 1.8 V, 10 mA, 드롭아웃 200 mV. PMOS 패스 소자 크기, 부하 과도, PSRR 40 dB @1 MHz 목표. 오차 증폭기는 AB-1 OTA 변형. |
| 15 스위치드 커패시터 | ADC 앞 샘플러: Cs 1 pF, kT/C 64 µV rms. 스위치 Ron과 트래킹 대역, 전하 주입, 부트스트랩. OTA의 정착 시간(1 MS/s에서 반 주기 안에 12비트 정착). |
| 16 ADC | 12비트 1 MS/s SAR: LSB 293 µV, 이상 SNDR 74 dB, 목표 ENOB ≥ 10.5. 커패시터 DAC 부정합, 비교기 잡음, 클록 16+ 사이클. |
| 17 ΔΣ | 온도 채널: 2차 1비트 변조기, OSR 128 → 이상 SQNR 약 100 dB, 실제 변조기(−6 dBFS) 측정 약 84 dB. 16비트 목표와의 차이, 데시메이션. |
| 18 PLL | 4 MHz → 32 MHz(N = 8). 지터 10 ps rms가 ADC SNR을 얼마나 깎는가(입력 500 kHz에서 약 90 dB 한계). 루프 대역과 위상 여유. |
| 19 실험실 | 독자가 AB-1 신호 사슬을 직접 조립·조정한다. 회로도 편집기 + AN.circuit. |

## JS 헬퍼 (`AB`, `js/common.js`)
- `AB.canvas(el|선택자, draw(ctx, w, h), {aspect, minHeight, maxHeight, height})` → `{redraw(), ctx, w, h, canvas}`. 리사이즈·테마 변경 시 자동으로 다시 그린다. draw 안에서 `AB.palette()`를 매번 다시 읽는다. w, h는 CSS px. 문자열은 `querySelector` 선택자이므로 `"#id"`로 넘긴다. 만들자마자 draw를 한 번 부르므로 draw가 읽는 상태와 컨트롤(`AB.range`, `AB.seg`)을 먼저 만든다. 폭이 좁으면(모바일 360px) 배치를 바꿔 높이를 키우고 싶을 때는 옵션에 `get height() { … }` getter를 넘긴다.
- `AB.drag(canvas|선택자, {start(x, y, e), move(x, y, e), end(), hover(x, y, e)})` 캔버스 위 누르기·끌기·호버(마우스·터치, CSS px). 누르는 순간 start와 move가 한 번씩 불린다. **클릭(선택)도 이것으로 처리한다.** draw에서 계산한 배치(상자, 축 변환, 소자 위치)를 바깥 변수에 저장해 두고 hit-test 한다.
- `AB.tip(canvas)` → `{show(x, y, html), hide()}` 캔버스 위 호버 정보 상자. 캔버스에서 마우스가 나가면 `canvas.addEventListener("pointerleave", tip.hide)`.
- `AB.chart(ctx, box|null, {x:[min,max], y:[min,max], logX, logY, xLabel, yLabel, xFmt, yFmt, xTicks, yTicks, series:[{data:[[x,y]], color, width, dash, fill}], vlines:[{x,color,label}], hlines:[{y,color,label}], points:[{x,y,color,r,label}], bands:[{x0,x1,color}]})` → `{X, Y, box}`.
- `AB.range(id, fmt, onInput)` → `get()`, `get.set(v)`. 출력은 `id + "-out"` 요소. `AB.seg(id, onChange)` → `get()`, `get.set(v)`. `AB.stat(id, html)`.
- `AB.loop(el, (dt, t) => {})` 화면에 보일 때만 도는 애니메이션(`stop()`, `start()`, `toggle()`). `AB.three(container, opts)`.
- `AB.palette()` → `{bg, text, dim, faint, grid, axis, border, surface, accent, accent2, ok, warn, bad, red, green, blue, series}`, `AB.color(name)`(CSS 변수: `"sch-wire"`, `"sch-hot"`, `"tr-1"` …), `AB.trace(1..4)` 스코프 채널 색, `AB.segColor(key)` 설계 계층 색(dev blk amp prec pwr conv clk), `AB.alpha(color, a)`, `AB.isDark()`, `AB.onTheme(cb)`.
- `AB.si(2.3e-6, "A")` → "2.3 µA", `AB.db(1000)` → "60.0 dB", `AB.pct(0.23)` → "23.0%", `AB.fmt(x, digits)`.
- `AB.rrect(ctx, x, y, w, h, r)`, `AB.wrapText(ctx, text, x, y, maxW, lineH, maxLines)`.
- `AB.font(px, mono, weight)`: 고정폭(mono)은 숫자·영문에만. 한글은 자간이 벌어진다. `AB.rng(seed)`(0~1 난수 함수), `AB.randn()`, `AB.poisson(λ)`, `AB.erf`, `AB.debounce`, `AB.clamp/lerp/map`. `AB.C`(물리 상수 h c q k eps0).
- `AB.CHAPTERS`, `AB.STAGES`.

## 회로 엔진 (`AN`, `js/analog.js`)
모든 장이 같은 소자 모델과 같은 시뮬레이터를 쓰게 하는 공통 엔진이다. 단위는 SI(V, A, Ω, F, H, m, s, Hz), 온도는 K. **MOSFET 곡선·동작점·주파수 응답·과도 응답·잡음은 직접 만들지 말고 이것을 쓴다.** 시뮬레이터 주석(`.sim-note`)에 모델의 가정을 밝힌다(제곱 법칙 + 약반전 연속 모델, 속도 포화·이동도 저하 없음, 기생 커패시턴스는 동작점에서 고정).

### 공정과 소자
- `AN.PROC` 가상의 AB180: `vdd 1.8, Lmin 0.18e-6, cox 8.5e-3 F/m²(8.5 fF/µm²), cov 0.3 fF/µm, cj 1 fF/µm`, `n: {vth0 0.45, kp 280e-6(µnCox), lam 0.08e-6(λ·L, 즉 L = 1 µm에서 λ = 0.08 V⁻¹), gamma 0.45, phi 0.8, nsub 1.3, kf 1e-25, avt 5e-9(5 mV·µm), abeta 0.01e-6(1 %·µm), tcv −1 mV/K}`, `p: {vth0 0.48, kp 70e-6, lam 0.10e-6, gamma 0.40, nsub 1.35, kf 3e-26, avt 6e-9, …}`, `res: {poly 300 Ω/□, nwell 1 kΩ/□}`, `capMim 2 fF/µm²`, `pnp: {is 1e-17, xti 3, eg 1.17}`.
- `AN.mos(dev, vgs, vds, vbs = 0, T = 300)` → `{id, gm, gds, gmb, ro, vth, vov, vdsat, region, ic, gmid, intrinsic(gm·ro), cgs, cgd, cdb, csb, ft, beta, lam}`. `dev = {type: "n"|"p", W, L, m?, dvth?, dbeta?}`. **pMOS는 크기로 넘긴다**: `AN.mos(pdev, VSG, VSD, VBS→부호 반전한 값)`. region: `off`(차단) `triode`(선형) `sub`(약반전 포화) `sat`(포화), 이름표 `AN.REGION[region]`. 강반전에서 정확히 \(I_D = \tfrac12 \mu C_{ox}\tfrac{W}{L}V_{ov}^2(1+\lambda V_{DS})\), 약반전에서 \(\exp(V_{ov}/nU_T)\)(기울기 약 78 mV/dec)로 매끄럽게 이어진다. gm/ID 최대 약 30 V⁻¹.
- `AN.vgsFor(dev, id, vds, vbs, T)` 원하는 전류의 VGS. `AN.gmidLookup(type, L, gmid, vds)` → `{vgs, vov, jd(ID/W, A/m), ft, intrinsic, ic}` gm/ID 설계표.
- `AN.pelgrom(type, W, L)` → `{svth, sbeta}` 쌍의 σ. `AN.mcDev(dev, randn)` 부정합을 입힌 소자 복사본(`AB.randn` 또는 시드 난수).
- `AN.Ut(T)`, `AN.kT(T)`, `AN.k`, `AN.q`.

### 브라우저 SPICE (`AN.circuit`)
```js
const c = AN.circuit({ T: 300 });                 // 옵션: mosCaps(기본 true: AC·과도에 MOSFET 기생 C 포함), gmin
c.V("vdd", 0, 1.8, { name: "Vdd" });
c.V("in", 0, { dc: 0.65, ac: 1, wave: AN.wave.sin(0.65, 0.01, 1e6) }, { name: "Vin" });
c.R("vdd", "out", 15e3, { name: "RD" });
c.M("out", "in", 0, 0, { type: "n", W: 10e-6, L: 1e-6 }, { name: "M1" });   // (d, g, s, b)
c.C("out", 0, 1e-12);
const op = c.op();        // op.ok, op.v.out(V), op.dev.M1 = AN.mos 결과 + ids(실제 d→s 전류, pMOS는 음수), op.i.Vdd, op.i.RD
const ac = c.ac({ f0: 1e3, f1: 1e10, n: 120 });   // ac.f, ac.mag("out"), ac.db("out"), ac.ph("out")(도, 펼침), ac.re/im
const tr = c.tran({ tstop: 5e-6, dt: 5e-9 });     // tr.t, tr.v("out"), tr.i("Vdd"), tr.ok
const nz = c.noise("out", { f0: 1, f1: 1e9, n: 100, input: "Vin" }); // nz.f, nz.out, nz.inp(V²/Hz), nz.contrib.M1, nz.thermal, nz.flicker, nz.total(arr, f0, f1)
const sw = c.dc(AN.linspace(0, 1.8, 61), (c, v) => c.set("Vin", "dc", v));  // sw.v("out"), sw.dev("M1", "gm")
```
- 소자: `R(a, b, r)`, `C(a, b, c, {ic})`, `L(a, b, l)`, `V(a, b, 값)`(a가 +), `I(a, b, 값)`(소스 안을 a → b로 흐른다. 즉 b로 들어간다), `E(a, b, cp, cn, gain | {fn: vd => vout})`(전압 제어 전압원. fn이면 비선형: `v => 0.9 + 0.9 * Math.tanh(1e4 * v / 0.9)` 같은 포화 증폭기·비교기), `G(a, b, cp, cn, gm)`, `M(d, g, s, b, dev)`, `D(a, k, {is, n, area} | {pnp: true, area})`(pnp는 `AN.PROC.pnp` 온도 모델), `S(a, b, ctrl(t) → bool | {cp, cn, vt}, {ron, roff})` 스위치.
- 값: 숫자(dc) 또는 `{dc, ac, acPh(도), wave(t)}`. `op()`는 dc를, `tran()`은 wave를 쓴다(시작점은 wave(0)의 동작점). 파형: `AN.wave.sin(off, amp, f, td, ph)`, `.pulse(v1, v2, td, tr, tf, pw, per)`, `.step(v0, v1, t0, tr)`, `.pwl([[t, v], …])`, `.clock(per, duty, vh, vl, td)`.
- 값 바꾸기: `c.set("RD", "r", 20e3)`, `c.set("M1", "W", 20e-6)`, `c.set("Vin", "dc", 0.7)`, `c.T = 350`. 다음 `op()`는 직전 해에서 출발하므로 슬라이더를 움직여도 빠르다. 마디 목록 `c.nodes()`.
- 수렴: 뉴턴 + 전압 갱신 제한, 실패 시 gmin 스텝·전원 스텝. `op.ok`가 false면 화면에 "수렴 실패"를 표시한다. 양안정 회로(래치, 밴드갭의 0 전류 해)는 `c.op({guess: {마디: V}})`로 초기값을 준다.
- 속도: 마디 20개 회로에서 `op()` 약 1 ms, `ac` 200점 약 10 ms, `tran` 800스텝 약 30 ms. 몬테카를로 수백 회는 버튼 + 애니메이션으로 나눠 돌린다.
- **AB-1 OTA**: `AN.ota2(o, mode, wave)` 넷리스트(마디 vdd inp inn x y tail out nb z, 소자 Vdd Vp Vn Ib M1~M8 Rz Cc CL). mode: `"open"`(Vp에 ac 1), `"follower"`(단위 이득 버퍼, Vp에 wave), `"none"`. `o`는 `AN.AB1.ota`를 덮어쓴다(`{cc, rz, cl, itail, i2, m1: {...}, m6: {...}, vos}`; M2/M4는 `m2`, `m4`로 따로 줄 수 있다). `AN.ota2Open(o, {f0, f1, n})` → `{c, op, vos, bd, m, a0, gbw}` 출력이 vcm이 되도록 입력 오프셋을 맞춘 개루프 측정.

### 선형 시스템
- `AN.pz({k, poles: [Hz…], zeros: [Hz…], delay})` → `H(f)` = [re, im]. 양수 = 좌반면, **음수 영점 = 우반면 영점**, 복소 극점 쌍 `{f0, q}`. `H.s(σ, ω)` s 평면 값.
- `AN.pzPoly(o)` → `{num, den}` 오름차순 다항식(rad/s). `AN.tf(num, den)`, `AN.closeLoop(num, den, β)`, `AN.polyMul/polyAdd/polyEval`.
- `AN.bodeData(H, f0, f1, n)` → `{f, mag, db, ph}`. `AN.margins(bd, {ref})` → `{fu, pm, f180, gm, ref}`(적분기 몫을 뺀 DC 위상을 180° 배수로 맞춰 기준으로 삼는다). `AN.f3db(bd)`.
- `AN.response(num, den, {tstop, n, input: "step"|"impulse"|fn(t)})` → `{t, y}`(쌍선형 이산화). `AN.stepInfo(t, y, tol)` → `{overshoot, ts, tr, final}`.
- `AN.zetaToPm(ζ)`, `AN.pmToZeta(pm)`, `AN.overshoot(ζ)`.
- `AN.cx` 복소 연산 `{mul, div, abs, arg, add}`, `AN.unwrap(deg[])`, `AN.logspace(a, b, n)`, `AN.linspace`.

### 신호
- `AN.fft(re, im)` 제자리 radix-2. `AN.window(n, "hann"|"bh"|"rect")`.
- `AN.spectrum(x, {window, fs, full})` → `{f, p, db(dBFS)}`. `AN.sinad(x, {window: "bh", harm: 7})` → `{sndr, snr, thd, sfdr, enob, bin, spec}`(일관 표본화 가정). `AN.coherent(fs, n, f)` → `{f, cycles}`. `AN.quantize(v, bits, vref)`.

### 그리기
- `const S = AN.sch(ctx, {u: 12})` 회로도. 기호 함수가 **핀 좌표를 돌려주므로** `S.wire([p.d, [x, y], …])`로 잇는다.
  `S.nmos(x, y, {label, flip, color})` → `{g, d, s}`(게이트 왼쪽, 드레인 위. flip이면 게이트 오른쪽), `S.pmos` → `{g, s(위), d(아래)}`, `S.pnp(x, y)` → `{b, e, c}`, `S.opamp(x, y, {w, h, flip, label})` → `{inp, inn, out}`,
  `S.res/cap/ind/diode/sw/isrc/vsrc(x1, y1, x2, y2, {label, on, dir, ac, color})`(두 점 사이), `S.gnd(x, y)`, `S.vdd(x, y, "VDD")`, `S.wire(pts, {color, width, dash})`, `S.dot`, `S.open`(단자), `S.label(x, y, text, {align, color, size, mono, bold})`, `S.tag(x, y, "0.87 V", {color, align})`(값 상자), `S.arrow(x1, y1, x2, y2, {label})`, `S.flow(pts, phase, {color, gap, r})`(전류 점 애니메이션: phase를 `dt × 전류에 비례하는 속도`로 키운다).
  회로도 크기 단위 u는 캔버스 폭에 맞춰 정한다(`u = Math.min(14, w / 40)`처럼). 모바일 360px에서도 글자가 겹치지 않게.
- `AN.scope(ctx, box, {t: [t0, t1], y: [lo, hi], traces: [{t, v, label, color, dash}], tDiv: "200 ns/div", vDiv: "0.1 V/div", dark})` → `{X, Y}`. 10 × 8 칸 오실로스코프 화면.
- `AN.bode(ctx, box, bd | [bd…], {f: [f0, f1], db: [lo, hi], ph: [lo, hi], marks: true, vlines, hlines, xTicks})`(좁으면 눈금을 자동으로 건너뛴다). `AN.margins(bd, {ref})`는 저주파 기울기로 적분기 개수를 세어 기준 위상(반전의 ±180°)을 스스로 정한다(2형 PLL처럼 원점 극점이 있어도 된다). 결과의 `ref`가 그 기준이다 → `{X, Ym, Yp}`. `marks: true`면 단위 이득 주파수와 PM을 표시한다.

## 점검
- `python tools/head.py <slug>` 로 head를 채운다.
- `python tools/check.py <slug>` (playwright 필요). 넓은 화면·라이트와 360px·다크로 열어 콘솔 오류, 가로 넘침, 조작 중 예외, 그려지지 않은 캔버스를 보고한다. `--shots 폴더`로 스크린샷을 남겨 **눈으로도 본다**(겹친 글자, 잘린 회로도, 빈 그래프). **문제가 0이 될 때까지 고친다.**
- `python tools/sims.py` 로 갤러리 목록(`js/sims.js`)을 다시 만든다(data-desc 누락을 알려 준다).
- 모바일(폭 360px)에서 가로 스크롤 금지. 캔버스 글자는 `AB.font()`로, 색은 `AB.palette()`·`AB.color()`로. 다크·라이트 모두 확인. 고정 색은 오실로스코프 화면(`AN.scope`)처럼 실제로 어두운 경우에만.
