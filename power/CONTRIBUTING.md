# PowerBook 챕터 작성 가이드

PowerBook은 SemiBooks 서가(`semi.euiyun.com`)의 한 권이다. 배포 주소는 `https://semi.euiyun.com/power/`.
전기를 바꾸는 반도체, 곧 **전력 반도체**를 **재료·항복 물리 → 소자(다이오드·MOSFET·IGBT·SiC·GaN) → 스위칭과 구동 → 변환 회로(DC-DC·PFC·인버터) → 열·패키징·신뢰성 → 응용**으로 깊이 다루는 교과서다. DeviceBook 14장(`../device/chapters/power.html`)이 "소자 물리 한 장"으로 훑은 내용을, 이 책은 **스위치 하나가 컨버터 효율·온도·수명을 어떻게 정하는가**까지 계산한다. 중심 줄기는 세 가지 트레이드오프다.
1. **항복 전압 ↔ 온저항**(재료와 드리프트층이 정한다, \(R_{on,sp} \propto BV^{2.5}\))
2. **전도 손실 ↔ 스위칭 손실**(소자 크기·스위칭 주파수·게이트 저항이 정한다)
3. **스위칭 속도 ↔ 오버슈트·EMI·신뢰성**(기생 인덕턴스·dv/dt·패키지가 정한다)
모든 장에서 "이 손잡이(재료, 도핑·두께, 다이 면적, 게이트 저항, 스위칭 주파수, 데드 타임, 냉각)를 돌리면 손실·온도·파형이 어떻게 바뀌는가"를 시뮬레이터로 보여 준다.

빌드 과정 없는 정적 사이트다. `power/index.html` + `power/chapters/<slug>.html` + 공통 `power/css/style.css`, `power/js/common.js`.
로컬 실행: 저장소 루트에서 `python3 -m http.server 8000` → http://localhost:8000/power/ (file://로 열어도 동작하게 classic script만 쓴다. ES module 금지.)

PlasmaBook(`../plasma`)의 구조와 컴포넌트를 그대로 물려받았다. 전역 객체 이름만 `PB` → `PW`, 클래스 접두사만 `pb-` → `pw-`로 바뀌었다. PlasmaBook 장(`../plasma/chapters/*.html`, 예: `sheath.html`, `rf.html`, `ccp.html`)은 형식의 좋은 본보기다. **`js/common.js`와 `css/style.css`는 수정하지 않는다**(여러 장이 동시에 쓰인다). 장 전용 스타일은 그 장의 `<style>`에, 장 전용 함수는 그 장의 `<script>`에 둔다.

