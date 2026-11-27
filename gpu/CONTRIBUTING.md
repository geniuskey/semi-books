# GPUBook 챕터 작성 가이드

GPUBook은 SemiBooks 서가(`semi.euiyun.com`)의 한 권이다. 배포 주소는 `https://semi.euiyun.com/gpu/`.
이 책은 **GPU라는 칩**을 다룬다. CUDA 프로그래밍 책이 아니다. 질문은 하나다. **"GPU 칩은 왜 이렇게 생겼나?"** 연산 유닛(SM·텐서 코어)의 구조, 온칩 SRAM과 HBM 대역폭, 다이 크기와 수율, 2.5D 인터포저 패키징, 전력 공급과 발열, 칩 사이의 링크까지, **실리콘 면적·대역폭·전력·원가라는 네 가지 예산**이 설계를 어떻게 정하는지 계산한다.
워프와 SIMT, 메모리 접근 병합, 타일링, 루프라인은 **"왜 칩을 이렇게 설계하는가"를 설명하는 도구**로 쓴다. 코드 문법을 가르치지 않는다. 커널 코드 조각이 필요하면 의사 코드 몇 줄로 짧게 두고, 그 코드가 **하드웨어에서 무엇을 일으키는지**(레지스터 수, 메모리 트랜잭션 수, 뱅크 충돌, 점유율)를 보여 준다.

중심 줄기는 네 가지 트레이드오프다.
1. **면적**: 같은 mm²를 제어·캐시에 줄 것인가, 연산 유닛에 줄 것인가(CPU ↔ GPU, FP32 ↔ 텐서 코어, SRAM ↔ ALU).
2. **대역폭**: 연산은 싸고 데이터 이동은 비싸다(FLOP/B 리지 포인트, 재사용, HBM, 인터포저 배선 밀도).
3. **전력**: 칩은 전력 상한에 묶여 있다(CV²f, DVFS, PDN 1,000 A, 열 스로틀링, pJ/bit).
4. **원가와 수율**: 다이가 클수록 비싸고 불량이 많다(레티클 한계, 결함 밀도, 하베스팅, 칩렛, 패키징 원가).

모든 장에서 "이 손잡이(SM 수, 클럭, 전압, 정밀도, 타일 크기, HBM 스택 수, 핀 속도, 다이 면적, 결함 밀도, 냉각수 온도, 링크 수)를 돌리면 성능·전력·원가가 어떻게 바뀌는가"를 시뮬레이터로 보여 준다.

빌드 과정 없는 정적 사이트다. `gpu/index.html` + `gpu/chapters/<slug>.html` + 공통 `gpu/css/style.css`, `gpu/js/common.js`.
로컬 실행: 저장소 루트에서 `python3 -m http.server 8000` → http://localhost:8000/gpu/ (file://로 열어도 동작하게 classic script만 쓴다. ES module 금지.)

공통 키트는 DeviceBook(`../device`)의 v2 그림·시뮬레이터 키트를 이식했다. 전역 객체 이름만 `PB` → `GP`, 클래스 접두사만 `pb-` → `gp-`로 바뀌었다. DeviceBook 장(`../device/chapters/mosfet.html`, `scaling.html`, `power.html`)은 v2 키트(`GP.chart` 범례·hover, `GP.text` 첨자 서식, `GP.tip`, SVG 재질 클래스)를 쓰는 좋은 본보기이고, PowerBook 장(`../power/chapters/*.html`)은 장 구성·밀도·기준 플랫폼 노트의 본보기다. 다른 책의 장을 읽을 때 `PB.`는 이 책에서 `GP.`로 읽는다. **`js/common.js`와 `css/style.css`는 수정하지 않는다**(여러 장이 동시에 쓰인다). 장 전용 스타일은 그 장의 `<style>`에, 장 전용 함수는 그 장의 `<script>`에 둔다.

