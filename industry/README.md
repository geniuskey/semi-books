# ChipIndustryBook — 만져 보며 읽는 반도체 산업 지도

칩 하나는 누가, 어디서, 왜, 얼마에 만드는가. 설계 도구·IP에서 팹리스, 장비·소재, 파운드리·메모리, 패키징·테스트, 시장까지 반도체 산업의 가치사슬 전체를 지도와 시뮬레이터로 펼치는 한국어 인터랙티브 교과서입니다.
17개 챕터, 100개가 넘는 시뮬레이터, 그리고 모든 장이 같은 숫자와 모델을 쓰게 하는 산업 엔진(`js/industry.js`)으로 구성됩니다.
책 전체가 가상의 AI 가속기 칩 하나(TARGET AX-1: 806 mm², 3 nm급, HBM 6스택)를 가치사슬을 따라 시장까지 옮기고, 16장에서는 독자가 반도체 회사를 직접 경영해 봅니다.

글을 읽지 않고 시뮬레이터만 쓰는 독자를 위해 두 가지 길을 둡니다.
- **시뮬레이터 갤러리**(`sims.html`): 모든 시뮬레이터를 카드로 모아 검색하고 바로 엽니다.
- **시뮬레이터만 보기**: 챕터 상단 버튼 하나로 글·퀴즈를 숨기고 시뮬레이터만 남깁니다.

반도체 시리즈([ProcessBook](https://semi.euiyun.com/process/), [LithoBook](https://semi.euiyun.com/litho/), [MemoryBook](https://semi.euiyun.com/memory/), [PackagingBook](https://semi.euiyun.com/packaging/), [YieldBook](https://semi.euiyun.com/yield/), [FailureBook](https://semi.euiyun.com/failure/), [SensorBook](https://semi.euiyun.com/sensor/), [TCADBook](https://semi.euiyun.com/tcad/))의 마지막 권입니다.

배포 주소: https://semi.euiyun.com/industry/

## 실행
빌드 과정이 없는 정적 사이트입니다.

```bash
python -m http.server 8000   # → http://localhost:8000
```
`index.html`을 브라우저로 바로 열어도 동작합니다. KaTeX와 폰트는 CDN에서 불러오므로 인터넷 연결이 필요합니다.

## 구성

| 장 | 파일 | 주제 |
|---|---|---|
| 01 | chapters/overview.html | 칩 한 개가 지나는 길: 가치사슬과 산업 지도 |
| 02 | chapters/market.html | 시장의 크기와 모양: 제품·응용·지역, 40년 매출, 순위 변천 |
| 03 | chapters/cycle.html | 실리콘 사이클: 증설 지연, 채찍 효과, 거미집 |
| 04 | chapters/business.html | 사업 모델: IDM, 팹리스, 파운드리, 팹라이트 |
| 05 | chapters/eda-ip.html | 설계 도구와 IP: EDA 과점, 라이선스·로열티 |
| 06 | chapters/fabless.html | 팹리스와 칩 설계의 경제학: NRE, 다이 크기, 가격 |
| 07 | chapters/equipment.html | 장비: 팹 투자 분해, EUV 경제학, 장비 과점 |
| 08 | chapters/materials.html | 소재와 부품: 집중도, 공급 차질 |
| 09 | chapters/foundry.html | 파운드리와 팹의 경제학: 다이 원가, 학습 곡선 |
| 10 | chapters/memory.html | 메모리 산업: 과점, 가격 사이클, HBM |
| 11 | chapters/packaging.html | 패키징·테스트와 칩렛 |
| 12 | chapters/demand.html | 수요: 응용 시장, 기기별 칩 함량, AI 가속기 원가 |
| 13 | chapters/geography.html | 공급망의 지리: 지역 점유, 거점, 단일 장애점 |
| 14 | chapters/geopolitics.html | 정책과 지정학: 수출 통제, 보조금, 자급의 비용 |
| 15 | chapters/korea.html | 한국 반도체 |
| 16 | chapters/lab.html | 산업 실험실: 회사 경영 게임, AX-2 설계, 공급망 스트레스 테스트 |
| 17 | chapters/glossary.html | 용어집, 회사 사전, 종합 퀴즈 |

공통 코드
- `css/style.css` — 디자인 토큰(라이트/다크), 가치사슬·지역 색
- `js/common.js` — 내비게이션, 시뮬레이터만 보기, 캔버스·차트·끌기·정보 상자 헬퍼, 전역 `CB`
- `js/industry.js` — 지역·가치사슬·회사·시장·노드 데이터, 다이 원가·수율·팹·칩렛·집중도·사이클 모델, 세계 지도, 전역 `IND`
- `js/sims.js` — 시뮬레이터 목록(자동 생성)
- `tools/head.py` — 챕터 `<head>`·사이트맵·JSON-LD 생성기
- `tools/sims.py` — 시뮬레이터 갤러리 목록 생성기
- `tools/check.py` — 페이지 점검기(콘솔 오류, 가로 넘침, 조작 중 예외)

챕터 작성 규칙은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.
수치는 공개 자료(WSTS, SIA·BCG, SEMI, 각 사 연차 보고서 등)를 반올림한 근사치이며, 시뮬레이터는 교육용 단순 모델입니다. 투자 조언이 아닙니다. 타깃 칩 AX-1과 노바실리콘은 가상입니다.

## 배포 (GitHub Pages)
저장소 루트가 그대로 사이트입니다. `CNAME`에 `chipindustrybook.euiyun.com`이 들어 있고, `.nojekyll`로 Jekyll 처리를 끕니다. `main` 브랜치에 푸시하면 배포됩니다.

## 용어집과 본문 뜻풀이

용어 정의는 `js/glossary-data.js`의 `window.BOOK_GLOSSARY`에 저장합니다. 용어집과 본문 뜻풀이가 같은 데이터를 사용하며, 본문에서 용어에 마우스를 올리거나 키보드로 포커스하거나 모바일에서 탭하면 정의를 확인할 수 있습니다. 공통 동작과 스타일은 `js/glossary-tooltips.js`, `css/glossary-tooltips.css`입니다. 데이터 형식은 시리즈 공통 v1이며, 각 항목은 `ko`(이름), `en`(영문명), `abbr`(약어), `def`(정의), `chapters`(관련 장 목록)를 갖습니다. 이름이 반복되면 한 번만 표시하고, 묶음 항목은 가리킨 이름을 제목에 표시하며 구분에 필요한 비교 설명을 함께 제공합니다.

## 라이선스

Copyright (c) 2026 geniuskey and ChipIndustryBook contributors

| 적용 대상 | 라이선스 | 재사용 조건 |
|---|---|---|
| JS·CSS·Python·HTML의 실행 코드 | [MIT](LICENSE-MIT) | 수정·재배포·상업적 이용 가능. 저작권 및 라이선스 고지 유지 |
| 교재 본문·그림·문제·해설·데이터 표 | [CC BY 4.0](LICENSE-CC-BY-4.0) | 수정·번역·재배포·상업적 이용 가능. 저작자·출처·라이선스 표시 및 변경 사실 명시 |

자세한 내용은 [라이선스 안내](LICENSE.md)를 참고하세요.