## 원칙
- **한국어**, 대상은 공대 학부생과 신입 소자·회로·시스템 엔지니어(반도체 물리 기초 — pn 접합·MOSFET, 회로 이론, 미적분을 안다고 가정). 영어 원어는 `<span class="en">(on-resistance)</span>`처럼 병기. 표기: 온저항, 항복 전압, 드리프트층, 슈퍼정션, 바디 다이오드, 역회복, 데드 타임, 게이트 드라이버, 접합 온도, 열저항, 파워 사이클링, 쇼트키, 바리가(Baliga), 2차원 전자 가스(2DEG). 소자 기호는 \(V_{DS}, I_D, V_{GS}, V_{CE}, R_{DS(on)}, Q_G, Q_{rr}, E_{on}, E_{off}, T_j, R_{th}\).
- 개념 → 직관 그림(SVG) → 수식(KaTeX) → 시뮬레이터 → 실제 수치 예(PW-800) → 요약/퀴즈 순서.
- **시각 자료와 인터랙티브 요소가 이 책의 핵심이다.** 한 장에 **시뮬레이터 7개 이상, 그림(figure) 7개 이상, 퀴즈 6문항 이상**. 글로 길게 설명할 것은 그림·애니메이션으로 보여 준다. 태그에 `3d`가 있는 장은 three.js 3D 시뮬레이터를 최소 1개 둔다.
- 시뮬레이터는 장식이 아니라 **계산하는 모델**이어야 한다(1D 포아송 전계 풀이, 이온화 적분, 바리가 한계, 2D 라플라스/포아송 완화법, 전하 제어 다이오드 역회복, 온저항 성분 합, 비선형 커패시턴스와 게이트 전하 적분, 슈퍼정션 전하 균형, 분극 전하와 2DEG 밀도, 이중 펄스 시험 파형 적분, RLC 오버슈트 ODE, 벅·부스트 상태 평균, LLC 이득 곡선, PWM 비교기·3상 전류 리플·FFT/THD, 포스터 열 회로 과도 응답, 레인플로 계수·코핀-맨슨 수명 등). 입력을 끝까지 움직였을 때 물리적으로 말이 되는지(음수 저항, 0으로 나누기, NaN, 무한 루프, 수치 발산) 확인한다. 쓰는 식은 본문에 적는다. 스위칭 파형, 전계 분포가 변하는 모습, PWM 비교, 전류 경로, 온도 리플처럼 **움직이는 그림**을 적극 쓴다.
- 손잡이와 결과의 연결을 꼭 보여 준다: 각 장에 "조건 → 결과" 표나 시뮬레이터가 하나 이상 있어야 한다(예: 드리프트 도핑↓ → 항복 전압↑·온저항↑, 게이트 저항↑ → 스위칭 손실↑·오버슈트↓, 스위칭 주파수↑ → 수동 소자 작아짐·스위칭 손실↑, 접합 온도↑ → SiC MOSFET 온저항↑·IGBT 꼬리 전류↑, ΔTj↑ → 파워 사이클 수명↓).
- 수치는 공개 자료(Baliga *Fundamentals of Power Semiconductor Devices*, Lutz 외 *Semiconductor Power Devices*, Kimoto & Cooper *Fundamentals of Silicon Carbide Technology*, Mohan *Power Electronics*, Erickson & Maksimović *Fundamentals of Power Electronics*, 학회 논문·공개 데이터시트의 대표 범위)에서 합리적인 값을 쓴다. 확실하지 않은 수치는 '약', '~'로 표기한다. 특정 회사의 제품 값처럼 쓰지 않는다. 상표명·제품 모델명 대신 일반 명칭을 쓴다.
- 외부 라이브러리는 KaTeX(빌드가 처리)와 아래 head 템플릿의 three.js r147만 쓴다. 이미지 파일 대신 인라인 SVG/canvas로 그린다.
- 색은 하드코딩하지 말고 CSS 변수나 `PW.palette()`를 쓴다. 라이트/다크 둘 다 읽혀야 한다. 3D 모델의 물리적 재질색(구리, 알루미늄, 세라믹, 실리콘 젤)은 고정색 가능.
- 모바일(폭 360px)에서 가로 스크롤이 생기면 안 된다. SVG는 `viewBox`만 주고 width/height 속성 생략. viewBox 폭은 900 이하로.
- 화면을 아껴 쓴다. 긴 여백, 큰 장식 영역을 만들지 않는다. 한 화면에 쓸모 있는 내용이 많이 보이게 한다.
- 회로도는 SVG로 그리되 소자 기호(MOSFET, IGBT, 다이오드, 인덕터, 커패시터)를 일관되게 그린다. 전압 파형은 `volt` 색, 전류 파형은 `amp` 색, 손실·전력은 `heat` 색을 쓴다.

## 재료·물리량 색 코드
책 전체에서 같은 재료·물리량은 같은 색으로 그린다. SVG 면 클래스 `.m-sic .m-gan ...`, 선 클래스 `.ms-*`, 캔버스는 `PW.palette().sic` 등, 범례는 `<span class="m-key sic">SiC</span>`.

| 키 | 뜻 |
|---|---|
| electron | 전자, n형 영역, 전자 전류 |
| hole | 정공, p형 영역, 정공 전류 |
| field | 전계 분포 \(E(x)\), 공핍 영역 강조 |
| volt | 전압 파형 \(v_{DS}, v_{CE}\), 전압원 |
| amp | 전류 파형 \(i_D, i_C, i_L\), 전류 경로 |
| heat | 손실·전력·온도, 열 흐름 |
| si | 실리콘 |
| sic | 탄화규소(4H-SiC) |
| gan | 질화갈륨(GaN, AlGaN) |
| oxide | 게이트 산화막·패시베이션·유전체 |
| metal | 알루미늄 금속화·본드 와이어·전극 |
| copper | 구리(DBC 구리층, 버스바, 베이스판, 클립) |
| ceramic | 세라믹 기판(Al₂O₃, AlN, Si₃N₄) |
| solder | 솔더·소결 은 접합층 |
| mold | 몰드 수지·실리콘 젤·하우징 |

## 교육용 기준 플랫폼 PW-800 (가상)
모든 장이 같은 가상 플랫폼을 예로 든다. 실제 특정 제품이 아니다. 장마다 `<div class="callout fab"><strong>제목</strong>...</div>`로 "PW-800 노트"를 1~3개 둔다(접두어 "PW-800 노트 · "는 CSS가 붙인다). 계산 결과가 이 표와 어긋나면 표가 맞는 쪽으로 맞추거나 본문에 이유를 쓴다.

