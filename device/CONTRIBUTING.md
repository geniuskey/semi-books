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
각 챕터 `<head>`에는 아래 표식만 두고 `python3 tools/head.py`를 실행한다. 제목·번호는 `js/common.js`의 `CHAPTERS`에서 읽고, canonical·OG·JSON-LD·사이트맵·`index.html`의 `hasPart`를 함께 갱신한다.
```html
<!--head:start {"desc": "한 문장 설명", "libs": ["semi", "three"]}-->
<!--head:end-->
```
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
- `PB.canvas(el, draw(ctx,w,h), {aspect, minHeight, maxHeight})` → `{redraw, w, h, ctx, canvas}` — 리사이즈·테마 변경 시 자동 다시 그림.
- `PB.chart(ctx, box|null, {x:[a,b], y:[a,b], logX, logY, xLabel, yLabel, xFmt, yFmt, series:[{data:[[x,y]], color, width, dash, fill}], vlines, hlines, points, bands})` → `{X, Y, box}`.
- `PB.range(id, fmt, cb)` → getter(`.set(v)`), `PB.seg(id, cb)`, `PB.stat(id, html)`, `PB.loop(el, (dt,t)=>{})` (보일 때만 도는 rAF 루프), `PB.three(el, opts)`.
- `PB.palette()`, `PB.color(name)`, `PB.font(px, mono, weight)`, `PB.fmt`, `PB.si`, `PB.erf/erfc`, `PB.rng(seed)`, `PB.randn()`, `PB.poisson`, `PB.debounce`, `PB.clamp/lerp/map`, `PB.wl2rgb(nm)`.
- 캔버스 포인터 상호작용은 `pointerdown/move/up` + `canvas.setPointerCapture`, `touch-action: none`(스타일)로 모바일 드래그를 지원한다.

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
- 그리기: `SC.drawBands(ctx, box, {x, Ec, Ev, Ei, Ef|Efn,Efp}, chartOpts)`, `SC.dot(ctx,x,y,'e'|'h',r)`, `SC.sci(v)` "3.2×10¹⁷", `SC.sciH(v)` HTML 위첨자.

## 점검
`node tools/check.mjs chapters/<slug>.html` — 360px·1280px에서 JS 오류, 가로 넘침, 빈 캔버스를 검사한다(Playwright 필요). CDN이 막힌 환경이면 `CDN_DIR`로 KaTeX·three.js 사본을 지정한다.
