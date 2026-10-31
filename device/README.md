# DeviceBook — 인터랙티브 반도체 소자 물리 교과서

전자와 정공에서 트랜지스터까지. 공대 학부생을 위한 한국어 반도체 소자 물리 학습 사이트입니다.
19개 챕터, 130여 개의 시뮬레이터·애니메이션·챌린지, 그리고 포아송·드리프트–확산 방정식을 실제로 푸는 1차원 소자 솔버(`js/semi.js`)로 구성됩니다.
도핑·온도·바이어스를 바꾸면 밴드 다이어그램, 캐리어 농도, 전기장, 전류가 어떻게 변하는지 보고, 마지막에는 직접 소자를 설계해 봅니다.

배포 주소: https://semi.euiyun.com/device/ · 자매 교과서: [ProcessBook (반도체 제조 공정)](https://semi.euiyun.com/process/)

## 실행
빌드 과정이 없는 정적 사이트입니다.

```bash
python3 -m http.server 8000   # → http://localhost:8000
```
`index.html`을 브라우저로 바로 열어도 동작합니다. KaTeX, three.js, 폰트는 CDN에서 불러오므로 인터넷 연결이 필요합니다.

## 구성
| 장 | 파일 | 주제 |
|---|---|---|
| 01 | chapters/crystal.html | 다이아몬드 격자(3D), 밀러 지수, 원자 준위 → 밴드, 크로니히–페니, E–k와 유효 질량, 직접·간접 밴드갭 |
| 02 | chapters/carriers.html | 상태 밀도와 페르미–디랙, 진성 농도, 도핑, 불완전 이온화, 동결·외인성·진성 영역, 축퇴 |
| 03 | chapters/transport.html | 열 운동과 산란, 드리프트·이동도·속도 포화, 확산과 아인슈타인 관계, 홀 효과, 4탐침 |
| 04 | chapters/gr.html | 직접·SRH·오제 재결합, 수명, 연속 방정식, 확산 길이, 헤인스–쇼클리, 준페르미 준위 |
| 05 | chapters/pn.html | 접합 형성 애니메이션, 내부 전위, 공핍 근사 vs 수치 해, C–V |
| 06 | chapters/diode.html | 소수 캐리어 주입, 쇼클리 방정식, 이상 계수, 항복, 확산 용량, 역회복 |
| 07 | chapters/ms.html | 쇼트키 장벽, 페르미 준위 고정, 열전자 방출, 영상력, 오믹 접촉과 TLM |
| 08 | chapters/mos.html | 축적·공핍·반전 밴드 휨, 평탄대·문턱 전압, LF/HF/깊은 공핍 C–V, 산화막 전하, high-k |
| 09 | chapters/mosfet.html | 점진 채널 근사, 출력·전달 특성, 핀치오프, 문턱 이하 기울기, 바디 효과, CMOS 인버터 |
| 10 | chapters/scaling.html | 데너드 스케일링, 자연 길이, DIBL·롤오프, 누설, FinFET·GAA(3D) |
| 11 | chapters/bjt.html | 동작 영역, 소수 캐리어 분포, 전류 이득, 거멜 플롯, 얼리 효과, 에버스–몰, HBT |
| 12 | chapters/opto.html | 흡수와 광 생성, 포토다이오드, 태양 전지 I–V, LED 추출 효율, 레이저 기초 |
| 13 | chapters/hetero.html | 이종 접합과 밴드 공학: 밴드 오프셋, 2차원 전자 가스, 양자 우물, 변형 SiGe |
| 14 | chapters/power.html | 전력 반도체 소자: 항복과 온저항, 전력 MOSFET·슈퍼정션·IGBT, SiC·GaN, 스위칭 손실 |
| 15 | chapters/rf.html | 고주파 소자와 잡음: 소신호 모델, f_T·f_max, 열·산탄·1/f 잡음과 잡음 지수 |
| 16 | chapters/reliability.html | 소자 신뢰성: HCI, BTI, TDDB와 와이블 통계, 가속 시험, ESD, 자가 발열 |
| 17 | chapters/esd.html | ESD와 래치업: HBM·CDM·IEC 펄스, TLP, GGNMOS 스냅백·실리사이드 블록, RC 레일 클램프, CDM 영역 경계, 래치업·JESD78, SEED, 고속 I/O |
| 18 | chapters/lab.html | 소자 실험실(샌드박스): 도핑 영역을 쌓고 바이어스·빛을 걸어 1D 수치 해를 보고 링크로 공유 |
| 19 | chapters/glossary.html | 용어집, 종합 퀴즈(문제 은행에서 20문항) |