| 모듈 | 값(교육용 가정) |
|---|---|
| **TI 트랙션 인버터** (본진) | 800 V급 전기차 3상 2레벨 전압형 인버터. DC 링크 공칭 800 V(운전 범위 550–850 V), 필름 커패시터 500 µF. 최대 출력 250 kW(10 s), 연속 150 kW. 상전류 최대 450 A rms(10 s), 연속 250 A rms. 역률 약 0.9. 스위칭 주파수 10 kHz(SiC), 비교용 Si IGBT 8 kHz. 모터 기본파 0–1 kHz. 데드 타임 SiC 200 ns, IGBT 1.5 µs. 냉각수 50/50 글리콜 65 °C, 10 L/min, 핀핀 직접 냉각. 최대 접합 온도 175 °C(설계 상한 150 °C 운전). 피크 효율 약 99 %(SiC), 약 98 %(IGBT) |
| TI용 SiC 하프 브리지 모듈 | 1200 V, 스위치당 SiC MOSFET 다이 8개 병렬(다이 약 4.5×4.5 mm, 다이당 \(R_{DS(on)}\) 약 16 mΩ at 25 °C) → 스위치 \(R_{DS(on)}\) 약 2.0 mΩ(25 °C), 약 3.2 mΩ(175 °C). 활성 영역 비온저항 약 2.5 mΩ·cm². 게이트 +18 V/−4 V, \(V_{GS(th)}\) 약 2.8 V(25 °C), 모듈 \(Q_G\) 약 1.3 µC, 외부 \(R_G\) 2.5 Ω. 800 V·400 A·150 °C에서 \(E_{on}\) 약 12 mJ, \(E_{off}\) 약 8 mJ, 바디 다이오드 \(E_{rr}\) 약 1 mJ. 단락 내량 약 2–3 µs. 열저항 \(R_{th,j-f}\) 약 0.12 K/W(스위치당, 접합-냉각수) |
| TI용 비교 Si IGBT 모듈 | 1200 V/600 A 필드 스톱 트렌치 IGBT + Si 프리휠 다이오드. \(V_{CE(sat)} \approx 0.9\,\text{V} + 2.0\,\text{m}\Omega \cdot I_C\)(150 °C, 400 A에서 약 1.7 V), 다이오드 \(V_F \approx 0.9\,\text{V} + 1.8\,\text{m}\Omega \cdot I_F\). 800 V·400 A·150 °C에서 \(E_{on}\) 약 40 mJ, \(E_{off}\) 약 45 mJ, \(E_{rr}\) 약 25 mJ. 게이트 +15 V/−8 V. 단락 내량 약 6–10 µs. \(R_{th,j-f}\) 약 0.10 K/W(IGBT), 0.16 K/W(다이오드) |
| 전력 루프 | 정류 루프 인덕턴스 약 15 nH(모듈 8 nH + 버스바·커패시터 7 nH). SiC 턴오프 di/dt 약 5–10 A/ns → 오버슈트 약 75–150 V. dv/dt 약 20–40 V/ns |
| 게이트 드라이버 | 절연형, 공통 모드 과도 내성(CMTI) 100 V/ns 이상, 피크 전류 ±20 A, DESAT 단락 감지 응답 1 µs 미만(SiC)·약 3–5 µs(IGBT), 소프트 턴오프, 능동 밀러 클램프, 부트스트랩 대신 절연 DC-DC 바이어스 전원 |
| **OB 온보드 충전기** | 11 kW(3상 400 VAC) / 7.4 kW(단상 230 VAC). 1단: 토템폴 PFC(고속 레그 650 V GaN 또는 SiC, 65 kHz CCM), DC 링크 약 800 V(단상 모드 약 400 V). 2단: 절연형 CLLC 공진 컨버터 1200 V SiC, 공진 주파수 약 200 kHz. 전체 효율 약 96 %, 역률 0.99 이상, 전류 THD 5 % 미만 |
| **GC GaN 충전기** | 65 W USB-C 어댑터, 입력 90–264 VAC. 능동 클램프 플라이백(ACF) 약 300 kHz, 650 V 증강형 GaN HEMT(\(R_{DS(on)}\) 약 150 mΩ, \(Q_G\) 약 3 nC, \(Q_{rr}\) 0). 동기 정류. 효율 약 93 %, 전력 밀도 약 2 W/cm³(약 30 W/in³) |
| **DC 서버 전원** | 데이터센터 48 V 버스 → 12 V, 1 kW, 4상 인터리브드 동기 벅, 100 V GaN(\(R_{DS(on)}\) 약 3 mΩ), 상당 500 kHz. 피크 효율 약 97.5 %. 비교: 같은 회로 Si MOSFET 200 kHz |
| 비교 기준 소자 (650 V급, 데이터시트 대표 범위) | Si 슈퍼정션 MOSFET 40 mΩ(\(Q_G\) 약 90 nC, 바디 다이오드 \(Q_{rr}\) 약 10 µC), SiC MOSFET 40 mΩ(\(Q_G\) 약 60 nC, \(Q_{rr}\) 약 0.1 µC), GaN HEMT 50 mΩ(\(Q_G\) 약 6 nC, \(Q_{rr}\) 0). 1200 V급: Si IGBT, SiC MOSFET 16 mΩ 다이 |
| 신뢰성 목표 | 수명 15년·주행 30만 km·운전 8,000시간, 파워 사이클링 \(\Delta T_j\) = 60 K에서 약 10⁶ 사이클 이상(소결·구리 와이어), 우주선 고장률 800 V에서 모듈당 10 FIT 미만, HTRB 1,000 h(\(0.8\,BV\), 175 °C), H3TRB 1,000 h(85 °C/85 %RH, 80 V) |

