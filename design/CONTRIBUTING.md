# DesignBook 챕터 작성 가이드

빌드 과정 없는 정적 사이트다. `index.html` + `chapters/<slug>.html` + 공통 `css/style.css`, `js/common.js`, `js/cell.js`.
로컬 실행: `python3 -m http.server 8000` → http://localhost:8000 (file://로 열어도 동작하게 classic script만 쓴다. ES module 금지.)
공통 CSS·JS는 자매 사이트 [ProcessBook](https://semi.euiyun.com/process/)과 같은 구조·API(`PB`)를 쓴다.

## 기여물의 라이선스
실행 코드는 MIT, 본문·그림·문제·해설 등 교육 콘텐츠는 CC BY 4.0. 구분은 [라이선스 안내](LICENSE.md)를 따른다.

## 원칙
- **한국어**, 대상은 공대 학부생(디지털 논리·회로 기초, 반도체 소자 기초가 있다고 가정). 영어 원어는 `<span class="en">(Static timing analysis)</span>`처럼 병기.
- 개념 → 직관 그림(SVG) → 수식(KaTeX) → 시뮬레이터 → 실제 수치 → 요약/퀴즈 순서.
- 수치는 교과서 대표값(Weste–Harris *CMOS VLSI Design*, Rabaey *Digital Integrated Circuits*, Kahng 외 *VLSI Physical Design*)과 공개 자료의 대략값. 확실하지 않은 최신 수치는 '약', '~'를 붙이고 연도를 적는다. 특정 회사의 비공개 PDK 수치는 쓰지 않는다. 예시 공정은 교육용 가상 PDK **EDU45**(아래)다.
- 제조 공정과 이어지는 부분은 ProcessBook 챕터로 링크한다: `<a href="/process/chapters/litho.html">ProcessBook 4장</a>`. JS에서는 `PB.pbook("litho")`.
- 외부 라이브러리는 KaTeX, three.js r147만. 이미지 대신 인라인 SVG/canvas.
- 색은 CSS 변수(`var(--accent)`)나 `PB.palette()`를 쓴다. 레이아웃 레이어 색은 `CELL.LAYERS[...]`, 공정 재질색은 `--m-si`, `--m-ox` … (ProcessBook과 같은 값).
- 모바일(폭 360px)에서 가로 스크롤 금지. SVG는 `viewBox`만 주고 width/height 생략.

## 교육용 가상 PDK: EDU45
| 항목 | 값 |
|---|---|
| 게이트 길이 (그린 값) | 50 nm |
| 게이트 피치 CPP | 190 nm |
| M1 피치 / M2 피치 | 140 nm / 140 nm |
| 셀 높이 | 9 트랙 = 1260 nm |
| 공급 전압 | 1.0 V (코너 0.9~1.1 V) |
| FO4 인버터 지연 | 약 15 ps |
| 인버터 X1 입력 커패시턴스 | 약 1 fF |

## ProcessBook 챕터 slug
overview(01 개요), wafer(02), oxidation(03 열산화), litho(04 노광 광학), resist(05 감광막·OPC·멀티 패터닝), etch(06 식각), deposition(07 증착), implant(08 이온 주입), anneal(09 열처리), cmp(10 CMP·더미 필), metal(11 금속 배선·RC·전자 이동), integration(12 CMOS 공정 통합, 마스크 1~10), advanced(13 FinFET·GAA·BSPDN), metrology(14 계측·수율), lab(15), glossary(16).

## head 블록
소스에는 `<title>`과 `<meta name="description">`(한 줄)만 쓴다. canonical, `theme-color`, Open Graph, Twitter 카드, JSON-LD는 루트의 `tools/build.mjs`가 `js/common.js`의 `CHAPTERS`와 `book.json`의 `meta`로 배포물에 생성하고, 수식도 빌드가 KaTeX로 미리 렌더링한다. 소스에 이 태그들이나 KaTeX 태그를 넣으면 `npm test`가 실패한다. 빌드는 정적 HTML의 수식만 렌더링하므로 스크립트가 `\(`·`\[`·`$$`가 든 문자열을 DOM에 넣지 않는다. 소스 파일을 바로 열면 `common.js`가 CDN에서 KaTeX를 불러와 미리보기를 렌더링한다. 사이트맵은 루트에서 `npm run sitemap`으로 갱신한다.
챕터를 추가하면 `CHAPTERS`, `chapters/glossary.html`의 `TERMS`·`SHORT`에도 등록한다.

## 컴포넌트
본문 컴포넌트(`figure.diagram`, `.sim`, `.callout`, `.formula`, `.table-wrap`, `.quiz-q`, `.keypoints`)는 ProcessBook과 같다. 퀴즈 동작·목차·이전/다음는 `common.js`가 자동 처리한다.

## JS 헬퍼 (`PB`, `js/common.js`)
- `PB.canvas(el, draw, {aspect, minHeight, maxHeight})`, `PB.chart(ctx, box, opts)`, `PB.range(id, fmt, cb)`, `PB.seg(id, cb)`, `PB.stat(id, html)`, `PB.loop`, `PB.three`.
- `PB.palette()`, `PB.color(name)`, `PB.font(px, mono, weight)`, `PB.fmt`, `PB.si`, `PB.rng(seed)`, `PB.debounce`, `PB.clamp/lerp/map`, `PB.pbook(slug)`.

## 레이아웃 엔진 (`CELL`, `js/cell.js`)
- `CELL.LAYERS` — 레이어 정의(이름·GDS 번호·색·무늬·대응 마스크·ProcessBook 챕터).
- `CELL.CELLS` — EDU45 표준 셀(INV_X1, NAND2_X1, NOR2_X1)의 사각형·핀·트랜지스터.
- `CELL.drawLayout(ctx, rects, box, opts)`, `CELL.xsection(rects, cut)`, `CELL.drawXsec(ctx, xs, box, opts)`.
- `CELL.RULES`, `CELL.drc(rects)`, `CELL.extract(rects, labels)`, `CELL.lvs(ext, schematic)`, `CELL.toProcessBook(rects, cut, {period})` → ProcessBook 실험실 링크.

## 흐름 엔진 (`FLOW`, `js/flow.js`)
- `FLOW.run(src)` → `{parsed, S(합성), P(배치), R(배선), L(레이아웃)}`, `FLOW.sta(S, R, {T})`, `FLOW.lvs(S, L)`, `FLOW.gds(name, L)` → Uint8Array.

## 학습 진행
- `PB.track('e', key)` 이벤트, `PB.track('g', key, n)` 게임 기록. 배지 정의는 `js/common.js`의 `BADGES`.
