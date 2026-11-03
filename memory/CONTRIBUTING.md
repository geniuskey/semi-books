# MemoryBook 챕터 작성 가이드

소스는 빌드 없이 열리는 정적 사이트다(배포물의 메타데이터와 수식은 루트 빌드가 생성한다). `index.html` + `chapters/<slug>.html` + 공통 `css/style.css`, `js/common.js`.
로컬 실행: `python3 -m http.server 8000` → http://localhost:8000 (file://로 열어도 동작하게 classic script만 사용한다. ES module 금지.)

## 기여물의 라이선스

기여하는 실행 코드는 MIT, 본문·그림·문제·해설 등 교육 콘텐츠는 CC BY 4.0으로 제공합니다. 혼합 파일과 코드 예제의 구분은 [라이선스 안내](LICENSE.md)를 따릅니다. 외부 자료를 추가할 때는 원저작자·출처·라이선스를 명시하고 원래 고지를 유지하세요.

## 원칙
- **한국어**, 대상은 공대 학부생(전자회로·반도체 소자·컴퓨터 구조 기초가 있다고 가정). 영어 원어는 `<span class="en">(Sense Amplifier)</span>`처럼 병기.
- 개념 → 직관 그림(SVG) → 수식(KaTeX) → 시뮬레이터 → 실제 수치 예 → 요약/퀴즈 순서.
- 수치는 실제 제품에서 합리적인 범위를 쓴다(예: DRAM 셀 커패시턴스 8~25 fF, 비트라인 60~120 fF, tRCD ≈ 14 ns, 리프레시 창 DDR4 64 ms·DDR5 32 ms(85 °C 초과 시 절반), HBM3E 스택당 ~1.2 TB/s, 3D NAND 200~400단대(2026), TLC P/E 1k~3k회). 확실하지 않은 최신 수치는 '약', '~' 로 표기하고 연도를 적는다.
- 외부 라이브러리는 KaTeX(빌드가 처리)와 아래 head 템플릿의 three.js r147만 쓴다. 이미지 파일 대신 인라인 SVG/canvas로 그린다.
- 색은 하드코딩하지 말고 CSS 변수(`var(--accent)` 등)나 `MB.palette()`를 쓴다. 라이트/다크 둘 다 읽혀야 한다. 단, 물리적 재질색(구리, 실리콘, 산화막 등 3D 모델)은 고정색 가능.
- 모바일(폭 360px)에서 가로 스크롤이 생기면 안 된다. SVG는 `viewBox`만 주고 width/height 속성 생략.

## head 템플릿
```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>DRAM 셀과 어레이 · MemoryBook</title>
<meta name="description" content="한 문장 설명">
<link rel="stylesheet" href="../css/style.css">
<script src="../js/common.js"></script>
<!-- 3D가 필요한 페이지만 -->
<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/controls/OrbitControls.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/environments/RoomEnvironment.js"></script>
</head>
<body data-chapter="dram-cell">
<main class="chapter">
  <header class="chapter-hero">
    <div class="eyebrow">Chapter 04</div>
    <h1>DRAM 셀과 어레이</h1>
    <p class="lead">...</p>
    <ul class="objectives"><li>...</li></ul>
  </header>

  <section id="intro"><h2>제목</h2> ... </section>   <!-- h2 번호와 우측 목차는 자동 생성 -->
  ...
  <section class="keypoints" id="summary"><h2>핵심 정리</h2><ol><li>...</li></ol></section>
  <section class="quiz-sec" id="quiz"><h2>확인 퀴즈</h2><div class="quiz"> ... </div></section>
</main>
<script> /* 페이지 스크립트: 여기서 MB 사용 */ </script>
</body>
</html>
```
소스에는 `<title>`과 `<meta name="description">`만 쓴다. canonical, `theme-color`, Open Graph(`og.png` 포함), Twitter 카드, JSON-LD는 `tools/build.mjs`가 파일 경로, `<title>`·description, `js/common.js`의 `CHAPTERS`(장 이름과 순서), `memory/book.json`의 `meta`(사이트 이름, 테마 색, 책 소개), 그리고 git 마지막 커밋 날짜(`dateModified`)로 배포물에 생성한다. 소스에 이 태그들이 남아 있으면 `npm test`와 빌드가 실패한다. description은 `<meta>` 한 줄에 쓴다.
상단바, 챕터 서랍, 목차, 이전/다음, 푸터, 테마 토글, 퀴즈 동작, 검색은 `common.js`가 자동 처리한다.
수식은 `tools/katex.mjs`가 빌드할 때 KaTeX HTML로 렌더링하고, 배포물에는 KaTeX 스타일시트만 붙인다. 소스에 KaTeX 태그를 넣지 않는다. 소스 파일을 바로 열면 `common.js`가 CDN에서 KaTeX를 불러와 렌더링하므로 미리보기는 그대로 된다. TeX 문법 오류가 있으면 빌드가 실패한다. 빌드는 정적 HTML의 수식만 렌더링하므로, 스크립트가 `\(`·`\[`·`$$`가 든 문자열을 DOM에 넣으면 `npm test`가 실패한다.