### 재료 상수 (실온, 교육용 대표값)
| 재료 | \(E_g\) (eV) | 임계 전계 \(E_c\) (MV/cm) | 전자 이동도 (cm²/V·s) | \(\varepsilon_r\) | 열전도 (W/cm·K) | 포화 속도 (cm/s) |
|---|---|---|---|---|---|---|
| Si | 1.12 | 약 0.3 | 1350 | 11.7 | 1.5 | 1×10⁷ |
| 4H-SiC | 3.26 | 약 2.5 (2–3) | 약 950 (c축, 벌크) | 9.7 | 약 3.7 (3.3–4.9) | 2×10⁷ |
| GaN | 3.39 | 약 3.3 | 약 1200 (벌크), 약 2000 (2DEG) | 9.0 | 약 1.3 (GaN-on-Si 실효), 2.3 (벌크) | 2.5×10⁷ |
| β-Ga₂O₃ | 4.8 | 약 8 (이론) | 약 200 | 10 | 0.1–0.27 | 약 2×10⁷ |
| 다이아몬드 | 5.47 | 약 10 | 약 2000 | 5.7 | 약 22 | 약 2.7×10⁷ |

- 바리가 성능 지수 \(\mathrm{BFOM} = \varepsilon \mu E_c^3\), 단극 한계 \(R_{on,sp} = 4BV^2/(\varepsilon\mu E_c^3)\).
- 충돌 이온화(Fulop/Baliga 근사, \(E\)는 V/cm): Si \(\alpha = 1.8\times10^{-35}E^7\) cm⁻¹ → 평행 평면 비펀치스루 \(BV = 5.34\times10^{13}N_D^{-3/4}\) V, \(W_{pp} = 2.67\times10^{10}N_D^{-7/8}\) cm, \(R_{on,sp} \approx 5.93\times10^{-9}BV^{2.5}\) Ω·cm². 4H-SiC \(\alpha = 3.9\times10^{-42}E^7\) → 이온화 적분으로 \(BV \approx 2.1\times10^{15}N_D^{-3/4}\), \(W \approx 1.5\times10^{11}N_D^{-7/8}\)(교재에 흔한 \(3.0\times10^{15}N_D^{-3/4}\)는 임계 전계를 약 18 % 높게 잡은 식), \(R_{on,sp} \approx 2.97\times10^{-12}BV^{2.5}\) Ω·cm². 정밀 계산은 체이노웨스 식 \(\alpha = a\,e^{-b/E}\)을 쓸 수 있다.
- PW-800 TI의 1200 V SiC 다이 드리프트층: 약 10 µm, \(N_D\) 약 8×10¹⁵ cm⁻³(펀치스루 설계), 4H-SiC 기판 약 350 µm를 약 150 µm로 연마.

