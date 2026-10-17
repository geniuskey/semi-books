# LithoBook — 인터랙티브 반도체 노광 교과서

빛으로 회로를 새긴다. 공대 학부생을 위한 한국어 반도체 노광(리소그래피) 학습 사이트입니다.
19개 챕터, 150여 개의 시뮬레이터, 그리고 공간상·CD·공정 윈도·OPC·박막 반사·단면을 한 가지 모델로 계산하는 노광 엔진(`js/litho.js`)으로 구성됩니다.
책 전체가 가상의 패턴 하나(TARGET LB-28: 피치 28 nm, 선폭 14 nm)를 layout → OPC → mask → exposure → resist → develop → etch transfer 일곱 단계로 옮기고, 18장에서는 독자가 자기 레이아웃을 직접 끝까지 찍어 봅니다.
[ProcessBook](https://semi.euiyun.com/process/)(반도체 제조 공정) 시리즈의 한 권입니다.

배포 주소: https://semi.euiyun.com/litho/

## 실행
빌드 과정이 없는 정적 사이트입니다.

```bash
python -m http.server 8000   # → http://localhost:8000
```
`index.html`을 브라우저로 바로 열어도 동작합니다. KaTeX와 폰트는 CDN에서 불러오므로 인터넷 연결이 필요합니다.

## 구성

| 장 | 파일 | 주제 |
|---|---|---|
| 01 | chapters/overview.html | 노광의 전체 흐름, 스캐너 구조, 피치와 CD |
| 02 | chapters/diffraction.html | 회절 차수와 결상, 동공, 푸리에 합성 |
| 03 | chapters/resolution.html | 레일리 식, 파장·NA·k₁, 액침 |
| 04 | chapters/illumination.html | 부분 간섭성, 사입사 조명, 광원 최적화 |
| 05 | chapters/focus.html | 초점 심도, 제르니케 수차, 레벨링 |
| 06 | chapters/mask.html | 바이너리·위상 변이 마스크, MEEF, 전자빔 묘화, 펠리클 |
| 07 | chapters/opc.html | 근접 효과, 규칙·모델 기반 OPC, SRAF |
| 08 | chapters/resist.html | 화학 증폭형 레지스트, 산 확산, 정상파와 BARC |
| 09 | chapters/develop.html | 현상, 레지스트 프로파일, 패턴 붕괴 |
| 10 | chapters/window.html | 초점-노광량 행렬, 보성 곡선, ED 윈도 |
| 11 | chapters/cd.html | CD-SEM, 산란 계측, CD 균일도, 거칠기 |
| 12 | chapters/overlay.html | 정렬, 오버레이 모델, 가장자리 배치 오차 |
| 13 | chapters/euv.html | 주석 플라스마 광원, 다층막 거울, 반사 마스크 |
| 14 | chapters/stochastic.html | 광자 산탄 잡음, 확률적 결함, High-NA |
| 15 | chapters/transfer.html | 하드마스크 적층, 선택비, 다마신 |
| 16 | chapters/multipatterning.html | LELE, SADP, SAQP, 컷 마스크 |
| 17 | chapters/nodes.html | 2 nm 로직과 1c DRAM의 노광 |
| 18 | chapters/lab.html | 리소 실험실: 전체 흐름 종합 시뮬레이터 |
| 19 | chapters/glossary.html | 용어집, 종합 퀴즈 |

공통 코드
- `css/style.css` — 디자인 토큰(라이트/다크)
- `js/common.js` — 내비게이션, 캔버스·차트·끌기 헬퍼, 전역 `LB`
- `js/litho.js` — 아베 결상, 레지스트 문턱 모델, 공정 윈도, OPC, 산탄 잡음, 박막 전달 행렬, 단면 모델, 전역 `LT`
- `tools/head.py` — 챕터 `<head>`·사이트맵·JSON-LD 생성기
- `tools/check.py` — 페이지 점검기(콘솔 오류, 가로 넘침, 조작 중 예외)

챕터 작성 규칙은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.
시뮬레이터의 수치는 교육용 근사 모델(스칼라 결상, 얇은 마스크, 문턱 레지스트)이며, 타깃 패턴은 가상입니다.

## 배포 (GitHub Pages)
저장소 루트가 그대로 사이트입니다. `CNAME`에 `lithobook.euiyun.com`이 들어 있고, `.nojekyll`로 Jekyll 처리를 끕니다. `main` 브랜치에 푸시하면 배포됩니다.

## 용어집과 본문 뜻풀이

용어 정의는 `js/glossary-data.js`의 `window.BOOK_GLOSSARY`에 저장합니다. 용어집과 본문 뜻풀이가 같은 데이터를 사용하며, 본문에서 용어에 마우스를 올리거나 키보드로 포커스하거나 모바일에서 탭하면 정의를 확인할 수 있습니다. 공통 동작과 스타일은 `js/glossary-tooltips.js`, `css/glossary-tooltips.css`입니다. 데이터 형식은 시리즈 공통 v1이며, 각 항목은 `ko`(이름), `en`(영문명), `abbr`(약어), `def`(정의), `chapters`(관련 장 목록)를 갖습니다. 이름이 반복되면 한 번만 표시하고, 묶음 항목은 가리킨 이름을 제목에 표시하며 구분에 필요한 비교 설명을 함께 제공합니다.

## 라이선스

Copyright (c) 2026 geniuskey and LithoBook contributors

| 적용 대상 | 라이선스 | 재사용 조건 |
|---|---|---|
| JS·CSS·Python·HTML의 실행 코드 | [MIT](LICENSE-MIT) | 수정·재배포·상업적 이용 가능. 저작권 및 라이선스 고지 유지 |
| 교재 본문·그림·문제·해설 | [CC BY 4.0](LICENSE-CC-BY-4.0) | 수정·번역·재배포·상업적 이용 가능. 저작자·출처·라이선스 표시 및 변경 사실 명시 |

자세한 내용은 [라이선스 안내](LICENSE.md)를 참고하세요.