## 원칙
- **한국어**, 대상은 공대 학부생과 신입 반도체·회로·시스템 엔지니어(디지털 회로, 컴퓨터 구조 기초, 미적분을 안다고 가정. GPU 프로그래밍 경험은 가정하지 않는다). 영어 원어는 `<span class="en">(streaming multiprocessor)</span>`처럼 병기. 표기: 스트리밍 멀티프로세서(SM), 워프, 스레드 블록, 워프 스케줄러, 레지스터 파일, 공유 메모리, 점유율, 분기 발산, 텐서 코어, 시스톨릭 배열, 산술 강도, 리지 포인트, 루프라인, 고대역폭 메모리(HBM), 실리콘 관통 전극(TSV), 베이스 다이(로직 다이), 인터포저, 마이크로범프, 하이브리드 본딩, 레티클, 하베스팅, 칩렛, 전력망(PDN), 디커플링 커패시터, 열 설계 전력(TDP), 스로틀링, 직렬화기(SerDes), 올리듀스. 기호: \(f_{clk}, V_{DD}, C_{eff}, P_{dyn}, BW, I\)(산술 강도, FLOP/B), \(D_0, Y, A_{die}, T_j, R_{th}\).
- 개념 → 직관 그림(SVG) → 수식(KaTeX) → 시뮬레이터 → 실제 수치 예(GX-1) → 요약/퀴즈 순서.
- **시각 자료와 인터랙티브 요소가 이 책의 핵심이다.** 한 장에 **시뮬레이터 7개 이상, 그림(figure) 7개 이상, 퀴즈 6문항 이상**. 글로 길게 설명할 것은 그림·애니메이션으로 보여 준다. 태그에 `3d`가 있는 장(01 overview, 03 sm, 08 hbm, 11 package)은 three.js 3D 모델을 최소 1개 둔다.
- 시뮬레이터는 장식이 아니라 **계산하는 모델**이어야 한다(리틀의 법칙 큐, 워프 스케줄링 사이클 시뮬레이션, 스코어보드, 점유율 계산기, 레지스터 뱅크 충돌, 비트 단위 부동소수점 반올림, 곱셈기 면적 모델, 시스톨릭 배열 사이클 시뮬레이션, 캐시 적중률(LRU) 시뮬레이션, 메모리 트랜잭션 병합 계산, 공유 메모리 뱅크 충돌, 타일링 트래픽 계산, 루프라인, DRAM 뱅크·행 버퍼 시뮬레이션, 크로스바·메시 경합, 분산 RC 배선 지연과 리피터 최적, 웨이퍼 다이 배치와 결함 몬테카를로, 포아송·음이항 수율, 원가 모델, 인터포저 배선 밀도, 동적·누설 전력과 V–f 곡선, PDN 임피던스 주파수 응답과 IR 드롭 격자 풀이, 열저항 회로·과도 응답, 링크 눈 다이어그램과 채널 손실, 링·트리 올리듀스 시간, LLM 프리필·디코드 성능 모델 등). 입력을 끝까지 움직였을 때 물리적으로 말이 되는지(음수, 0으로 나누기, NaN, 무한 루프, 수치 발산) 확인한다. 쓰는 식은 본문에 적는다. 워프가 번갈아 발행되는 모습, 데이터가 시스톨릭 배열을 흘러가는 모습, 메모리 요청이 합쳐지는 모습, 웨이퍼 위 결함처럼 **움직이는 그림**을 적극 쓴다.
- 손잡이와 결과의 연결을 꼭 보여 준다: 각 장에 "조건 → 결과" 표나 시뮬레이터가 하나 이상 있어야 한다(예: 스레드당 레지스터↑ → 점유율↓ → 지연 숨기기↓, 정밀도 FP32→FP8 → 곱셈기 면적 약 1/10 → 같은 면적에서 처리량↑, 타일 크기↑ → HBM 트래픽↓·SRAM 요구↑, 다이 면적↑ → 수율↓·원가 초선형↑, 전압↓ → 전력 약 V²·f로↓·클럭↓, 냉각수 온도↑ → 스로틀 클럭↓).
- 수치는 공개 자료(Hennessy & Patterson *Computer Architecture*, Kirk & Hwu *Programming Massively Parallel Processors*, Weste & Harris *CMOS VLSI Design*, Jouppi 외 TPU 논문, Horowitz ISSCC 2014 "Computing's Energy Problem", JEDEC HBM 표준의 대표 범위, ISSCC·Hot Chips 발표의 일반적인 범위)에서 합리적인 값을 쓴다. 확실하지 않은 수치는 '약', '~'로 표기한다. **특정 회사의 제품 값처럼 쓰지 않는다. 상표명·제품 모델명 대신 일반 명칭을 쓴다**(예: "어느 GPU 회사의 텐서 코어" 대신 "텐서 코어", 특정 패키징 상표 대신 "실리콘 인터포저 2.5D(CoWoS류)"처럼 한 번만 일반 명칭과 함께 언급 가능). 역사적 사실(예: 그래픽 GPU에서 범용 계산으로의 전환, 통합 셰이더, 텐서 코어의 등장)은 연도와 일반적 서술로 쓴다.
- 외부 라이브러리는 KaTeX(빌드가 처리)와 아래 head 템플릿의 three.js r147만 쓴다. 이미지 파일 대신 인라인 SVG/canvas로 그린다.
- 색은 하드코딩하지 말고 CSS 변수나 `GP.palette()`를 쓴다. 라이트/다크 둘 다 읽혀야 한다. 3D 모델의 물리적 재질색(구리, 실리콘, 솔더, 기판)은 고정색 가능.
- 모바일(폭 360px)에서 가로 스크롤이 생기면 안 된다. SVG는 `viewBox`만 주고 width/height 속성 생략. viewBox 폭은 900 이하로. 폭 560 이상인 그림은 좁은 화면에서 키트가 가로로 밀어 보게 하므로 글자 크기를 12px 이상으로.
- 화면을 아껴 쓴다. 긴 여백, 큰 장식 영역을 만들지 않는다. 한 화면에 쓸모 있는 내용이 많이 보이게 한다.

## 색 코드
책 전체에서 같은 기능 블록·물리량은 같은 색으로 그린다. CSS 변수 `--compute` 등, SVG 면 `.k-compute`(옅은 면 + 테두리), 진한 면 `.kf-compute`, 선 `.ks-compute`, 글자 `.kt-compute`, 캔버스 `GP.palette().compute`, 범례 `<span class="m-key compute">FP32 유닛</span>`.

| 키 | 뜻 |
|---|---|
| compute | 일반 연산 유닛(FP32·INT32 레인, SM의 연산 부분), FLOP |
| tensor | 텐서 코어·행렬 엔진·시스톨릭 배열 |
| ctrl | 제어·스케줄러·명령어 발행·분기, CPU식 제어 논리 |
| sram | 온칩 SRAM: 레지스터 파일·공유 메모리·L1·L2 |
| dram | DRAM·HBM·GDDR, 오프칩 메모리 |
| data | 데이터 이동·대역폭·메모리 트래픽 |
| link | 칩간 링크·SerDes·NoC·스위치 |
| volt | 전압·전력 공급(PDN, 전압 레귤레이터) |
| heat | 전력 소모·온도·열 흐름 |
| clock | 클럭·타이밍·사이클 |

물리 재질(단면도): `.m-si`(실리콘 다이), `.m-dram`(HBM DRAM 코어 다이), `.m-interp`(실리콘 인터포저), `.m-sub`(유기 기판), `.m-cu`(구리 배선·TSV·필러), `.m-sol`(솔더·범프), `.m-mold`(몰드), `.m-lid`(구리 리드), `.m-tim`(열 계면 물질), `.m-pcb`(보드), `.m-ox`(유전체). 원기둥 음영은 `.mc-*`. 캔버스 재질 사각형은 `GP.matRect(ctx,x,y,w,h,'dram')`.

## 교육용 기준 칩 GX-1 (가상)
모든 장이 같은 가상 칩을 예로 든다. 실제 특정 제품이 아니다. 장마다 `<div class="callout fab"><strong>제목</strong>...</div>`로 "GX-1 노트"를 1~3개 둔다(접두어 "GX-1 노트 · "는 CSS가 붙인다). 계산 결과가 이 표와 어긋나면 표가 맞는 쪽으로 맞추거나 본문에 이유를 쓴다. **아래 값은 서로 맞물려 있다(예: 피크 FLOPS = SM 수 × 유닛 × 2 × 클럭). 장에서 새 값을 만들 때도 이 표에서 계산해 낸다.**

