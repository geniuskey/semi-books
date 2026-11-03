# ProcessBook 챕터 작성 가이드

빌드 과정 없는 정적 사이트다. `index.html` + `chapters/<slug>.html` + 공통 `css/style.css`, `js/common.js`, `js/xsec.js`, `js/optics.js`.
로컬 실행: `python3 -m http.server 8000` → http://localhost:8000 (file://로 열어도 동작하게 classic script만 쓴다. ES module 금지.)

## 기여물의 라이선스
실행 코드는 MIT, 본문·그림·문제·해설 등 교육 콘텐츠는 CC BY 4.0. 구분은 [라이선스 안내](LICENSE.md)를 따른다.

## 원칙
- **한국어**, 대상은 공대 학부생(반도체 물리·소자 기초가 있다고 가정). 영어 원어는 `<span class="en">(Step coverage)</span>`처럼 병기.
- 개념 → 직관 그림(SVG) → 수식(KaTeX) → 시뮬레이터 → 실제 수치 → 요약/퀴즈 순서.
- 수치는 교과서 대표값(Plummer·Deal·Griffin, Sze, Campbell)과 공개 자료의 대략값. 확실하지 않은 최신 수치는 '약', '~'를 붙이고 연도를 적는다.
- 외부 라이브러리는 KaTeX, three.js r147만. 이미지 대신 인라인 SVG/canvas.
- 색은 CSS 변수(`var(--accent)`)나 `PB.palette()`를 쓴다. 물리적 재질색은 `--m-si`, `--m-ox` … 또는 `XS.MATS[...].color`.
- 모바일(폭 360px)에서 가로 스크롤 금지. SVG는 `viewBox`만 주고 width/height 생략.

## head 블록
소스에는 `<title>`과 `<meta name="description">`(한 줄)만 쓴다. canonical, `theme-color`, Open Graph, Twitter 카드, JSON-LD는 루트의 `tools/build.mjs`가 `js/common.js`의 `CHAPTERS`와 `book.json`의 `meta`로 배포물에 생성하고, 수식도 빌드가 KaTeX로 미리 렌더링한다. 소스에 이 태그들이나 KaTeX 태그를 넣으면 `npm test`가 실패한다. 빌드는 정적 HTML의 수식만 렌더링하므로 스크립트가 `\(`·`\[`·`$$`가 든 문자열을 DOM에 넣지 않는다. 소스 파일을 바로 열면 `common.js`가 CDN에서 KaTeX를 불러와 미리보기를 렌더링한다. 사이트맵은 루트에서 `npm run sitemap`으로 갱신한다.
챕터를 추가하면 `CHAPTERS`, `chapters/glossary.html`의 챕터 칩·`TERMS`·`SHORT`에도 등록한다.

## 컴포넌트
본문 컴포넌트(`figure.diagram`, `.sim`, `.callout`, `.formula`, `.table-wrap`, `.quiz-q`)는 MemoryBook과 같다. 퀴즈 동작·목차·이전/다음는 `common.js`가 자동 처리한다.

## JS 헬퍼 (`PB`, `js/common.js`)
- `PB.canvas(el, (ctx,w,h)=>{}, {aspect, height, minHeight, maxHeight, hover})` → `{ctx,w,h,redraw()}` HiDPI, 리사이즈/테마 시 자동 redraw(배경 `--canvas-bg`로 칠해 줌).
- `PB.chart(ctx, box|null, opts)` → `{X,Y,invX,invY,box,hover}`. 옵션은 아래 "품질 기준".
- `PB.range(id, fmt, cb)` → getter `get()`, `get.set(v)`, `get.el`. `fmt`가 태그가 든 문자열(`1.0×10<sup>15</sup>`)을 돌려주면 HTML로 넣는다. `PB.seg(id, cb)` → getter. `PB.stat(id, html)`. `PB.loop(el, (dt,t)=>{})` 화면에 보일 때만 도는 rAF 루프.
- `PB.palette()`, `PB.color(name)`, `PB.onTheme(cb)`, `PB.isDark()`, `PB.alpha(c,a)`, `PB.mix(a,b,t)`, `PB.matColor('cu')`(재질색, `xsec.js` 없이도; `'1'` 위쪽·`'e'` 경계색).
- `PB.font(size, weight, mono)`(예전 형식 `PB.font(11, true)`도 된다), `PB.text`, `PB.textWidth`, `PB.wrapText`, `PB.badge`, `PB.rrect`, `PB.arrow`, `PB.num`, `PB.ease.*`, `PB.approach`, `PB.drag`, `PB.tip`, `PB.pointer`.
- `PB.fmt`, `PB.si`, `PB.erf/erfc`, `PB.rng(seed)`, `PB.randn`, `PB.poisson`, `PB.debounce`, `PB.clamp/lerp/map`, `PB.kB`, `PB.C`, `PB.wl2rgb`.
- `PB.three(el, {camera, target, fov, autoRotate, minDistance, maxDistance})` → `T = {THREE, scene, camera, renderer, controls, onFrame, label, material, fit, ground, edges, pick}`.