## 장 목록 (slug와 담당 주제)
| 장 | slug | 제목 | 핵심 내용 |
|---|---|---|---|
| 01 | overview | 전력 반도체의 지도 | 전력 변환이란(AC↔DC, 전압·주파수 바꾸기), 선형 레귤레이터 vs 스위칭(효율), 이상 스위치와 실제 스위치(온저항·누설·스위칭 시간), 전압×전류×주파수 응용 지도와 소자(다이오드·MOSFET·IGBT·사이리스터)·재료(Si·SiC·GaN) 영역, 손실의 두 종류, 세계 전력 소비와 효율 1 %의 의미, 3D 인버터 해부(모듈·게이트 드라이버·DC 링크·냉각판), 책 지도 |
| 02 | materials | 재료: 밴드갭과 임계 전계 | 밴드갭과 임계 전계의 관계(\(E_c \propto E_g^{\sim2}\)), 같은 내압에서 드리프트층이 얇고 진하게, 바리가 성능 지수와 단극 한계 직선(로그 그래프), 고온 동작(진성 캐리어 밀도), 열전도, 4H-SiC 폴리타입·이방성, GaN 에피(사파이어·Si·SiC 기판), Ga₂O₃·다이아몬드·AlN, 웨이퍼 크기·결함 밀도·가격, 재료 비교 레이더 |
| 03 | breakdown | 항복과 드리프트층 | 충돌 이온화 계수, 이온화 적분 = 1 조건, 1D 포아송으로 삼각형/사다리꼴 전계, 평행 평면 접합 BV(N_D), 비펀치스루 vs 펀치스루 최적(\(W\)와 \(N_D\) 동시 최적화, 펀치스루 최적 약 \(W_{opt}\)), 드리프트층 저항 \(R_{drift} = W/(q\mu N_D)\), 단극 한계 유도, 온도와 BV(양의 온도 계수, 애벌런치 견고성), 누설 전류(생성·확산), 이 장의 1D 솔버 |
| 04 | termination | 에지 종단과 표면 전계 | 원통·구 접합의 전계 집중(\(r_j/W\)), 평면 항복 대비 효율(%), 필드 플레이트, 플로팅 가드 링(FLR)과 간격 최적화, 접합 종단 확장(JTE) 도즈 창(SiC), 표면 전하·이동 이온·습기, 패시베이션(폴리이미드·SIPOS), 2D 라플라스/포아송 완화법 전계 지도, 종단 면적이 다이 면적을 잡아먹는 비율 |
| 05 | diodes | 전력 다이오드: PiN과 쇼트키 | PiN 순방향(고수준 주입, 전도도 변조, \(V_F\)의 성분), 앰비폴라 수명과 확산 길이, 저장 전하 \(Q_s = I_F\tau\), 역회복 파형(\(t_{rr}, I_{rrm}, Q_{rr}\), 소프트 계수), 스냅 회복과 진동, 수명 제어(Pt·전자선·양성자), 쇼트키 열전자 방출과 장벽 저하, 누설과 온도, SiC 쇼트키·JBS·MPS(서지 전류), 다이오드 선택 표, 전하 제어 역회복 시뮬레이터 |
| 06 | mosfet | 전력 MOSFET과 슈퍼정션 | 평면 VDMOS·트렌치 MOSFET 구조, 온저항 성분(채널·축적·JFET·드리프트·기판·패키지)과 전압 등급별 비중, 셀 피치, 출력 특성과 포화, 비선형 \(C_{iss}, C_{oss}, C_{rss}\)와 게이트 전하 곡선(밀러 플래토), \(R_{DS(on)}\cdot Q_G\) 성능 지수, \(E_{oss}\), 슈퍼정션 전하 균형과 \(R_{on,sp} \propto BV^{1.x}\), 다중 에피 vs 트렌치 충전, 바디 다이오드와 기생 BJT, 애벌런치 에너지 \(E_{AS}\), 3D 트렌치·슈퍼정션 셀 |
| 07 | igbt | IGBT와 사이리스터 | IGBT 구조(MOSFET + PNP), 전도도 변조로 낮은 \(V_{CE(sat)}\), 출력 특성의 무릎 전압, 턴오프 꼬리 전류와 \(E_{off}\), \(V_{CE(sat)}\)–\(E_{off}\) 트레이드오프 곡선, 래치업과 방지, PT·NPT·필드 스톱, 트렌치·캐리어 저장층, RC-IGBT, 단락 내량, 온도 계수(병렬화), 사이리스터 재생 래치(α₁+α₂=1), GTO·IGCT·HVDC 사이리스터 |
| 08 | sic | SiC MOSFET | 4H-SiC MOSFET 평면·트렌치 구조, 온저항 분해(채널 비중이 큼), SiO₂/SiC 계면 트랩 \(D_{it}\)과 채널 이동도(NO 어닐), 문턱 전압 온도·바이어스 불안정(BTI, 게이트 스위칭 드리프트), 게이트 전압 +15~+18/−5 V 창, 산화막 전계와 TDDB, 바디 다이오드 \(V_F\) 약 3 V와 바이폴라 열화(BPD→적층 결함), 단락 내량이 짧은 이유(전류 밀도·얇은 다이), 웨이퍼(150→200 mm), 결함(마이크로파이프·BPD·TSD), 수율과 다이 크기, 온도에 따른 \(R_{DS(on)}\) |
| 09 | gan | GaN HEMT | 자발·압전 분극과 AlGaN/GaN 계면 2DEG(밀도 \(n_s\)를 Al 조성·두께로), 공핍형 HEMT, 증강형: p-GaN 게이트·리세스·캐스코드, 게이트 전압 창이 좁은 이유(약 +6 V), 바디 다이오드 없는 역도통(3사분면, \(V_{SD}\) = \(V_{th}\) + …), 전류 붕괴·동적 온저항(트래핑), 필드 플레이트, GaN-on-Si 버퍼(격자·열팽창 불일치, 탄소 도핑), 측면 소자의 전압 한계, 수직 GaN, 모놀리식 집적(드라이버+하프 브리지), 3D HEMT 층 구조 |
| 10 | switching | 스위칭 과도와 손실 | 유도성 부하 하드 스위칭, 이중 펄스 시험 회로와 측정, 턴온 4구간(지연·전류 상승·전압 하강·밀러 플래토), 턴오프, \(E_{on}, E_{off}, E_{rr}\) 적분, 기생 인덕턴스 \(L_\sigma\cdot di/dt\) 오버슈트와 링잉(RLC), 공통 소스 인덕턴스와 켈빈 소스, \(C_{oss}\) 손실, 게이트 저항으로 속도 조절, 스위칭 손실 \(P_{sw} = f(E_{on}+E_{off})\), 소프트 스위칭(ZVS·ZCS)과 공진, 측정 함정(프로브 지연·대역폭) |
| 11 | gatedrive | 게이트 구동과 보호 | 게이트 루프 RLC, 구동 전압과 \(R_{DS(on)}\), 게이트 전력 \(Q_G V f\), 턴온·턴오프 저항 분리, 밀러 유도 턴온(\(C_{gd}\cdot dv/dt\))과 음 바이어스·밀러 클램프, 절연(광·자기·용량 아이솔레이터), CMTI, 부트스트랩 회로 설계, 단락 유형(Type I/II)과 DESAT·전류 감지, 소프트 턴오프·2단 턴오프, 저전압 차단(UVLO), 능동 게이트 구동·dv/dt 제어, 병렬 소자 구동 |
| 12 | converters | DC-DC 변환과 PFC | 벅·부스트·벅-부스트 변환비와 볼트-초 균형, 인덕터 전류 리플과 커패시터 전압 리플, CCM·DCM 경계, 동기 정류와 데드 타임 손실, 손실 분해(전도·스위칭·게이트·자성체)와 효율 곡선(경부하·중부하), 스위칭 주파수 최적, 인터리빙, 절연형(플라이백·LLC), LLC 이득 곡선과 ZVS 영역, 역률과 THD, 부스트 PFC, 토템폴 브리지리스 PFC가 GaN·SiC를 부르는 이유(역회복), 3상 PFC 개요 |
| 13 | inverter | 인버터와 PWM | 하프 브리지와 풀 브리지, 3상 2레벨 인버터, 사인파 PWM(반송파 비교, 변조 지수, 과변조), 3고조파 주입·공간 벡터 PWM(전압 활용 15 %), 상전압·선간 전압 파형과 FFT·THD, 부하 전류 리플과 스위칭 주파수, 데드 타임 전압 오차, 소자 손실 계산(전도·스위칭, 변조 지수·역률 의존), 다이오드와 스위치 손실 분배, 모터 구동·회생 제동, 3레벨(NPC·T형) 인버터, dv/dt와 모터 절연·베어링 전류 |
| 14 | thermal | 열 설계와 접합 온도 | 손실 → 열 경로(다이·솔더·DBC·베이스판·TIM·방열판·냉각수), 1D 열저항과 열 퍼짐, 포스터·카우어 열 회로, 과도 열 임피던스 \(Z_{th}(t)\) 곡선, 펄스 전력과 \(T_j\) 피크, 기본파 주기에 따른 \(\Delta T_j\) 리플(저속·정지 시 큰 리플), 온도 의존 손실의 전기-열 결합과 열 폭주 조건, 냉각 방식 비교(공랭·간접 수냉·핀핀 직접 냉각·양면 냉각), 접합 온도 측정(\(V_{CE}\)·\(V_{SD}\) TSEP), 열 시뮬레이터 |
| 15 | packaging | 전력 모듈 패키징 | 모듈 층 구조(다이·다이 접합·DBC/AMB·베이스판·젤·하우징), 세라믹 비교(Al₂O₃·AlN·Si₃N₄: 열전도·강도), 솔더 vs 은 소결, Al 와이어·Cu 와이어·클립·리본, 정류 루프 인덕턴스 계산과 저인덕턴스 배치(라미네이트 버스바, 플립 레이아웃), 병렬 다이 전류 분배(공통 소스 인덕턴스), 디스크리트(TO-247, TOLL) vs 모듈, 양면 냉각·직접 냉각·임베디드 PCB, 열팽창 계수 불일치 응력, 고전압 절연과 부분 방전, 3D 하프 브리지 모듈 |
| 16 | reliability | 신뢰성과 수명 | 고장 모드 지도(칩·접합·와이어·기판·외부), 파워 사이클링 시험(\(\Delta T_j, T_{j,m}, t_{on}\)), 본드 와이어 들뜸과 솔더 피로, 코핀-맨슨·LESIT 수명 모델, 미션 프로파일 → 레인플로 계수 → 마이너 누적 손상, 열 사이클링, 단락·애벌런치 견고성, 우주선 단일 사건 소손(FIT와 전압 디레이팅), HTRB·HTGB·H3TRB, SiC 게이트 산화막 수명 외삽, GaN 동적 신뢰성, 와이블 분포와 B10 수명, 상태 감시(\(V_{CE}\) 증가) |
| 17 | applications | 응용과 기술 선택 | 전기차 트랙션 인버터(400 V→800 V, SiC 전환과 주행거리), OBC·DC-DC, 급속 충전기, 태양광 인버터·ESS, 데이터센터 전원(48 V, 80 PLUS), 스마트폰·노트북 GaN 충전기, 철도·풍력·HVDC(사이리스터·IGBT·MMC), 산업용 모터 드라이브, 사양 → 소자 선택 지도(전압·주파수·전력), 시스템 비용(소자 비용 vs 수동 소자·냉각 절감), 시장과 공급망(SiC 기판, 8인치 전환), 다음 세대(Ga₂O₃, 다이아몬드, 수직 GaN, 고전압 SiC IGBT) |
| 18 | glossary | 용어집 & 종합 퀴즈 | 용어 검색, 플래시카드, 종합 퀴즈 |

