# ProcessBook — 인터랙티브 반도체 제조 공정 교과서

모래에서 트랜지스터까지. 공대 학부생을 위한 한국어 반도체 공정 학습 사이트입니다.
16개 챕터, 50여 개의 시뮬레이터, 그리고 증착·노광·식각·이온 주입·열처리·CMP를 2차원 단면 위에서 실제로 계산하는 공정 엔진(`js/xsec.js`)으로 구성됩니다.
공정 조건을 바꾸면 프로파일·CD·깊이가 어떻게 변하는지 보고, 단면을 한 단계씩 쌓아 CMOS 트랜지스터를 완성합니다.

배포 주소: https://semi.euiyun.com/process/

## 실행
빌드 과정이 없는 정적 사이트입니다.

```bash
python3 -m http.server 8000   # → http://localhost:8000
```
`index.html`을 브라우저로 바로 열어도 동작합니다. KaTeX, three.js, 폰트는 CDN에서 불러오므로 인터넷 연결이 필요합니다.

## 구성
| 장 | 파일 | 주제 |
|---|---|---|
| 01 | chapters/overview.html | 팹·클린룸, 8대 공정, FEOL/MOL/BEOL, pn 다이오드 공정 흐름, 다이 수·수율·원가 |
| 02 | chapters/wafer.html | CZ 성장과 편석, 비저항·이동도, 결정 방향, 웨이퍼 가공, RCA 세정·금속 오염 |
| 03 | chapters/oxidation.html | Deal–Grove, 건식·습식·(111), 간섭색, LOCOS 버즈 빅, 산화막 전하 |
| 04 | chapters/litho.html | 회절과 동공, 부분 결맞음 공중상, 사입사 조명·PSM, 보썽 곡선·공정 창, EUV |
| 05 | chapters/resist.html | 대비 곡선, 정재파·스윙·BARC, 레지스트 단면, OPC, SADP 피치 워크, EUV 확률 결함 |
| 06 | chapters/etch.html | 습식·플라즈마, 트렌치 프로파일, ARDE, 보쉬 공정, 종말점·과식각 |
| 07 | chapters/deposition.html | CVD 영역, 단차 피복·보이드, ALD 포화·온도 창, 에피택시, 막 응력·휨 |
| 08 | chapters/implant.html | Rp·ΔRp, 접합 깊이, 마스크 차단 두께, 틸트·그림자 |
| 09 | chapters/anneal.html | 픽의 법칙, erfc·가우시안, 아레니우스, 열 예산, RTA·스파이크·밀리초, TED |
| 10 | chapters/cmp.html | 프레스턴 식, 패턴 밀도와 단차 제거, 디싱·이로전, 더미 필 |
| 11 | chapters/metal.html | 듀얼 다마신 단면, 크기 효과, RC 지연, 전자 이동 |
| 12 | chapters/integration.html | CMOS + M1 공정 흐름 60여 단계, 문턱 전압 |
| 13 | chapters/advanced.html | HKMG·RMG, FinFET/GAA 3D, 나노시트 공정 단면, BSPDN, 하이브리드 본딩·칩렛 |
| 14 | chapters/metrology.html | 반사 분광 피팅, 오버레이 보정, SPC·Cpk, 수율 모델 |
| 15 | chapters/lab.html | 공정 실험실(샌드박스): 단계를 직접 골라 단면을 쌓고 링크로 공유 |
| 16 | chapters/glossary.html | 용어집, 종합 퀴즈(문제 은행에서 20문항) |

공통 코드
- `css/style.css` — 디자인 토큰(라이트/다크), 재질 색
- `js/common.js` — 내비게이션, 캔버스·차트 헬퍼, 전역 `PB`
- `js/xsec.js` — 2D 단면 공정 엔진과 단계별 단면 위젯, 전역 `XS`
- `js/optics.js` — 1D 부분 결맞음 결상 엔진, 전역 `OPT`
- `tools/head.py` — 챕터 `<head>`·사이트맵·JSON-LD 생성기

챕터 작성 규칙은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.
시뮬레이터의 수치는 교육용 근사 모델입니다. 양산 수치는 2024~2026년 공개 자료 기준의 대략값입니다.

## 배포 (GitHub Pages)
저장소 루트가 그대로 사이트입니다. `CNAME`에 `processbook.euiyun.com`이 들어 있고, `.nojekyll`로 Jekyll 처리를 끕니다.
1. GitHub 저장소 **Settings → Pages**에서 Source를 `Deploy from a branch`, 브랜치 `main` / 폴더 `/ (root)`로 지정합니다.
2. DNS에서 `processbook.euiyun.com`을 `geniuskey.github.io`로 가리키는 **CNAME 레코드**를 추가합니다.
3. Pages 설정에서 Custom domain이 `processbook.euiyun.com`으로 잡히면 **Enforce HTTPS**를 켭니다.

## 용어집과 본문 뜻풀이

용어 정의는 `js/glossary-data.js`의 `window.BOOK_GLOSSARY`에 저장합니다. 용어집과 본문 뜻풀이가 같은 데이터를 사용하며, 본문에서 용어에 마우스를 올리거나 키보드로 포커스하거나 모바일에서 탭하면 정의를 확인할 수 있습니다. 공통 동작과 스타일은 `js/glossary-tooltips.js`, `css/glossary-tooltips.css`입니다. 데이터 형식은 시리즈 공통 v1이며, 각 항목은 `ko`(이름), `en`(영문명), `abbr`(약어), `def`(정의), `chapters`(관련 장 목록)를 갖습니다. 이름이 반복되면 한 번만 표시하고, 묶음 항목은 가리킨 이름을 제목에 표시하며 구분에 필요한 비교 설명을 함께 제공합니다.

## 라이선스

Copyright (c) 2026 geniuskey and ProcessBook contributors

| 적용 대상 | 라이선스 | 재사용 조건 |
|---|---|---|
| JS·CSS·Python·HTML의 실행 코드 | [MIT](LICENSE-MIT) | 수정·재배포·상업적 이용 가능. 저작권 및 라이선스 고지 유지 |
| 교재 본문·그림·문제·해설 | [CC BY 4.0](LICENSE-CC-BY-4.0) | 수정·번역·재배포·상업적 이용 가능. 저작자·출처·라이선스 표시 및 변경 사실 명시 |

자세한 내용은 [라이선스 안내](LICENSE.md)를 참고하세요.
