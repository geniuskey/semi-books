# DopingBook 챕터 작성 가이드

빌드 과정 없는 정적 사이트다. `index.html` + `chapters/<slug>.html` + 공통 `css/style.css`, `js/common.js`, `js/doping.js`.
로컬 실행: `python -m http.server 8000` → http://localhost:8000 (file://로 열어도 동작하게 classic script만 쓴다. ES module 금지.)
같은 시리즈의 [EtchBook](https://github.com/geniuskey/etchbook), [LithoBook](https://github.com/geniuskey/lithobook)과 구조·문체·컴포넌트가 같다. 막히면 그 저장소의 장을 본보기로 삼는다.

## 기여물의 라이선스
실행 코드는 MIT, 본문·그림·문제·해설 등 교육 콘텐츠는 CC BY 4.0. 구분은 [라이선스 안내](LICENSE.md)를 따른다.

## 원칙
- **한국어**, 대상은 반도체 업계 신입부터 다른 공정의 엔지니어까지. 전공(반도체 물리·공정 기초)은 있으나 도핑은 처음인 사람. 영어 원어는 첫 등장에 `<span class="en">(Projected range)</span>`처럼 병기.
- 다른 책과 겹치는 내용은 반복하지 않고 링크한다. 공정 전체 흐름은 [ProcessBook](https://semi.euiyun.com/process/), 접합·문턱 전압은 [DeviceBook](https://semi.euiyun.com/device/), 프로파일 시뮬레이션(공정 모사)은 [TCADBook](https://semi.euiyun.com/tcad/), 주입 마스크(감광막 패턴)는 [LithoBook](https://semi.euiyun.com/litho/), 도핑 기인 불량은 [YieldBook](https://semi.euiyun.com/yield/)·[FailureBook](https://semi.euiyun.com/failure/).
- 뼈대는 **만져 보며 배우기**. 직관과 그림이 먼저, 수식은 그 뒤.
  - 개념 하나에 조작 가능한 그림 하나. 정적인 SVG는 조작으로 대신할 수 없을 때만(장마다 1~2개 이하).
  - 한 시뮬레이터는 **한 가지**만 보여 준다. 슬라이더는 1~3개.
  - 글은 시뮬레이터 바로 앞에서 "무엇을 움직여 볼지"를, 바로 뒤에서 "무엇을 봤는지"를 말한다.
  - 값을 끝까지 밀었을 때 **무너지는 모습**이 보여야 한다(빔이 부풀어 사라진다, 꼬리가 접합을 밀어낸다, 활성화가 고용 한계에 막힌다).
  - 결과는 숫자(`.sim-readout`)로도 함께 보여 준다.
  - 농도는 거의 항상 **로그 축**이다. 10¹⁴~10²¹ cm⁻³을 한 그림에 담는다.
- 순서: 개념 → 조작 가능한 그림 → 수식(KaTeX) → 시뮬레이터 → 대표 수치 → 타깃 파일 → 요약/퀴즈.
- 도핑의 흐름은 어디에·얼마나 → 이온 만들기 → 고르고 쏘기 → 고체 속 → 활성화·확산 → 측정·검증. 각 장은 자기가 이 흐름의 어디인지 분명히 한다.
- 수치는 교과서·공개 논문 수준의 대표값(Plummer·Deal·Griffin *Silicon VLSI Technology*, Ziegler 편 *Ion Implantation Science and Technology*, Rimini *Ion Implantation: Basics to Device Fabrication*, Sze *VLSI Technology*, Ziegler·Biersack·Littmark의 ZBL 저지능, Lindhard 채널링 이론, 공개 리뷰 논문). 확실하지 않은 수치는 '약', '~'를 붙이거나 본문에 넣지 않는다. **특정 회사의 레시피·장비 설정처럼 보이는 숫자는 쓰지 않는다.** 범위로 쓴다.
- 시뮬레이터 수치는 교육용 모델의 값이다. 실제 시뮬레이터(TCAD, SRIM 등) 결과라고 주장하지 않는다. 모든 시뮬레이터 아래에 `<div class="sim-note model">…</div>` 한 줄로 **어떤 근사인지** 밝힌다(화면에는 "근사 모델 ·"이 앞에 붙는다).
- 외부 라이브러리는 KaTeX, three.js r147만. 이미지 대신 인라인 SVG/canvas.
- 색은 CSS 변수(`var(--accent)`)나 `DB.palette()`. n형은 `--n-type`(파랑), p형은 `--p-type`(빨강). 재질 색은 SVG의 `.m-*`.
- 모바일(폭 360px)에서 가로 스크롤 금지. SVG는 `viewBox`만 주고 width/height 생략.
- 문체는 평서문 "~다". 이모지 금지. 다른 장을 언급할 때는 `<a href="stopping.html">8장</a>`처럼 링크한다.

## head 블록
소스에는 `<title>`과 `<meta name="description">`(한 줄)만 쓴다. canonical, `theme-color`, Open Graph, Twitter 카드, JSON-LD는 루트의 `tools/build.mjs`가 `js/common.js`의 `CHAPTERS`와 `book.json`의 `meta`로 배포물에 생성하고, 수식도 빌드가 KaTeX로 미리 렌더링한다. 소스에 이 태그들이나 KaTeX 태그를 넣으면 `npm test`가 실패한다. 빌드는 정적 HTML의 수식만 렌더링하므로 스크립트가 `\(`·`\[`·`$$`가 든 문자열을 DOM에 넣지 않는다. 소스 파일을 바로 열면 `common.js`가 CDN에서 KaTeX를 불러와 미리보기를 렌더링한다. 사이트맵은 루트에서 `npm run sitemap`으로 갱신한다.

## 페이지 골격과 컴포넌트
EtchBook의 [CONTRIBUTING.md](https://github.com/geniuskey/etchbook/blob/main/CONTRIBUTING.md)와 같다(`.sim`, `.sim-head`, `.sim-body side`, `.sim-controls`, `.sim-readout`, `.sim-note`, `.formula`, `.callout`, `.table-wrap`, `.casefile`, `.keypoints`, `.quiz-q`). 이 책에서 더한 것:
- `<div class="sim-note model">` — 근사 모델 한 줄.
- SVG 클래스 `.f-n .f-p .f-n-soft .f-p-soft .s-n .s-p .lbl-n .lbl-p`, 글자색 `.n-t .p-t`.

## 이어지는 타깃: DB-20
모든 장은 같은 가상의 접합 하나를 한 걸음씩 진전시킨다. 각 장 끝(핵심 정리 앞)에 `.casefile` 하나를 두고 아래 표에서 자기 장에 해당하는 내용만 다룬다. 뒤 장의 결론을 미리 말하지 않는다. 숫자는 `DP`로 직접 계산해서 쓴다.

- 타깃: 가상의 로직 칩 pMOS의 **소스·드레인 익스텐션**. 붕소, 도즈 1×10¹⁵ cm⁻², 배경(할로 + n웰) 1×10¹⁸ cm⁻³. 실제 회사·제품과 무관하다.
- 규격(이 책이 정한 것): 접합 깊이 x_j ≤ 20 nm(배경 10¹⁸ 기준), 면저항 R_s ≤ 700 Ω/□.
- 엔진 기준값(`DP.implant` + `DP.anneal`, 0.5 keV B 1e15, 배경 1e18): 주입 직후 x_j 약 12.5 nm(비정질), 결정 7°/22°면 약 24 nm(채널링). Ge PAI 10 keV 1e15 → 비정질 약 16 nm. PAI 포함 스파이크 1050 °C: TED 없음 약 27 nm, TED 약 37 nm, R_s 약 245 Ω/□. 플래시 1300 °C: TED 약 17.5 nm / 233 Ω/□, 탄소(TED 원천 1/4) 약 13.9 nm / 291 Ω/□. 레이저 1350 °C: 약 12.8 nm / 320 Ω/□. 최종 DB-20 = Ge PAI + C + B 0.5 keV + 플래시 1300 °C.

| 장 | 이 장에서 다루는 것 |
|---|---|
| 01 도핑 | 타깃 소개. 숫자의 감각: 10²⁰과 10¹⁸, 원자 몇 개 중 하나인가. 왜 얕고 진해야 하는가. |
| 02 흐름 | CMOS 흐름 속 익스텐션의 자리(게이트 뒤, 스페이서 앞). 할로와의 관계. |
| 03 소스 | BF₃에서 B⁺를 만든다. 저에너지 고전류가 어려운 이유의 시작(추출 한계). |
| 04 질량 분석 | ¹¹B⁺를 고르는 자기장. BF₂⁺로 갈 수도 있다. |
| 05 빔 라인 | 0.5 keV 빔의 공간 전하. 감속 모드와 그 대가. |
| 06 도즈 | 1e15를 세는 시간과 정확도, 차징. |
| 07 장비 | 고전류 장비의 영역. 플라스마 도핑이라는 대안. |
| 08 저지 | Rp 약 3 nm. 주입 직후 x_j 약 12 nm. |
| 09 채널링 | 저에너지 B의 채널링 꼬리가 x_j를 밀어낸다. 틸트·트위스트, PAI. |
| 10 손상 | 붕소는 스스로 비정질화하지 않는다. Ge PAI와 EOR 결함. |
| 11 어닐 | 스파이크는 x_j 약 26 nm. 플래시는 13 nm대. 활성화율. |
| 12 확산 | TED가 몇 nm를 더한다. 농도 의존 확산. |
| 13 써멀 버짓 | x_j–R_s 지도에서 규격 상자에 들어가는 방법은 ms 어닐뿐. |
| 14 계측 | SIMS로 x_j를, 4점 탐침으로 R_s를 잰다. SIMS 깊이 분해능. |
| 15 결함 | 감속 모드 에너지 오염이 x_j를 망친다. |
| 16 다음 세대 | 핀에서는 익스텐션을 등각으로. 플라스마 도핑과 인시추 도핑 에피. |

## JS 헬퍼 (`DB`, `js/common.js`)
EtchBook의 `EB`와 같다(이름만 `DB`). `DB.canvas`, `DB.chart`(로그 축 `logY`), `DB.range`, `DB.seg`, `DB.drag`, `DB.loop`, `DB.palette()`, `DB.font`, `DB.fmt`, `DB.si`, `DB.erf/erfc`, `DB.rng`, `DB.debounce`, `DB.CHAPTERS`, `DB.STAGES`.

## 도핑 엔진 (`DP`, `js/doping.js`)
모든 장이 같은 숫자를 쓰게 하는 공통 엔진. node에서도 돈다: `global.window = global; require("./js/doping.js");`
- 이온: `DP.ION` (B, BF2, In, P, As, Sb, Ge, Si, C, H).
- 사정거리: `DP.range(ion, E)` → `{Rp, dRp, gamma, beta, dRl}`(nm). 대표값 표의 로그 보간. BF₂는 붕소 몫 에너지(11/49)로.
- 분포: `DP.implant(xs, {ion, E, dose, shape, screen, chan, chanLen})` → `{c, r, retained, inScreen}`. `DP.pearson`, `DP.gauss`, `DP.emg`, `DP.peak`.
- 저지능: `DP.stopping(ion, E)` → `{Sn, Se}`(eV/nm, ZBL·LSS). `DP.crossover(ion)`.
- 몬테카를로: `DP.mc({ion, E, tilt, n, seed, keep})` → `{paths, ends, displaced, Rp, dRp, dRl, back}`. 저지능에 보정 계수를 곱해 표의 Rp와 맞췄다(`DP.mcCal`).
- 손상: `DP.damage(xs, {ion, E, dose})` → 핵 에너지 밀도(eV/cm³). `DP.amorphThreshold(ion, Tsub)`.
- 채널링: `DP.critAngle(ion, E, d)`(°), `DP.channeling(ion, E, tilt, twist, {screen, amorph})` → `{frac, best, pbest}`, `DP.beamDir`, `DP.diamond`.
- 열처리: `DP.history(kind, {peak, hold})`, `DP.budget(dop, hist)`, `DP.anneal(c0, hist, {xs, dop, background, ted, tedDose, tedRp, amorph, melt})` → `{c, a, xj, Rs, Dt, active, chem}`. `DP.D`, `DP.ni`, `DP.solubility`, `DP.sperVelocity`.
- 전기: `DP.mobility(type, N)`, `DP.resistivity`, `DP.sheet`, `DP.sheetCumulative`, `DP.junction`.
- 빔: `DP.rigidity`, `DP.radius`, `DP.speed`, `DP.perveance`, `DP.childLangmuir`.
- 단면: `DP.xsec({W, H, nx, ny})` → `.add(feature)`, `.implant({ion, E, dose, tilt, quad})`, `.anneal(hist)`, `.net(i, j)`, `.column(x)`.
- 표시: `DP.sci(x)` → "2.3×10¹⁸".

## 점검
- `PW_CHROMIUM=/path/to/chrome python3 tools/check.py <slug>` (playwright 필요). 넓은 화면·라이트와 360px·다크로 열어 콘솔 오류, 가로 넘침, 조작 중 예외를 보고한다. `--shots 폴더`로 스크린샷.
- 다크·라이트 테마 모두 확인. 캔버스 글자는 `DB.font()`로, 색은 `DB.palette()`로.
