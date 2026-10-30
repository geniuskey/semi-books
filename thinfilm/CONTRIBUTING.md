# ThinFilmBook 챕터 작성 가이드

ThinFilmBook은 SemiBooks 서가(`semi.euiyun.com`)의 한 권이다. 배포 주소는 `https://semi.euiyun.com/thinfilm/`.
8대 공정 중 산화와 박막 증착을 ProcessBook보다 한 단계 깊이 다루는 심화 편이다. 열산화, PVD·CVD·ALD의 **반응과 수송**, **핵생성·피복성·막질**을 **장비 조건**(온도, 압력, 유량, 전력, 펄스·퍼지 시간)과 연결하는 것이 이 책의 중심 줄기다. 모든 장에서 "이 손잡이를 돌리면 막이 어떻게 바뀌는가"를 시뮬레이터로 보여 준다.

빌드 과정 없는 정적 사이트다. `thinfilm/index.html` + `thinfilm/chapters/<slug>.html` + 공통 `thinfilm/css/style.css`, `thinfilm/js/common.js`.
로컬 실행: 저장소 루트에서 `python3 -m http.server 8000` → http://localhost:8000/thinfilm/ (file://로 열어도 동작하게 classic script만 쓴다. ES module 금지.)

CMPBook(`../cmp`)의 구조와 컴포넌트를 그대로 물려받았다. 전역 객체 이름만 `CB` → `TF`, 클래스 접두사만 `cb-` → `tf-`로 바뀌었다. CMPBook 장(`../cmp/chapters/*.html`)은 형식의 좋은 본보기다.

## 원칙
- **한국어**, 대상은 공대 학부생과 신입 공정 엔지니어(일반화학·물리화학 기초·열역학 기초가 있다고 가정). 영어 원어는 `<span class="en">(Atomic Layer Deposition)</span>`처럼 병기.
- 개념 → 직관 그림(SVG) → 수식(KaTeX) → 시뮬레이터 → 실제 수치 예(TF-300) → 요약/퀴즈 순서.
- **시각 자료와 인터랙티브 요소가 이 책의 핵심이다.** 한 장에 **시뮬레이터 7개 이상, 그림(figure) 7개 이상, 퀴즈 6문항 이상**. 글로 길게 설명할 것은 그림·애니메이션으로 보여 준다. 태그에 `3d`가 있는 장은 three.js 3D 시뮬레이터를 최소 1개 둔다.
- 시뮬레이터는 장식이 아니라 **계산하는 모델**이어야 한다(딜-그로브 식, 확산 방정식, 아레니우스, 랭뮤어 흡착, 몬테카를로 입자 궤적, 경계층 수송, 크누센 확산, 핵생성 속도식, 박막 간섭, 스토니 식 등). 입력을 끝까지 움직였을 때 물리적으로 말이 되는지(음수 두께, 0으로 나누기, NaN, 무한 루프) 확인한다. 쓰는 식은 본문에 적는다. 막이 시간에 따라 자라는 단면 애니메이션, 분자 운동, 표면 흡착 격자, 입자 궤적처럼 **움직이는 그림**을 적극 쓴다.
- 장비 조건과 막 특성의 연결을 꼭 보여 준다: 각 장에 "조건 → 결과" 표나 시뮬레이터가 하나 이상 있어야 한다(예: 온도↑ → 반응 제한에서 수송 제한으로, 압력↑ → 평균 자유 행로↓ → 피복성 변화, 이온 에너지↑ → 밀도↑·압축 응력↑).
- 수치는 공개 자료(교과서 — Plummer·Deal·Griffin, Ohring, Smith, Sze, George의 ALD 리뷰, 학회 논문, IRDS 등)에서 합리적인 범위를 쓴다. 확실하지 않은 수치는 '약', '~'로 표기한다. 특정 회사의 내부 값처럼 쓰지 않는다. 상표명·장비 모델명 대신 일반 명칭을 쓴다.
- 외부 라이브러리는 KaTeX(빌드가 처리)와 아래 head 템플릿의 three.js r147만 쓴다. 이미지 파일 대신 인라인 SVG/canvas로 그린다.
- 색은 하드코딩하지 말고 CSS 변수나 `TF.palette()`를 쓴다. 라이트/다크 둘 다 읽혀야 한다. 3D 모델의 물리적 재질색(석영, 스테인리스 등)은 고정색 가능.
- 모바일(폭 360px)에서 가로 스크롤이 생기면 안 된다. SVG는 `viewBox`만 주고 width/height 속성 생략. viewBox 폭은 900 이하로.
- 화면을 아껴 쓴다. 긴 여백, 큰 장식 영역을 만들지 않는다. 한 화면에 쓸모 있는 내용이 많이 보이게 한다.

