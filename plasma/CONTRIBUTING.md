# PlasmaBook 챕터 작성 가이드

PlasmaBook은 SemiBooks 서가(`semi.euiyun.com`)의 한 권이다. 배포 주소는 `https://semi.euiyun.com/plasma/`.
반도체 공정에 쓰이는 저온(저압) 플라즈마를 **물리 → 소스 → 진단·모델 → 공정**으로 깊이 다루는 플라즈마공학 교과서다. EtchBook 3–5장(플라스마·시스·반응기)과 ThinFilmBook 10장(PECVD)이 "공정에 필요한 만큼" 다룬 플라즈마를, 이 책은 **왜 그 전자 온도·밀도·이온 에너지가 나오는가**까지 계산한다. 중심 줄기는 **장비 손잡이**(압력, RF 전력, 주파수, 기체, 간격·코일, 바이어스, 펄스)와 **플라즈마 변수**(Tₑ, nₑ, EEDF, 시스 전압, 이온 플럭스·에너지, 래디컬 밀도)의 연결이다. 모든 장에서 "이 손잡이를 돌리면 플라즈마가 어떻게 바뀌는가"를 시뮬레이터로 보여 준다.

빌드 과정 없는 정적 사이트다. `plasma/index.html` + `plasma/chapters/<slug>.html` + 공통 `plasma/css/style.css`, `plasma/js/common.js`.
로컬 실행: 저장소 루트에서 `python3 -m http.server 8000` → http://localhost:8000/plasma/ (file://로 열어도 동작하게 classic script만 쓴다. ES module 금지.)

ThinFilmBook(`../thinfilm`)의 구조와 컴포넌트를 그대로 물려받았다. 전역 객체 이름만 `TF` → `PB`, 클래스 접두사만 `tf-` → `pb-`로 바뀌었다. ThinFilmBook 장(`../thinfilm/chapters/*.html`)은 형식의 좋은 본보기다(예: `vacuum.html`, `reactor.html`).

