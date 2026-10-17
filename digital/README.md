# DigitalBook — 인터랙티브 디지털 회로 설계 교과서

0과 1을 만드는 트랜지스터. 공대 학부생을 위한 한국어 디지털 회로 설계 학습 사이트입니다.
반도체 회로를 아날로그와 디지털로 나눌 때 **디지털 회로** 쪽을 다루며, [ProcessBook](https://semi.euiyun.com/process/)·[SoCBook](https://semi.euiyun.com/soc/)과 같은 디자인 시스템을 쓰는 [euiyun books](https://books.euiyun.com/) 시리즈의 한 권입니다.
Bartosz Ciechanowski의 글처럼 **스위치 하나, 게이트 하나를 직접 켜고 끄고 늘이고 재 보며** 배우도록 만들었습니다.

모든 장은 교육용 기준 공정 **DG-7**(7 nm급, VDD 0.75 V, Vt 0.30 V, FO4 ≈ 7.5 ps)을 함께 씁니다. 장 머리말의 추상화 사다리(소자 → 게이트 → 순차 회로 → 데이터패스 → 블록 → 칩)가 그 장이 어느 층을 다루는지 보여 줍니다.

배포 주소: https://semi.euiyun.com/digital/

## 실행
정적 사이트이므로 별도 빌드 없이 로컬 서버나 브라우저에서 열 수 있습니다.

```bash
python3 -m http.server 8000   # → http://localhost:8000
```
`index.html`을 브라우저로 바로 열어도 동작합니다. KaTeX와 폰트는 CDN에서 불러옵니다.

다른 시리즈 책과 같은 도구로 메타데이터와 배포 파일도 검사·생성할 수 있습니다(Node.js 20 이상, Python 3 필요).

```bash
npm ci
npm test
npm run build                 # 용어 데이터 갱신 → .book-dist/ 생성
```

상단의 ‘이 책 검색’에서 챕터·섹션·시뮬레이터·그림을 찾을 수 있습니다. 상세 검색은 로컬 서버나 배포 사이트에서 사용합니다. 실습 제목과 그림 설명의 `#` 링크로 해당 위치를 공유할 수 있습니다.

## 구성
| 장 | 파일 | 주제 |
|---|---|---|
| 01 | chapters/overview.html | 디지털이라는 약속: 재생성, 노이즈 마진, 이진 표현, 추상화의 사다리 |
| 02 | chapters/boolean.html | 불 대수와 논리 게이트: 진리표, 드모르간, 카르노 맵, 범용 게이트, 해저드 |
| 03 | chapters/mosfet.html | 스위치가 된 트랜지스터: I-V 곡선, 알파 전력 법칙, 부문턱 누설, 온저항과 커패시턴스 |
| 04 | chapters/inverter.html | CMOS 인버터: VTC, 스위칭 임계, 노이즈 마진, 과도 응답, 링 오실레이터 |
| 05 | chapters/gates.html | 정적 CMOS 게이트: 풀업·풀다운 쌍대성, 복합 게이트, 크기 조절, 오일러 경로 |
| 06 | chapters/delay.html | 게이트 지연과 논리적 노력: RC·엘모어 지연, FO4, 경로 최적화, 버퍼 체인 |
| 07 | chapters/styles.html | 패스 트랜지스터와 동적 논리: 전송 게이트, 의사 nMOS, 도미노, 전하 공유 |
| 08 | chapters/latch.html | 래치와 플립플롭: 쌍안정, D 래치, 마스터-슬레이브, setup·hold, 메타안정성 |
| 09 | chapters/fsm.html | 유한 상태 기계: 카운터, LFSR, 무어·밀리, 상태 인코딩 |
| 10 | chapters/timing.html | 타이밍과 클럭: 정적 타이밍 분석, 스큐·지터, 파이프라이닝, 리타이밍, CDC |
| 11 | chapters/adder.html | 덧셈기: 리플 캐리, 캐리 예측, 병렬 접두사(Kogge–Stone 등) |
| 12 | chapters/datapath.html | 곱셈기·시프터·ALU: 부스 부호화, 월리스 트리, 배럴 시프터, 부동소수점 |
| 13 | chapters/memory.html | SRAM과 메모리 회로: 6T 셀, 나비 곡선과 SNM, 센스 앰프, 디코더 |
| 14 | chapters/wire.html | 배선: 분산 RC, 리피터 삽입, 크로스토크, 미세화와 배선 지연 |
| 15 | chapters/power.html | 전력과 저전력 설계: αCV²f, 누설, 게이팅, 다중 Vt, DVFS, 최소 에너지점 |
| 16 | chapters/robust.html | 변동·신뢰성·테스트: PVT 코너, 몬테카를로, 소프트 에러와 ECC, 스캔 테스트 |
| 17 | chapters/hdl.html | HDL에서 게이트까지: Verilog, 래치 추론, 미니 합성기, 표준 셀 매핑 |
| 18 | chapters/lab.html | 디지털 회로 실험실(샌드박스): 게이트를 놓고 선을 이어 시뮬레이션, 링크로 공유 |
| 19 | chapters/glossary.html | 용어집, 종합 퀴즈(문제 은행에서 20문항) |

공통 코드
- `css/style.css` — 디자인 토큰(라이트/다크), 논리값 색(`--hi` `--lo` `--lx` `--lz`)과 트랜지스터 색(`--nmos` `--pmos`)
- `js/common.js` — 내비게이션, 캔버스·차트·컨트롤 헬퍼, 전역 `SB`
- `js/dig.js` — 기준 공정 DG-7, MOSFET 근사 모델과 인버터 VTC, 게이트·트랜지스터 기호, 타이밍 파형, 이벤트 구동 논리 시뮬레이터, 추상화 사다리, 전역 `DG`
- `tools/head.py` — 챕터 `<head>`·사이트맵·JSON-LD 생성기
- `tools/glossary.py` — `tools/glossary/<slug>.json`(용어·문제 은행)으로 공통 용어 데이터와 종합 퀴즈 생성
- `js/glossary-data.js` — 생성된 시리즈 공통 v1 용어 데이터(`ko`, `en`, `abbr`, `def`, `chapters`)
- `js/glossary-tooltips.js`, `css/glossary-tooltips.css` — 다른 시리즈와 같은 본문 용어 뜻풀이
- `tools/check.js` — Playwright로 모든 페이지의 콘솔 오류·모바일 가로 넘침 점검

챕터 작성 규칙은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.
시뮬레이터의 수치는 교육용 근사 모델입니다. 실제 공정·제품 수치는 2020~2026년 공개 자료 기준의 대략값입니다.

용어 정의는 `tools/glossary/<slug>.json`에서 수정한 뒤 `npm run generate`로 갱신합니다. 용어집과 본문 툴팁은 같은 데이터를 사용합니다. 마우스 오버, 키보드 포커스, 모바일 탭으로 뜻을 확인할 수 있으며, 이름 중복은 제거하고 묶음 항목은 가리킨 이름을 제목에 표시합니다.

## 점검
```bash
python3 tools/head.py && python3 tools/glossary.py
python3 tools/glossary.py --check   # 생성된 용어 데이터·퀴즈의 최신 여부 확인
node tools/check.js            # playwright 필요 (전역 설치라면 PW_PATH=$(npm root -g)/playwright)
```

## 배포 (GitHub Pages)
저장소 루트가 그대로 사이트입니다. `CNAME`에 `digitalbook.euiyun.com`이 들어 있고, `.nojekyll`로 Jekyll 처리를 끕니다.
1. GitHub 저장소 **Settings → Pages**에서 Source를 `Deploy from a branch`, 브랜치 `main` / 폴더 `/ (root)`로 지정합니다.
2. DNS에서 `digitalbook.euiyun.com`을 `geniuskey.github.io`로 가리키는 **CNAME 레코드**를 추가합니다.

## 라이선스
실행 코드는 [MIT](LICENSE-MIT), 교재 본문·그림·문제 등 교육 콘텐츠는 [CC BY 4.0](LICENSE-CC-BY-4.0)입니다. 자세한 구분은 [LICENSE.md](LICENSE.md)를 보세요.