## 수식 규칙 (빌드가 깨지지 않게)
- 인라인 `\( ... \)`, 블록 `$$ ... $$`. HTML 안에서 `<`는 `\lt`, `>`는 `\gt`, `&`는 `&amp;`로 쓴다.
- `\text{}` 안에 `·`, `°`, `µ`, 한글 이외의 특수 유니코드(가운뎃점 등)를 넣지 않는다. 곱은 `\cdot`, 도는 `^\circ`, 마이크로는 `\mu`를 `\text{}` 밖에서 쓴다. 한글은 `\text{}` 안에 넣어도 된다.
- 스크립트가 `\(`·`\[`·`$$`가 든 문자열을 DOM에 넣으면 안 된다(빌드는 정적 HTML의 수식만 렌더링한다). 시뮬레이터 출력에는 일반 텍스트·유니코드(x², µm, ·)를 쓴다.
- 작성 후 저장소 루트에서 `npm run build`가 성공해야 한다(KaTeX 문법 오류가 있으면 실패).

## 재료 색 코드
책 전체에서 같은 재료는 같은 색으로 그린다. 단면도에서 SVG 면 클래스 `.m-si .m-oxide ...`, 선 클래스 `.ms-*`, 캔버스는 `TF.palette().oxide` 등, 범례는 `<span class="m-key oxide">산화막</span>`.

| 키 | 뜻 |
|---|---|
| si | 실리콘 기판·단결정 Si |
| oxide | 산화막(SiO₂: 열산화막, TEOS, PECVD 산화막) |
| nitride | 질화막(Si₃N₄, SiON, SiN) |
| highk | 고유전율·ALD 산화물(HfO₂, Al₂O₃, ZrO₂) |
| metal | 금속·배리어(Ti, TiN, Ta/TaN, W, Mo, Al) |
| cu | 구리 시드·배선 |
| poly | 폴리실리콘·비정질 Si |
| gas | 기체 분자·전구체(precursor)·반응물 |
| plasma | 플라즈마·이온·래디컬 |

## 교육용 기준 장비 TF-300 (가상)
모든 장이 같은 가상 장비군을 예로 든다. 실제 특정 장비가 아니다. 장마다 `<div class="callout fab"><strong>제목</strong>...</div>`로 "TF-300 노트"를 1~3개 둔다(접두어 "TF-300 노트 · "는 CSS가 붙인다). 계산 결과가 이 표와 어긋나면 표가 맞는 쪽으로 맞추거나 본문에 이유를 쓴다.