## 원칙
- **한국어**, 대상은 공대 학부생과 신입 공정·장비 엔지니어(일반물리 전자기학, 기초 열·통계역학, 미적분을 안다고 가정). 영어 원어는 `<span class="en">(Debye length)</span>`처럼 병기. 표기는 "플라즈마"(EtchBook의 "플라스마"가 아니라)로 통일한다. 래디컬, 시스, 보옴, 랭뮤어, 타운센드, 파셴으로 쓴다.
- 개념 → 직관 그림(SVG) → 수식(KaTeX) → 시뮬레이터 → 실제 수치 예(PL-300) → 요약/퀴즈 순서.
- **시각 자료와 인터랙티브 요소가 이 책의 핵심이다.** 한 장에 **시뮬레이터 7개 이상, 그림(figure) 7개 이상, 퀴즈 6문항 이상**. 글로 길게 설명할 것은 그림·애니메이션으로 보여 준다. 태그에 `3d`가 있는 장은 three.js 3D 시뮬레이터를 최소 1개 둔다.
- 시뮬레이터는 장식이 아니라 **계산하는 모델**이어야 한다(데바이 차폐 포아송 풀이, 맥스웰 분포 적분으로 구한 k(Tₑ), 몬테카를로 충돌, 2항 볼츠만 근사, 타운센드·파셴, 양극성 확산 고유모드, 보옴·차일드 시스, 전역 모델, 균질 CCP 모델, 변압기 모델, 전송선·스미스 차트, 잔광 감쇠 ODE, 반응 속도 방정식, 랭뮤어 탐침 I-V, 1D PIC 등). 입력을 끝까지 움직였을 때 물리적으로 말이 되는지(음수 밀도, 0으로 나누기, NaN, 무한 루프, 수치 발산) 확인한다. 쓰는 식은 본문에 적는다. 전자 사태, 입자 궤적, 시스 안 이온 가속, 출렁이는 RF 시스, 분포 함수 변화처럼 **움직이는 그림**을 적극 쓴다.
- 손잡이와 플라즈마 변수의 연결을 꼭 보여 준다: 각 장에 "조건 → 결과" 표나 시뮬레이터가 하나 이상 있어야 한다(예: 압력↑ → Tₑ↓·밀도 프로파일 중심 집중, 전력↑ → nₑ 비례 증가·Tₑ 거의 그대로, 주파수↑ → 같은 전압에서 밀도↑·이온 에너지 분포 좁아짐, 바이어스 전력↑ → 이온 에너지↑·플럭스 거의 그대로).
- 수치는 공개 자료(Lieberman & Lichtenberg *Principles of Plasma Discharges and Materials Processing*, Chabert & Braithwaite *Physics of Radio-Frequency Plasmas*, Chen *Introduction to Plasma Physics*, Raizer *Gas Discharge Physics*, Phelps·LXCat 단면적, 학회 논문)에서 합리적인 범위를 쓴다. 확실하지 않은 수치는 '약', '~'로 표기한다. 특정 회사의 내부 값처럼 쓰지 않는다. 상표명·장비 모델명 대신 일반 명칭을 쓴다.
- 외부 라이브러리는 KaTeX(빌드가 처리)와 아래 head 템플릿의 three.js r147만 쓴다. 이미지 파일 대신 인라인 SVG/canvas로 그린다.
- 색은 하드코딩하지 말고 CSS 변수나 `PB.palette()`를 쓴다. 라이트/다크 둘 다 읽혀야 한다. 3D 모델의 물리적 재질색(석영, 알루미늄, 세라믹)과 플라즈마 발광색은 고정색 가능.
- 모바일(폭 360px)에서 가로 스크롤이 생기면 안 된다. SVG는 `viewBox`만 주고 width/height 속성 생략. viewBox 폭은 900 이하로.
- 화면을 아껴 쓴다. 긴 여백, 큰 장식 영역을 만들지 않는다. 한 화면에 쓸모 있는 내용이 많이 보이게 한다.

## 수식 규칙 (빌드가 깨지지 않게)
- 인라인 `\( ... \)`, 블록 `$$ ... $$`. HTML 안에서 `<`는 `\lt`, `>`는 `\gt`, `&`는 `&amp;`로 쓴다.
- `\text{}` 안에 `·`, `°`, `µ`, 한글 이외의 특수 유니코드(가운뎃점 등)를 넣지 않는다. 곱은 `\cdot`, 도는 `^\circ`, 마이크로는 `\mu`를 `\text{}` 밖에서 쓴다. 한글은 `\text{}` 안에 넣어도 된다.
- 스크립트가 `\(`·`\[`·`$$`가 든 문자열을 DOM에 넣으면 안 된다(빌드는 정적 HTML의 수식만 렌더링한다). 시뮬레이터 출력에는 일반 텍스트·유니코드(x², µm, ·)를 쓴다.
- 작성 후 저장소 루트에서 `npm run build`가 성공해야 한다(KaTeX 문법 오류가 있으면 실패).

## 입자·재료 색 코드
책 전체에서 같은 입자·재료는 같은 색으로 그린다. SVG 면 클래스 `.m-electron .m-ion ...`, 선 클래스 `.ms-*`, 캔버스는 `PB.palette().electron` 등, 범례는 `<span class="m-key ion">이온</span>`.

| 키 | 뜻 |
|---|---|
| electron | 전자, 전자 밀도·전자 전류 |
| ion | 양이온(Ar⁺, CF₃⁺ …), 이온 플럭스·이온 전류 |
| negion | 음이온(F⁻, Cl⁻, O⁻) |
| radical | 래디컬·해리 생성물(F, Cl, O, CFₓ, SiH₃) |
| neutral | 바탕 기체·중성 분자 |
| photon | 광자·발광·UV |
| si | 실리콘 웨이퍼·기판 |
| oxide | 산화막·유전체 창(석영·세라믹) |
| metal | 전극·챔버 벽·코일 |
| polymer | 고분자·증착물·벽 코팅 |
| glow | 플라즈마 글로(벌크 발광 영역) |

