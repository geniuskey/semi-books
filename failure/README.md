# FailureBook — 인터랙티브 반도체 불량 분석 교과서

불량 칩에서 범인까지. 공대 학부생을 위한 한국어 반도체 불량 분석(Failure Analysis) 학습 사이트입니다.
불량 발생 → 전기적 검출 → 위치 추적 → 층 제거 → SEM·TEM·EDS → 근본 원인의 순서를 한 가상의 사건(CASE FB-28)을 따라가며 배웁니다.
각 기법이 무엇을 보여 주고 무엇을 보여 주지 못하는지를 시뮬레이터로 직접 확인합니다.

[ProcessBook](https://semi.euiyun.com/process/)(반도체 제조 공정 교과서)의 다음 권입니다.

배포 주소: https://semi.euiyun.com/failure/

## 실행
빌드 과정이 없는 정적 사이트입니다.

```bash
python -m http.server 8000   # → http://localhost:8000
```
`index.html`을 브라우저로 바로 열어도 동작합니다. KaTeX, three.js, 폰트는 CDN에서 불러오므로 인터넷 연결이 필요합니다.

## 구성
| 단계 | 장 | 파일 | 주제 |
|---|---|---|---|
| 불량 발생 | 01 | chapters/overview.html | 불량 모드·메커니즘·근본 원인, 비파괴에서 파괴로 가는 순서 |
| | 02 | chapters/mechanisms.html | 전자 이동, TDDB, HCI·BTI, ESD·EOS, 와이블 분포와 가속 계수 |
| 전기적 검출 | 03 | chapters/test.html | 웨이퍼 맵 무늬, 슈무 플롯, IDDQ, I-V 곡선 |
| | 04 | chapters/diagnosis.html | 고장 모델, 스캔 진단, 메모리 비트맵 |
| 위치 추적 | 05 | chapters/nondestructive.html | X선·CT, 초음파 현미경, TDR |
| | 06 | chapters/emission.html | 포톤 에미션, 후면 관찰, 검출기 |
| | 07 | chapters/laser.html | OBIRCH·TIVA·SEI·OBIC, 락인 열화상 |
| | 08 | chapters/dynamic.html | SDL·LADA, LVP·EOFM, 고체 침지 렌즈 |
| 층 제거 | 09 | chapters/deprocess.html | 디캡, 평행 연마·습식·건식 식각, 종말점 |
| 물리 분석 | 10 | chapters/sem.html | 전자-시료 상호작용, 전압 대비, EBAC, 나노프로빙 |
| | 11 | chapters/fib.html | FIB 단면, 커튼 현상, 회로 수정, TEM 라멜라 |
| | 12 | chapters/tem.html | TEM·STEM 대비, 분해능, 회절, 시료 두께 |
| | 13 | chapters/composition.html | EDS·EELS·SIMS·AES·XPS |
| 근본 원인 | 14 | chapters/rootcause.html | 공통성 분석, 5 Why, 8D, 시정 조치 검증 |
| | 15 | chapters/casefile.html | 사건 파일(샌드박스): 예산 안에서 기법을 골라 직접 수사 |
| | 16 | chapters/glossary.html | 용어집, 종합 퀴즈 |

공통 코드
- `css/style.css` — 디자인 토큰(라이트/다크), 재질 색, 사건 파일·수사 단계 띠
- `js/common.js` — 내비게이션, 캔버스·차트 헬퍼, 전역 `FB`
- `js/fa.js` — 불량 분석 엔진(결함을 심은 배선 단면, 웨이퍼 맵, 레이아웃, 현미경 영상 헬퍼), 전역 `FA`
- `tools/head.py` — 챕터 `<head>`·사이트맵·JSON-LD 생성기
- `tools/check.py` — 페이지 점검기(콘솔 오류, 가로 넘침, 조작 중 예외)

챕터 작성 규칙과 이어지는 사건의 설정은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.
시뮬레이터의 수치는 교육용 근사 모델이고, 사건·제품·로트는 모두 가상의 예입니다.

## 배포 (GitHub Pages)
저장소 루트가 그대로 사이트입니다. `CNAME`에 `failurebook.euiyun.com`이 들어 있고, `.nojekyll`로 Jekyll 처리를 끕니다.
1. GitHub 저장소 **Settings → Pages**에서 Source를 `Deploy from a branch`, 브랜치 `main` / 폴더 `/ (root)`로 지정합니다.
2. DNS에서 `failurebook.euiyun.com`을 `geniuskey.github.io`로 가리키는 **CNAME 레코드**를 추가합니다.
3. Pages 설정에서 Custom domain이 `failurebook.euiyun.com`으로 잡히면 **Enforce HTTPS**를 켭니다.

## 용어집과 본문 뜻풀이

용어 정의는 `js/glossary-data.js`의 `window.BOOK_GLOSSARY`에 저장합니다. 용어집과 본문 뜻풀이가 같은 데이터를 사용하며, 본문에서 용어에 마우스를 올리거나 키보드로 포커스하거나 모바일에서 탭하면 정의를 확인할 수 있습니다. 공통 동작과 스타일은 `js/glossary-tooltips.js`, `css/glossary-tooltips.css`입니다. 데이터 형식은 시리즈 공통 v1이며, 각 항목은 `ko`(이름), `en`(영문명), `abbr`(약어), `def`(정의), `chapters`(관련 장 목록)를 갖습니다. 이름이 반복되면 한 번만 표시하고, 묶음 항목은 가리킨 이름을 제목에 표시하며 구분에 필요한 비교 설명을 함께 제공합니다.

## 라이선스

Copyright (c) 2026 geniuskey and FailureBook contributors

| 적용 대상 | 라이선스 | 재사용 조건 |
|---|---|---|
| JS·CSS·Python·HTML의 실행 코드 | [MIT](LICENSE-MIT) | 수정·재배포·상업적 이용 가능. 저작권 및 라이선스 고지 유지 |
| 교재 본문·그림·문제·해설 | [CC BY 4.0](LICENSE-CC-BY-4.0) | 수정·번역·재배포·상업적 이용 가능. 저작자·출처·라이선스 표시 및 변경 사실 명시 |

자세한 내용은 [라이선스 안내](LICENSE.md)를 참고하세요.