| 모듈 | 값(교육용 가정) |
|---|---|
| 공통 | 300 mm 웨이퍼, (100) Si. 볼츠만 상수 \(k = 8.617\times10^{-5}\) eV/K |
| **FX 종형 퍼니스** (산화·LPCVD·어닐) | 석영 튜브, 웨이퍼 150장 적재(제품 125 + 더미·모니터), 피치 약 6 mm, 히터 5구역. 투입·인출 650 °C(N₂), 승온 10 °C/min, 냉각 약 3–5 °C/min |
| 건식 산화 | O₂ 10 slm, 1 atm. 900 °C 30 min → 약 11 nm, 1000 °C 1 h → 약 48 nm(마수드 보정 모델) |
| 습식 산화 | 파이로제닉 H₂:O₂ ≈ 1.8:1, 1 atm. 1000 °C 1 h → 약 390 nm(딜-그로브) |
| 딜-그로브 상수 | 건식: \(B = 772\,e^{-1.23/kT}\) µm²/h, \(B/A = (6.23\times10^{6}/1.68)\,e^{-2.0/kT}\) µm/h, \(x_i = 25\) nm. 습식: \(B = 386\,e^{-0.78/kT}\) µm²/h, \(B/A = (1.63\times10^{8}/1.68)\,e^{-2.05/kT}\) µm/h, \(x_i = 0\). 1.68은 (111)→(100) 보정. 1000 °C 건식: B ≈ 0.0104 µm²/h, B/A ≈ 0.045 µm/h. 1000 °C 습식: B ≈ 0.315 µm²/h, B/A ≈ 0.744 µm/h |
| 얇은 건식 산화(마수드) | \(dx/dt = B/(2x + A) + C\,e^{-x/L}\), \(C = 3.6\times10^{8}\,e^{-2.35/kT}\) µm/h, \(L \approx 7\) nm, \(x_0 \approx 0.5\) nm(자연 산화막). 20 nm 이하 산화에 쓴다 |
| LPCVD | 폴리실리콘: SiH₄, 620 °C, 0.25 Torr, 약 8–10 nm/min. 질화막: SiH₂Cl₂:NH₃ = 1:5, 760 °C, 0.25 Torr, 약 2.5 nm/min. TEOS 산화막: 700 °C, 0.3 Torr, 약 10 nm/min |
| **RTP** 램프 챔버 | 텅스텐-할로겐 램프, 승온 150 °C/s(최대 250 °C/s), 냉각 약 80 °C/s, 고온계(pyrometer). 스파이크 어닐 1050 °C(정점 위 50 °C 구간 약 1.5 s). ISSG 래디컬 산화 약 1000–1100 °C, 수 ~ 십수 Torr |
| **PV 마그네트론 PVD** | DC 마그네트론, 타깃 지름 약 450 mm, 타깃-웨이퍼 거리 60 mm(표준)·300 mm(롱스로 옵션), Ar 3 mTorr(평균 자유 행로 약 2 cm), DC 20 kW. 반응성 TiN은 Ar+N₂. 이온화 PVD 옵션: RF 코일 + 기판 RF 바이어스(0–300 W). 전원 최대 20 kW. 저전력 레시피 Ti 라이너 약 100 nm/min(약 6 kW), Cu 시드 약 400 nm/min(약 7 kW); 20 kW에서 Ti는 약 330 nm/min(교육용) |
| **PE 플라즈마 CVD** | 평행판 CCP, 샤워헤드 간격 10 mm, 13.56 MHz HF 0–1,000 W + 400 kHz LF 0–500 W(이중 주파수), 기판 400 °C, 3 Torr. SiH₄/N₂O 산화막 약 300 nm/min, TEOS/O₂ 산화막 약 400 nm/min, SiH₄/NH₃/N₂ 질화막 약 100 nm/min. 응력 범위 약 −300 ~ +300 MPa(LF 비율로 조절) |
| **AL 원자층 증착** | 매엽 샤워헤드 챔버, 300 °C, 공정 압력 약 1 Torr(N₂ 운반·퍼지 300 sccm). Al₂O₃: TMA/H₂O, 사이클 0.1 s / 2 s / 0.1 s / 2 s, 사이클당 성장(GPC) 약 0.11 nm. TMA 분압 약 0.1 Torr(공정 압력의 10 %). 종횡비 40:1 이상에는 H₂O 펄스 0.2 s 변형 레시피를 쓴다(0.1 s는 95 % 피복에 아슬아슬). HfO₂: HfCl₄/H₂O 300 °C, GPC 약 0.06 nm. TiN: TiCl₄/NH₃ 400 °C, GPC 약 0.03 nm. PEALD SiO₂: 아미노실레인 + O₂ 플라즈마, 50–300 °C, GPC 약 0.12 nm |
| 목표 사양 | 두께 균일도: 퍼니스 산화 ≤ 0.5 %(1σ), PECVD ≤ 1.5 %, ALD ≤ 1 %. 웨이퍼 간 ≤ 1 %. ALD 스텝 커버리지 ≥ 95 %(종횡비 40:1). PVD 배리어 하단 피복 ≥ 10 %(종횡비 5:1). 열산화막 항복 전계 ≥ 10 MV/cm, 계면 트랩 \(D_{it}\) ≤ 10¹⁰ cm⁻²eV⁻¹(포밍 가스 어닐 후) |