## 교육용 기준 장비 PL-300 (가상)
모든 장이 같은 가상 장비군을 예로 든다. 실제 특정 장비가 아니다. 장마다 `<div class="callout fab"><strong>제목</strong>...</div>`로 "PL-300 노트"를 1~3개 둔다(접두어 "PL-300 노트 · "는 CSS가 붙인다). 계산 결과가 이 표와 어긋나면 표가 맞는 쪽으로 맞추거나 본문에 이유를 쓴다.

| 모듈 | 값(교육용 가정) |
|---|---|
| 공통 | 300 mm 웨이퍼. 기준 기체 Ar(질량 40 u, 이온화 15.76 eV, 대표 여기 12.14 eV), 기체 온도 300 K, 이온-중성 충돌 단면적 \(\sigma_i \approx 1\times10^{-18}\) m². 1 mTorr에서 \(n_g \approx 3.2\times10^{19}\) m⁻³ |
| Ar 반응 속도 계수 (Lieberman 근사, m³/s, Tₑ는 eV) | 이온화 \(K_{iz} = 2.34\times10^{-14}\,T_e^{0.59}e^{-17.44/T_e}\), 여기 \(K_{ex} = 2.48\times10^{-14}\,T_e^{0.33}e^{-12.78/T_e}\), 탄성 \(K_{el} = 2.336\times10^{-14}\,T_e^{1.609}\exp(0.0618\ln^2T_e - 0.1171\ln^3T_e)\). 전자-이온 쌍당 충돌 손실 \(\mathcal{E}_c\): Tₑ = 2 eV 약 127 eV, 3 eV 약 62 eV, 4 eV 약 45 eV, 5 eV 약 37 eV |
| **IC 모듈** (ICP 식각·고밀도 소스) | 원통 챔버 반지름 0.25 m, 창-웨이퍼 높이 0.10 m, 세라믹 창 위 평면 나선 코일 13.56 MHz 0–3 kW, 정전척 바이어스 13.56 MHz 0–1.5 kW, 압력 2–50 mTorr(기준 10 mTorr). Ar 10 mTorr, 흡수 전력 1.5 kW → 전역 모델로 Tₑ 약 2.5 eV, nₑ(중심) 약 4×10¹¹ cm⁻³, 보옴 속도 약 2.4 km/s, 이온 평균 자유 행로 약 3 mm. E→H 전환 약 100–200 W, H 모드 전력 전달 효율 약 85 % |
| **CP 모듈** (이중 주파수 CCP 유전체 식각) | 전극 지름 330 mm, 간격 25 mm, 위 샤워헤드 접지, 아래 전극에 60 MHz 소스 0–2 kW + 2 MHz 바이어스 0–5 kW, 압력 10–200 mTorr(기준 30 mTorr), Ar/C₄F₈/O₂. 60 MHz 1 kW → nₑ 약 5×10¹⁰ cm⁻³, Tₑ 약 3 eV. 2 MHz 3 kW → RF 전압 진폭 약 1 kV, 자기 바이어스 약 −700 V, 이온 에너지 수백 eV ~ 약 1.2 keV의 두 봉우리 분포 |
| **RP 원격 플라즈마** (챔버 세정·애싱) | 토로이달 변압기형 400 kHz, 최대 8 kW, NF₃/Ar 1–10 Torr, NF₃ 해리율 95 % 이상, F 원자를 수송관으로 챔버에 공급. 애싱 모드 O₂/N₂ 마이크로파 2.45 GHz 3 kW |
| **PE 모듈** (PECVD·스퍼터 기준) | PECVD 평행판 13.56 MHz 0–1 kW, 간격 10 mm, 3 Torr, 400 °C (ThinFilmBook TF-300 PE 모듈과 같은 값). DC 마그네트론 Ar 3 mTorr, 20 kW, 방전 전압 약 −400 ~ −600 V |
| RF 전달 | 발생기 출력 임피던스 50 Ω, L형 자동 정합기(진공 가변 커패시터 2개, 기계식 정합 약 0.5–1 s), 주파수 튜닝 ±5 %(수 ms), 반사 전력 목표 1 % 미만, 아크 감지 수 µs |
| 펄스 | 소스·바이어스 펄스 0.1–20 kHz, 듀티 10–90 %, 동기·지연 펄스 가능 |
| 진단 | 랭뮤어 탐침: 텅스텐 반지름 0.1 mm, 길이 5 mm, 스윕 −60 ~ +30 V. 발광 분광기(OES) 200–900 nm, 분해능 약 0.5 nm(액티노메트리: Ar 750.4 nm, F 703.7 nm, O 844.6 nm). V-I 탐침(기본파·고조파 5차까지), 헤어핀 공진 탐침 1.5–6 GHz, 웨이퍼형 지연 전위 분석기(RFEA) |
| 목표 사양 | IC 모듈 이온 플럭스 반경 균일도 ±3 % 이내(300 mm), 바이어스 이온 에너지 재현성 ±2 %, 챔버 간 nₑ 매칭 ±5 %, 정합 후 반사 전력 1 % 미만, 대전 손상: 안테나비 10⁴ 구조에서 게이트 누설 증가 없음 |