| 항목 | 값(교육용 가정) |
|---|---|
| **GX-1 패키지** (본진) | 데이터센터 AI 가속용 GPU 1개 패키지. 로직 다이 1개 + HBM 스택 6개를 실리콘 인터포저(2.5D) 위에 얹고 유기 기판에 실장. 모듈 전력(TDP) 1,000 W, 수냉 냉각판 |
| 로직 다이 | 4 nm급 공정, 26 × 30 mm = **780 mm²**(레티클 한계 26 × 33 mm = 858 mm²의 약 91 %), 트랜지스터 약 920억 개(약 118 MTr/mm²). 금속층 약 15층 |
| SM 구성 | GPC 8개 × SM 20개 = **물리 SM 160개, 활성 144개**(16개는 하베스팅용 여유, 10 %). SM당 서브파티션 4개 |
| 서브파티션 | 워프 스케줄러 1개(클럭당 워프 1개 명령 발행), FP32 레인 32개, INT32 레인 16개, FP64 레인 16개, SFU 4개, 텐서 코어 1개, 로드·스토어 유닛 8개, 레지스터 파일 64 KB(32비트 레지스터 16,384개, 뱅크 4개) |
| SM 하나 | FP32 레인 128개, 텐서 코어 4개, 레지스터 파일 256 KB, L1/공유 메모리 통합 256 KB(공유 메모리 최대 228 KB, 뱅크 32개 × 4 B), 최대 상주 워프 64개(스레드 2,048개), 최대 스레드 블록 32개, 스레드당 레지스터 최대 255개. SM 면적 약 3.2 mm²(160개 × 3.2 = 512 mm², 다이의 약 66 %) |
| 클럭·전압 | 부스트 1.6 GHz(\(V_{DD}\) 0.75 V), 기본 1.2 GHz(0.65 V), 최대 1.8 GHz(0.85 V). 메모리 지연: L1 약 30사이클, L2 약 200사이클, HBM 약 500 ns(부스트에서 약 800사이클) |
| 피크 연산 (1.6 GHz) | FP32 벡터 **59.0 TFLOPS**(144 × 128 × 2 × 1.6 GHz), FP64 29.5 TFLOPS. 텐서 코어 1개 = 클럭당 BF16 밀집 FMA 512개 → BF16 밀집 **943.7 TFLOPS**(144 × 4 × 512 × 2 × 1.6 GHz, 약 944), FP8 1,887 TFLOPS, FP4(마이크로스케일링) 3,775 TFLOPS, INT8 1,887 TOPS. 2:4 구조적 희소성은 2배(마케팅 수치, 실효는 낮음) |
| 온칩 메모리 | 레지스터 파일 총 36 MB(활성 144 SM), L1/공유 메모리 총 36 MB, **L2 64 MB**(파티션 2개 × 슬라이스 64개 = 슬라이스 128개 × 512 KB). L2 대역폭 약 13 TB/s(128 슬라이스 × 64 B/클럭 × 1.6 GHz). 공유 메모리 대역폭 SM당 128 B/클럭(전체 약 29.5 TB/s) |
| **HBM** | HBM3E급 스택 **6개**, 스택당 8단(24 Gb DRAM 다이 8개 + 베이스 다이) = 24 GB → **총 144 GB**. 스택당 1,024비트 인터페이스(채널 16개 × 64비트, 의사 채널 32개), 핀당 9.6 Gb/s → 스택당 1,228.8 GB/s → **총 7.37 TB/s**. 비트당 에너지 약 3 pJ/bit(DRAM 코어 + 인터페이스) → 대역폭을 100 % 계속 쓰면 약 180 W, TDP 분해에 쓰는 최대 부하(대역폭 활용 약 85 %)에서 약 150 W(스택당 약 25 W). TSV 스택당 수천 개, 마이크로범프 피치 약 45 µm. PHY는 로직 다이 긴 변 두 쪽에 스택 3개씩 |
| 리지 포인트 | BF16 텐서: 943.7 / 7.37 ≈ **128 FLOP/B**, FP8: 약 256 FLOP/B, FP32 벡터: 약 8 FLOP/B. L2 기준 BF16 약 72 FLOP/B |
| 온칩 네트워크 | SM ↔ L2 슬라이스 크로스바(GPC 단위 집선), L2 파티션 2개 사이 연결 약 4 TB/s, 다이 가로지르는 거리 최대 약 30 mm |
| 전력 (TDP 1,000 W, 최대 부하) | 로직 다이 약 760 W(동적 약 640 W + 누설 약 120 W, 85 °C), HBM 6개 약 150 W, 전압 변환 손실·기타 약 90 W. 코어 전류 약 1,000 A(760 W / 0.75 V). 전압 레귤레이터: 보드 48 V → 중간 12 V → 다상 벅 약 20상(상당 약 50 A) → 0.75 V |
| 열 | 다이 평균 열밀도 약 97 W/cm²(760 W / 7.8 cm²), 핫스팟(텐서 코어 밀집부) 약 2–3배. 냉각판 수냉, 냉각수 입구 40 °C, 접합–냉각수 열저항 약 0.05 K/W. 스로틀 시작 \(T_j\) 95 °C, 최대 105 °C |
| 패키지 | 실리콘 인터포저 약 **2,500 mm²**(약 58 × 43 mm — HBM이 다이 긴 변에 붙어 한쪽으로 길다, 레티클 약 2.9배 = 노광 필드 2 × 2개를 이어 붙임(스티칭)), HBM 스택 평면 약 11 × 11 mm, 다이·HBM 간격 약 1 mm. 인터포저 웨이퍼 약 $5,000, 웨이퍼당 20개(격자 배치), 수율 90 % → 개당 약 $280, 인터포저 배선 선폭/간격 약 0.4/0.4 µm·금속층 4층, 깊은 트렌치 커패시터 내장. 로직–인터포저·HBM–인터포저 마이크로범프 피치 약 45 µm, 인터포저–기판 C4 범프 피치 약 150 µm. 유기 기판 75 × 75 mm, 빌드업 20층, BGA 볼 약 4,500개(1 mm 피치). 비교 대안: RDL 인터포저 + 로컬 실리콘 브리지 |
| 칩간 링크 | **GX-Link** 18개, 링크당 방향별 2레인 × 224 Gb/s PAM4(유효 200 Gb/s) = 방향당 50 GB/s → 칩당 방향당 900 GB/s(양방향 1.8 TB/s). SerDes 약 5 pJ/bit(레인 송신+수신 합, 원시 224 Gb/s 기준) → 36레인 × 224 Gb/s × 5 pJ ≈ 40 W, 레인당 다이 가장자리 약 0.8 mm(짧은 변 두 개에 배치). 호스트는 PCIe 6.0 x16(방향당 원시 약 128 GB/s) |
| 노드·랙 | **GX-8 노드**: GX-1 8개 + GX-Switch 칩 4개(스위치당 36포트, 8 GPU × 18링크 ÷ 36 = 4; 모든 GPU 쌍이 900 GB/s), 노드당 약 12 kW. 스케일아웃 NIC 800 Gb/s × 8. **GX-Rack**: 노드 4대(32 GPU), 약 50 kW, 수냉 |
| 원가 (교육용 가정) | 300 mm 웨이퍼(4 nm급) 약 $18,000, 결함 밀도 \(D_0\) 약 0.08 /cm²(성숙 공정), 가장자리 제외 3 mm, 스크라이브 0.1 mm. HBM 약 $15/GB(스택당 약 $360), 인터포저·조립·테스트 약 $1,000. 패키지 조립 수율 98 %. 10장 계산값: 웨이퍼당 온전한 다이 70개(격자 배치·최적 오프셋, 근사식은 약 63개), 포아송 수율 53.6 %, SM 하베스팅 포함 판매 가능 수율 80.7 %, 양품 다이 약 $319(하베스팅 없으면 $480), 패키지 원가 약 $3,550(HBM 61 %·인터포저 등 28 %·다이 9 %). 다른 장은 이 값을 인용한다 |
| 비교: GX-G (게이밍 변형, 가상) | 같은 아키텍처, 4 nm급 380 mm², SM 96개, GDDR7 256비트 × 28 Gb/s = 896 GB/s, 래스터·텍스처·광선 추적 유닛 포함, 보드 전력 350 W |
| 비교: 서버 CPU (가상 SC-64) | 64코어, 3.0 GHz, 코어당 512비트 SIMD FMA 2개 → FP32 약 12.3 TFLOPS, L3 256 MB, DDR5 12채널 약 460 GB/s, 350 W, 다이 면적 중 연산 레인 비율 약 10–15 % |