## 단면 엔진 (`XS`, `js/xsec.js`)
- `new XS.Sim({W, H, dx, surf, substrate, bgType, bgConc})` — 셀 격자. x(nm)는 왼쪽 0, y(nm)는 초기 실리콘 표면 0·아래가 +.
- 단계 객체를 `sim.run(step)`(동기) 또는 `sim.stepGen(step)`(제너레이터)로 적용:
  - `{op:"depo", mat, mode:"cvd"|"ald"|"pvd"|"epi", thick, stick, cosn}`
  - `{op:"etch", sel:{mat:상대속도}, rate, time, ion, sigma, tilt, wet}`
  - `{op:"litho", thick, wl, NA, sigma, dose, focus, clear|chrome:[[x0,x1]], swing, peb, dev, tone}` (도포 + 노광 + Mack 현상)
  - `{op:"implant", species:"B"|"BF2"|"P"|"As", E, dose, tilt, channel}`, `{op:"anneal", T, time, ambient}`, `{op:"ox", T, time(분), ambient}`
  - `{op:"cmp", stop|level, over, dish:{mat:nm}}`, `{op:"strip", mat}`, `{op:"coat", mat, thick}`, `{op:"silicide", depth}`, `{op:"rect", ...}`, `{op:"fn", fn}`
- `XS.draw(ctx, sim, box, {y0nm, y1nm, doping, junction, labels, scale, outline})` → `{X(nm), Y(nm), sc, ox, oy, pw, ph, cell(px,py), taken}`.
  셀 격자를 벡터 다각형으로 바꿔 그린다(계단 없는 경계, 재질 음영·경계선, 도핑 틴트, p-n 접합 점선, 닫힌 보이드 표시). 같은 단면은 캐시하므로 커서를 움직일 때마다 다시 불러도 된다.
  `labels: true`(또는 `{only:['ox','si'], names:{ox:'필드 산화막'}}`)면 넓은 영역 안에 재질 이름표를 붙인다. 축척 막대는 빈 공간이 가장 많은 모서리로 간다(`scale:'tr'`처럼 고정 가능). `taken`은 이미 쓴 자리(겹침 피하기용).
- `XS.color('ox')`(아래쪽 색), `XS.color('ox','1')`(위쪽 색), `XS.color('ox','e')`(경계색) — 캔버스에서 재질색을 칠할 때 16진 색 대신 쓴다(라이트·다크 자동).
- `XS.stepper(el, {title, make, steps:[{...step, k, label, desc}], legend, view, overlay, editable, below, labels})` — 단계별 단면 위젯(목록·재생·커서 정보 상자). 재질 이름표는 기본으로 켜진다(`labels:false`로 끔).
- `XS.legend(keys, doping)` 범례 HTML(견본도 재질 그라데이션). `XS.concHTML(v)` → `3.2×10<sup>18</sup> cm<sup>−3</sup>`.
- 셀 크기는 보통 2~10 nm. 계산이 무거우면 영역을 줄이거나 셀을 키운다.

## 결상 엔진 (`OPT`, `js/optics.js`)
- `OPT.image({pitch, cd, type:"binary"|"att"|"alt", tone, wl, NA, n, focus}, OPT.source({type:"conv"|"annular"|"dipole"|"quad", ...}))` → `{x, I, P}`
- `OPT.cd(img, threshold)`, `OPT.contrast(img)`, `OPT.nils(img, th, w)`, `OPT.TOOLS`

## 그림·시뮬레이터 품질 기준 (v2, 2026-11)

모든 그림과 실험은 이 기준을 따른다. MemoryBook과 같은 키트를 쓰므로 `../memory/chapters/dram-cell.html`(그림 4-1, `#sim-share`), `../memory/chapters/process.html`(단면 그림, `#sim-pre`)이 좋은 예다(MB → PB, `#mb-` → `#pb-`로 읽는다).

### 공통
- **겹침·넘침 금지.** 글자가 선·도형·다른 글자와 겹치거나 viewBox·상자 밖으로 나가면 안 된다. 라이트·다크·모바일(390px) 세 가지로 확인한다.
- **첨자는 진짜 첨자로.** `C_s`, `t_ox`, `V_t`처럼 밑줄로 쓰지 않는다. HTML은 `<sub>`, SVG는 `<tspan dy="3" class="sub">ox</tspan><tspan dy="-3">…</tspan>`(또는 유니코드 SiO₂·Si₃N₄), 캔버스는 `PB.text(ctx, "t_{ox}", …)`.
- 색은 의미로 쓴다: `--accent` 주인공, `--accent-2` 비교·보조, `--ok/--warn/--bad` 판정, 나머지는 `--text-dim`·`--border` 계열. 한 그림에 강조색은 두세 가지까지. 재질은 재질색(아래)으로만 칠한다.
- 글자 크기: SVG 본문 13px(`.t`), 보조 11.5~12px, 제목 13~15px 굵게. 패널이 여러 개면 `.fig-panels`로 나눠 좁은 화면에서 한 줄씩 쌓이게 한다(각 svg에 `style="flex:<viewBox 폭> 1 <viewBox 폭>px"`). 넓은 단일 그림은 모바일에서 72 % 크기로 옆으로 밀어 보게 된다. 모든 그림에 확대 단추가 자동으로 붙는다(`data-nozoom`으로 끔).