## 장 목록 (slug와 담당 주제)
| 장 | slug | 제목 | 핵심 내용 |
|---|---|---|---|
| 01 | overview | 플라즈마의 지도 | 물질의 네 번째 상태, (nₑ, Tₑ) 지도(우주·형광등·공정·핵융합), 저온 비평형 플라즈마(Tₑ ≫ Tᵢ ≈ T_g), 반도체 공정이 플라즈마를 쓰는 이유(저온 화학, 방향성 이온), 플라즈마 장비 공통 구조(챔버·전원·정합기·가스·펌프·척), 3D 장비, 책 지도 |
| 02 | scales | 플라즈마의 척도 | 준중성, 데바이 차폐(1D 포아송-볼츠만 풀이), 플라즈마 주파수와 전자 진동, 플라즈마 파라미터 N_D, 전리도와 사하 식(열평형과 비교), 결합 파라미터, 전자기파 차단(차단 밀도), 척도 계산기 |
| 03 | collisions | 충돌과 반응 속도 | 단면적과 평균 자유 행로, 충돌 주파수, 탄성·여기·이온화·부착·해리·전하 교환, 에너지 전달 2m/M, 램사우어 최소, 맥스웰 분포 적분 k = ⟨σv⟩, 문턱과 지수 꼬리, 전자-이온 쌍당 에너지 𝓔_c, 몬테카를로 충돌 |
| 04 | eedf | 전자 에너지 분포 | EEDF·EEPF 정의와 로그 그래프, 맥스웰·드루이베스테인·두 온도, 2항 볼츠만 근사와 E/N(Td), 탄성 가열과 비탄성 손실의 균형, 꼬리 고갈과 반응 속도 민감도, 전자-전자 충돌로 맥스웰화, 저압 ICP의 비국소 EEDF |
| 05 | breakdown | 방전 개시와 직류 글로 | 1차 타운센드 계수 α(E/p), 2차 계수 γ, 자체 유지 조건, 파셴 곡선과 최소, 전류-전압 곡선(암흑·정상 글로·이상 글로·아크), 직류 글로 구조(음극 강하·부 글로·양광주), RF 방전 개시, 할로우 캐소드, 마그네트론 방전 기초 |
| 06 | transport | 수송: 이동도·확산·양극성 | 표류 속도와 이동도, 확산과 아인슈타인 관계, 양극성 확산과 양극성 전기장, 원통 고유모드(J₀·cos) 밀도 프로파일과 확산 길이, 저압의 보옴-고드 가장자리 비 h_L·h_R, 자기장 속 수송(라모어 반지름, 자화, 가둠), 확산 시간 |
| 07 | sheath | 시스와 보옴 기준 | 벽의 부유 전위(전자·이온 플럭스 균형), 보옴 기준과 예비 시스, 행렬 시스·차일드 법칙 시스 두께, 충돌 시스, 시스 안 이온 궤적, RF 시스: 정류·자기 바이어스와 면적비(V₁/V₂ = (A₂/A₁)^q), 이온 에너지 분포(IEDF) 두 봉우리와 폭 ∝ 1/(ω·τᵢ) |
| 08 | global | 전역 모델: 입자·전력 균형 | 입자 균형 → Tₑ (Kiz(Tₑ)/u_B = 1/(n_g d_eff)), 전력 균형 → n₀ (P = e n₀ u_B A_eff 𝓔_T), 압력·크기·전력 스케일링, 이온당 손실 에너지 분해, 전기 음성 플라즈마(부착·탈리, α = n₋/nₑ, 이온-이온 플라즈마), 혼합 기체, 시간 의존 전역 모델 |
| 09 | ccp | 용량 결합 플라즈마 | 균질 모델(벌크 저항 + 두 시스 커패시터), 저항 가열과 확률(무충돌) 가열, 시스 전압·전류·전력 스케일링, α·γ 모드, 주파수 효과(n ∝ ω²), 이중 주파수 분리의 한계(주파수 결합), VHF 정상파·표피 효과와 균일도, 비대칭 방전 자기 바이어스, 3D 이중 주파수 CCP |
| 10 | icp | 유도 결합 플라즈마와 고밀도 소스 | 코일 전류 → 방위각 유도 전기장, 표피 깊이(충돌·무충돌), 변압기 모델(R_p, L_p), 전력 전달 효율 R_p/(R_p+R_coil), E-H 모드 전환과 히스테리시스, 정전 결합과 패러데이 차폐, 코일 설계와 균일도, 헬리콘·ECR·마이크로파 표면파 개요, 3D ICP 챔버 |
| 11 | rf | RF 전력 전달과 임피던스 정합 | 전송선과 특성 임피던스, 반사 계수 Γ와 VSWR, 스미스 차트, 플라즈마 부하 임피던스(R + jX, 전력에 따라 변함), L형 정합 회로 설계, 자동 정합 알고리즘과 주파수 튜닝, 정합기 손실과 전력 전달, 고조파·상호 변조(이중 주파수), 아크 감지, V-I 탐침 기초 |
| 12 | pulsed | 펄스 플라즈마와 맞춤 파형 | 펄스 주기·듀티, 잔광에서 Tₑ 급랭(~µs)과 nₑ 감쇠(작은 챔버 수십 µs, IC 모듈 크기에서 약 300 µs), 시간 평균 vs 순간 값, 음이온 추출과 대전 완화, 소스·바이어스 동기 펄스, HiPIMS, 맞춤 바이어스 파형(펄스 DC·톱니파)으로 좁은 IEDF, 펄스 시 정합 문제 |
| 13 | chemistry | 플라즈마 화학과 래디컬 | 전자 충돌 해리 속도, 래디컬 생성-손실 균형(체류 시간·벽 재결합 계수 γ·펌핑), CF₄/O₂ 반응 네트워크와 F 밀도 최대, Cl₂, SiH₄(PECVD), NF₃ 원격 플라즈마 세정, 기체 온도, 래디컬 플럭스 계산(Γ = n v̄/4), 체류 시간과 유량, 기상 입자(먼지 플라즈마) |
| 14 | surface | 플라즈마-표면 상호작용과 손상 | 이온 에너지 플럭스와 웨이퍼 가열(He 후면 냉각), 스퍼터 수율·문턱, 이온-중성 시너지(이온 강화 식각 수율 모델), 2차 전자 방출 γ, 벽 재결합과 챔버 시즈닝·메모리 효과, 대전 손상(안테나 효과, 전자 그늘), VUV 광자 손상, 손상 완화 조건 지도 |
| 15 | diagnostics | 플라즈마 진단 | 랭뮤어 탐침 I-V(이온 포화·전자 지연·전자 포화, Tₑ·n·V_p·V_f), 드루이베스테인법 EEDF, RF 보상 탐침, 발광 분광(OES)과 액티노메트리, 종말점 응용, V-I 탐침과 플라즈마 임피던스, 헤어핀 공진 탐침·마이크로파 간섭계, 지연 전위 분석기(IEDF), 질량 분석, 3D 탐침 스캔 |
| 16 | modeling | 플라즈마 모델링: 유체·PIC·하이브리드 | 모델 위계(전역·유체·운동론), 표류-확산 근사 유체 모델과 포아송, 국소장 vs 국소 평균 에너지, PIC/MCC(입자 밀기·전하 할당·장 풀이·충돌, 안정 조건 Δx < λ_D, ω_pe Δt < 0.2), 1D PIC 실습, 하이브리드·2D 장비 모델, 검증·교정(진단과 비교), 계산 비용 |
| 17 | applications | 반도체 공정의 플라즈마 | 공정별 소스·조건 표(유전체 식각 CCP, 도체 식각 ICP, PECVD, PVD 마그네트론, 애싱·원격 세정, 플라즈마 도핑, 표면 처리), 공정 창(압력·전력·바이어스 지도), 챔버 매칭과 FDC(V-I·OES 신호), 예방 정비와 시즈닝, 플라즈마 공정 비용, 미래(원자층 공정, 극저온, 대기압) |
| 18 | glossary | 용어집 & 종합 퀴즈 | 용어 검색, 플래시카드, 종합 퀴즈 |