### 에너지 표 (교육용, 4 nm급 0.75 V 대표값)
| 동작 | 에너지 |
|---|---|
| INT8 곱-누산(텐서 코어 안) | 약 0.05 pJ |
| FP8 FMA(텐서 코어 안) | 약 0.1 pJ |
| BF16 FMA(텐서 코어 안) | 약 0.2 pJ |
| FP32 FMA(벡터 레인) | 약 0.8 pJ |
| 레지스터 파일 32비트 읽기 | 약 0.5 pJ |
| L1/공유 메모리 32비트 | 약 1.5 pJ |
| L2 32비트(수 mm 이동 포함) | 약 6 pJ |
| 온칩 배선 | 약 0.05 pJ/bit/mm |
| HBM | 약 3 pJ/bit(32비트 약 100 pJ) |
| GDDR7 | 약 6 pJ/bit |
| GX-Link SerDes(구리) | 약 5 pJ/bit |
| 플러그형 광 모듈 / 공동 패키징 광학(CPO) | 약 15 / 약 5 pJ/bit |
(참고: Horowitz 2014의 45 nm 값은 FP32 곱 3.7 pJ, 32비트 8 KB SRAM 읽기 5 pJ, 32비트 DRAM 640 pJ. 공정이 바뀌어도 "연산 ≪ SRAM ≪ DRAM" 순서와 수십~수백 배 격차는 유지된다.)

### 기준 워크로드 GX-LM-70B (가상)
밀집 트랜스포머 파라미터 700억 개, 층 80개, \(d_{model}\) 8,192, 어텐션 헤드 64개(헤드 차원 128), KV 헤드 8개(GQA), FFN 차원 28,672, 문맥 8,192 토큰. 가중치 BF16 140 GB / FP8 70 GB. KV 캐시 토큰당 \(2 \times 80 \times 8 \times 128 \times 2\,\text{B}\) = 320 KiB(BF16). 토큰당 순전파 약 \(2N\) = 140 GFLOP, 학습 약 \(6N\) FLOP/토큰. 배치 1 디코드는 가중치를 매 토큰 한 번 읽으므로 FP8에서 상한 약 7.37 TB/s ÷ 70 GB ≈ 105 토큰/s.