## 장 목록 (slug와 담당 주제)
| 장 | slug | 제목 | 핵심 내용 |
|---|---|---|---|
| 01 | overview | 박막 공정의 지도 | 칩 단면의 막 종류와 역할, 성장 vs 증착, 산화·PVD·CVD·ALD 비교(온도·속도·피복성·막질), 증착 장비 공통 구조(챔버·펌프·가스·전력·로드락), 3D 클러스터 장비, 책 지도 |
| 02 | vacuum | 진공과 기체 수송 | 이상 기체, 맥스웰-볼츠만 속도 분포, 평균 자유 행로, 크누센 수와 유동 영역, 충돌 플럭스(헤르츠-크누센), 단분자층 형성 시간, 펌핑 속도·컨덕턴스·펌프다운, 체류 시간, 확산 계수 |
| 03 | oxidation | 열산화와 딜-그로브 모델 | 산화 반응과 부피 팽창(Si 소모 0.44), 딜-그로브 3플럭스 유도, 선형·포물선 영역, 건식·습식, 아레니우스, 면방위, 압력(HiPOx), 염소 첨가, 산화 시간 계산 |
| 04 | interface | 산화막 심화: 계면·응력·형상 | 얇은 산화의 초기 급성장(마수드), 계면 전하 4종(Qf, Qit, Qm, Qot)과 C-V, 포밍 가스 어닐, 도펀트 편석(B·P), OED·OSF, LOCOS 새부리와 STI 라이너, 2D 산화 응력과 모서리 얇아짐, 질화(SiON)·ISSG·플라즈마 산화 |
| 05 | budget | 열 예산과 열처리 장비 | 확산 길이 \(\sqrt{Dt}\)와 유효 Dt 적분, 램프 구간 기여, 등가 시간, 배치 퍼니스 vs RTP vs 스파이크·플래시·레이저 어닐, 웨이퍼 온도 균일도와 열 슬립, 복사 열전달·방사율, 공정 순서와 열 예산 배분, 3D 퍼니스 |
| 06 | nucleation | 흡착·핵생성·성장 모드 | 물리·화학 흡착, 흡착 에너지와 체류 시간, 표면 확산 길이, 고전 핵생성(임계 반지름·장벽), 섬 밀도와 합체, 볼머-베버·프랑크-반 데어 메르베·스트란스키-크라스타노프, 잠복기, 구조 영역 모델(Movchan-Demchishin, Thornton), 결정립 성장 |
| 07 | pvd | PVD: 증발과 스퍼터링 | 증기압과 증발 플럭스, 코사인 분포와 두께 분포, 스퍼터 수율(시그문트 근사), 이온 에너지와 문턱, DC·RF 방전, 마그네트론 자기 가둠과 레이스트랙 침식, 원자 수송의 열평형화(thermalization, 감속), 3D 마그네트론 |
| 08 | sputter | PVD 심화: 반응성·이온화·응력 | 반응성 스퍼터링 히스테리시스(베르그 모델), 타깃 피독, 이온화 PVD와 재스퍼터, 롱스로·시준기, 바닥·측벽 피복, 압력과 이온 충격으로 본 응력 반전(압축↔인장), 배리어·시드 응용 |
| 09 | cvd | CVD 반응과 수송 | CVD 단계(수송·흡착·반응·탈착), 그로브 모델(\(h_g\)와 \(k_s\)), 반응 제한 vs 수송 제한, 아레니우스 그림의 꺾임, 경계층 두께, 부착 계수, 기상 반응과 입자, 실레인·TEOS·DCS 반응 경로, 성장 속도 계산 |
| 10 | reactor | CVD 반응기와 PECVD | APCVD·LPCVD·PECVD·HDP 비교, 배치 LPCVD 고갈과 온도 경사 보정, 샤워헤드·체류 시간·페클레 수, PECVD 플라즈마(전자 충돌 해리), 이온 충격과 수소 함량, 이중 주파수 응력 조절, HDP 증착-식각 비와 갭필, 에피 성장 기초, 3D 샤워헤드 |
| 11 | ald | ALD 반응과 포화 | 반쪽 반응과 자기 제한, TMA/H₂O 화학, 랭뮤어 흡착 동역학과 포화 노출량(랭뮤어 단위), 펄스·퍼지 시간 최적화, 퍼지 부족 시 CVD 성분, GPC와 입체 장애, ALD 온도 창, 핵생성 지연과 기판 의존, 3D 사이클 애니메이션 |
| 12 | aldadv | ALD 심화: 플라즈마·선택·고유전율 | PEALD(래디컬 플럭스·재결합·이온 손상), 공간 분할 ALD와 처리량, 영역 선택 증착(억제제, 선택도, 결함), ALE와의 대칭, HfO₂ 게이트 유전체(EOT·결정상), 금속 ALD(TiN, W 핵생성층), 전구체 선택 기준 |
| 13 | conformality | 피복성과 갭필 | 스텝 커버리지 정의, 시야각(view factor)과 직진 플럭스, 몬테카를로 입자 궤적과 부착 계수, 크누센 확산과 고종횡비 노출량(Gordon 모델), 오버행·심·보이드 형성, 증착-식각-증착, 유동성 CVD, 3D 트렌치 피복 |
| 14 | uniformity | 균일도와 로딩 | 균일도 지표(1σ %, 범위/2평균), 웨이퍼 안(온도·유동·플라즈마), 웨이퍼 사이(배치 고갈·적재 위치), 다구역 히터 보정, 회전과 샤워헤드 구멍 분포, 미시·거시 로딩과 패턴 밀도, 가장자리 효과 |
| 15 | quality | 막질: 밀도·조성·응력·전기 특성 | 밀도와 굴절률(로렌츠-로렌츠), 조성·수소·탄소 불순물, 습식 식각률(WER), 열 응력과 고유 응력, 스토니 식과 웨이퍼 휨, 누설 전류(파울러-노르트하임·풀-프렌켈), 항복과 TDDB, 막질 ↔ 장비 조건 지도 |
| 16 | metrology | 박막 계측과 공정 제어 | 반사율 박막 간섭, 엘립소메트리(Ψ, Δ), XRR(키에시그 무늬), XRF, 4탐침 면저항, 휨·응력 측정, 측정 산포와 게이지 R&R, SPC 관리도, 런투런(EWMA) 두께 제어 |
| 17 | integration | 응용과 통합: 게이트·배선·3D 낸드 | 게이트 스택(계면 SiO₂ + HfO₂ + TiN), 스페이서·라이너·CESL, STI 갭필, 배리어·시드·W 충전, 3D 낸드 ONO·산화막/질화막 적층, 하드마스크(비정질 탄소), 박막 공정 비용(CoO)과 처리량 |
| 18 | glossary | 용어집 & 종합 퀴즈 | 용어 검색, 플래시카드, 종합 퀴즈 |