장끼리 겹치는 주제는 한쪽에서 자세히, 다른 쪽에서는 짧게 다루고 링크한다(예: 전역 모델은 8장이 본진, 9·10장은 결과만 가져다 쓴다. 시스 물리는 7장이 본진, 9장은 CCP 관점만).

## 이어지는 책
본문에서 자연스러울 때 서가 안의 책을 상대 경로로 링크한다(챕터에서 `../../etch/`): EtchBook(`etch/` — 공정 관점 플라스마 `etch/chapters/plasma.html`, 시스 `etch/chapters/sheath.html`, 반응기 `etch/chapters/reactors.html`, 이온-라디칼 시너지 `etch/chapters/surface.html`, 종말점 `etch/chapters/endpoint.html`, ALE `etch/chapters/ale.html`, 고종횡비 `etch/chapters/har.html`), ThinFilmBook(`thinfilm/` — 진공 `thinfilm/chapters/vacuum.html`, 스퍼터 `thinfilm/chapters/pvd.html`, `thinfilm/chapters/sputter.html`, PECVD `thinfilm/chapters/reactor.html`, PEALD `thinfilm/chapters/aldadv.html`), ProcessBook(`process/`), InfraBook(`infra/` — 가스 `infra/chapters/gas.html`, 배기·스크러버 `infra/chapters/exhaust.html`, 전력 `infra/chapters/power.html`), TCADBook(`tcad/`), DeviceBook(`device/` — 게이트 산화막 손상), YieldBook(`yield/`). 링크하기 전에 대상 파일이 실제로 있는지 확인한다.