## 장 목록 (slug와 담당 주제)
| 장 | slug | 제목 | 핵심 내용 |
|---|---|---|---|
| 01 | overview | GPU라는 칩의 지도 | CPU와 GPU의 면적 배분(제어·캐시 vs 연산 레인), 지연 최적화 vs 처리량 최적화, 같은 전력 예산에서 FLOPS 비교(SC-64 vs GX-1), 그래픽 가속기에서 범용 병렬 계산·AI 가속기로의 역사(고정 기능 → 프로그래머블 셰이더 → 통합 셰이더 → 범용 계산 → 텐서 코어), GX-1 해부 3D(기판·인터포저·로직 다이·HBM 6개·냉각판, 분해 보기), 칩 한 개가 데이터센터 랙이 되기까지 계층(레인→서브파티션→SM→GPC→다이→패키지→노드→랙), 네 가지 예산(면적·대역폭·전력·원가), 이 책의 지도, SoCBook GPU 장과의 차이 |
| 02 | throughput | 처리량 기계: 지연을 숨기는 법 | 지연과 처리량, 리틀의 법칙(동시에 떠 있어야 할 요청 수 = 지연 × 대역폭, HBM 7.37 TB/s × 500 ns ≈ 3.7 MB가 날아다녀야 함), 지연 숨기기 세 가지(캐시·추측 실행 vs 멀티스레딩), 하드웨어 멀티스레딩(워프 전환이 공짜인 이유: 문맥이 레지스터 파일에 상주), SIMD vs SIMT vs MIMD, 스레드·워프·블록·그리드가 하드웨어에 매핑되는 방식, 암달·구스타프손 법칙, 병렬 효율과 파이프라인, 동시 워프 수 vs 활용률 시뮬레이터 |
| 03 | sm | SM 해부: 워프와 레지스터 파일 | SM의 블록도(서브파티션 4개, 공유 L1, 텍스처·로드스토어), 명령어 인출·디코드, 워프 스케줄러와 스코어보드(의존성 대기), 발행 정책(GTO·LRR), 파이프라인 지연과 이중 발행, 레지스터 파일의 크기(SM당 256 KB, L1과 같고 공유 메모리 최대 228 KB보다 큼)와 뱅크·오퍼랜드 수집기·뱅크 충돌, 점유율 계산(레지스터·공유 메모리·블록 한계), 분기 발산과 재수렴(활성 마스크, 재수렴 스택 vs 독립 스레드 스케줄링), SM 면적 예산 분해(레지스터·ALU·텐서·L1·제어), 3D SM 평면도 |
| 04 | alu | 연산 유닛과 수 표현 | 정수와 부동소수점, IEEE 754 FP32·FP16·BF16·TF32·FP8(E4M3/E5M2)·FP4 비트 배치와 범위·정밀도, 반올림과 비정규수, FMA 회로(곱셈기 배열·정렬·정규화), 곱셈기 면적 ∝ 가수 비트² 모델, 정밀도별 에너지(에너지 표), 같은 면적에서 처리량 배수, 특수 함수 유닛(역수·제곱근·exp 근사), INT 연산과 주소 계산, FP64가 데이터센터에서만 넓은 이유, 누산 정밀도와 오차 누적 시뮬레이터 |
| 05 | tensor | 텐서 코어와 행렬 엔진 | 행렬곱 \(C = AB\)의 연산량 \(2MNK\) vs 데이터량, 데이터 재사용, 벡터 레인으로 하면 레지스터 대역폭이 병목인 이유, 내적 트리(점곱 유닛)와 외적, 시스톨릭 배열(가중치 고정·출력 고정, 사이클 시뮬레이션, 채움·비움 손실), 텐서 코어의 입출력 대역폭 계산(클럭당 512 FMA에 필요한 바이트), 워프 단위 행렬 명령(타일 크기), 2:4 구조적 희소성, 마이크로스케일링(블록 공유 지수) 포맷, 텐서 코어 면적과 전력 비중, NPU·TPU식 거대 시스톨릭 배열과 비교(SoCBook NPU 장 링크) |
| 06 | onchip | 온칩 메모리: 레지스터에서 L2까지 | 6T SRAM 비트셀과 면적(4 nm급 약 0.021 µm², 주변 회로 포함 실효 밀도), SRAM 비트셀 축소가 로직보다 느려진 이유, 계층별 용량·대역폭·지연·에너지 표(레지스터 36 MB → L1 36 MB → L2 64 MB → HBM 144 GB), 메모리 접근 병합(워프 32 스레드의 주소 → 32 B 섹터·128 B 라인 트랜잭션 수), 스트라이드 접근, 공유 메모리 32뱅크와 뱅크 충돌·패딩, 캐시 구조(연관도·라인·섹터)와 LRU 적중률 시뮬레이터, 쓰기 정책, 데이터 이동 에너지가 거리에 비례(에너지 표), 비동기 복사·TMA류 하드웨어 |
| 07 | roofline | 루프라인과 데이터 재사용 | 산술 강도 \(I\) = FLOP / 바이트, 루프라인 \(P = \min(P_{peak}, I \cdot BW)\), 리지 포인트(GX-1 BF16 128 FLOP/B), 계층별 루프라인(HBM·L2·공유 메모리), GEMM 타일링(타일 \(b\)일 때 트래픽 ∝ 1/b, 공유 메모리·레지스터 용량 한계), 원소별 연산·리덕션·어텐션·합성곱의 산술 강도, 연산 융합(커널 퓨전)으로 트래픽 줄이기, 정밀도를 낮추면 리지 포인트가 오른쪽으로 이동, 세대별 FLOPS 증가가 대역폭 증가보다 빠른 "메모리 장벽", 칩 설계자에게 루프라인이 뜻하는 것(연산:대역폭 비율 결정) |
| 08 | hbm | HBM과 메모리 대역폭 | 대역폭 = 핀 수 × 핀 속도, GDDR(32비트 × 고속) vs HBM(1,024비트 × 중속) vs LPDDR, 왜 넓고 느린 버스가 에너지가 적은가(짧은 배선·낮은 스윙), HBM 스택 구조(DRAM 코어 다이·베이스 다이·TSV·마이크로범프), 채널·의사 채널·뱅크, 행 버퍼 적중과 tRCD·tRP·tCL, 리프레시, 스택 높이(8·12·16단)와 용량, 다이 가장자리 길이(쇼어라인)가 스택 수를 제한, 비트당 에너지와 HBM 전력, 열(DRAM 85–95 °C 한계), 용량 vs 대역폭 vs 원가, HBM4(2,048비트, 로직 공정 베이스 다이), 3D HBM 스택 모델. MemoryBook HBM 장 링크(DRAM 셀 자체는 그쪽에서) |
| 09 | noc | 온칩 네트워크와 L2 | SM 144개와 L2 슬라이스 128개를 잇는 문제, 버스·크로스바·링·메시 비교(면적 ∝ 포트², 지연 ∝ 홉), 주소 해싱으로 슬라이스 분산, L2 파티션과 원거리 접근(NUMA 같은 효과), 경합과 큐 지연 시뮬레이터, 배선 RC(구리 저항률 증가, \(0.38RCL^2\)), 리피터 삽입과 최적 간격, 전역 배선 지연이 칩을 가로지르는 데 몇 사이클인가, 클럭 분배(H-트리·메시)와 스큐, 클럭 도메인과 비동기 FIFO, 다이 평면 배치(HBM PHY·SM 배열·L2·I/O 위치). DesignBook 배치·배선·CTS 장 링크 |
| 10 | die | 다이 크기·수율·칩렛 | 레티클 한계(26 × 33 mm), 웨이퍼당 다이 수 공식과 가장자리 손실, 결함과 수율 모델(포아송 \(e^{-AD_0}\), 음이항·군집 계수, 머피), 웨이퍼 몬테카를로 시뮬레이터, 하베스팅(SM 160 중 144 활성, 이항 분포로 양품률 계산), 양품 다이당 원가 = 웨이퍼 원가 / (다이 수 × 수율), 다이 면적에 대한 원가 초선형성, 칩렛 분할(다이 2개로 나누면 수율 이득 vs 다이 간 연결 면적·전력·지연), 다이 간 인터페이스(병렬 단거리 링크, pJ/bit·Tb/s/mm), KGD(양품 다이 확인)와 패키지 수율, 패키지 원가 합산(HBM·인터포저). YieldBook 수율 모델 장 링크 |
| 11 | package | 2.5D·3D 패키징 | 왜 HBM을 다이 옆에 두는가(배선 길이·밀도·에너지), 실리콘 인터포저(TSV·미세 배선·스티칭), RDL(유기) 인터포저와 로컬 실리콘 브리지, 마이크로범프 피치 → 단위 길이당 I/O 수(쇼어라인 밀도), 인터포저 크기의 레티클 배수와 원가, 휨(warpage)과 열팽창 계수 불일치, 언더필, 유기 기판 빌드업 층과 C4·BGA, 리드와 TIM, 하이브리드 본딩(피치 10 µm 이하)과 3D 적층(SRAM·로직 적층), 패널 레벨 패키징, 3D GX-1 패키지 분해 모델. PackagingBook 인터포저·TSV·범프·HBM 장 링크 |
| 12 | power | 전력 공급과 DVFS | 동적 전력 \(P = \alpha C V^2 f\), 누설 전력과 온도, 전압–주파수 곡선(알파 전력 법칙)과 전력 상한 아래 최적 동작점, DVFS와 부스트, 활동도에 따른 클럭 조정(전력 관리 루프), 1,000 A를 0.75 V로 공급하는 문제(전류 밀도·범프 수), PDN 모델(VRM–보드–패키지–다이, 임피던스 주파수 응답과 공진), 목표 임피던스 \(Z_t = \Delta V / \Delta I\), 디커플링(보드·패키지·인터포저 깊은 트렌치·온다이), 부하 급변(di/dt)과 전압 강하, IR 드롭 격자 풀이, 수직 전력 공급과 후면 전력 공급망, 전력 게이팅과 다크 실리콘, 전력 효율(FLOPS/W) |
| 13 | thermal | 발열과 냉각 | 열 경로(접합 → 다이 → TIM → 리드/냉각판 → 냉각수)와 1D 열저항, 열 퍼짐, 열밀도와 핫스팟 지도, 과도 열(열 용량, 시정수), 열 스로틀링 제어 루프 시뮬레이터, 누설–온도 양의 되먹임, 공랭 한계(약 700 W) vs 냉각판 수냉 vs 액침, 냉각수 온도·유량과 성능, HBM 온도 한계, 랙 전력 밀도(kW/랙)와 데이터센터 PUE, 3D 적층의 열 문제. PowerBook 열 장·InfraBook 냉각 장 링크 |
| 14 | scale | 칩 사이의 링크와 스케일업 | 칩 하나로 모자란 이유(모델 크기·메모리 용량), 병렬화 방식(데이터·텐서·파이프라인·전문가 병렬)이 요구하는 통신량, SerDes 구조(직렬화·CDR·이퀄라이저), NRZ vs PAM4, 채널 손실(dB)과 나이퀴스트 주파수, 눈 다이어그램 시뮬레이터, 비트 오류율과 FEC, 링크 대역폭 밀도와 pJ/bit, 칩간 링크 + 스위치 칩 토폴로지(GX-8 노드), 올리듀스 시간 모델(링 \(2(p-1)/p \cdot n/BW\) + 지연 항)·트리·스위치 내 리덕션, 스케일업 vs 스케일아웃 네트워크, 구리 도달 거리 한계와 광 연결, 공동 패키징 광학(CPO) |
| 15 | workloads | 워크로드가 칩을 만든다 | LLM 학습 FLOP(\(6ND\))과 GPU 시간 계산, 추론의 프리필(연산 제한) vs 디코드(대역폭 제한), 배치 크기와 산술 강도, KV 캐시 용량이 배치를 제한, 양자화(FP8·FP4)가 대역폭·용량에 주는 효과, 토큰/s와 지연 모델 시뮬레이터(GX-LM-70B), 전문가 혼합(MoE)과 통신, 그래픽 파이프라인(정점·래스터·픽셀 셰이딩·텍스처·ROP)과 고정 기능 유닛이 남아 있는 이유, 광선 추적 유닛(BVH 순회), GX-G vs GX-1 면적 배분 비교, 면적 배분 설계 실험(같은 780 mm²로 FP32·텐서·SRAM 비율 바꾸기) |
| 16 | roadmap | GPU 산업과 다음 세대 | 세대별 추세(트랜지스터 수·FLOPS·HBM 대역폭·TDP, 로그 그래프와 증가율 비교), 파운드리·HBM·첨단 패키징으로 이어지는 공급망과 병목(인터포저 생산 능력), GPU vs 맞춤형 가속기(ASIC) 트레이드오프(유연성 vs 효율), 원가 구조(다이·HBM·패키지·보드·마진), 소프트웨어 생태계가 하드웨어에 주는 제약, 다음 단계: 후면 전력, 3D 적층 SRAM, 하이브리드 본딩 칩렛, 공동 패키징 광학, 웨이퍼 스케일·패널 레벨, 전력 효율 한계. ChipIndustryBook·MemoryBook·PackagingBook 링크 |
| 17 | glossary | 용어집 & 종합 퀴즈 | 용어 검색, 플래시카드, 종합 퀴즈 |

