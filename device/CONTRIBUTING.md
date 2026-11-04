# DeviceBook 챕터 작성 가이드

빌드 과정 없는 정적 사이트다. `index.html` + `chapters/<slug>.html` + 공통 `css/style.css`, `js/common.js`, `js/semi.js`.
로컬 실행: `python3 -m http.server 8000` → http://localhost:8000 (file://로 열어도 동작하게 classic script만 쓴다. ES module 금지.)

## 기여물의 라이선스
실행 코드는 MIT, 본문·그림·문제·해설 등 교육 콘텐츠는 CC BY 4.0. 구분은 [라이선스 안내](LICENSE.md)를 따른다.

## 원칙
- **한국어**, 대상은 공대 학부생(일반물리·기초 전자기·미적분을 안다고 가정). 영어 원어는 `<span class="en">(Depletion region)</span>`처럼 병기.
- 개념 → 직관 그림(SVG/애니메이션) → 수식(KaTeX) → 시뮬레이터 → 실제 수치 → 요약/퀴즈 순서.
- **인터랙티브가 핵심이다.** 장마다 시뮬레이터(`.sim`) 4~7개. 슬라이더만 있는 차트에 그치지 말고 움직이는 입자(전자·정공), 드래그 가능한 점, 단계별 애니메이션, 예측해 보기(먼저 답을 고르고 결과 확인), 미니 게임/챌린지(목표값 맞추기) 등을 섞는다.
- 수치는 교과서 대표값(Sze, Pierret, Neamen, Streetman, Taur–Ning, Green)과 공개 자료의 대략값. 확실하지 않은 최신 수치는 '약', '~'를 붙이고 연도를 적는다.
- 외부 라이브러리는 KaTeX, three.js r147만. 이미지 대신 인라인 SVG/canvas.
- 색은 CSS 변수나 `PB.palette()`를 쓴다. 전자 `P.e`(파랑, 채운 원), 정공 `P.h`(빨강, 빈 원), 전도대 `P.ec`, 가전자대 `P.ev`, 페르미 준위 `P.ef`(청록 점선). 하드코딩한 색은 다크 모드에서 깨진다.
- 모바일(폭 360px)에서 가로 스크롤 금지. SVG는 `viewBox`만 주고 width/height 생략. 캔버스는 `PB.canvas`로 부모 폭을 따르게.
- 에너지 축은 위가 높은 전자 에너지. 전위 ψ와 전자 에너지는 부호가 반대(\(E = -q\psi\)).

## head 블록
소스에는 `<title>`과 `<meta name="description">`(한 줄)만 쓴다. canonical, `theme-color`, Open Graph, Twitter 카드, JSON-LD는 루트의 `tools/build.mjs`가 `js/common.js`의 `CHAPTERS`와 `book.json`의 `meta`로 배포물에 생성하고, 수식도 빌드가 KaTeX로 미리 렌더링한다. 소스에 이 태그들이나 KaTeX 태그를 넣으면 `npm test`가 실패한다. 빌드는 정적 HTML의 수식만 렌더링하므로 스크립트가 `\(`·`\[`·`$$`가 든 문자열을 DOM에 넣지 않는다. 소스 파일을 바로 열면 `common.js`가 CDN에서 KaTeX를 불러와 미리보기를 렌더링한다. 사이트맵은 루트에서 `npm run sitemap`으로 갱신한다.
챕터를 추가하면 `CHAPTERS`, `chapters/glossary.html`의 챕터 칩·`TERMS`·`QUIZ`에도 등록한다.

