# SoCBook 챕터 작성 가이드

빌드 과정 없는 정적 사이트다. `index.html` + `chapters/<slug>.html` + 공통 `css/style.css`, `js/common.js`, `js/soc.js`.
로컬 실행: `python3 -m http.server 8000` → http://localhost:8000 (file://로 열어도 동작하게 classic script만 쓴다. ES module 금지.)
ProcessBook·MemoryBook과 같은 디자인 시스템과 컴포넌트를 쓰는 시리즈다.

## 기여물의 라이선스
실행 코드는 MIT, 본문·그림·문제·해설 등 교육 콘텐츠는 CC BY 4.0. 구분은 [라이선스 안내](LICENSE.md)를 따른다.

## 원칙
- **한국어**, 대상은 공대 학부생(디지털 논리 기초가 있으면 좋지만 필수는 아님). 영어 원어는 `<span class="en">(Cache coherence)</span>`처럼 병기.
- **만지며 배운다.** 영감은 Bartosz Ciechanowski의 글(예: *Mechanical Watch*)이다. 개념을 설명하는 문단 바로 옆에 그 개념 하나만 떼어 낸 작은 인터랙티브 그림(`figure.play`)을 두고, 장의 핵심에는 큰 시뮬레이터(`.sim`)를 둔다. 정적인 그림은 꼭 필요할 때만.
- 장 하나에 인터랙티브 요소 6개 이상(작은 그림 + 시뮬레이터), 예측해 보기(`.predict`) 1~3개, 퀴즈 4~6문항.
- 순서: 직관 → 만져 보기 → 수식(KaTeX) → 실제 수치 → 요약 → 퀴즈.
- 수치는 교과서(Hennessy & Patterson, Weste & Harris, Jacob의 Memory Systems 등)와 공개 자료의 대략값. 확실하지 않은 최신 수치는 '약', '~'를 붙이고 연도를 적는다.
- 외부 라이브러리는 KaTeX, three.js r147만. 이미지 대신 인라인 SVG/canvas.
- 색은 CSS 변수(`var(--accent)`)나 `SB.palette()`. IP 블록 종류는 항상 블록 색(`--b-cpu`, `--b-gpu` … 또는 `SOC.color(type)`)을 쓴다. 같은 색 = 같은 종류의 블록.
- 모바일(폭 360px)에서 가로 스크롤 금지. SVG는 `viewBox`만 주고 width/height 생략. 캔버스는 `SB.canvas`로 부모 폭을 따른다.
- 끌기 조작은 `SOC.pointer(el, {...}, {drag:true})`로 마우스·터치를 함께 지원한다.

## head 블록
각 챕터 `<head>`에는 아래 표식만 두고 `python3 tools/head.py`를 실행한다. 제목·번호는 `js/common.js`의 `CHAPTERS`에서 읽고, canonical·OG·JSON-LD·사이트맵·`index.html`의 `hasPart`를 함께 갱신한다.
```html
<!--head:start {"desc": "한 문장 설명", "libs": ["three"]}-->
<!--head:end-->
```
챕터를 추가하면 `CHAPTERS`, `chapters/glossary.html`의 `TERMS`·`BANK`·`SHORT`에도 등록한다.

## 컴포넌트
- `header.chapter-hero` 안에 `.eyebrow`, `h1`, `p.lead`, `ul.objectives`, 그리고 `<div class="soc-locator" data-blocks="gpu"></div>`(이 장이 칩의 어디인지 보여 주는 미니 지도. 블록 종류나 id를 공백으로 구분).
- 본문: `section > h2`(번호 자동), `figure.diagram`(정적 SVG), `figure.play`(작은 인터랙티브: `.play-view` + `.play-ctrl` + `figcaption`), `.sim`(큰 시뮬레이터: `.sim-head` + `.sim-body` + `.sim-readout` + `.sim-note`), `.callout`(`.tip`/`.warn`/`.deep`), `.predict`(예측 → `<details>`로 답), `.formula`, `.table-wrap`, `section.keypoints`, `section.quiz-sec` + `.quiz-q`.
- 퀴즈 동작·목차·이전/다음·KaTeX 렌더는 `common.js`가 자동 처리한다.

## JS 헬퍼
`SB` (`js/common.js`)
- `SB.canvas(el, draw, {aspect, minHeight, maxHeight})`, `SB.chart(ctx, box, opts)`, `SB.range(id, fmt, cb)`, `SB.seg(id, cb)`, `SB.stat(id, html)`, `SB.loop(el, fn)`, `SB.three`.
- `SB.palette()`, `SB.color(name)`, `SB.font(px, mono, weight)`, `SB.fmt`, `SB.si`, `SB.bytes`, `SB.bin`, `SB.rng(seed)`, `SB.debounce`, `SB.clamp/lerp/map`, `SB.onTheme(cb)`, `SB.isDark()`.

`SOC` (`js/soc.js`)
- `SOC.FLOOR`, `SOC.DIE` — 이 책의 기준 칩 SB-1의 평면도(mm). `SOC.block(id)`, `SOC.areaByType()`.
- `SOC.drawDie(ctx, box, {highlight, heat, selected, labels})`, `SOC.die(canvas, {onPick, onHover, heat, overlay})`.
- `SOC.wave(ctx, box, {cycles, signals:[{name,type:"clk"|"bit"|"bus",v}], marks, shade, cursor})` — 타이밍 파형.
- `SOC.pointer(el, {down, move, up, leave}, {drag})`, `SOC.arrow`, `SOC.box`, `SOC.heat(t)`, `SOC.alpha(c,a)`, `SOC.mix(a,b,t)`, `SOC.color(type)`.