공통 코드
- `css/style.css` — 디자인 토큰(라이트/다크), 전자·정공·밴드 색
- `js/common.js` — 내비게이션, 캔버스·차트 헬퍼, 전역 `PB`
- `js/semi.js` — 소자 물리 엔진, 전역 `SC`: 재료 상수, 캐리어 통계, 이동도, pn·MOS·MOSFET 모델, 1D 포아송·드리프트–확산 솔버(샤페터–거멜), 밴드 다이어그램 그리기
- `tools/check.mjs` — Playwright 점검(JS 오류, 360px 가로 넘침, 빈 캔버스)

챕터 작성 규칙은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.
시뮬레이터의 수치는 교육용 근사 모델입니다. 재료 상수는 Sze, Pierret, Green 등의 대표값이며, 이 책에서 실리콘의 300 K 진성 농도는 \(n_i \approx 1.07\times10^{10}\,\mathrm{cm^{-3}}\)입니다.

## 배포 (GitHub Pages)
저장소 루트가 그대로 사이트입니다. `CNAME`에 `devicebook.euiyun.com`이 들어 있고, `.nojekyll`로 Jekyll 처리를 끕니다.
1. GitHub 저장소 **Settings → Pages**에서 Source를 `Deploy from a branch`, 브랜치 `main` / 폴더 `/ (root)`로 지정합니다.
2. DNS에서 `devicebook.euiyun.com`을 `geniuskey.github.io`로 가리키는 **CNAME 레코드**를 추가합니다.
3. Pages 설정에서 Custom domain이 `devicebook.euiyun.com`으로 잡히면 **Enforce HTTPS**를 켭니다.

## 용어집과 본문 뜻풀이

용어 정의는 `js/glossary-data.js`의 `window.BOOK_GLOSSARY`에 저장합니다. 용어집과 본문 뜻풀이가 같은 데이터를 사용하며, 본문에서 용어에 마우스를 올리거나 키보드로 포커스하거나 모바일에서 탭하면 정의를 확인할 수 있습니다. 공통 동작과 스타일은 `js/glossary-tooltips.js`, `css/glossary-tooltips.css`입니다. 데이터 형식은 시리즈 공통 v1이며, 각 항목은 `ko`(이름), `en`(영문명), `abbr`(약어), `def`(정의), `chapters`(관련 장 목록)를 갖습니다. 이름이 반복되면 한 번만 표시하고, 묶음 항목은 가리킨 이름을 제목에 표시하며 구분에 필요한 비교 설명을 함께 제공합니다.

## 라이선스

Copyright (c) 2026 geniuskey and DeviceBook contributors

| 적용 대상 | 라이선스 | 재사용 조건 |
|---|---|---|
| JS·CSS·Python·HTML의 실행 코드 | [MIT](LICENSE-MIT) | 수정·재배포·상업적 이용 가능. 저작권 및 라이선스 고지 유지 |
| 교재 본문·그림·문제·해설 | [CC BY 4.0](LICENSE-CC-BY-4.0) | 수정·번역·재배포·상업적 이용 가능. 저작자·출처·라이선스 표시 및 변경 사실 명시 |

자세한 내용은 [라이선스 안내](LICENSE.md)를 참고하세요.