## 페이지 골격
```html
<body data-chapter="pn">
<main class="chapter">
  <header class="chapter-hero"><div class="eyebrow">Chapter 05</div><h1>…</h1><p class="lead">…</p><ul class="objectives"><li>…</li></ul></header>
  <section id="…"><h2>…</h2> …본문, figure.diagram, .sim, .callout, .formula, .table-wrap… </section>
  …
  <section class="keypoints" id="summary"><h2>핵심 정리</h2><ol><li>…</li></ol></section>
  <section class="quiz-sec" id="quiz"><h2>확인 퀴즈</h2><div class="quiz"> .quiz-q × 5~6 </div></section>
</main>
<script> (function(){ "use strict"; … })(); </script>
</body>
```
`section > h2`에 번호와 우측 목차가 자동으로 붙는다. 퀴즈: `<div class="quiz-q"><p>질문</p><div class="opts"><button class="opt">…</button><button class="opt" data-correct>…</button></div><div class="quiz-exp">해설</div></div>`.

## 시뮬레이터 카드
```html
<div class="sim" id="sim-x">
  <div class="sim-head"><span class="sim-tag">SIMULATOR</span><h3>제목</h3></div>   <!-- 3D면 class="sim-tag three">3D -->
  <div class="sim-body side">  <!-- side: 오른쪽 컨트롤 열 (넓은 화면) -->
    <div class="sim-view"><canvas id="x-cv"></canvas></div>
    <div class="sim-controls">
      <label class="ctrl"><span>도핑 <output id="x-n-out"></output></span><input type="range" id="x-n" min="14" max="19" step="0.1" value="16"></label>
      <div class="ctrl"><span>재료</span><div class="seg" id="x-m"><button data-value="Si" class="on">Si</button><button data-value="GaAs">GaAs</button></div></div>
    </div>
  </div>
  <div class="sim-readout"><div class="stat"><span class="k">값</span><span class="v" id="x-o">—</span></div></div>
  <div class="sim-note">해볼 것: ① … ② …</div>
</div>
```
태그 종류: `SIMULATOR`, `ANIMATION`, `CHALLENGE`, `PREDICT`, `3D`(three). 범례는 `.legend`, 버튼은 `.btn`/`.btn.primary`, 체크박스는 `.check`.

## JS 헬퍼 (`PB`, `js/common.js`)
- `PB.canvas(el, draw(ctx,w,h), {aspect, height, minHeight, maxHeight, hover})` → `{redraw, w, h, ctx, canvas}` — HiDPI, 리사이즈·테마 변경 시 자동 다시 그림(배경 `--canvas-bg`). 크기 옵션은 폭을 받는 함수여도 된다(`aspect: (w) => w < 520 ? 1.1 : 0.55`).
- `PB.chart(ctx, box|null, opts)` → `{X, Y, invX, invY, box, hover}`. 옵션은 아래 "품질 기준".
- `PB.range(id, fmt, cb)` → getter(`.set(v)`, `.el`, `.refresh()` — min/max를 코드로 바꾼 뒤 출력 갱신). `fmt`가 태그가 든 문자열(`1.0×10<sup>15</sup>`)을 돌려주면 HTML로 넣는다. `PB.seg(id, cb)`, `PB.stat(id, html)`, `PB.loop(el, (dt,t)=>{})`(보일 때만 도는 rAF 루프), `PB.three(el, opts)`.
- `PB.palette()`(`e h ec ev ef ei` 포함), `PB.color(name)`, `PB.onTheme(cb)`, `PB.isDark()`, `PB.alpha(c,a)`, `PB.mix(a,b,t)`, `PB.matColor('si')`(재질색; `'1'` 위쪽·`'e'` 경계색), `PB.matRect(ctx, x, y, w, h, 'np', {r})`(캔버스 재질 사각형, SVG `.m-*`와 같은 음영).
- 글자·도형: `PB.text`, `PB.textWidth`, `PB.wrapText`, `PB.font(size, weight, mono)`(예전 형식 `PB.font(11, true)`도 된다), `PB.badge`, `PB.rrect`, `PB.arrow`, `PB.num`, `PB.endLabels`(선 끝 라벨 겹침 피하기).
- 움직임·입력: `PB.ease.*`, `PB.approach`, `PB.drag`, `PB.tip`, `PB.pointer`.
- `PB.fmt`, `PB.si`, `PB.erf/erfc`, `PB.rng(seed)`, `PB.randn()`, `PB.poisson`, `PB.debounce`, `PB.clamp/lerp/map`, `PB.kB`, `PB.C`, `PB.wl2rgb(nm)`.
- 캔버스 포인터 상호작용은 `PB.drag(canvas, {hit, move, end})`(드래그할 것이 없으면 스크롤 유지)나 `pointerdown/move/up` + `setPointerCapture`로 모바일 드래그를 지원한다.