## head 템플릿
```html
<!doctype html>
<!-- Copyright (c) 2026 geniuskey and PlasmaBook contributors.
     Executable code: MIT (see ../../LICENSE-MIT).
     Text, illustrations, questions and explanations: CC-BY-4.0 (see ../../LICENSE.md). -->
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>시스와 보옴 기준 · PlasmaBook</title>
<meta name="description" content="한 문장 설명">
<link rel="icon" type="image/svg+xml" href="../favicon.svg">
<link rel="stylesheet" href="../css/style.css">
<script src="../js/common.js"></script>
<!-- 3D가 필요한 페이지만 -->
<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/controls/OrbitControls.js"></script>
</head>
<body data-chapter="sheath">
<main class="chapter">
  <header class="chapter-hero">
    <div class="eyebrow">Chapter 07</div>
    <h1>시스와 보옴 기준</h1>
    <p class="lead">...</p>
    <ul class="objectives"><li>...</li></ul>
  </header>

  <section id="intro"><h2>제목</h2> ... </section>   <!-- h2 번호와 우측 목차는 자동 생성 -->
  ...
  <section class="keypoints" id="summary"><h2>핵심 정리</h2><ol><li>...</li></ol></section>
  <section class="quiz-sec" id="quiz"><h2>확인 퀴즈</h2><div class="quiz"> ... </div></section>
</main>
<script> /* 페이지 스크립트: 여기서 PB 사용. 시뮬레이터마다 (function(){ ... })(); 로 감싼다 */ </script>
</body>
</html>
```
소스에는 `<title>`과 `<meta name="description">`만 쓴다. canonical, `theme-color`, Open Graph, Twitter 카드, JSON-LD는 `tools/build.mjs`가 파일 경로, `<title>`·description, `js/common.js`의 `CHAPTERS`, `plasma/book.json`의 `meta`, git 마지막 커밋 날짜로 배포물에 생성한다. 소스에 이 태그들이 남아 있으면 `npm test`와 빌드가 실패한다. description은 `<meta>` 한 줄에 쓴다. Analytics beacon은 넣지 않는다(빌드가 넣는다).
상단바, 챕터 서랍, 목차, 이전/다음, 푸터, 테마 토글, 퀴즈 동작, 검색은 `common.js`가 자동 처리한다.
수식은 `tools/katex.mjs`가 빌드할 때 KaTeX HTML로 렌더링하고, 배포물에는 KaTeX 스타일시트만 붙인다. 소스에 KaTeX 태그를 넣지 않는다. 소스 파일을 바로 열면 `common.js`가 CDN에서 KaTeX를 불러와 렌더링하므로 미리보기는 그대로 된다.

