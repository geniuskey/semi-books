# SemiBooks — 반도체 교과서 서가

소자와 회로 설계, 제조 공정과 팹 인프라, 패키징·테스트, 메모리·센서·디스플레이와 산업까지. 직접 만져 보며 배우는 한국어 인터랙티브 반도체 교과서를 한 저장소에서 관리합니다.

주소: **https://semi.euiyun.com/** · 책 한 권의 홈은 **`/{slug}/`**, 각 장은 **`/{slug}/chapters/{chapter}.html`**입니다.

## 수록 책

| 경로 | 책 | 원래 저장소 |
|---|---|---|
| `/device/` | DeviceBook · 반도체 소자 물리 | `geniuskey/devicebook` |
| `/digital/` | DigitalBook · 디지털 회로 설계 | `geniuskey/digitalbook` |
| `/design/` | DesignBook · 반도체 설계 | `geniuskey/designbook` |
| `/soc/` | SoCBook · 시스템 온 칩 | `geniuskey/socbook` |
| `/analog/` | AnalogBook · 아날로그 회로 | `geniuskey/analogbook` |
| `/process/` | ProcessBook · 반도체 제조 공정 | `geniuskey/processbook` |
| `/litho/` | LithoBook · 노광 | `geniuskey/lithobook` |
| `/etch/` | EtchBook · 식각 | `geniuskey/etchbook` |
| `/doping/` | DopingBook · 도핑 | `geniuskey/dopingbook` |
| `/yield/` | YieldBook · 수율 | `geniuskey/yieldbook` |
| `/failure/` | FailureBook · 불량 분석 | `geniuskey/failurebook` |
| `/tcad/` | TCADBook · 소자·공정 시뮬레이션 | `geniuskey/tcadbook` |
| `/packaging/` | PackagingBook · 패키징 | `geniuskey/packagingbook` |
| `/test/` | TestBook · 테스트 | `geniuskey/testbook` |
| `/memory/` | MemoryBook · 메모리 반도체 | `geniuskey/memorybook` |
| `/optics/` | OpticsBook · 이미지 센서 광학 | `geniuskey/opticsbook` |
| `/sensor/` | SensorBook · 이미지 센서 | `geniuskey/sensorbook` |
| `/display/` | DisplayBook · 디스플레이 | `geniuskey/displaybook` |
| `/industry/` | ChipIndustryBook · 반도체 산업 | `geniuskey/chipindustrybook` |
| `/infra/` | InfraBook · 팹 인프라, 집필 중 | 이 저장소에서 별도 집필 |

기존 책 19권은 소스·실습 엔진·용어 데이터·저작권 안내를 포함해 가져왔습니다. `.git`, `node_modules`, 빌드 결과, 개별 사이트의 CNAME과 CI·패키지 설정은 복사 대상에서 제외합니다. 각 책의 CSS·JS와 실습은 독립적으로 유지하며, 공통 서가 연결과 테마는 `shared/`에서 지원합니다.

## 한 달간 병행 관리

기존 저장소와 개별 도메인은 그대로 운영합니다. 서가에서 책 표지를 누르면 새 주소로 이동하며, 각 카드의 ‘기존 사이트’ 링크로 원래 주소에서도 읽을 수 있습니다.

가져오기 원본과 slug, 기존 URL은 `migration/books.json`에, 실제로 가져온 커밋과 파일별 해시는 `migration/import-state.json`에 기록합니다. 두 파일 모두 저장소에 보관합니다. 가져오기는 Git이 추적하는 파일을 대상으로 하므로 새 원본 파일은 먼저 해당 저장소에 추가합니다. 원본에 미커밋 수정이 있으면 상태 파일의 `sourceDirty`에도 기록합니다.

```bash
# 개별 저장소를 semi-books와 같은 상위 폴더에 둡니다.
python3 tools/import-books.py --check        # 원본과 통합본의 차이 확인
python3 tools/import-books.py --write        # 안전하게 갱신
python3 tools/import-books.py --write --book memory  # 한 권만 갱신
python3 tools/sync-catalog.py
python3 tools/sync-sitemap.py
npm test
npm run build
```