챕터를 추가할 때는 `js/common.js`의 `CHAPTERS`, 루트 `sitemap.xml`(`npm run sitemap`), `chapters/glossary.html`의 챕터 칩(`#gl-ch`)과 `TERMS`에도 함께 등록한다.

## 컴포넌트
```html
<figure class="diagram"><svg viewBox="0 0 800 300">...</svg><figcaption><b>그림 4-1.</b> 설명</figcaption></figure>
```
SVG 안 유틸 클래스: `.t .t-dim .t-mono .t-acc`(텍스트), `.s-line .s-axis .s-acc`(선), `.f-surface .f-elev .f-acc .f-acc-soft .f-acc2-soft`(면).

```html
<div class="sim" id="sim-share">
  <div class="sim-head"><span class="sim-tag">SIMULATOR</span><h3>제목</h3></div>   <!-- 3D는 <span class="sim-tag three">3D</span> -->
  <div class="sim-body side">                                    <!-- side: 넓은 화면에서 컨트롤을 오른쪽에 -->
    <div class="sim-view"><canvas id="cv-share"></canvas></div>     <!-- 3D는 <div class="sim-view three" id="v3d"></div> -->
    <div class="sim-controls">
      <label class="ctrl"><span>셀 커패시턴스 <output id="cs-out"></output></span><input type="range" id="cs" min="5" max="30" value="15"></label>
      <div class="ctrl"><span>모드</span><div class="seg" id="mode"><button data-value="open" class="on">Open BL</button><button data-value="folded">Folded BL</button></div></div>
      <label class="check"><input type="checkbox" id="showx"> 옵션</label>
      <button class="btn primary" id="run">실행</button>
    </div>
  </div>
  <div class="sim-readout">
    <div class="stat"><span class="k">신호 전압 ΔV</span><span class="v" id="o-dv">—</span></div>
  </div>
  <div class="sim-note">해볼 것: ...</div>
</div>
```
콜아웃: `<div class="callout">`, `.tip`, `.warn`, `.deep`(심화). 수식: `<div class="formula">$$...$$<div class="where">여기서 ...</div></div>`, 인라인 `\( ... \)`.
표: `<div class="table-wrap"><table>...</table></div>`. 퀴즈:
```html
<div class="quiz-q"><p>질문?</p><div class="opts">
  <button class="opt">보기</button><button class="opt" data-correct>정답</button>
</div><div class="quiz-exp">해설</div></div>
```

## JS 헬퍼 (`js/common.js`)
- `MB.canvas(el, (ctx,w,h)=>{}, {aspect:0.5, height, minHeight, maxHeight})` → `{ctx,w,h,redraw()}` HiDPI, 리사이즈/테마 시 자동 redraw(배경 `--canvas-bg`로 칠해 줌).
- `MB.chart(ctx, box|null, {x:[a,b], y:[a,b], logX, logY, xLabel, yLabel, series:[{data:[[x,y]],color,width,dash,fill,label,dots}], vlines, hlines, points, bands, hbands, legend, hover, xFmt, yFmt})` → `{X,Y,invX,invY,box,hover}`. 자세한 옵션은 아래 "품질 기준".
- `MB.loop(el, (dt,t)=>{})` 화면에 보일 때만 도는 rAF 루프 `{start,stop,toggle}`.
- `MB.range(id, fmt, onInput)` → getter `get()`, `get.set(v)`. `MB.seg(id, onChange)` → getter. `MB.stat(id, html)`.
- `MB.palette()` 테마 색, `MB.color('accent')`, `MB.onTheme(cb)`, `MB.isDark()`.
- `MB.wl2rgb(nm, alpha)`, `MB.wl2rgbArr(nm)`, `MB.randn()`, `MB.poisson(λ)`, `MB.fmt(x, digits)`, `MB.si(x,'m')`, `MB.clamp/lerp/map`, `MB.C = {h,c,q,k}`.
- `MB.three(el, {camera:[x,y,z], target:[x,y,z], fov, autoRotate, minDistance, maxDistance})` → `T = {THREE, scene, camera, renderer, controls, onFrame(cb), label(html, Vector3|[x,y,z]) , material(color, opts)}`. 조명/리사이즈/화면밖 정지 포함. 라벨의 `L.obj = mesh`로 두면 로컬 좌표를 따라감.