장끼리 겹치는 주제는 한쪽에서 자세히, 다른 쪽에서는 짧게 다루고 링크한다(예: 바리가 한계는 2장이 정의·재료 비교, 3장이 드리프트층으로 유도. 이중 펄스 시험과 스위칭 에너지는 10장이 본진, 6–9장은 소자별 특징만. 손실 계산은 13장(인버터)·12장(DC-DC)이 본진, 14장은 손실을 입력으로 받아 온도를 계산. 역회복 물리는 5장, 회로 영향은 10장).

## 이어지는 책
본문에서 자연스러울 때 서가 안의 책을 상대 경로로 링크한다(챕터에서 `../../device/`): DeviceBook(`device/` — pn 접합 `device/chapters/pn.html`, MOSFET `device/chapters/mosfet.html`, BJT `device/chapters/bjt.html`, 쇼트키 `device/chapters/ms.html`, 이종 접합 `device/chapters/hetero.html`, 전력 소자 개관 `device/chapters/power.html`, 신뢰성 `device/chapters/reliability.html`), PackagingBook(`packaging/` — 다이 접합 `packaging/chapters/dieattach.html`, 와이어 본딩 `packaging/chapters/wirebond.html`, 기판 `packaging/chapters/substrate.html`, 몰딩 `packaging/chapters/molding.html`, 열 `packaging/chapters/thermal.html`), AnalogBook(`analog/` — LDO `analog/chapters/ldo.html`, 밴드갭 `analog/chapters/bandgap.html`, 피드백 `analog/chapters/feedback.html`), SoCBook(전력 관리 `soc/chapters/power.html`, 열 `soc/chapters/thermal.html`), DopingBook(`doping/`), ThinFilmBook(`thinfilm/` — 산화 `thinfilm/chapters/oxidation.html`, CVD `thinfilm/chapters/cvd.html`), ProcessBook(`process/`), TCADBook(`tcad/` — 고전계 `tcad/chapters/highfield.html`), FailureBook(`failure/` — 고장 메커니즘 `failure/chapters/mechanisms.html`), TestBook(`test/` — 번인 `test/chapters/burnin.html`), InfraBook(`infra/` — 팹 전력 `infra/chapters/power.html`), ChipIndustryBook(`industry/` — 시장 `industry/chapters/market.html`). 링크하기 전에 대상 파일이 실제로 있는지 확인한다.