장끼리 겹치는 주제는 한쪽에서 자세히, 다른 쪽에서는 짧게 다루고 링크한다(예: 리틀의 법칙은 2장 본진, 8장은 HBM 숫자로만. 점유율 계산은 3장 본진. 병합·뱅크 충돌은 6장 본진. 루프라인 정의는 7장 본진, 5·8·15장은 결과만 인용. 수율·원가는 10장 본진, 11장은 패키지 원가만 더한다. PDN·DVFS는 12장, 열은 13장이 12장의 전력을 입력으로 받는다. SerDes 물리는 14장, 다이 간 단거리 링크는 10장).

## 이어지는 책
본문에서 자연스러울 때 서가 안의 책을 상대 경로로 링크한다(챕터에서 `../../soc/`): SoCBook(`soc/` — 모바일 GPU 블록 `soc/chapters/gpu.html`, NPU `soc/chapters/npu.html`, 캐시 `soc/chapters/cache.html`, 일관성 `soc/chapters/coherence.html`, NoC `soc/chapters/noc.html`, 전력 `soc/chapters/power.html`, 열 `soc/chapters/thermal.html`, 클럭 `soc/chapters/clock.html`, DRAM 컨트롤러 `soc/chapters/dram.html`), MemoryBook(`memory/` — HBM `memory/chapters/hbm.html`, SRAM `memory/chapters/sram.html`, DRAM 셀 `memory/chapters/dram-cell.html`, DRAM 동작 `memory/chapters/dram-ops.html`, 메모리 계층 `memory/chapters/hierarchy.html`, 인터페이스 `memory/chapters/interface.html`), PackagingBook(`packaging/` — 인터포저 `packaging/chapters/interposer.html`, TSV `packaging/chapters/tsv.html`, HBM 패키징 `packaging/chapters/hbm.html`, 범프 `packaging/chapters/bump.html`, 플립칩 `packaging/chapters/flipchip.html`, 기판 `packaging/chapters/substrate.html`, 열 `packaging/chapters/thermal.html`), YieldBook(`yield/` — 수율 모델 `yield/chapters/models.html`, 결함 `yield/chapters/defects.html`), DigitalBook(`digital/` — 배선 `digital/chapters/wire.html`, 데이터패스 `digital/chapters/datapath.html`, 가산기 `digital/chapters/adder.html`, 전력 `digital/chapters/power.html`, 타이밍 `digital/chapters/timing.html`, 메모리 `digital/chapters/memory.html`), DesignBook(`design/` — 배치 `design/chapters/place.html`, 배선 `design/chapters/route.html`, CTS `design/chapters/cts.html`, 전력망 `design/chapters/power.html`, 사인오프 `design/chapters/signoff.html`), DeviceBook(`device/` — 스케일링 `device/chapters/scaling.html`, 신뢰성 `device/chapters/reliability.html`), ProcessBook(`process/` — 첨단 공정 `process/chapters/advanced.html`), LithoBook(`litho/` — 노드 `litho/chapters/nodes.html`, EUV `litho/chapters/euv.html`), TestBook(`test/` — 비닝 `test/chapters/binning.html`, 원가 `test/chapters/cost.html`), PowerBook(`power/` — 컨버터 `power/chapters/converters.html`, 열 `power/chapters/thermal.html`), InfraBook(`infra/` — 냉각 `infra/chapters/cooling.html`, 전력 `infra/chapters/power.html`), ChipIndustryBook(`industry/` — 파운드리 `industry/chapters/foundry.html`, 패키징 산업 `industry/chapters/packaging.html`, 메모리 산업 `industry/chapters/memory.html`, 시장 `industry/chapters/market.html`, 팹리스 `industry/chapters/fabless.html`). 링크하기 전에 대상 파일이 실제로 있는지 확인한다. `#조각`을 붙이면 대상 페이지에 그 id가 있어야 한다(`npm test`가 검사).