### SVG 그림 도구 (`css/style.css` + `js/common.js`가 문서에 넣는 `#pb-*` defs)
- **재질**: `.m-<재질>`(위→아래 음영 + 경계선), `.mc-<재질>`(원기둥 음영). 단면 엔진과 같은 색이다.
  `si`, `ox`(SiO₂), `nit`(Si₃N₄, `.m-sin`도 같음), `poly`, `pr`, `w`, `cu`, `al`, `tin`, `hk`(HfO₂), `sil`(NiSi), `epi`(SiGe), `lowk`, `acl`(탄소 하드마스크), `cfx`(고분자),
  도핑 영역 `n`·`p`(웰), `np`·`pp`(n⁺·p⁺ 확산층), 접합선 `.junc`, 패키징 `die`·`sol`·`mold`·`pcb`·`ipz`, 광학 `glass`(석영·렌즈)·`cr`(크롬 마스크)·`melt`(용융 실리콘).
  단색이 필요하면 `var(--m-si)` 등. 단면도는 반드시 이 재질 클래스를 쓴다(라이트·다크 색이 자동으로 맞는다).
- **선·화살표**: `.arr`(기본), `.arr-t .arr-a .arr-a2 .arr-ok .arr-warn .arr-bad .arr-blue .arr-red`, 양쪽 화살촉 `.arr2`. 치수선 `.dimline`, 보조선 `.ext`, 점선 `.dash`. 주석 지시선 `.lead`(끝점에 점), `.lead-a`. 회로 배선 `.wire2`, 접점 `.node`, 단자 `.node-o`.
- **면**: `.card`(그림자 상자), `.chip`, `.chip-a`, `.chip-a2`, `.f-ok/.f-warn/.f-bad`, 무늬 `.p-hatch .p-dots .p-grid`, 전하 `.q-e`(전자) `.q-h`(정공).
- **글자**: `.t .t-dim .t-mono .t-acc .t-acc2 .t-faint .t-ok .t-warn .t-bad`, 굵기 `.t-b .t-sb`, 크기 `.t-xs .t-sm .t-lg .t-xl`, 정렬 `.t-c .t-e`, 어두운 재질 위 흰 글자 `.t-inv`, 배경 테두리 `.t-halo`. 예전 `.lbl*`·`.s-dash`·`.beam`은 호환용으로만 남아 있다.
- 주석은 도형 위에 직접 쓰기보다 바깥 열에 정렬하고 `.lead`로 가리킨다. 지시선끼리 교차하지 않게 위에서 아래로 순서를 맞춘다.

### 캔버스 시뮬레이터
- 글자는 `PB.text(ctx, s, x, y, {size, weight, mono, color, align, baseline, halo})`로 그린다(첨자 지원: `_`/`^` 뒤 글자·숫자 묶음, 숫자로 시작하면 숫자만, 여러 단어는 `_{…}`, 부호 위첨자 `n^+`·`p^-`). **align/baseline을 주지 않으면 ctx의 현재 값을 따른다.**
- 차트는 `PB.chart`: `legend: true`(데이터를 가리지 않는 모서리 자동) + 시리즈 `label`, `fill: true`(그라데이션), `dots`, `bands`/`hbands`(그림 영역 안으로 잘린다), 로그 축 10ⁿ 눈금·보조 격자 자동(범위가 10⁻²~10⁴를 넘으면 모든 눈금을 10ⁿ으로). **`hover: true`** + `PB.canvas(…, {hover: true})`면 십자선과 값 상자가 뜬다(그리기 함수가 난수를 쓰면 켜지 말 것). 차트 안 왼쪽 위에 `fillText`로 제목을 얹지 말고 범례나 축 제목을 쓴다.
- 단면은 `XS.draw`로 그리고, 덧그림(치수선·화살표·이름)은 `PB.arrow`, `PB.text(…, {halo:true})`, `PB.badge`로. 재질색은 `XS.color()`.
- 캔버스 공간을 비워 두지 않는다. 그림이 영역을 채우고, 빈 아래쪽이 생기면 aspect·minHeight를 줄인다. 모바일(폭 < 520px)에서는 패널을 세로로 쌓는다.
- 값이 바뀔 때 도형이 순간이동하지 않게 `PB.approach`로 짧게 따라가게 하면 인과가 잘 보인다. 상태가 멈추면 rAF도 멈춘다.
- 판정·상태는 색만이 아니라 글자로도 보여 준다(색각 이상 대비).

### 3D (three.js)
- head에서 `RoomEnvironment.js`(`three@0.147.0/examples/js/environments/RoomEnvironment.js`)를 불러오면 금속에 환경 반사가 생긴다. 재질은 `metalness`·`roughness`로 구분한다. 색 관리는 sRGB다.
- 라벨은 `T.label`이 겹치지 않게 비켜서 지시선을 긋는다. `T.fit(group)`, `T.ground(y, size)`, `T.edges(mesh)`, `T.pick(objs, {click, hover})`.