장끼리 겹치는 주제는 한쪽에서 자세히, 다른 쪽에서는 짧게 다루고 링크한다(예: 스텝 커버리지 몬테카를로는 13장이 본진, 8장은 PVD 관점만).

## 이어지는 책
본문에서 자연스러울 때 서가 안의 책을 상대 경로로 링크한다(챕터에서 `../../process/`): ProcessBook(`process/` — 8대 공정 입문), DopingBook(`doping/` — 확산·어닐은 `doping/chapters/diffusion.html`, `doping/chapters/anneal.html`, `doping/chapters/budget.html`), EtchBook(`etch/` — 플라즈마는 `etch/chapters/plasma.html`, ALE는 `etch/chapters/ale.html`), CMPBook(`cmp/` — STI·구리 CMP), DeviceBook(`device/` — MOS 커패시터), MemoryBook(`memory/` — 3D 낸드), TCADBook(`tcad/` — 공정 시뮬레이션), InfraBook(`infra/` — 특수 가스 공급은 `infra/chapters/gas.html`, 배기는 `infra/chapters/exhaust.html`), FailureBook(`failure/`), YieldBook(`yield/`). 링크하기 전에 대상 파일이 실제로 있는지 확인한다.

## head 템플릿
```html
<!doctype html>
<!-- Copyright (c) 2026 geniuskey and ThinFilmBook contributors.
     Executable code: MIT (see ../../LICENSE-MIT).
     Text, illustrations, questions and explanations: CC-BY-4.0 (see ../../LICENSE.md). -->
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>열산화와 딜-그로브 모델 · ThinFilmBook</title>
<meta name="description" content="한 문장 설명">
<link rel="icon" type="image/svg+xml" href="../favicon.svg">
<link rel="stylesheet" href="../css/style.css">
<script src="../js/common.js"></script>
<!-- 3D가 필요한 페이지만 -->
<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/controls/OrbitControls.js"></script>
</head>
<body data-chapter="oxidation">
<main class="chapter">
  <header class="chapter-hero">
    <div class="eyebrow">Chapter 03</div>
    <h1>열산화와 딜-그로브 모델</h1>
    <p class="lead">...</p>
    <ul class="objectives"><li>...</li></ul>
  </header>

  <section id="intro"><h2>제목</h2> ... </section>   <!-- h2 번호와 우측 목차는 자동 생성 -->
  ...
  <section class="keypoints" id="summary"><h2>핵심 정리</h2><ol><li>...</li></ol></section>
  <section class="quiz-sec" id="quiz"><h2>확인 퀴즈</h2><div class="quiz"> ... </div></section>
</main>
<script> /* 페이지 스크립트: 여기서 TF 사용. 시뮬레이터마다 (function(){ ... })(); 로 감싼다 */ </script>
</body>
</html>
```
소스에는 `<title>`과 `<meta name="description">`만 쓴다. canonical, `theme-color`, Open Graph, Twitter 카드, JSON-LD는 `tools/build.mjs`가 파일 경로, `<title>`·description, `js/common.js`의 `CHAPTERS`, `thinfilm/book.json`의 `meta`, git 마지막 커밋 날짜로 배포물에 생성한다. 소스에 이 태그들이 남아 있으면 `npm test`와 빌드가 실패한다. description은 `<meta>` 한 줄에 쓴다. Analytics beacon은 넣지 않는다(빌드가 넣는다).
상단바, 챕터 서랍, 목차, 이전/다음, 푸터, 테마 토글, 퀴즈 동작, 검색은 `common.js`가 자동 처리한다.
수식은 `tools/katex.mjs`가 빌드할 때 KaTeX HTML로 렌더링하고, 배포물에는 KaTeX 스타일시트만 붙인다. 소스에 KaTeX 태그를 넣지 않는다. 소스 파일을 바로 열면 `common.js`가 CDN에서 KaTeX를 불러와 렌더링하므로 미리보기는 그대로 된다.

