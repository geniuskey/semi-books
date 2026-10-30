# SemiBooks — 반도체 교과서 서가

소자와 회로 설계, 제조 공정과 팹 인프라, 패키징·테스트, 메모리·센서·디스플레이와 산업까지. 직접 만져 보며 배우는 한국어 인터랙티브 반도체 교과서를 한 저장소에서 관리합니다.

주소: **https://semi.euiyun.com/** · 책 한 권의 홈은 **`/{slug}/`**, 각 장은 **`/{slug}/chapters/{chapter}.html`**입니다.

## 수록 책

| 경로 | 책 | 상태 | 원래 저장소 |
|---|---|---|---|
| `/device/` | DeviceBook · 반도체 소자 물리 | 공개 | `geniuskey/devicebook` |
| `/digital/` | DigitalBook · 디지털 회로 설계 | 공개 | `geniuskey/digitalbook` |
| `/design/` | DesignBook · 반도체 설계 | 공개 | `geniuskey/designbook` |
| `/soc/` | SoCBook · 시스템 온 칩 | 공개 | `geniuskey/socbook` |
| `/analog/` | AnalogBook · 아날로그 회로 | 공개 | `geniuskey/analogbook` |
| `/process/` | ProcessBook · 반도체 제조 공정 | 공개 | `geniuskey/processbook` |
| `/litho/` | LithoBook · 노광 | 공개 | `geniuskey/lithobook` |
| `/etch/` | EtchBook · 식각 | 공개 | `geniuskey/etchbook` |
| `/thinfilm/` | ThinFilmBook · 산화·박막 증착 | 공개 | 이 저장소에서 별도 집필 |
| `/plasma/` | PlasmaBook · 플라즈마공학 | 공개 | 이 저장소에서 별도 집필 |
| `/cmp/` | CMPBook · CMP·세정 | 공개 | 이 저장소에서 별도 집필 |
| `/doping/` | DopingBook · 도핑 | 공개 | `geniuskey/dopingbook` |
| `/yield/` | YieldBook · 수율 | 공개 | `geniuskey/yieldbook` |
| `/failure/` | FailureBook · 불량 분석 | 공개 | `geniuskey/failurebook` |
| `/tcad/` | TCADBook · 소자·공정 시뮬레이션 | 공개 | `geniuskey/tcadbook` |
| `/packaging/` | PackagingBook · 패키징 | 공개 | `geniuskey/packagingbook` |
| `/test/` | TestBook · 테스트 | 공개 | `geniuskey/testbook` |
| `/memory/` | MemoryBook · 메모리 반도체 | 공개 | `geniuskey/memorybook` |
| `/optics/` | OpticsBook · 이미지 센서 광학 | 공개 | `geniuskey/opticsbook` |
| `/sensor/` | SensorBook · 이미지 센서 | 공개 | `geniuskey/sensorbook` |
| `/display/` | DisplayBook · 디스플레이 | 공개 | `geniuskey/displaybook` |
| `/industry/` | ChipIndustryBook · 반도체 산업 | 공개 | `geniuskey/chipindustrybook` |
| `/infra/` | InfraBook · 팹 인프라 | 공개 | 이 저장소에서 별도 집필 |

총 23권이 공개 상태(`book.json`의 `status: published`)이며, 위 경로마다 책 홈과 장 파일이 있습니다. 용어집을 포함한 장 목록은 각 책의 `js/common.js`에 등록되어 있습니다.

기존 책 19권은 소스·실습 엔진·용어 데이터·저작권 안내를 포함해 개별 저장소에서 가져왔고, InfraBook·CMPBook·ThinFilmBook·PlasmaBook은 처음부터 이 저장소에서 썼습니다. 이제 23권 모두 이 저장소에서 집필합니다(각 `book.json`에 `meta`). 각 책의 CSS·JS와 실습은 독립적으로 유지하며, 공통 서가 연결과 테마는 `shared/`에서 지원합니다. 각 책의 `js/glossary-data.js`는 용어집과 본문 툴팁이 함께 사용하는 용어 원본입니다. 집필 규칙은 책마다 있는 `CONTRIBUTING.md`를 참고하세요.

## 원본 저장소와 가져오기 기록

개별 도메인(`*book.euiyun.com`)은 운영을 마쳤습니다. 모든 책은 `semi.euiyun.com/{slug}/`에서만 제공하며, 책 사이의 링크도 내부 주소를 씁니다.

가져오기 원본과 slug, 기존 URL, 서가 정보는 `migration/books.json`에 남아 있습니다. `tools/import-books.py`는 `book.json`에 `meta`가 있는 책을 건너뛰므로 지금은 어떤 책도 덮어쓰지 않으며, `migration/import-state.json`의 가져오기 기록도 비어 있습니다. 개별 저장소는 더 이상 원본이 아닙니다. 책을 고칠 때는 이 저장소의 파일을 직접 수정합니다.

## 구성