## 소자 물리 엔진 (`SC`, `js/semi.js`) — 단위: cm, cm⁻³, eV/V, K
- 상수: `SC.q, SC.kB, SC.kBeV, SC.eps0 (F/cm), SC.h, SC.hbar, SC.m0`, `SC.Vt(T)` 열전압.
- 재료: `SC.MAT.{Si,Ge,GaAs,SiC,GaN}` = `{Eg0,a,b,Nc,Nv,chi,eps,me,mh,medos,mhdos,mun,mup,vsn,vsp,direct}`. `SC.Eg(mat,T)`, `SC.Nc/Nv(mat,T)`, `SC.ni(mat,T)` (Si 300 K ≈ 1.07×10¹⁰), `SC.EiOffset`, `SC.debye(N)`.
- 통계: `SC.fd(E,Ef,T)`, `SC.F12(η)`, `SC.dosC`, `SC.equilibrium(mat,T,{Nd,Na,Ed,Ea,incomplete,fd})` → `{Ef(Ev 기준), EfEi, n, p, NdIon, NaIon, Eg, ni, Ei}`, `SC.np(Nd,Na,mat,T)`.
- 수송: `SC.mobility(mat,N,T,'n'|'p')`(Si: 아로라), `SC.vdrift(mu,E,vsat,beta)`, `SC.diff(mu,T)`, `SC.resistivity(Nd,Na,mat,T)`.
- 재결합: `SC.srh(n,p,ni,taun,taup,Et,T)`, `SC.tauSRH(N)`.
- 접합: `SC.pn(Na,Nd,V,mat,T)` → `{Vbi,W,xn,xp,Emax,Cj}`, `SC.diodeJ({Na,Nd,V,T,taun,taup,Wn,Wp})` → `{J,Jdiff,Jgr,J0,Ln,Lp}`.
- 쇼트키: `SC.schottkyJ(phiB,V,T,Astar,n)`, `SC.imageLowering(E)`.
- MOS: `const m = SC.mosSetup({Nsub, type:'p'|'n', tox, phims?, Qox?})` → `m.Vfb, m.Vth, m.phiF, m.Cox, m.Wmax, m.gamma, m.psis(Vg,'lf'|'dd'), m.Vg(psis), m.Qs(psis), m.C(Vg,'lf'|'hf'|'dd'), m.Qinv(Vg), m.W(psis)`.
- MOSFET: `SC.mosfet({W,L,tox,mu0,Vth0,Nsub,Vsb,theta,vsat,lambda,dibl,type}, Vgs, Vds)` → `{Id, Vth, n, regime}` (EKV형: 문턱 이하~포화 연속), `SC.SS(n,T)`.
- 광: `SC.alphaSi(nm)`, `SC.alphaDirect(Eph,Eg)`, `SC.eV2nm/nm2eV`.
- 1D 드리프트–확산: `new SC.Device1D({L, N, doping: x=>Nd−Na, taun, taup, Et, G: x=>생성률, mobility})` → `.solve(Va)`(왼쪽 접촉 전위, p 왼쪽 다이오드면 순방향 +), `.setG(fn)`, `.state()` → `{x, psi, n, p, Ec, Ev, Ei, Efn, Efp, E, rho, R, Jn, Jp, J}`. 401점 기준 바이어스 한 점에 수 ms.
- 그리기: `SC.drawBands(ctx, box, {x, Ec, Ev, Ei, Ef|Efn,Efp, labels:true|'out'|false}, chartOpts)` — 선 끝에 E<sub>C</sub>·E<sub>V</sub>·E<sub>F</sub>·E<sub>Fn</sub>·E<sub>Fp</sub>·E<sub>i</sub> 라벨을 겹치지 않게 붙인다(`'out'`은 그림 영역 오른쪽 바깥, box 오른쪽에 ~40px 여백). 입자를 밴드 위에 그리면 `labels:false`로 그린 뒤 입자 다음에 `SC.bandLabels(ctx, ch, d)`를 불러 라벨이 가려지지 않게 한다. 선을 더 얹으려면 `chartOpts.extraSeries`. 직접 그린 밴드 그림에도 `SC.bandLabels(ctx, {Y, box}, d)`로 라벨만 붙일 수 있다. `SC.dot(ctx,x,y,'e'|'h',r)`(전자 빛나는 구·정공 빈 원, 스프라이트라 수백 개도 빠르다), `SC.ion(ctx,x,y,+1|−1,size)`(이온화 도너 ⊕·억셉터 ⊖), `SC.sci(v)` "3.2×10¹⁷", `SC.sciR(v, digits=2)` "3.2×10^{17}"(`PB.text`용; 유효 2자리라 1.04×10⁻⁷은 10⁻⁷이 된다 — 읽음 상자는 `SC.sciR(v, 3)`), `SC.sciH(v)` HTML 위첨자.