챕터를 추가할 때는 `js/common.js`의 `CHAPTERS`, 루트 `sitemap.xml`, `chapters/glossary.html`의 챕터 칩, `js/glossary-data.js`에도 함께 등록한다.

## 컴포넌트
```html
<figure class="diagram"><svg viewBox="0 0 800 300" role="img" aria-label="...">...</svg><figcaption><b>그림 7-1.</b> 설명</figcaption></figure>
```
SVG 안 유틸 클래스: `.t .t-dim .t-mono .t-acc`(텍스트), `.s-line .s-axis .s-acc .s-acc2`(선), `.f-surface .f-elev .f-acc .f-acc-soft .f-acc2 .f-acc2-soft .f-ok-soft .f-warn-soft .f-bad-soft`(면), 재료 면 `.m-*`, 재료 선 `.ms-*`.
SVG `<marker>`/`<linearGradient>` id는 페이지 안에서 겹치지 않게 그림마다 접두사를 붙인다. 페이지 전체에서 `id`가 중복되면 `npm test`가 실패한다.

```html
<div class="sim" id="sim-child">
  <div class="sim-head"><span class="sim-tag">SIMULATOR</span><h3>제목</h3></div>   <!-- 3D는 <span class="sim-tag three">3D</span> -->
  <div class="sim-body side">                                    <!-- side: 넓은 화면에서 컨트롤을 오른쪽에 -->
    <div class="sim-view"><canvas id="cv-child"></canvas></div>       <!-- 3D는 <div class="sim-view three" id="v3d"></div> -->
    <div class="sim-controls">
      <label class="ctrl"><span>온도 <output id="ch-T-out"></output></span><input type="range" id="ch-T" min="800" max="1200" step="5" value="1000"></label>
      <div class="ctrl"><span>분위기</span><div class="seg" id="ch-amb"><button data-value="dry" class="on">건식</button><button data-value="wet">습식</button></div></div>
      <label class="check"><input type="checkbox" id="ch-show"> 옵션</label>
      <button class="btn primary" id="ch-run">실행</button>
    </div>
  </div>
  <div class="sim-readout">
    <div class="stat"><span class="k">두께</span><span class="v" id="ch-x">—</span></div>
  </div>
  <div class="sim-note">해볼 것: ...</div>
</div>
```
`class="sim"`은 정확히 이 문자열로 쓴다(검사기가 `class="sim"`을 센다). 시뮬레이터 안 요소 id에는 시뮬레이터별 접두사를 붙여 중복을 피한다.
콜아웃: `<div class="callout">`, `.tip`, `.warn`, `.deep`(심화), `.fab`(PL-300 노트). 수식: `<div class="formula">$$...$$<div class="where">여기서 ...</div></div>`, 인라인 `\( ... \)`.
표: `<div class="table-wrap"><table>...</table></div>`. 퀴즈:
```html
<div class="quiz-q"><p>질문?</p><div class="opts">
  <button class="opt">보기</button><button class="opt" data-correct>정답</button>
</div><div class="quiz-exp">해설</div></div>
```
본문 첫 등장 핵심 용어는 `<span class="term">보옴 기준</span>`처럼 강조할 수 있다(용어집 툴팁은 `js/glossary-data.js`로 자동 연결된다).