## 수식 규칙 (빌드가 깨지지 않게)
- 인라인 `\( ... \)`, 블록 `$$ ... $$`. HTML 안에서 `<`는 `\lt`, `>`는 `\gt`, `&`는 `&amp;`로 쓴다.
- `\text{}` 안에 `·`, `°`, `µ`, 한글 이외의 특수 유니코드(가운뎃점 등)를 넣지 않는다. 곱은 `\cdot`, 도는 `^\circ`, 마이크로는 `\mu`를 `\text{}` 밖에서 쓴다. 한글은 `\text{}` 안에 넣어도 된다.
- 스크립트가 `\(`·`\[`·`$$`가 든 문자열을 DOM에 넣으면 안 된다(빌드는 정적 HTML의 수식만 렌더링한다). 시뮬레이터 출력에는 일반 텍스트·유니코드(x², µm, ·)를 쓴다.
- 작성 후 저장소 루트에서 `npm run build`가 성공해야 한다(KaTeX 문법 오류가 있으면 실패).

## head 템플릿
```html
<!doctype html>
<!-- Copyright (c) 2026 geniuskey and PowerBook contributors.
     Executable code: MIT (see ../../LICENSE-MIT).
     Text, illustrations, questions and explanations: CC-BY-4.0 (see ../../LICENSE.md). -->
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>전력 MOSFET과 슈퍼정션 · PowerBook</title>
<meta name="description" content="한 문장 설명">
<link rel="icon" type="image/svg+xml" href="../favicon.svg">
<link rel="stylesheet" href="../css/style.css">
<script src="../js/common.js"></script>
<!-- 3D가 필요한 페이지만 -->
<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/controls/OrbitControls.js"></script>
</head>
<body data-chapter="mosfet">
<main class="chapter">
  <header class="chapter-hero">
    <div class="eyebrow">Chapter 06</div>
    <h1>전력 MOSFET과 슈퍼정션</h1>
    <p class="lead">...</p>
    <ul class="objectives"><li>...</li></ul>
  </header>

  <section id="intro"><h2>제목</h2> ... </section>   <!-- h2 번호와 우측 목차는 자동 생성 -->
  ...
  <section class="keypoints" id="summary"><h2>핵심 정리</h2><ol><li>...</li></ol></section>
  <section class="quiz-sec" id="quiz"><h2>확인 퀴즈</h2><div class="quiz"> ... </div></section>
</main>
<script> /* 페이지 스크립트: 여기서 PW 사용. 시뮬레이터마다 (function(){ ... })(); 로 감싼다 */ </script>
</body>
</html>
```
소스에는 `<title>`과 `<meta name="description">`만 쓴다. canonical, `theme-color`, Open Graph, Twitter 카드, JSON-LD는 `tools/build.mjs`가 파일 경로, `<title>`·description, `js/common.js`의 `CHAPTERS`, `power/book.json`의 `meta`, git 마지막 커밋 날짜로 배포물에 생성한다. 소스에 이 태그들이 남아 있으면 `npm test`와 빌드가 실패한다. description은 `<meta>` 한 줄에 쓴다. Analytics beacon은 넣지 않는다(빌드가 넣는다).
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
<div class="sim" id="sim-ron">
  <div class="sim-head"><span class="sim-tag">SIMULATOR</span><h3>제목</h3></div>   <!-- 3D는 <span class="sim-tag three">3D</span> -->
  <div class="sim-body side">                                    <!-- side: 넓은 화면에서 컨트롤을 오른쪽에 -->
    <div class="sim-view"><canvas id="ron-cv"></canvas></div>       <!-- 3D는 <div class="sim-view three" id="v3d"></div> -->
    <div class="sim-controls">
      <label class="ctrl"><span>온도 <output id="ron-V-out"></output></span><input type="range" id="ron-V" min="800" max="1200" step="5" value="1000"></label>
      <div class="ctrl"><span>분위기</span><div class="seg" id="ron-type"><button data-value="dry" class="on">건식</button><button data-value="wet">습식</button></div></div>
      <label class="check"><input type="checkbox" id="ron-show"> 옵션</label>
      <button class="btn primary" id="ron-run">실행</button>
    </div>
  </div>
  <div class="sim-readout">
    <div class="stat"><span class="k">두께</span><span class="v" id="ron-r">—</span></div>
  </div>
  <div class="sim-note">해볼 것: ...</div>