## 그림·시뮬레이터 품질 기준 (v2, 2026-11)

모든 그림과 실험은 이 기준을 따른다. MemoryBook·ProcessBook과 같은 키트다. DeviceBook 예시: `chapters/pn.html`의 그림 5-1(따로 있는 p·n의 밴드, 치수 화살표, 재질 띠), 그림 5-2(평형 밴드 휨, 공핍층, 이온·캐리어 띠). 다른 책의 예: `../memory/chapters/dram-cell.html` 그림 4-1과 `#sim-share`, `../process/chapters/*.html`의 단면 그림(MB → PB, `#mb-` → `#pb-`로 읽는다).

### 공통
- **겹침·넘침 금지.** 글자가 선·도형·다른 글자와 겹치거나 viewBox·상자 밖으로 나가면 안 된다. 라이트·다크·모바일(390px) 세 가지로 확인한다.
- **첨자는 진짜 첨자로.** `E_F`, `V_bi`, `N_A`, `n_i`, `E꜀`처럼 쓰지 않는다. HTML은 `<sub>`, SVG는 `E<tspan dy="3" class="sub">C</tspan>`(뒤에 글자가 이어지면 `<tspan dy="-3">…</tspan>`로 되돌린다), 캔버스는 `PB.text(ctx, "E_{Fn}", …)`.
- 색은 의미로 쓴다: 전자·E<sub>C</sub>는 `--electron`/`--band-c`(파랑), 정공·E<sub>V</sub>는 `--hole`/`--band-v`(빨강), 페르미 준위는 `--fermi`(청록 점선), `--accent` 이 그림의 주인공(내부 전위, 강조 치수), `--accent-2` 비교·보조, `--ok/--warn/--bad` 판정, 나머지는 `--text-dim`·`--border` 계열. 한 그림에 강조색은 두세 가지까지.
- 글자 크기: SVG 본문 13px(`.t`), 보조 11.5~12px, 제목 13~15px 굵게. 패널이 여러 개면 `.fig-panels`로 나눠 좁은 화면에서 한 줄씩 쌓이게 한다(각 svg에 `style="flex:<viewBox 폭> 1 <viewBox 폭>px"`). 넓은 단일 그림(viewBox 폭 ≥ 560)은 모바일에서 72 % 크기로 옆으로 밀어 보게 된다. 모든 그림에 확대 단추가 자동으로 붙는다(`data-nozoom`으로 끔).