## JS 헬퍼 (`js/common.js`)
- `PB.canvas(el, (ctx,w,h)=>{}, {aspect:0.5, height, minHeight, maxHeight})` → `{ctx,w,h,redraw()}` HiDPI, 리사이즈/테마 시 자동 redraw(배경 `--canvas-bg`로 칠해 줌).
- `PB.chart(ctx, box|null, {x:[a,b], y:[a,b], logX, logY, xLabel, yLabel, series:[{data:[[x,y]],color,width,dash,fill}], vlines, hlines, points, bands, xFmt, yFmt})` → `{X,Y,box}`.
- `PB.loop(el, (dt,t)=>{})` 화면에 보일 때만 도는 rAF 루프 `{start,stop,toggle}`.
- `PB.range(id, fmt, onInput)` → getter `get()`, `get.set(v)`. `PB.seg(id, onChange)` → getter. `PB.stat(id, html)`.
- `PB.palette()` 테마 색(+ 재료 색 `electron ion negion radical neutral photon si oxide metal polymer glow`), `PB.color('accent')`, `PB.onTheme(cb)`, `PB.isDark()`.
- `PB.randn()`, `PB.poisson(λ)`, `PB.fmt(x, digits)`, `PB.si(x,'m')`, `PB.clamp/lerp/map`, `PB.C = {h,c,q,k,eps0,hbar,me}`.
- `PB.three(el, {camera:[x,y,z], target:[x,y,z], fov, autoRotate, minDistance, maxDistance})` → `T = {THREE, scene, camera, renderer, controls, onFrame(cb), label(html, Vector3|[x,y,z]), material(color, opts)}`. 조명/리사이즈/화면밖 정지 포함. 라벨의 `L.obj = mesh`로 두면 로컬 좌표를 따라감.

정확한 시그니처는 `js/common.js`를 직접 읽어 확인한다.

## 검사
저장소 루트에서 `npm test`(메타데이터·링크·스크립트 문법·id 중복·장별 최소 개수 경고)와 `npm run build`(KaTeX)를 돌린다. 브라우저 검사: `node tools/browser-check.cjs --offline plasma/`, 모바일 `node tools/browser-check.cjs --dist --mobile plasma/`(Playwright 필요).