## 수식 규칙 (빌드가 깨지지 않게)
- 인라인 `\( ... \)`, 블록 `$$ ... $$`. HTML 안에서 `<`는 `\lt`, `>`는 `\gt`, `&`는 `&amp;`로 쓴다.
- `\text{}` 안에 `·`, `°`, `µ`, `×`, 한글 이외의 특수 유니코드(가운뎃점 등)를 넣지 않는다. 곱은 `\cdot`·`\times`, 도는 `^\circ`, 마이크로는 `\mu`를 `\text{}` 밖에서 쓴다. 한글은 `\text{}` 안에 넣어도 된다.
- 스크립트가 `\(`·`\[`·`$$`가 든 문자열을 DOM에 넣으면 안 된다(빌드는 정적 HTML의 수식만 렌더링한다). 시뮬레이터 출력에는 일반 텍스트·유니코드(x², µm, ·)를 쓴다. 캔버스 글자는 `GP.text`의 서식(`V_{DD}`, `10^{-9}`)을 쓸 수 있다.
- 퀴즈 보기(`button.opt`)와 해설에도 수식을 쓸 수 있지만 짧게.
- 작성 후 저장소 루트에서 `npm run build`가 성공해야 한다(KaTeX 문법 오류가 있으면 실패).

## head 템플릿
```html
<!doctype html>
<!-- Copyright (c) 2026 geniuskey and GPUBook contributors.
     Executable code: MIT (see ../LICENSE-MIT).
     Text, illustrations, questions and explanations: CC-BY-4.0 (see ../LICENSE.md). -->
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>HBM과 메모리 대역폭 · GPUBook</title>
<meta name="description" content="한 문장 설명">
<link rel="icon" type="image/svg+xml" href="../favicon.svg">
<link rel="stylesheet" href="../css/style.css">
<script src="../js/common.js"></script>
<!-- 3D가 필요한 페이지만 -->
<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/controls/OrbitControls.js"></script>
<style> /* 장 전용 스타일 */ </style>
<link rel="stylesheet" href="../../shared/css/book-ui.css">
<script defer src="../../shared/js/book-ui.js"></script>
<script defer src="../../shared/js/book-shell.js" data-book="gpu"></script>
</head>
<body data-chapter="hbm">
<main class="chapter">
  <header class="chapter-hero">
    <div class="eyebrow">Chapter 08</div>
    <h1>HBM과 메모리 대역폭</h1>
    <p class="lead">...</p>
    <ul class="objectives"><li>...</li></ul>
  </header>

  <section id="intro"><h2>제목</h2> ... </section>   <!-- h2 번호와 우측 목차는 자동 생성 -->
  ...
  <section class="keypoints" id="summary"><h2>핵심 정리</h2><ol><li>...</li></ol></section>
  <section class="quiz-sec" id="quiz"><h2>확인 퀴즈</h2><div class="quiz"> ... </div></section>
</main>
<script> /* 페이지 스크립트: 여기서 GP 사용. 시뮬레이터마다 (function(){ ... })(); 로 감싼다 */ </script>
</body>
</html>
```
소스에는 `<title>`과 `<meta name="description">`만 쓴다. canonical, `theme-color`, Open Graph, Twitter 카드, JSON-LD는 `tools/build.mjs`가 파일 경로, `<title>`·description, `js/common.js`의 `CHAPTERS`, `gpu/book.json`의 `meta`, git 마지막 커밋 날짜로 배포물에 생성한다. 소스에 이 태그들이 남아 있으면 `npm test`와 빌드가 실패한다. description은 `<meta>` 한 줄에 쓴다. Analytics beacon은 넣지 않는다(빌드가 넣는다). `book-ui.css`·`book-ui.js`·`book-shell.js` 세 줄은 반드시 넣는다(`npm test`가 검사).
상단바, 챕터 서랍, 목차, 이전/다음, 푸터, 테마 토글, 퀴즈 동작, 검색, 그림 확대는 `common.js`와 `@euiyun/book` 런타임이 자동 처리한다.
수식은 `tools/katex.mjs`가 빌드할 때 KaTeX HTML로 렌더링하고, 배포물에는 KaTeX 스타일시트만 붙인다. 소스에 KaTeX 태그를 넣지 않는다. 소스 파일을 바로 열면 `common.js`가 CDN에서 KaTeX를 불러와 렌더링하므로 미리보기는 그대로 된다.

챕터를 추가할 때는 `js/common.js`의 `CHAPTERS`, 루트 `sitemap.xml`, `chapters/glossary.html`의 챕터 칩, `js/glossary-data.js`에도 함께 등록한다.

## 컴포넌트
```html
<figure class="diagram"><svg viewBox="0 0 800 300" role="img" aria-label="...">...</svg><figcaption><b>그림 8-1.</b> 설명</figcaption></figure>
```
SVG 안 유틸 클래스: 글자 `.t .t-dim .t-mono .t-acc .t-acc2 .t-ok .t-warn .t-bad .t-faint .t-b .t-xs .t-sm .t-lg .t-c .t-e .t-halo`, 선 `.s-line .s-axis .s-acc .s-acc2 .s-ok .s-warn .s-bad .s-faint .dash`, 화살표 `.arr .arr-t .arr-a .arr-a2 .arr-ok .arr-warn .arr-bad .arr-blue .arr-red`(marker 내장), 지시선 `.lead .lead-a`, 치수선 `.dimline`, 면 `.f-surface .f-elev .f-acc .f-acc-soft .f-acc2-soft .f-ok-soft .f-warn-soft .f-bad-soft`, 블록 `.card .chip .chip-a .chip-a2`, 색 코드 `.k-* .kf-* .ks-* .kt-*`, 재질 `.m-* .mc-*`, 무늬 `.p-hatch .p-dots .p-grid`. 문서 전체에서 쓸 수 있는 화살촉 `url(#gp-ah)`·`#gp-ah-a` 등이 이미 있으므로 직접 marker를 만들 필요가 적다.
SVG `<marker>`/`<linearGradient>` id를 새로 만들 때는 페이지 안에서 겹치지 않게 그림마다 접두사를 붙인다. 페이지 전체에서 `id`가 중복되면 `npm test`가 실패한다.