### 밴드 다이어그램 (SVG)
- 에너지는 위가 높다. 선: `.s-ec`(E<sub>C</sub>), `.s-ev`(E<sub>V</sub>), `.s-ef`(E<sub>F</sub>, 점선), `.s-ei`(E<sub>i</sub>, 점점선), `.s-efn`·`.s-efp`(준페르미 준위), `.s-vac`(진공 준위 E<sub>0</sub>).
- 띠 영역 음영: `.f-cb`(E<sub>C</sub> 위 전도대), `.f-vb`(E<sub>V</sub> 아래 가전자대), 공핍층 `.f-dep`(경계는 `.ext` 점선).
- 라벨은 선 오른쪽 끝의 라벨 열에 `.t-ec .t-ev .t-ef .t-ei`로 쓰고(글자 기준선 = 선 y + 4), 서로 14px 이상 떨어지게 한다. 선 위에 글자를 얹지 않는다.
- 캐리어·이온은 기호를 쓴다: `<use href="#pb-e" x y/>`(전자, 빛나는 파란 구), `#pb-h`(정공, 빈 빨간 원), `#pb-don`(이온화 도너 ⊕, 고정 양전하), `#pb-acc`(이온화 억셉터 ⊖, 고정 음전하), 작은 점 `#pb-e-sm`·`#pb-h-sm`. 전자는 E<sub>C</sub> 바로 위, 정공은 E<sub>V</sub> 바로 아래에 둔다. 흐름 화살표는 `.arr-e`·`.arr-h`, 페르미 준위 관련 `.arr-ef`.
- 에너지 차이(qV<sub>bi</sub>, qχ, qφ, E<sub>g</sub>)는 `.dimline`(양쪽 화살촉) 또는 강조색 `class="arr-a" marker-start="url(#pb-ah-a)"`, 기준선 연장은 `.ext`.
- 소자 구조와 밴드를 함께 보이면 좋다: 밴드 아래에 재질 띠(`.m-p`·`.m-n`, 접합 `.junc`)를 같은 x 축으로 그린다(그림 5-2).

### SVG 그림 도구 (`css/style.css` + `js/common.js`가 문서에 넣는 `#pb-*` defs)
- **재질**: `.m-<재질>`(위→아래 음영 + 경계선), `.mc-<재질>`(원기둥 음영). `si`(실리콘), 도핑 `nm`·`n`·`np`(n⁻·n·n⁺), `pm`·`p`·`pp`(p⁻·p·p⁺), `ox`(SiO₂), `nit`(Si₃N₄, `.m-sin`도 같음), `poly`, `pr`, `w`, `cu`, `al`, `tin`, `hk`(HfO₂), `sil`(실리사이드), `epi`(SiGe), 화합물 `ge`·`gaas`·`algaas`·`ingaas`·`inp`·`gan`·`algan`·`sic`(같은 계열은 밴드갭이 넓을수록 옅다), 접촉 금속 `metal`·`au`, 패키징 `die`·`sol`·`mold`·`pcb`, `glass`. 단색은 `var(--m-si)` 등. 소자 단면은 반드시 재질 클래스를 쓴다(라이트·다크 색이 자동으로 맞는다). p–n 접합선은 `.junc`.
- **선·화살표**: `.arr`(기본), `.arr-t .arr-a .arr-a2 .arr-ok .arr-warn .arr-bad .arr-blue .arr-red .arr-e .arr-h .arr-ef`, 양쪽 화살촉 `.arr2`. 치수선 `.dimline`, 보조선 `.ext`, 점선 `.dash`. 주석 지시선 `.lead`(끝점에 점), `.lead-a`. 회로 배선 `.wire2`, 접점 `.node`, 단자 `.node-o`.
- **면**: `.card`(그림자 상자), `.chip`, `.chip-a`, `.chip-a2`, `.f-ok/.f-warn/.f-bad`(+`-soft`), 무늬 `.p-hatch .p-dots .p-grid`.
- **글자**: `.t .t-dim .t-mono .t-acc .t-acc2 .t-faint .t-ok .t-warn .t-bad .t-el .t-ho`, 굵기 `.t-b .t-sb`, 크기 `.t-xs .t-sm .t-lg .t-xl`, 정렬 `.t-c .t-e`, 어두운 재질 위 흰 글자 `.t-inv`, 배경 테두리 `.t-halo`. 예전 `.lbl*`·`.f-e/.f-h/.f-n/.f-p`·`.s-dash`는 호환용으로만 남아 있다.
- 주석은 도형 위에 직접 쓰기보다 바깥 열에 정렬하고 `.lead`로 가리킨다. 지시선끼리 교차하지 않게 위에서 아래로 순서를 맞춘다. 회로 기호는 표준 모양(MOSFET 게이트·채널, 다이오드 삼각형+막대, BJT 화살표, 커패시터 두 판)으로 그린다.