챕터를 추가할 때는 `js/common.js`의 `CHAPTERS`, 루트 `sitemap.xml`, `chapters/glossary.html`의 챕터 칩, `js/glossary-data.js`에도 함께 등록한다.

## 컴포넌트
```html
<figure class="diagram"><svg viewBox="0 0 800 300" role="img" aria-label="...">...</svg><figcaption><b>그림 3-1.</b> 설명</figcaption></figure>
```
SVG 안 유틸 클래스: `.t .t-dim .t-mono .t-acc`(텍스트), `.s-line .s-axis .s-acc .s-acc2`(선), `.f-surface .f-elev .f-acc .f-acc-soft .f-acc2 .f-acc2-soft .f-ok-soft .f-warn-soft .f-bad-soft`(면), 재료 면 `.m-*`, 재료 선 `.ms-*`.
SVG `<marker>`/`<linearGradient>` id는 페이지 안에서 겹치지 않게 그림마다 접두사를 붙인다. 페이지 전체에서 `id`가 중복되면 `npm test`가 실패한다.

```html
<div class="sim" id="sim-dg">
  <div class="sim-head"><span class="sim-tag">SIMULATOR</span><h3>제목</h3></div>   <!-- 3D는 <span class="sim-tag three">3D</span> -->
  <div class="sim-body side">                                    <!-- side: 넓은 화면에서 컨트롤을 오른쪽에 -->
    <div class="sim-view"><canvas id="cv-dg"></canvas></div>       <!-- 3D는 <div class="sim-view three" id="v3d"></div> -->
    <div class="sim-controls">
      <label class="ctrl"><span>온도 <output id="dg-T-out"></output></span><input type="range" id="dg-T" min="800" max="1200" step="5" value="1000"></label>
      <div class="ctrl"><span>분위기</span><div class="seg" id="dg-amb"><button data-value="dry" class="on">건식</button><button data-value="wet">습식</button></div></div>
      <label class="check"><input type="checkbox" id="dg-show"> 옵션</label>
      <button class="btn primary" id="dg-run">실행</button>
    </div>
  </div>
  <div class="sim-readout">
    <div class="stat"><span class="k">두께</span><span class="v" id="dg-x">—</span></div>
  </div>
  <div class="sim-note">해볼 것: ...</div>
</div>
```
`class="sim"`은 정확히 이 문자열로 쓴다(검사기가 `class="sim"`을 센다). 시뮬레이터 안 요소 id에는 시뮬레이터별 접두사를 붙여 중복을 피한다.
콜아웃: `<div class="callout">`, `.tip`, `.warn`, `.deep`(심화), `.fab`(TF-300 노트). 수식: `<div class="formula">$$...$$<div class="where">여기서 ...</div></div>`, 인라인 `\( ... \)`.
표: `<div class="table-wrap"><table>...</table></div>`. 퀴즈:
```html
<div class="quiz-q"><p>질문?</p><div class="opts">
  <button class="opt">보기</button><button class="opt" data-correct>정답</button>
</div><div class="quiz-exp">해설</div></div>
```
본문 첫 등장 핵심 용어는 `<span class="term">딜-그로브 모델</span>`처럼 강조할 수 있다(용어집 툴팁은 `js/glossary-data.js`로 자동 연결된다).

