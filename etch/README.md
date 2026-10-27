# EtchBook — 인터랙티브 반도체 식각 교과서

깎아서 새긴다. 공대 학부생을 위한 한국어 반도체 식각(에칭) 학습 사이트입니다.
18개 챕터, 수많은 시뮬레이터, 그리고 시간에 따라 단면이 깎여 내려가는 모습을 입자 하나하나로 계산하는 식각 엔진(`js/etch.js`)으로 구성됩니다.
책 전체가 가상의 식각 하나(TARGET EB-20: 산화막에 폭 20 nm, 깊이 160 nm, 종횡비 8의 트렌치)를 마스크 → 플라스마 → 수송 → 표면 반응 → 프로파일 → 종말점·계측의 여섯 단계로 따라가고, 17장에서는 독자가 직접 레시피를 골라 끝까지 깎아 봅니다.
[ProcessBook](https://semi.euiyun.com/process/)(반도체 제조 공정) 시리즈의 한 권이고, [LithoBook](https://semi.euiyun.com/litho/)(노광)의 다음 단계입니다.

배포 주소: https://semi.euiyun.com/etch/

## 실행
빌드 과정이 없는 정적 사이트입니다.

```bash
python -m http.server 8000   # → http://localhost:8000
```
`index.html`을 브라우저로 바로 열어도 동작합니다. KaTeX와 폰트는 CDN에서 불러오므로 인터넷 연결이 필요합니다.

## 구성

| 장 | 파일 | 주제 |
|---|---|---|
| 01 | chapters/overview.html | 식각의 언어: 습식과 건식, 등방성과 이방성, 속도·선택비·균일도·프로파일 |
| 02 | chapters/wet.html | 습식 식각, 언더컷, 반응 제한과 확산 제한, KOH 결정 방향 식각 |
| 03 | chapters/plasma.html | 플라스마: 전자 온도, 이온화와 해리, 데바이 길이 |
| 04 | chapters/sheath.html | 시스, 자기 바이어스, 이온 에너지·각도 분포 |
| 05 | chapters/reactors.html | 배럴, RIE, ICP, 이중 주파수 CCP, 균일도 |
| 06 | chapters/surface.html | 이온-라디칼 시너지, 덮임률, 수율의 에너지·각도 의존 |
| 07 | chapters/rie.html | RIE와 이방성: 시간에 따라 깎이는 단면 |
| 08 | chapters/selectivity.html | 선택비, 마스크 침식과 패시팅, 정지막과 과식각 |
| 09 | chapters/profile.html | 프로파일과 측벽 각도, 테이퍼와 언더컷 |
| 10 | chapters/arde.html | ARDE(RIE 지연), 크누센 수송, 로딩 효과 |
| 11 | chapters/bowing.html | 보잉과 트위스팅 |
| 12 | chapters/microtrench.html | 마이크로트렌칭과 노칭 |
| 13 | chapters/chemistry.html | 재료별 식각 화학, 휘발성, F/C 비 |
| 14 | chapters/endpoint.html | 종말점 검출, 균일도, 과식각, 챔버 시즈닝 |
| 15 | chapters/ale.html | 원자층 식각(ALE) |
| 16 | chapters/har.html | 고종횡비 식각: 3D 낸드와 DRAM |
| 17 | chapters/lab.html | 식각 실험실: 종합 시뮬레이터와 임무 |
| 18 | chapters/glossary.html | 용어집, 종합 퀴즈 |

공통 코드
- `css/style.css` — 디자인 토큰(라이트/다크), 재질 색
- `js/common.js` — 내비게이션, 캔버스·차트·끌기 헬퍼, 전역 `EB`
- `js/etch.js` — 식각 엔진, 전역 `ET`. 셀 단면 위에서 이온·라디칼·고분자 전구체를 몬테카를로로 날려 이방성, 언더컷, ARDE, 보잉, 마이크로트렌칭, 패시팅, 노칭이 저절로 나오게 한다. 등방성 습식 식각은 도달 시간(fast marching)으로 푼다.
- `tools/check.py` — 페이지 점검기(콘솔 오류, 가로 넘침, 조작 중 예외)

챕터 작성 규칙은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.
시뮬레이터의 수치는 교육용 근사 모델(2차원 단면, 셀 기반 표면, 단순 표면 반응식)이며, 타깃 패턴은 가상입니다.

## 용어집과 본문 뜻풀이

용어 정의는 `js/glossary-data.js`의 `window.BOOK_GLOSSARY`에 저장합니다. 용어집과 본문 뜻풀이가 같은 데이터를 사용하며, 본문에서 용어에 마우스를 올리거나 키보드로 포커스하거나 모바일에서 탭하면 정의를 확인할 수 있습니다. 공통 동작과 스타일은 `js/glossary-tooltips.js`, `css/glossary-tooltips.css`입니다. 데이터 형식은 시리즈 공통 v1이며, 각 항목은 `ko`(이름), `en`(영문명), `abbr`(약어), `def`(정의), `chapters`(관련 장 목록)를 갖습니다. 이름이 반복되면 한 번만 표시하고, 묶음 항목은 가리킨 이름을 제목에 표시하며 구분에 필요한 비교 설명을 함께 제공합니다.

## 라이선스
실행 코드는 [MIT](LICENSE-MIT), 본문·그림·문제·해설은 [CC BY 4.0](LICENSE-CC-BY-4.0)입니다. 자세한 구분은 [LICENSE.md](LICENSE.md)를 보세요.
