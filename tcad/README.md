# TCADBook — 인터랙티브 반도체 TCAD 교과서

웨이퍼 없이 소자를 만든다. 공대 학부 고학년·대학원 초년생을 위한 한국어 반도체 TCAD(Technology CAD) 학습 사이트입니다.
19개 챕터와 브라우저 안에서 실제로 방정식을 푸는 작은 TCAD 엔진(`js/tcad.js`, `js/process.js`, `js/device1d.js`, `js/device2d.js`)으로 구성됩니다.
이온 주입·확산·산화 같은 공정 모사부터 격자, 포아송·드리프트-확산 방정식, 뉴턴 반복, PN 접합·MOS 커패시터·2D MOSFET 해석, 보정과 변동성까지 다룹니다.
책 전체가 가상의 트랜지스터 하나(TARGET TN-45: 게이트 길이 45 nm 평면 nMOSFET)를 공정 레시피에서 I-V 곡선까지 계산하고, 18장에서는 독자가 자기 레시피를 끝까지 돌려 봅니다.

배포 주소: https://semi.euiyun.com/tcad/

## 실행
빌드 과정이 없는 정적 사이트입니다.

```bash
python -m http.server 8000   # → http://localhost:8000
```
`index.html`을 브라우저로 바로 열어도 동작합니다. KaTeX와 폰트는 CDN에서 불러오므로 인터넷 연결이 필요합니다.

## 구성

| 장 | 파일 | 주제 |
|---|---|---|
| 01 | chapters/overview.html | TCAD의 흐름, 공정·소자·회로 시뮬레이션, 타깃 TN-45 |
| 02 | chapters/carriers.html | 밴드, 상태 밀도, 페르미-디랙 통계, 진성 농도, 이온화, 밴드갭 좁아짐 |
| 03 | chapters/equations.html | 포아송 방정식, 연속 방정식, 드리프트-확산 전류, 경계 조건 |
| 04 | chapters/mesh.html | 유한 차분·유한 체적, 박스 방법, 들로네 삼각 분할, 격자 세밀화 |
| 05 | chapters/numerics.html | 샤페터-거멜 이산화, 뉴턴·거멜 반복, 선형 풀이기, 수렴 |
| 06 | chapters/implant.html | 이온 주입, 피어슨 분포, 채널링, 몬테카를로 궤적 |
| 07 | chapters/diffusion.html | 확산, 농도 의존 확산, 과도 증속 확산, 활성화, 어닐 |
| 08 | chapters/topography.html | 딜-그로브 산화, LOCOS, 증착·식각 형상, 스페이서 |
| 09 | chapters/pn.html | PN 접합 시뮬레이션: 밴드 그림, I-V, 이상 계수, 접합 용량 |
| 10 | chapters/models.html | 이동도 모델, 속도 포화, SRH·오제 재결합 |
| 11 | chapters/moscap.html | MOS 커패시터 C-V, 게이트 공핍, 양자 보정 |
| 12 | chapters/mosfet.html | MOSFET 2D 시뮬레이션: Id-Vg, Id-Vd, 문턱 전압, SS, DIBL |
| 13 | chapters/highfield.html | 충돌 이온화, 항복, 밴드 간 터널링, 신뢰성, 자기 발열 |
| 14 | chapters/transport.html | 속도 과도, 유체역학 모델, 몬테카를로, 슈뢰딩거-포아송, NEGF |
| 15 | chapters/transient.html | 과도·소신호 AC 해석, 용량 추출, 혼합 모드 |
| 16 | chapters/calibration.html | 민감도, 파라미터 추출, 실험 계획법, 반응 표면 |
| 17 | chapters/variability.html | 무작위 도펀트, LER, FinFET·GAA, 3D TCAD |
| 18 | chapters/lab.html | TCAD 실험실: 공정에서 특성까지 종합 시뮬레이터 |
| 19 | chapters/glossary.html | 용어집, 종합 퀴즈 |

공통 코드
- `css/style.css` — 디자인 토큰(라이트/다크)
- `js/common.js` — 내비게이션, 캔버스·차트·끌기 헬퍼, 전역 `TB`
- `js/tcad.js` — 엔진 코어: 물성, 통계, 이동도·재결합 모델, 수치 도구, 필드 시각화, 전역 `TC`
- `js/process.js` — 이온 주입, 확산·어닐, 산화, 형상 진화, TN-45 공정 흐름
- `js/device1d.js` — 1D 포아송·드리프트-확산, 다이오드, MOS 커패시터, 슈뢰딩거-포아송, 몬테카를로 수송
- `js/device2d.js` — 2D 격자, 2D 포아송·드리프트-확산, I-V 스윕과 특성 추출, 컴팩트 모델, TN-45 소자
- `tools/head.py` — 챕터 `<head>`·사이트맵·JSON-LD 생성기
- `tools/check.py` — 페이지 점검기(콘솔 오류, 가로 넘침, 조작 중 예외)

챕터 작성 규칙은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.
시뮬레이터는 실제로 방정식을 풀지만 교육용으로 줄인 모델(작은 격자, 단순화한 물리 모델)이며, 타깃 소자는 가상입니다.

## 배포 (GitHub Pages)
저장소 루트가 그대로 사이트입니다. `CNAME`에 `tcadbook.euiyun.com`이 들어 있고, `.nojekyll`로 Jekyll 처리를 끕니다. `main` 브랜치에 푸시하면 배포됩니다.

## 용어집과 본문 뜻풀이

용어 정의는 `js/glossary-data.js`의 `window.BOOK_GLOSSARY`에 저장합니다. 용어집과 본문 뜻풀이가 같은 데이터를 사용하며, 본문에서 용어에 마우스를 올리거나 키보드로 포커스하거나 모바일에서 탭하면 정의를 확인할 수 있습니다. 공통 동작과 스타일은 `js/glossary-tooltips.js`, `css/glossary-tooltips.css`입니다. 데이터 형식은 시리즈 공통 v1이며, 각 항목은 `ko`(이름), `en`(영문명), `abbr`(약어), `def`(정의), `chapters`(관련 장 목록)를 갖습니다. 이름이 반복되면 한 번만 표시하고, 묶음 항목은 가리킨 이름을 제목에 표시하며 구분에 필요한 비교 설명을 함께 제공합니다.

## 라이선스

Copyright (c) 2026 geniuskey and TCADBook contributors

| 적용 대상 | 라이선스 | 재사용 조건 |
|---|---|---|
| JS·CSS·Python·HTML의 실행 코드 | [MIT](LICENSE-MIT) | 수정·재배포·상업적 이용 가능. 저작권 및 라이선스 고지 유지 |
| 교재 본문·그림·문제·해설 | [CC BY 4.0](LICENSE-CC-BY-4.0) | 수정·번역·재배포·상업적 이용 가능. 저작자·출처·라이선스 표시 및 변경 사실 명시 |

자세한 내용은 [라이선스 안내](LICENSE.md)를 참고하세요.