- `MB.bytes(x, digits, bin=true)` → "3 GiB" / (bin=false) "3 GB". `MB.bin(n, width)` → 고정 폭 2진 문자열.
- `MB.C`에는 `eps0, hbar, me`도 있다.

## 추가 SVG 유틸
`.s-acc2`(보조 강조선), `.f-acc2`, `.f-ok-soft .f-warn-soft .f-bad-soft`(상태 면). 본문용 `.bits`(모노 비트열), `.pill`.

## 그림·시뮬레이터 품질 기준 (v2, 2026-11)

모든 그림과 실험은 이 기준을 따른다. 예시: `chapters/dram-cell.html`의 그림 4-1(회로도 + 재질 단면)과 전하 공유 시뮬레이터(`#sim-share`).

### 공통
- **겹침·넘침 금지.** 글자가 선·도형·다른 글자와 겹치거나 viewBox·상자 밖으로 나가면 안 된다. 라이트·다크·모바일(390px) 세 가지로 확인한다.
- **첨자는 진짜 첨자로.** `V_DD`, `I_on`, `t_ox`처럼 밑줄로 쓰지 않는다. HTML은 `<sub>`, SVG는 `<tspan dy="3" class="sub">DD</tspan><tspan dy="-3">…</tspan>`, 캔버스는 `MB.text(ctx, "V_{DD}", …)`.
- 색은 의미로 쓴다: `--accent` 이 그림의 주인공, `--accent-2` 비교·보조, `--ok/--warn/--bad` 판정, 나머지는 `--text-dim`·`--border` 계열로 가라앉힌다. 한 그림에 강조색은 두세 가지까지.
- 글자 크기: SVG 본문 13px(`.t`), 보조 11.5~12px, 제목 13~15px 굵게. 760 폭 viewBox의 글자는 모바일에서 40%로 줄어드므로, 패널이 여러 개면 `.fig-panels`로 나눠 좁은 화면에서 한 줄씩 쌓이게 한다(각 svg에 `style="flex:<viewBox 폭> 1 <viewBox 폭>px"`). 모든 그림에는 확대 단추가 자동으로 붙는다(`data-nozoom`으로 끔).