가져오기 도구는 개별 원본 저장소를 읽기만 합니다. 통합본에서 수정한 파일이 있으면 덮어쓰기를 거부하고 해당 경로를 알립니다. 원본에서 사라진 파일도 자동 삭제하지 않습니다. 병행 기간에 같은 책을 양쪽에서 수정했다면 먼저 차이를 합친 뒤 가져오기 상태를 정리하세요. 원본 저장소 삭제와 기존 도메인의 리디렉션 전환은 병행 기간 이후 별도 작업입니다.

`/infra/`는 가져오기 대상에 포함하지 않습니다. InfraBook의 집필과 파일 관리는 해당 작업자가 이어서 수행합니다. 집필 규칙은 [infra/CONTRIBUTING.md](infra/CONTRIBUTING.md)를 참고하세요.

## 구성

```text
index.html, shelf.css                 서가 홈, 분야 필터와 검색
catalog.js                           생성된 책 목록
book.json                            서가 메타데이터, 각 책의 book.json 목록
shared/js/covers.js                   books 프로젝트의 SVG 책 표지
shared/css/cover-animations.css       표지 애니메이션, 동작 줄이기 지원
shared/js/book-shell.js               가져온 책의 ‘반도체 서가’ 연결
{slug}/                              각 책의 본문, 실습, 용어 데이터, 집필 도구
infra/                               별도 집필 중인 InfraBook
migration/books.json                 원본·slug·서가 정보와 이전 경로 별칭
migration/import-state.json          가져온 커밋과 파일 해시
tools/import-books.py                보호된 가져오기·갱신
tools/sync-catalog.py                 서가 목록 생성, 기본 입력은 migration/books.json
tools/sync-sitemap.py                 루트 사이트맵 생성
tools/build.mjs                      하위 경로를 지원하는 정적 배포물 생성
tools/check.cjs                       메타데이터·링크·스크립트 정적 검사
tools/migration.test.cjs              원본 보존·덮어쓰기 거부·infra 보호 회귀 검사
tools/browser-check.cjs               데스크톱·모바일 브라우저 검사
```

`catalog.js`를 직접 수정하지 않고 `migration/books.json`의 책 정보를 수정한 후 생성합니다. 원본 포털의 목록을 다시 참고할 때는 `python3 tools/sync-catalog.py ../books/data/books.json`도 사용할 수 있습니다. 실제 장 수는 통합된 파일에서 계산합니다.

## 실행·검사·배포

```bash
python3 -m http.server 8000          # http://localhost:8000/, /memory/, /digital/ ...
npm ci
npm test
npm run build                       # .book-dist/ 생성
node tools/browser-check.cjs --imported --offline  # Playwright 필요
```

브라우저 검사에는 Playwright를 설치하거나 `PW_PATH`로 모듈 위치를 지정합니다. `CHROME`으로 브라우저 실행 파일을 지정할 수 있습니다. `--imported`는 작업 중인 InfraBook을 제외하고 서가와 가져온 책들만 검사합니다. CDN을 사용할 수 있는 환경에서는 `--offline`을 생략해 수식·폰트·3D 라이브러리까지 확인합니다.

빌드와 테스트에는 이전 개별 저장소나 books 프로젝트의 체크아웃이 필요하지 않습니다. 생성된 파일과 SVG 표지를 이 저장소에 포함합니다. KaTeX·three.js·웹 폰트는 각 책에서 사용하던 CDN을 계속 사용합니다. 소스 HTML의 canonical·OG·구조화 데이터는 통합 주소를 가리키고, 빌드 시 배포물에만 애널리틱스 비컨을 한 번 추가합니다.

GitHub Pages 배포물은 `.book-dist/`입니다. `CNAME`은 `semi.euiyun.com`입니다. 빌드는 소스와 `/infra/`를 읽기만 하며, 결과물과 통합 사이트맵은 `.book-dist/`에 씁니다.

## 라이선스

실행 코드는 [MIT](LICENSE-MIT), 본문·그림·문제·해설 등 교육 콘텐츠는 [CC BY 4.0](LICENSE-CC-BY-4.0)입니다. 각 책의 기여자와 저작권 안내도 해당 폴더에 보존했습니다. SVG 표지와 애니메이션은 `geniuskey/books`의 MIT 코드에서 가져왔습니다. 자세한 범위는 [LICENSE.md](LICENSE.md)를 참고하세요.

시뮬레이터 수치는 교육용 근사 모델입니다. InfraBook의 FAB-E는 가상의 기준 팹이며 특정 회사·팹의 실제 값이 아닙니다.
