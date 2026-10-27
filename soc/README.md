# SoCBook — 인터랙티브 시스템 온 칩 교과서

손톱만 한 칩 안의 컴퓨터 한 대. 공대 학부생을 위한 한국어 SoC(System on Chip) 학습 사이트입니다.
[ProcessBook](https://semi.euiyun.com/process/)과 같은 디자인 시스템을 쓰는 [euiyun books](https://books.euiyun.com/) 시리즈의 한 권이며,
Bartosz Ciechanowski의 [Mechanical Watch](https://ciechanow.ski/mechanical-watch/)처럼 **부품 하나하나를 직접 건드려 보고 바꿔 보며** 배우도록 만들었습니다.

모든 장은 가상의 기준 칩 **SB-1**(3 nm급, 약 106 mm², 트랜지스터 약 190억 개)을 함께 씁니다. 장 머리말의 미니 지도가 그 장이 칩의 어느 블록인지 보여 줍니다.

배포 주소: https://semi.euiyun.com/soc/

## 실행
빌드 과정이 없는 정적 사이트입니다.

```bash
python3 -m http.server 8000   # → http://localhost:8000
```
`index.html`을 브라우저로 바로 열어도 동작합니다. KaTeX, three.js, 폰트는 CDN에서 불러옵니다.

## 구성
| 장 | 파일 | 주제 |
|---|---|---|
| 01 | chapters/overview.html | SoC란 무엇인가: 통합의 이득, SB-1 다이 탐험, 작업별 전력 지도, 사진 한 장의 여행, 연산 에너지, 무어의 법칙, 효율의 사다리 |
| 02 | chapters/logic.html | 트랜지스터에서 동기 회로까지: CMOS 인버터, 게이트 지연, 플립플롭, setup·hold, 임계 경로 |
| 03 | chapters/cpu.html | CPU 코어: 명령어 인코딩, 5단 파이프라인, 해저드·포워딩, 분기 예측 |
| 04 | chapters/ooo.html | 슈퍼스칼라·비순차 실행, 레지스터 이름 바꾸기, ROB, big.LITTLE 스케줄링 |
| 05 | chapters/cache.html | 캐시와 메모리 계층: 지역성, 캐시 시뮬레이터, AMAT, 블로킹, 프리페치 |
| 06 | chapters/coherence.html | 캐시 일관성: MESI, 스누핑·디렉터리, 거짓 공유, 메모리 순서 |
| 07 | chapters/dram.html | 메모리 컨트롤러와 LPDDR: 뱅크·행 버퍼, 타이밍, 스케줄링, 리프레시 |
| 08 | chapters/noc.html | 온칩 인터커넥트: valid/ready, AXI, 크로스바·메시 NoC, 라우팅·혼잡·교착 |
| 09 | chapters/gpu.html | GPU: 래스터화, SIMT와 분기 발산, 점유율과 지연 숨기기, 타일 렌더링 |
| 10 | chapters/npu.html | NPU: 시스톨릭 배열, 루프라인, 양자화, LLM 대역폭 |
| 11 | chapters/media.html | ISP 파이프라인, 움직임 추정·DCT, DSP 필터, 디스플레이 |
| 12 | chapters/power.html | 전력: CV²f, 누설, DVFS 거버너, 클럭·전원 게이팅 |
| 13 | chapters/thermal.html | 열·전력 공급: 열 RC 모델과 스로틀링, 다이 열 확산, IR 강하, 전압 강하 |
| 14 | chapters/clock.html | 클럭: PLL, 클럭 트리와 스큐, 클럭 게이팅, CDC·동기화기, 비동기 FIFO |
| 15 | chapters/io.html | 인터럽트·DMA, I²C·SPI, SerDes와 아이 다이어그램, 메모리 맵 |
| 16 | chapters/security.html | 부팅 순서, 해시·서명, 신뢰 사슬, TrustZone, 부채널 공격 |
| 17 | chapters/design.html | 설계 흐름, 평면 배치, 검증 커버리지, 다이 원가·수율, 칩렛 |
| 18 | chapters/lab.html | SoC 설계실(샌드박스): 구성을 골라 성능·전력·면적·원가를 겨루고 링크로 공유 |
| 19 | chapters/glossary.html | 용어집, 종합 퀴즈(문제 은행에서 20문항) |

공통 코드
- `css/style.css` — 디자인 토큰(라이트/다크), IP 블록 색(`--b-cpu`, `--b-gpu` …)
- `js/common.js` — 내비게이션, 캔버스·차트·컨트롤 헬퍼, 전역 `SB`
- `js/soc.js` — 기준 칩 SB-1 평면도, 다이 위젯, 장 위치 지도, 타이밍 파형, 포인터 헬퍼, 전역 `SOC`
- `tools/glossary.py` — `tools/glossary/<slug>.json`(용어·문제 은행)으로 용어집 데이터 생성
- `tools/check.js` — Playwright로 모든 페이지의 콘솔 오류·모바일 가로 넘침 점검

챕터 작성 규칙은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.
시뮬레이터의 수치는 교육용 근사 모델입니다. 실제 제품 수치는 2023~2026년 공개 자료 기준의 대략값입니다.

## 점검
```bash
python3 tools/glossary.py
node tools/check.js            # playwright 필요 (전역 설치라면 PW_PATH=$(npm root -g)/playwright)
```

## 배포 (GitHub Pages)
저장소 루트가 그대로 사이트입니다. `CNAME`에 `socbook.euiyun.com`이 들어 있고, `.nojekyll`로 Jekyll 처리를 끕니다.
1. GitHub 저장소 **Settings → Pages**에서 Source를 `Deploy from a branch`, 브랜치 `main` / 폴더 `/ (root)`로 지정합니다.
2. DNS에서 `socbook.euiyun.com`을 `geniuskey.github.io`로 가리키는 **CNAME 레코드**를 추가합니다.

## 용어집과 본문 뜻풀이

용어 정의는 `js/glossary-data.js`의 `window.BOOK_GLOSSARY`에 저장합니다. 용어집과 본문 뜻풀이가 같은 데이터를 사용하며, 본문에서 용어에 마우스를 올리거나 키보드로 포커스하거나 모바일에서 탭하면 정의를 확인할 수 있습니다. 공통 동작과 스타일은 `js/glossary-tooltips.js`, `css/glossary-tooltips.css`입니다. 데이터 형식은 시리즈 공통 v1이며, 각 항목은 `ko`(이름), `en`(영문명), `abbr`(약어), `def`(정의), `chapters`(관련 장 목록)를 갖습니다. 이름이 반복되면 한 번만 표시하고, 묶음 항목은 가리킨 이름을 제목에 표시하며 구분에 필요한 비교 설명을 함께 제공합니다.

## 라이선스
실행 코드는 [MIT](LICENSE-MIT), 교재 본문·그림·문제 등 교육 콘텐츠는 [CC BY 4.0](LICENSE-CC-BY-4.0)입니다. 자세한 구분은 [LICENSE.md](LICENSE.md)를 보세요.