```html
<div class="sim" id="sim-occ">
  <div class="sim-head"><span class="sim-tag">SIMULATOR</span><h3>제목</h3></div>   <!-- 3D는 <span class="sim-tag three">3D</span> -->
  <div class="sim-body side">                                    <!-- side: 넓은 화면에서 컨트롤을 오른쪽에 -->
    <div class="sim-view"><canvas id="occ-cv"></canvas></div>       <!-- 3D는 <div class="sim-view three" id="v3d"></div> -->
    <div class="sim-controls">
      <label class="ctrl"><span>스레드당 레지스터 <output id="occ-r-out"></output></span><input type="range" id="occ-r" min="16" max="255" step="1" value="64"></label>
      <div class="ctrl"><span>정밀도</span><div class="seg" id="occ-p"><button data-value="bf16" class="on">BF16</button><button data-value="fp8">FP8</button></div></div>
      <label class="check"><input type="checkbox" id="occ-show"> 옵션</label>
      <button class="btn primary" id="occ-run">실행</button>
    </div>
  </div>
  <div class="sim-readout">
    <div class="stat"><span class="k">점유율</span><span class="v" id="occ-o">—</span></div>
  </div>
  <div class="sim-note">해볼 것: ...</div>
</div>
```
`class="sim"`은 정확히 이 문자열로 쓴다(검사기가 `class="sim"`을 센다). 시뮬레이터 안 요소 id에는 시뮬레이터별 접두사를 붙여 중복을 피한다.
콜아웃: `<div class="callout">`, `.tip`, `.warn`, `.deep`(심화), `.fab`(GX-1 노트). 수식: `<div class="formula">$$...$$<div class="where">여기서 ...</div></div>`, 인라인 `\( ... \)`.
표: `<div class="table-wrap"><table>...</table></div>`. 퀴즈:
```html
<div class="quiz-q"><p>질문?</p><div class="opts">
  <button class="opt">보기</button><button class="opt" data-correct>정답</button>
</div><div class="quiz-exp">해설</div></div>
```
한 문항에 `data-correct`는 정확히 하나, `quiz-exp` 해설은 반드시 하나(`npm test`가 검사). 정답 위치를 문항마다 바꾼다.
본문 첫 등장 핵심 용어는 `<span class="term">레지스터 파일</span>`처럼 강조할 수 있다(용어집 툴팁은 `js/glossary-data.js`로 자동 연결된다).

## JS 헬퍼 (`js/common.js`, DeviceBook v2 키트)
- `GP.canvas(el, (ctx,w,h)=>{}, {aspect:0.5, height, minHeight, maxHeight, hover})` → `{ctx,w,h,redraw()}` HiDPI, 리사이즈/테마 시 자동 redraw(배경 `--canvas-bg`로 칠해 줌). `height`에 함수 `(w)=>px`도 가능.
- `GP.chart(ctx, box|null, {x:[a,b], y:[a,b], logX, logY, xLabel, yLabel, series:[{data:[[x,y]],color,width,dash,fill,label}], vlines, hlines, points, bands, hbands, legend, hover, xFmt, yFmt, after})` → `{X,Y,invX,invY,box}`. 축 이름·범례·값 글자는 `GP.text` 서식(첨자 `_{}`, 지수 `^{}`)을 따른다.
- `GP.text(ctx, str, x, y, {size, weight, color, align, baseline, halo, font})`, `GP.textWidth`, `GP.wrapText`, `GP.badge`, `GP.endLabels`, `GP.arrow(ctx,x0,y0,x1,y1,{color,width,head,dash,both})`, `GP.rrect`, `GP.matRect(ctx,x,y,w,h,'dram')`.
- `GP.loop(el, (dt,t)=>{})` 화면에 보일 때만 도는 rAF 루프 `{start,stop,toggle,running}`. `GP.approach(x, target, dt, tau)`, `GP.ease`.
- `GP.range(id, fmt, onInput)` → getter `get()`, `get.set(v)`. `GP.seg(id, onChange)` → getter. `GP.stat(id, html)`. `GP.pointer`, `GP.drag`, `GP.tip`(캔버스 툴팁).
- `GP.palette()` 테마 색(`bg text dim faint grid axis border surface accent accent2 ok warn bad red green blue series[]` + 색 코드 `compute tensor ctrl sram dram data link volt heat clock`), `GP.color('accent')`, `GP.alpha(c,a)`, `GP.mix(a,b,t)`, `GP.onTheme(cb)`, `GP.isDark()`.
- `GP.randn()`, `GP.poisson(λ)`, `GP.rng(seed)`, `GP.fmt(x, digits)`, `GP.si(x,'B')`, `GP.bytes(x)`, `GP.bin(n,w)`, `GP.num(x)`, `GP.clamp/lerp/map`, `GP.erf/erfc`, `GP.debounce`, `GP.C = {h,c,q,k,eps0,hbar,me}`.
- `GP.three(el, {camera:[x,y,z], target:[x,y,z], fov, autoRotate, minDistance, maxDistance})` → `T = {THREE, scene, camera, renderer, controls, onFrame(cb), label(html, Vector3|[x,y,z]), material(color, opts)}`. 조명/리사이즈/화면밖 정지 포함. 라벨의 `L.obj = mesh`로 두면 로컬 좌표를 따라감.

정확한 시그니처는 `js/common.js`를 직접 읽어 확인한다.

## 검사
저장소 루트에서 `npm test`(메타데이터·링크·스크립트 문법·id 중복·장별 최소 개수 경고)와 `npm run build`(KaTeX)를 돌린다. 장 하나만 빠르게 볼 때는 `node tools/check.cjs 2>&1 | grep gpu/`. 브라우저 검사: `node tools/browser-check.cjs --offline gpu/`, 모바일 `node tools/browser-check.cjs --dist --mobile gpu/`(Playwright 필요, 로컬 전용).
