# YieldBook — 인터랙티브 반도체 수율 분석 교과서

수율은 왜 떨어졌는가. 공대 학부생을 위한 한국어 반도체 수율 분석 학습 사이트입니다.
16개 챕터, 50여 개의 시뮬레이터, 그리고 웨이퍼 맵·공간 패턴·검사 영상(명시야·암시야·SEM·전압 대비)을 한 가지 모델로 그리는 웨이퍼 맵 엔진(`js/wafer.js`)으로 구성됩니다.
책 전체가 가상의 사건 하나(CASE YB-12)를 따라가고, 15장에서는 독자가 새 사건을 직접 푸는 추리 게임을 합니다.
[ProcessBook](https://semi.euiyun.com/process/)(반도체 제조 공정) 시리즈의 한 권이며, 다이 하나를 열어 보는 [FailureBook](https://semi.euiyun.com/failure/)의 앞 이야기입니다.

배포 주소: https://semi.euiyun.com/yield/

## 실행
빌드 과정이 없는 정적 사이트입니다.

```bash
python -m http.server 8000   # → http://localhost:8000
```
`index.html`을 브라우저로 바로 열어도 동작합니다. KaTeX와 폰트는 CDN에서 불러오므로 인터넷 연결이 필요합니다.

## 구성
흐름은 wafer → dies → fail map → spatial pattern → root cause 입니다.

| 장 | 파일 | 주제 |
|---|---|---|
| 01 | chapters/overview.html | 수율의 종류와 곱셈 구조, 원가, 학습 곡선, 책의 지도 |
| 02 | chapters/wafer.html | 웨이퍼당 다이 수, 가장자리 제외, 노광 샷, 좌표계 |
| 03 | chapters/defects.html | 결함의 종류, 치명 결함과 임계 면적, 무작위 결함과 계통 결함 |
| 04 | chapters/models.html | 푸아송·머피·시즈·음이항 수율 모델, 결함 밀도와 군집 |
| 05 | chapters/optical.html | 명시야·암시야 검사, 다이 대 다이 비교, 감도와 뉴슨스 |
| 06 | chapters/ebeam.html | 전자빔 검사, 전압 대비, 리뷰 SEM |
| 07 | chapters/classify.html | 검출 → 리뷰 → 분류, 파레토, 층간 결함 추적, 치명률 |
| 08 | chapters/sort.html | 웨이퍼 테스트와 빈 맵, 인라인 결함과의 겹침 |
| 09 | chapters/patterns.html | 공간 패턴 도감: 가장자리 고리, 중심, 도넛, 군집, 스크래치, 반복 |
| 10 | chapters/statistics.html | 무작위성 검정, 반지름·각도 프로파일, 스택 맵, 자동 분류 |
| 11 | chapters/repeater.html | 반복 결함과 레티클, 샷 접기, 필드 안 시그니처 |
| 12 | chapters/signature.html | 공정 장비가 남기는 무늬, 챔버와 슬롯 |
| 13 | chapters/commonality.html | 공통성 분석, 다중 비교, 분할 실험, 시정 조치 |
| 14 | chapters/learning.html | 수율 램프, 검사 샘플링 계획, 이상 발생의 비용 |
| 15 | chapters/detective.html | 수율 탐정: 수율이 떨어진 원인을 추리하는 게임 |
| 16 | chapters/glossary.html | 용어집, 종합 퀴즈 |

공통 코드
- `css/style.css` — 디자인 토큰(라이트/다크)
- `js/common.js` — 내비게이션, 캔버스·차트 헬퍼, 전역 `YB`
- `js/wafer.js` — 다이 격자, 공간 패턴, 불량 맵 통계, 결함 좌표 맵, 검사 영상 합성, 전역 `WM`
- `tools/check.py` — 페이지 점검기(콘솔 오류, 가로 넘침, 조작 중 예외)

챕터 작성 규칙은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.
시뮬레이터의 수치는 교육용 근사 모델이며, 사건과 제품은 모두 가상입니다.

## 배포 (GitHub Pages)
저장소 루트가 그대로 사이트입니다. `CNAME`에 `yieldbook.euiyun.com`이 들어 있고, `.nojekyll`로 Jekyll 처리를 끕니다. `main` 브랜치에 푸시하면 배포됩니다.

## 용어집과 본문 뜻풀이

용어 정의는 `js/glossary-data.js`의 `window.BOOK_GLOSSARY`에 저장합니다. 용어집과 본문 뜻풀이가 같은 데이터를 사용하며, 본문에서 용어에 마우스를 올리거나 키보드로 포커스하거나 모바일에서 탭하면 정의를 확인할 수 있습니다. 공통 동작과 스타일은 `js/glossary-tooltips.js`, `css/glossary-tooltips.css`입니다. 데이터 형식은 시리즈 공통 v1이며, 각 항목은 `ko`(이름), `en`(영문명), `abbr`(약어), `def`(정의), `chapters`(관련 장 목록)를 갖습니다. 이름이 반복되면 한 번만 표시하고, 묶음 항목은 가리킨 이름을 제목에 표시하며 구분에 필요한 비교 설명을 함께 제공합니다.

## 라이선스

Copyright (c) 2026 geniuskey and YieldBook contributors

| 적용 대상 | 라이선스 | 재사용 조건 |
|---|---|---|
| JS·CSS·Python·HTML의 실행 코드 | [MIT](LICENSE-MIT) | 수정·재배포·상업적 이용 가능. 저작권 및 라이선스 고지 유지 |
| 교재 본문·그림·문제·해설 | [CC BY 4.0](LICENSE-CC-BY-4.0) | 수정·번역·재배포·상업적 이용 가능. 저작자·출처·라이선스 표시 및 변경 사실 명시 |

자세한 내용은 [라이선스 안내](LICENSE.md)를 참고하세요.
