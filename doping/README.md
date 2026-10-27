# DopingBook — 인터랙티브 반도체 도핑 교과서

원자 백만 개 중 하나를 바꾼다. 반도체 업계 신입부터 다른 공정의 엔지니어까지, 도핑이 처음인 사람을 위한 한국어 이온 주입·어닐 학습 사이트입니다.
17개 챕터와 30여 개의 시뮬레이터, 그리고 이온 종·에너지·도즈·온도·시간을 바꾸면 농도 분포가 다시 계산되는 도핑 엔진(`js/doping.js`)으로 구성됩니다.
책 전체가 가상의 얕은 접합 하나(TARGET DB-20: pMOS 소스·드레인 익스텐션, 붕소 10¹⁵ cm⁻², 접합 깊이 20 nm 이하, 면저항 700 Ω/□ 이하)를 따라갑니다.
[ProcessBook](https://semi.euiyun.com/process/)(반도체 제조 공정)의 심화편이며, [LithoBook](https://semi.euiyun.com/litho/)(노광), [EtchBook](https://semi.euiyun.com/etch/)(식각)과 같은 층위의 단위 공정 책입니다.

배포 주소: https://semi.euiyun.com/doping/

## 실행
빌드 과정이 없는 정적 사이트입니다.

```bash
python -m http.server 8000   # → http://localhost:8000
```
`index.html`을 브라우저로 바로 열어도 동작합니다. KaTeX와 폰트는 CDN에서 불러오므로 인터넷 연결이 필요합니다.
배포용 결과물은 `npm ci && npm run build`(`@euiyun/book`)로 `.book-dist/`에 만듭니다.

## 구성

| 장 | 파일 | 주제 |
|---|---|---|
| 01 | chapters/doping.html | 도핑이란: 캐리어, n형과 p형, 농도 스케일 |
| 02 | chapters/flow.html | 공정 흐름 속의 도핑: 웰, 채널, 할로, 익스텐션, 소스·드레인 |
| 03 | chapters/source.html | 이온 소스: 가스, 플라스마, 추출 |
| 04 | chapters/analyzer.html | 질량 분석 |
| 05 | chapters/beamline.html | 가속, 감속, 빔 라인과 스캔 |
| 06 | chapters/dose.html | 도즈 제어: 패러데이 컵, 빔 전류, 웨이퍼 차징 |
| 07 | chapters/tools.html | 장비 분류: 고전류, 중전류, 고에너지, 플라스마 도핑 |
| 08 | chapters/stopping.html | 이온은 어떻게 멈추는가: 핵·전자 저지, Rp·ΔRp, 분포 |
| 09 | chapters/channeling.html | 채널링: 틸트와 트위스트 |
| 10 | chapters/damage.html | 격자 손상과 비정질화, PAI |
| 11 | chapters/anneal.html | 어닐: 퍼니스, RTA, 스파이크, 플래시, 레이저, 고체상 에피 재성장 |
| 12 | chapters/diffusion.html | 확산: 픽의 법칙, 점결함, TED |
| 13 | chapters/budget.html | 써멀 버짓: 활성화와 확산의 줄다리기 |
| 14 | chapters/metrology.html | 계측: SIMS, 4점 탐침, SRP, 써멀 웨이브 |
| 15 | chapters/defects.html | 결함과 이슈: 에너지 오염, 금속 오염, 섀도잉, 아웃개싱 |
| 16 | chapters/nextgen.html | 다음 세대: 등각 도핑, 인시추 도핑 에피, 저온·고온 주입 |
| 17 | chapters/glossary.html | 용어집, 종합 퀴즈 |

공통 코드
- `css/style.css` — 디자인 토큰(라이트/다크), 재질 색, n형·p형 색
- `js/common.js` — 내비게이션, 캔버스·차트·끌기 헬퍼, 전역 `DB`
- `js/doping.js` — 도핑 엔진, 전역 `DP`. 사정거리 표와 피어슨 분포, ZBL·LSS 저지능과 단순 몬테카를로, 린하드 임계각, 열 이력·확산(TED 포함)·활성화, 이동도와 면저항, 2차원 단면.
- `tools/check.py` — 페이지 점검기(콘솔 오류, 가로 넘침, 조작 중 예외)

챕터 작성 규칙은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.
시뮬레이터의 수치는 교육용 근사 모델(대표값 표, 1차원 확산, 단순 몬테카를로)이며, 실제 공정 시뮬레이터의 결과가 아닙니다. 각 시뮬레이터 아래에 어떤 근사인지 밝혀 두었습니다. 타깃 DB-20은 가상입니다.

## 용어집과 본문 뜻풀이

용어 정의는 `js/glossary-data.js`의 `window.BOOK_GLOSSARY`에 저장합니다. 용어집과 본문 뜻풀이가 같은 데이터를 사용하며, 본문에서 용어에 마우스를 올리거나 키보드로 포커스하거나 모바일에서 탭하면 정의를 확인할 수 있습니다. 공통 동작과 스타일은 `js/glossary-tooltips.js`, `css/glossary-tooltips.css`입니다. 데이터 형식은 시리즈 공통 v1이며, 각 항목은 `ko`(이름), `en`(영문명), `abbr`(약어), `def`(정의), `chapters`(관련 장 목록)를 갖습니다. 이름이 반복되면 한 번만 표시하고, 묶음 항목은 가리킨 이름을 제목에 표시하며 구분에 필요한 비교 설명을 함께 제공합니다.

## 라이선스
실행 코드는 [MIT](LICENSE-MIT), 본문·그림·문제·해설은 [CC BY 4.0](LICENSE-CC-BY-4.0)입니다. 자세한 구분은 [LICENSE.md](LICENSE.md)를 보세요.