## JS 헬퍼 (`js/common.js`)
- `TF.canvas(el, (ctx,w,h)=>{}, {aspect:0.5, height, minHeight, maxHeight})` → `{ctx,w,h,redraw()}` HiDPI, 리사이즈/테마 시 자동 redraw(배경 `--canvas-bg`로 칠해 줌).
- `TF.chart(ctx, box|null, {x:[a,b], y:[a,b], logX, logY, xLabel, yLabel, series:[{data:[[x,y]],color,width,dash,fill}], vlines, hlines, points, bands, xFmt, yFmt})` → `{X,Y,box}`.
- `TF.loop(el, (dt,t)=>{})` 화면에 보일 때만 도는 rAF 루프 `{start,stop,toggle}`.
- `TF.range(id, fmt, onInput)` → getter `get()`, `get.set(v)`. `TF.seg(id, onChange)` → getter. `TF.stat(id, html)`.
- `TF.palette()` 테마 색(+ 재료 색 `si oxide nitride highk metal cu poly gas plasma`), `TF.color('accent')`, `TF.onTheme(cb)`, `TF.isDark()`.
- `TF.randn()`, `TF.poisson(λ)`, `TF.fmt(x, digits)`, `TF.si(x,'m')`, `TF.clamp/lerp/map`, `TF.C = {h,c,q,k,eps0,hbar,me}`.
- `TF.three(el, {camera:[x,y,z], target:[x,y,z], fov, autoRotate, minDistance, maxDistance})` → `T = {THREE, scene, camera, renderer, controls, onFrame(cb), label(html, Vector3|[x,y,z]), material(color, opts)}`. 조명/리사이즈/화면밖 정지 포함. 라벨의 `L.obj = mesh`로 두면 로컬 좌표를 따라감.

정확한 시그니처는 `js/common.js`를 직접 읽어 확인한다.

## 검사
저장소 루트에서 `npm test`(메타데이터·링크·스크립트 문법·id 중복·장별 최소 개수 경고)와 `npm run build`(KaTeX)를 돌린다. 브라우저 검사: `node tools/browser-check.cjs --offline thinfilm/`, 모바일 `node tools/browser-check.cjs --dist --mobile thinfilm/`(Playwright 필요).
