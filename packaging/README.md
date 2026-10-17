# PackagingBook — 인터랙티브 반도체 패키징 교과서

웨이퍼에서 완성된 칩까지. 공대 학부생을 위한 한국어 반도체 패키징 학습 사이트입니다.
17개 챕터, 50여 개의 시뮬레이터, 그리고 패키지 단면을 도형 목록으로 그려 공정 흐름을 한 단계씩 넘겨 보는 단면 엔진(`js/pkg.js`)으로 구성됩니다.
[ProcessBook](https://semi.euiyun.com/process/)(반도체 제조 공정)의 다음 권입니다.

배포 주소: https://semi.euiyun.com/packaging/

## 실행
빌드 과정이 없는 정적 사이트입니다.

```bash
python3 -m http.server 8000   # → http://localhost:8000
```
`index.html`을 브라우저로 바로 열어도 동작합니다. KaTeX와 폰트는 CDN에서 불러오므로 인터넷 연결이 필요합니다.

## 구성
| 장 | 파일 | 주제 |
|---|---|---|
| 01 | chapters/overview.html | 패키지의 역할, 피치 계층, 패키지 진화, 후공정 흐름, 산업 구조 |
| 02 | chapters/wafer.html | 웨이퍼 테스트와 웨이퍼 맵, 백그라인딩, 얇은 웨이퍼의 휨·강도 |
| 03 | chapters/bump.html | UBM, 전해 도금 범핑, 리플로, 구리 필러, RDL, 금속간 화합물 |
| 04 | chapters/dicing.html | 블레이드·레이저·스텔스·플라즈마 다이싱, 웨이퍼당 다이 수, 다이 강도 |
| 05 | chapters/dieattach.html | 픽업, 에폭시·DAF·솔더·소결 은, 본드 라인 두께, 보이드와 열저항 |
| 06 | chapters/wirebond.html | 볼 본딩 사이클, 루프 프로파일, 와이어 재료, 풀·전단 시험 |
| 07 | chapters/flipchip.html | 자기 정렬, 리플로·열압착, 언더필 유동, 솔더 피로 수명 |
| 08 | chapters/molding.html | EMC, 트랜스퍼·압축 몰딩, 와이어 스윕, 경화 |
| 09 | chapters/substrate.html | 리드프레임, 빌드업 기판과 SAP, BGA 볼 배열, 임피던스 |
| 10 | chapters/wlp.html | WLCSP, 팬아웃, 다이 시프트, 패널 레벨 패키지 |
| 11 | chapters/interposer.html | 실리콘·RDL 인터포저, 브리지, 칩렛의 배선 밀도와 경제성 |
| 12 | chapters/tsv.html | 비아 미들 TSV 흐름, 보쉬 식각, 구리 충전, 응력과 KOZ |
| 13 | chapters/hbm.html | HBM 적층, TC-NCF·MR-MUF, 방열, 하이브리드 본딩 |
| 14 | chapters/thermal.html | 열저항 네트워크, 휨, PDN 임피던스, 동시 스위칭 잡음 |
| 15 | chapters/test.html | 번인, 파이널 테스트, KGD와 누적 수율, 신뢰성 시험과 가속 모델 |
| 16 | chapters/lab.html | 패키지 실험실(샌드박스): 패키지 설계기, 조립 순서 맞추기 |
| 17 | chapters/glossary.html | 용어집, 종합 퀴즈 |

공통 코드
- `css/style.css` — 디자인 토큰(라이트/다크), 재질 색
- `js/common.js` — 내비게이션, 캔버스·차트 헬퍼, 전역 `PB`
- `js/pkg.js` — 패키지 단면 그리기 엔진과 단계별 공정 흐름 위젯, 전역 `PKG`
- `tools/head.py` — 챕터 `<head>`·사이트맵·JSON-LD 생성기

챕터 작성 규칙은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.
시뮬레이터의 수치는 교육용 근사 모델입니다. 양산 수치는 2024~2026년 공개 자료 기준의 대략값입니다.

## 배포 (GitHub Pages)
저장소 루트가 그대로 사이트입니다. `CNAME`에 `packagingbook.euiyun.com`이 들어 있고, `.nojekyll`로 Jekyll 처리를 끕니다. `main` 브랜치에 푸시하면 배포됩니다.

## 용어집과 본문 뜻풀이

용어 정의는 `js/glossary-data.js`의 `window.BOOK_GLOSSARY`에 저장합니다. 용어집과 본문 뜻풀이가 같은 데이터를 사용하며, 본문에서 용어에 마우스를 올리거나 키보드로 포커스하거나 모바일에서 탭하면 정의를 확인할 수 있습니다. 공통 동작과 스타일은 `js/glossary-tooltips.js`, `css/glossary-tooltips.css`입니다. 데이터 형식은 시리즈 공통 v1이며, 각 항목은 `ko`(이름), `en`(영문명), `abbr`(약어), `def`(정의), `chapters`(관련 장 목록)를 갖습니다. 이름이 반복되면 한 번만 표시하고, 묶음 항목은 가리킨 이름을 제목에 표시하며 구분에 필요한 비교 설명을 함께 제공합니다.

## 라이선스

Copyright (c) 2026 geniuskey and PackagingBook contributors

| 적용 대상 | 라이선스 | 재사용 조건 |
|---|---|---|
| JS·CSS·Python·HTML의 실행 코드 | [MIT](LICENSE-MIT) | 수정·재배포·상업적 이용 가능. 저작권 및 라이선스 고지 유지 |
| 교재 본문·그림·문제·해설 | [CC BY 4.0](LICENSE-CC-BY-4.0) | 수정·번역·재배포·상업적 이용 가능. 저작자·출처·라이선스 표시 및 변경 사실 명시 |

자세한 내용은 [라이선스 안내](LICENSE.md)를 참고하세요.