```text
index.html, shelf.css                 서가 홈: 책장·분야 필터·검색, 대표 실험, 읽는 순서
catalog.js                           생성된 책 목록
book.json                            서가 메타데이터, 각 책의 book.json 목록
shared/js/shelf.js                    서가 홈의 책장 렌더링·필터·실험 카드
shared/js/covers.js                   books 프로젝트의 SVG 책 표지와 공정·식각·인프라 표지
shared/css/cover-animations.css       표지 애니메이션, 동작 줄이기 지원
shared/img/sims/                      홈 ‘직접 해보기’의 시뮬레이터 화면
shared/js/book-shell.js               기존 19권의 ‘반도체 서가’ 연결
{slug}/                              각 책의 본문, 실습, 용어 데이터, 집필 도구
migration/books.json                 원본·slug·서가 정보와 이전 경로 별칭(가져오기 기록)
migration/import-state.json          가져오기 상태(모든 책을 이 저장소에서 집필하므로 비어 있음)
tools/import-books.py                보호된 가져오기(meta가 있는 책은 건너뜀)
tools/sync-catalog.py                 서가 목록 생성, 기본 입력은 migration/books.json
tools/sync-sitemap.py                 루트 사이트맵 생성
tools/build.mjs                      하위 경로를 지원하는 정적 배포물 생성
tools/check.cjs                       메타데이터·링크·스크립트 정적 검사
tools/katex.mjs                       모든 책의 수식 빌드 렌더링
tools/katex.test.mjs                  수식 렌더링·HTML의 < 거부 규칙 회귀 검사
tools/migration.test.cjs              원본 보존·덮어쓰기 거부·집필 책 보호 회귀 검사
tools/browser-check.cjs               데스크톱·모바일 브라우저 검사
```

`catalog.js`를 직접 수정하지 않고 `migration/books.json`의 책 정보를 수정한 후 생성합니다. 장 수와 시뮬레이터 수는 소스에서 셉니다. 원본 포털의 목록을 다시 참고할 때는 `python3 tools/sync-catalog.py ../books/data/books.json`도 사용할 수 있습니다. 

표지 그림은 각 책의 `motif`로 고릅니다. ProcessBook의 `process`, EtchBook의 `etch`, InfraBook의 `fab`, CMPBook의 `cmp`, ThinFilmBook의 `film`, PlasmaBook의 `plasma`는 이 저장소에서 만들어 books 포털에도 같은 코드로 반영한 표지입니다. 표지를 고칠 때는 `shared/js/covers.js`·`shared/css/cover-animations.css`와 books의 `js/covers.js`·`css/style.css`를 함께 맞춥니다. `npm test`는 서가의 모든 `motif`에 표지가 있는지도 확인합니다.

## 실행·검사·배포

```bash
python3 -m http.server 8000          # http://localhost:8000/, /memory/, /digital/ ...
npm ci
npm test
npm run build                       # .book-dist/ 생성
node tools/browser-check.cjs --offline  # Playwright 필요
node tools/browser-check.cjs --dist --mobile cmp/ infra/  # 배포물의 360px 화면·툴팁 검사(책 경로로 거르기)
```

브라우저 검사에는 Playwright를 설치하거나 `PW_PATH`로 모듈 위치를 지정합니다. `CHROME`으로 브라우저 실행 파일을 지정할 수 있습니다. 인자로 경로 일부를 주면 해당 페이지만 검사합니다. `--dist`는 빌드 결과인 `.book-dist/`를 열고, `--mobile`은 폭 360px만 검사합니다. 모든 책의 장에서 용어 툴팁의 로딩·포커스·클릭·Escape 동작도 확인합니다. CDN을 사용할 수 있는 환경에서는 `--offline`을 생략해 수식·폰트·3D 라이브러리까지 확인합니다.

빌드와 테스트에는 이전 개별 저장소나 books 프로젝트의 체크아웃이 필요하지 않습니다. 생성된 파일과 SVG 표지를 이 저장소에 포함합니다. KaTeX·three.js·웹 폰트는 각 책에서 사용하던 CDN을 계속 사용합니다. 단, 수식은 빌드가 `katex` 패키지로 미리 렌더링하고 배포물에는 KaTeX 스타일시트만 붙입니다. canonical·OG·구조화 데이터는 소스에 두지 않습니다. `book.json`에 `meta`가 있는 책(지금은 모든 책)은 빌드가 `<title>`·description·`CHAPTERS`·git 커밋 날짜로 생성합니다. 책 폴더에 `og.png`(1200×630)가 있으면 공유 이미지로도 씁니다. 애널리틱스 비컨은 빌드할 때 배포물에만 한 번 추가합니다.

GitHub Pages 배포물은 `.book-dist/`입니다. `CNAME`은 `semi.euiyun.com`입니다. 빌드는 소스를 읽기만 하며, 결과물과 통합 사이트맵은 `.book-dist/`에 씁니다.

## 라이선스

실행 코드는 [MIT](LICENSE-MIT), 본문·그림·문제·해설 등 교육 콘텐츠는 [CC BY 4.0](LICENSE-CC-BY-4.0)입니다. 각 책의 기여자와 저작권 안내도 해당 폴더에 보존했습니다. SVG 표지와 애니메이션은 `geniuskey/books`의 MIT 코드에서 가져왔고, 공정·식각·인프라·CMP·박막·플라즈마 표지는 이 저장소에서 추가했습니다. 홈의 시뮬레이터 화면(`shared/img/sims/`)은 각 책의 콘텐츠로 CC BY 4.0을 따릅니다. 자세한 범위는 [LICENSE.md](LICENSE.md)를 참고하세요.

시뮬레이터 수치는 교육용 근사 모델입니다. InfraBook의 FAB-E와 CMPBook의 CP-300, ThinFilmBook의 TF-300, PlasmaBook의 PL-300은 가상의 기준 팹·공정·장비이며 특정 회사·팹·장비의 실제 값이 아닙니다.