### 캔버스 시뮬레이터
- 글자는 `PB.text(ctx, s, x, y, {size, weight, mono, color, align, baseline, halo})`로 그린다(첨자: `_`/`^` 뒤 글자·숫자 묶음, 숫자로 시작하면 숫자만, 여러 글자는 `_{…}`, 부호 위첨자 `n^+`·`p^-`, `cm^{-3}`). **align/baseline을 주지 않으면 ctx의 현재 값을 따른다.**
- 차트는 `PB.chart`: `legend: true`(데이터를 가리지 않는 모서리 자동, 네 모서리를 다 곡선이 지나면 `legend: 'above'` — 그림 영역 위 바깥 한 줄, box 위에 줄당 ~18px 여백; 반환값 `legend`는 그린 범례 자리 `{x,y,w,h}`) + 시리즈 `label`, `fill: true`(그라데이션), `dots`, `bands`/`hbands`(그림 영역 안으로 잘린다), 로그 축 10ⁿ 눈금·보조 격자 자동. **`hover: true`** + `PB.canvas(…, {hover: true})`면 십자선과 값 상자가 뜬다(그리기 함수가 난수를 쓰면 켜지 말 것; 스냅백·사이리스터처럼 x가 단조가 아닌 곡선은 보간이 틀리므로 그 시리즈에 `hover: false`). 차트 안 모서리에 `fillText`로 제목을 얹지 말고 범례나 축 제목을 쓴다. 선 끝 이름은 `PB.endLabels`. 라벨 자리: `bands[].labelPos:'bottom'`, `hlines[].labelPos:'below'`(띠 이름은 선 위에 그려진다). 차트 위 덧그림은 `after(ctx, ch)` 옵션에서 그리면 범례·hover 상자에 가려지지 않는다.
- 밴드는 `SC.drawBands`(라벨 자동), 캐리어는 `SC.dot`, 이온은 `SC.ion`.
- 캔버스 공간을 비워 두지 않는다. 그림이 영역을 채우고, 빈 아래쪽이 생기면 aspect·minHeight를 줄인다. 모바일(폭 < 520px)에서는 패널을 세로로 쌓는다.
- 값이 바뀔 때 도형이 순간이동하지 않게 `PB.approach`로 짧게 따라가게 하면 인과가 잘 보인다. 상태가 멈추면 rAF도 멈춘다.
- 판정·상태는 색만이 아니라 글자로도 보여 준다(색각 이상 대비).

### 3D (three.js)
- head에서 `RoomEnvironment.js`(`three@0.147.0/examples/js/environments/RoomEnvironment.js`)를 불러오면 금속에 환경 반사가 생긴다. 재질은 `metalness`·`roughness`로 구분한다. 색 관리는 sRGB다.
- 라벨은 `T.label`이 겹치지 않게 비켜서 지시선을 긋는다(`L.priority`, `L.setText`). `T.fit(group)`, `T.ground(y, size)`, `T.edges(mesh)`, `T.pick(objs, {click, hover})`.

## 점검
`node tools/check.mjs chapters/<slug>.html` — 360px·1280px에서 JS 오류, 가로 넘침, 빈 캔버스를 검사한다(Playwright 필요). CDN이 막힌 환경이면 `CDN_DIR`로 KaTeX·three.js 사본을 지정한다.
