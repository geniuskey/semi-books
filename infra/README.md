# InfraBook — 인터랙티브 반도체 인프라 교과서

팹을 움직이는 보이지 않는 공장. 공대 학부생과 신입 엔지니어를 위한 한국어 반도체 팹 인프라 학습 사이트입니다.
18개 챕터, 130여 개의 시뮬레이터, 3D 구조 모델(three.js)로 구성되며, 가상 기준 팹 FAB-E의 숫자로 직접 계산해 봅니다.

배포 주소: https://semi.euiyun.com/infra/

## 실행
원본은 빌드 없이 동작하는 정적 사이트입니다. 저장소 루트에서 실행하세요.

```bash
python3 -m http.server 8000   # → http://localhost:8000/infra/
```
배포할 때는 저장소 루트의 `npm run build`가 head 메타데이터와 KaTeX 수식을 미리 렌더링합니다. three.js와 폰트는 CDN에서 불러오므로 인터넷 연결이 필요합니다.

## 구성
| 장 | 파일 | 주제 |
|---|---|---|
| 01 | chapters/overview.html | 팹 인프라 지도 — 공장을 위한 공장. 클린룸·서브팹·유틸리티동의 층 구조, 웨이퍼 한 장이 먹는 물·전기·가스, 이 책의 지도. |
| 02 | chapters/cleanroom.html | 클린룸과 입자 — ISO 14644 등급과 입자 크기 분포, FFU와 단방향 기류, 환기 횟수, 사람이 가장 큰 오염원인 이유. |
| 03 | chapters/hvac.html | 공조: 온도·습도·압력 — 외기조화기(MAU)와 순환 공조, 습공기선도, ±0.1 °C 제어, 실간 차압 계층과 에너지. |
| 04 | chapters/amc.html | 분자 오염과 미니인바이런먼트 — AMC의 네 종류(산·염기·유기·도펀트), 케미컬 필터 수명, FOUP·EFEM과 질소 퍼지. |
| 05 | chapters/upw.html | 초순수(UPW) — 18.2 MΩ·cm의 물. 역삼투·EDI·UV·이온교환·한외여과 트레인, ppt 단위 TOC·금속·입자 관리. |
| 06 | chapters/gas.html | 가스 공급 — 질소 공기분리장치, 벌크·특수가스, 가스 캐비닛과 VMB, ppb 순도와 배관 압력 강하. |
| 07 | chapters/chemical.html | 케미컬과 슬러리 공급 — 중앙 케미컬 공급(CDS), 블렌딩과 농도 제어, 필터링, 슬러리 응집과 순환 루프. |
| 08 | chapters/exhaust.html | 배기와 스크러버 — 산·알칼리·유기·일반 배기 분리, POU 스크러버(연소·습식·플라즈마), PFC 분해 효율과 GWP. |
| 09 | chapters/water.html | 폐수 처리와 물 재이용 — 불산·CMP·유기 폐수의 분리 수집, 응집·침전, 물 수지와 재이용률을 계산한다. |
| 10 | chapters/power.html | 전력과 전력 품질 — 154/345 kV 수전, 변전과 배전, 순간 전압 강하와 SEMI F47, UPS·비상발전, 부하 곡선. |
| 11 | chapters/cooling.html | 냉동·냉각수·열 관리 — 칠러 COP와 냉각탑, 공정 냉각수(PCW), 습구 온도, 프리쿨링과 폐열 회수. |
| 12 | chapters/vibration.html | 진동·소음·전자기 환경 — VC 진동 기준 곡선, 와플 슬래브, 노광·계측 장비의 미세진동 절연, 자기장과 EMI. |
| 13 | chapters/amhs.html | 물류 자동화(AMHS) — OHT와 스토커, 레일 교통과 대기열, 반송 시간이 사이클 타임을 바꾸는 방식. |
| 14 | chapters/safety.html | 가스 안전과 비상 대응 — 독성·자연발화성 가스, 노출 기준과 가스 감지기, 누출 확산, 화재·지진·정전 대응. |
| 15 | chapters/operation.html | 유틸리티 운영과 신뢰성 — N+1 이중화와 가용도, MTBF·MTTR, FMCS 모니터링, 이상 감지와 예지 정비, 디지털 트윈. |
| 16 | chapters/sustain.html | 에너지·탄소·물 — 웨이퍼당 전력·물·탄소, Scope 1·2·3, 재생에너지 조달, 효율 개선의 우선순위. |
| 17 | chapters/build.html | 팹 건설과 경제학 — 부지·용수·전력 선정, 셸 퍼스트와 단계 확장, 건설 일정, 인프라 CAPEX와 운영비. |
| 18 | chapters/glossary.html | 용어집 & 종합 퀴즈 — 팹 인프라 핵심 용어를 검색하고, 종합 퀴즈로 실력을 점검하자. |

공통 코드: `css/style.css`(디자인 토큰, 라이트/다크), `js/common.js`(내비게이션, 캔버스·차트·3D 헬퍼, 전역 `IB`).
챕터 작성 규칙은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.

시뮬레이터의 수치는 교육용 근사 모델입니다. 실제 수치는 공개 자료 기준의 대략값이며 특정 회사의 내부 값이 아닙니다.

## 용어집과 본문 뜻풀이

용어 정의는 `js/glossary-data.js`의 `window.BOOK_GLOSSARY`에 저장합니다. 용어집과 본문 뜻풀이가 같은 데이터를 사용하며, 본문에서 용어에 마우스를 올리거나 키보드로 포커스하거나 모바일에서 탭하면 정의를 확인할 수 있습니다. 공통 동작과 스타일은 `js/glossary-tooltips.js`, `css/glossary-tooltips.css`입니다. 데이터 형식은 시리즈 공통 v1이며, 각 항목은 `ko`(이름), `en`(영문명), `abbr`(약어), `def`(정의), `chapters`(관련 장 목록)를 갖습니다.

## 라이선스

Copyright (c) 2026 geniuskey and InfraBook contributors

| 적용 대상 | 라이선스 | 재사용 조건 |
|---|---|---|
| JS·CSS·HTML의 실행 코드 | [MIT](LICENSE-MIT) | 수정·재배포·상업적 이용 가능. 저작권 및 라이선스 고지 유지 |
| 교재 본문·그림·문제·해설 | [CC BY 4.0](LICENSE-CC-BY-4.0) | 수정·번역·재배포·상업적 이용 가능. 저작자·출처·라이선스 표시 및 변경 사실 명시 |

HTML 및 JS 안의 교육 콘텐츠에도 CC BY 4.0을 적용합니다. 적용 범위, 출처 표시 예시 및 외부 자료에 대한 안내는 [라이선스 안내](LICENSE.md)를 참고하세요.