### SVG 그림 도구 (`css/style.css` + `js/common.js`가 문서에 넣는 `#mb-*` defs)
- **재질**: `.m-<재질>`(위→아래 음영), `.mc-<재질>`(원기둥 음영). `si`(실리콘), `p`(p형), `n`(n⁺), `ox`(SiO₂), `sin`(SiN), `poly`(폴리), `w`(텅스텐·금속), `cu`, `tin`, `hk`(high-k), `ctf`(전하 트랩), `sol`(솔더·범프), `mold`(EMC), `pcb`(유기 기판), `ipz`(인터포저), `die`(실리콘 다이), `mag`(자성층), `mgo`(터널 장벽), `gst`(칼코게나이드), `pr`(감광막), `acl`(하드마스크). 단면도는 반드시 이 재질 클래스를 쓴다(라이트·다크 색이 자동으로 맞는다).
- **선·화살표**: `.arr`(기본), `.arr-t .arr-a .arr-a2 .arr-ok .arr-warn .arr-bad .arr-blue .arr-red`, 양쪽 화살촉 `.arr2`를 더함. 치수선 `.dimline`, 보조선 `.ext`, 점선 `.dash`. 주석 지시선 `.lead`(끝점에 점). 회로 배선 `.wire2`, 접점 `.node`, 단자 `.node-o`. 직접 `marker-end="url(#mb-ah-a)"`처럼 써도 된다.
- **면**: `.card`(그림자 있는 상자), `.chip`, `.chip-a`, `.chip-a2`, `.f-ok/.f-warn/.f-bad`, 무늬 `.p-hatch .p-dots .p-grid`, 전하 `.q-e`(전자) `.q-h`(정공).
- **글자**: `.t .t-dim .t-mono .t-acc .t-acc2 .t-faint .t-ok .t-warn .t-bad`, 굵기 `.t-b .t-sb`, 크기 `.t-xs .t-sm .t-lg .t-xl`, 정렬 `.t-c .t-e`, 어두운 재질 위 흰 글자 `.t-inv`, 배경 테두리 `.t-halo`.
- 주석은 도형 위에 직접 쓰기보다 바깥 열에 정렬하고 `.lead`로 가리킨다. 지시선끼리 교차하지 않게 위에서 아래로 순서를 맞춘다.
- 회로 기호는 표준 모양(MOSFET 게이트·채널 두 줄, 커패시터 두 판, 접점 점)으로 그린다. 블록도의 화살표는 굵은 도형 대신 `.arr*` 선을 쓴다.

### 캔버스 시뮬레이터
- 글자는 `MB.text(ctx, s, x, y, {size, weight, mono, color, align, baseline, halo})`로 그린다(첨자 지원, `halo`는 선 위에서도 읽히게). **align/baseline을 주지 않으면 ctx의 현재 값을 따르므로** 눈금을 그린 뒤에는 꼭 지정한다. 글꼴은 `MB.font(size, weight, mono)`.
- 차트는 `MB.chart`를 쓴다. 새 옵션: `legend: true`(자동 위치, 데이터를 가리지 않는 모서리) · 시리즈 `label`, `fill: true`(그라데이션), `dots`; `hbands`; 로그 축은 10ⁿ 눈금과 보조 격자가 자동. **`hover: true`** + `MB.canvas(…, {hover: true})`이면 십자선과 값 상자가 뜬다(그리기 함수가 난수를 쓰면 켜지 말 것). 반환값 `invX/invY`로 드래그 좌표를 값으로 바꾼다.
- 기타 헬퍼: `MB.rrect`, `MB.arrow(ctx,x0,y0,x1,y1,{color,width,both,dash})`, `MB.badge(ctx, s, x, y, {bg,fg,border})`, `MB.alpha(color,a)`, `MB.mix(a,b,t)`, `MB.ease.*`, `MB.approach(x, target, dt, tau)`(부드러운 추종), `MB.drag(canvas, {hit, move, end})`, `MB.tip(canvas)`(DOM 툴팁), `MB.num(x)`(지수를 10^{n} 서식으로), `MB.wrapText`.
- 캔버스 공간을 비워 두지 않는다. 그래프·도식이 영역을 채우고, 빈 아래쪽이 생기면 aspect·minHeight를 줄인다. 모바일(폭 < 520px)에서는 패널을 세로로 쌓는다.
- 값이 바뀔 때 도형이 순간이동하지 않게 `MB.approach`로 짧게(0.1~0.2 s) 따라가게 하면 인과가 잘 보인다. 상태가 멈추면 rAF도 멈춘다.
- 판정·상태는 색만이 아니라 글자로도 보여 준다(색각 이상 대비).

### 3D (three.js)
- `RoomEnvironment.js`를 head에서 불러오면(`three@0.147.0/examples/js/environments/RoomEnvironment.js`) 금속에 환경 반사가 생긴다. 재질은 `metalness`·`roughness`로 구분한다(금속 0.6~0.9/0.25~0.4, 산화막 0/0.6 반투명).
- 라벨은 `T.label`이 겹치지 않게 비켜서 지시선을 긋는다. 중요한 라벨은 `L.priority = 1`. 문구를 바꿀 때는 `L.setText(html)`.
- `T.fit(group, {pad})`로 모델이 뷰를 채우게 하고, `T.ground(y, size)`로 바닥 그림자를 깐다. `T.edges(mesh)`는 윤곽선, `T.pick(objs, {click, hover})`는 클릭·호버 선택.