</div>
```
`class="sim"`은 정확히 이 문자열로 쓴다(검사기가 `class="sim"`을 센다). 시뮬레이터 안 요소 id에는 시뮬레이터별 접두사를 붙여 중복을 피한다.
콜아웃: `<div class="callout">`, `.tip`, `.warn`, `.deep`(심화), `.fab`(PW-800 노트). 수식: `<div class="formula">$$...$$<div class="where">여기서 ...</div></div>`, 인라인 `\( ... \)`.
표: `<div class="table-wrap"><table>...</table></div>`. 퀴즈:
```html
<div class="quiz-q"><p>질문?</p><div class="opts">
  <button class="opt">보기</button><button class="opt" data-correct>정답</button>
</div><div class="quiz-exp">해설</div></div>
```
본문 첫 등장 핵심 용어는 `<span class="term">온저항</span>`처럼 강조할 수 있다(용어집 툴팁은 `js/glossary-data.js`로 자동 연결된다).

## JS 헬퍼 (`js/common.js`)
- `PW.canvas(el, (ctx,w,h)=>{}, {aspect:0.5, height, minHeight, maxHeight})` → `{ctx,w,h,redraw()}` HiDPI, 리사이즈/테마 시 자동 redraw(배경 `--canvas-bg`로 칠해 줌).
- `PW.chart(ctx, box|null, {x:[a,b], y:[a,b], logX, logY, xLabel, yLabel, series:[{data:[[x,y]],color,width,dash,fill}], vlines, hlines, points, bands, xFmt, yFmt})` → `{X,Y,box}`.
- `PW.loop(el, (dt,t)=>{})` 화면에 보일 때만 도는 rAF 루프 `{start,stop,toggle}`.
- `PW.range(id, fmt, onInput)` → getter `get()`, `get.set(v)`. `PW.seg(id, onChange)` → getter. `PW.stat(id, html)`.
- `PW.palette()` 테마 색(+ 재료·물리량 색 `electron hole field volt amp heat si sic gan oxide metal copper ceramic solder mold`), `PW.color('accent')`, `PW.onTheme(cb)`, `PW.isDark()`.
- `PW.randn()`, `PW.poisson(λ)`, `PW.fmt(x, digits)`, `PW.si(x,'m')`, `PW.clamp/lerp/map`, `PW.C = {h,c,q,k,eps0,hbar,me}`.
- `PW.three(el, {camera:[x,y,z], target:[x,y,z], fov, autoRotate, minDistance, maxDistance})` → `T = {THREE, scene, camera, renderer, controls, onFrame(cb), label(html, Vector3|[x,y,z]), material(color, opts)}`. 조명/리사이즈/화면밖 정지 포함. 라벨의 `L.obj = mesh`로 두면 로컬 좌표를 따라감.

정확한 시그니처는 `js/common.js`를 직접 읽어 확인한다.

## 검사
저장소 루트에서 `npm test`(메타데이터·링크·스크립트 문법·id 중복·장별 최소 개수 경고)와 `npm run build`(KaTeX)를 돌린다. 브라우저 검사: `node tools/browser-check.cjs --offline power/`, 모바일 `node tools/browser-check.cjs --dist --mobile power/`(Playwright 필요).
