/* Copyright (c) 2026 geniuskey and ChipIndustryBook contributors.
   Executable code: MIT (see ../LICENSE-MIT).
   Educational content and illustrations: CC-BY-4.0 (see ../LICENSE.md). */
/* ==========================================================================
   ChipIndustryBook 공통 스크립트 — 전역 객체 CB
   - 레이아웃(상단바, 목차, 이전/다음, 테마) 자동 생성
   - 시뮬레이터 헬퍼: canvas, chart, range, seg, drag, 색/난수/포맷, three.js 씬
   이 파일은 <head>에서 defer 없이 로드된다. 페이지 스크립트는 </body> 직전에 둔다.
   ========================================================================== */
(function () {
  "use strict";

  // stage: 가치사슬 단계(STAGES의 인덱스). 지리·정책처럼 가로지르는 장은 생략한다.
  const STAGES = [
    { key: "ip",     name: "설계 도구·IP", en: "EDA & IP",      seg: "ip" },
    { key: "design", name: "칩 설계",      en: "Fabless",       seg: "design" },
    { key: "supply", name: "장비·소재",    en: "Equip & Mat",   seg: "equip" },
    { key: "fab",    name: "웨이퍼 제조",  en: "Fabrication",   seg: "fab" },
    { key: "atp",    name: "패키징·테스트", en: "Assembly & Test", seg: "atp" },
    { key: "market", name: "시장",         en: "End market",    seg: "mkt" },
  ];

  const CHAPTERS = [
    { slug: "overview",    num: "01",           title: "칩 한 개가 지나는 길",          desc: "스마트폰 속 칩 하나가 설계 도구, 설계, 장비·소재, 제조, 패키징, 시장을 거쳐 손에 오기까지. 산업 지도 전체를 한 번에 펼친다.", tags: ["지도", "sim"] },
    { slug: "market",      num: "02",           title: "시장의 크기와 모양",            desc: "연 6천억 달러를 넘는 시장. 제품별·지역별·응용별로 쪼개 보고, 40년 매출 곡선과 상위 기업 순위가 어떻게 바뀌어 왔는지 본다.", tags: ["시장", "sim"] },
    { slug: "cycle",       num: "03",           title: "실리콘 사이클",                desc: "호황과 불황이 3~5년마다 돈다. 공장을 짓는 데 걸리는 2년, 재고와 채찍 효과, 메모리 가격의 거미집을 직접 돌려 본다.", tags: ["경제", "sim"] },
    { slug: "business",    num: "04",           title: "사업 모델: IDM, 팹리스, 파운드리", desc: "공장을 가질 것인가 빌릴 것인가. 고정비와 가동률, 손익분기, 팹라이트와 파운드리 분업이 생긴 이유.", tags: ["경제", "sim"] },
    { slug: "eda-ip",      num: "05", stage: 0, title: "설계 도구와 IP",              desc: "칩 설계의 연필과 레고 블록. EDA 3사의 과점, Arm의 라이선스·로열티 모델, RISC-V, 검증 비용이 설계를 지배하는 이유.", tags: ["설계", "sim"] },
    { slug: "fabless",     num: "06", stage: 1, title: "팹리스와 칩 설계의 경제학",    desc: "설계비 수억 달러를 몇 개를 팔아 회수하는가. NRE와 판매량, 다이 크기와 가격 결정, GPU·AP·모뎀 팹리스의 지형.", tags: ["설계", "sim"] },
    { slug: "equipment",   num: "07", stage: 2, title: "장비: 팹을 채우는 기계",       desc: "팹 투자비의 4분의 3이 장비다. 노광·증착·식각·검사 장비와 그 과점 구조, EUV 한 대의 무게와 값, 장비 주문이 사이클을 앞서는 이유.", tags: ["공급망", "sim"] },
    { slug: "materials",   num: "08", stage: 2, title: "소재와 부품",                 desc: "웨이퍼, 특수 가스, 포토레지스트, 습식 화학. 작은 시장이지만 하나라도 끊기면 팹이 선다. 집중도와 공급 차질 시뮬레이션.", tags: ["공급망", "sim"] },
    { slug: "foundry",     num: "09", stage: 3, title: "파운드리와 팹의 경제학",       desc: "팹 하나 200억 달러. 웨이퍼 원가의 구성, 다이 원가 계산기, 노드별 웨이퍼 가격, 선단 공정의 승자 독식.", tags: ["제조", "sim"] },
    { slug: "memory",      num: "10", stage: 3, title: "메모리 산업",                 desc: "DRAM 세 회사, NAND 다섯 회사. 비트 성장과 가격 탄력, 치킨 게임의 역사, HBM이 바꾼 판도.", tags: ["제조", "sim"] },
    { slug: "packaging",   num: "11", stage: 4, title: "패키징·테스트와 칩렛",        desc: "후공정이 다시 앞으로 나왔다. OSAT 지형, 2.5D·3D 패키징 용량 병목, 칩렛으로 쪼개면 원가가 왜 내려가는가.", tags: ["후공정", "sim"] },
    { slug: "demand",      num: "12", stage: 5, title: "수요: 칩은 어디로 가는가",     desc: "스마트폰, PC, 데이터센터, 자동차, 산업. 기기 한 대의 칩 함량과 AI 가속기 한 장의 원가 분해.", tags: ["시장", "sim"] },
    { slug: "geography",   num: "13",           title: "공급망의 지리",                desc: "단계마다 다른 나라가 1등이다. 지역별 점유율, 칩 한 개가 국경을 넘는 횟수, 한 지역이 멈추면 무엇이 서는가.", tags: ["지리", "sim"] },
    { slug: "geopolitics", num: "14",           title: "정책과 지정학",                desc: "수출 통제, 보조금, 자급률. 팹을 어디에 짓느냐에 따라 원가가 얼마나 달라지고, 규제가 공급망을 어떻게 다시 그리는가.", tags: ["정책", "sim"] },
    { slug: "korea",       num: "15",           title: "한국 반도체",                  desc: "메모리 세계 1위와 시스템 반도체의 숙제. 수출의 5분의 1, 클러스터, 소부장, 팹리스 생태계의 지도.", tags: ["지역", "sim"] },
    { slug: "lab",         num: "16",           title: "산업 실험실",                  desc: "반도체 회사를 직접 경영한다. 사이클 속에서 언제 팹을 짓고, 어떤 노드에 걸고, 누구와 손잡을지 결정하는 종합 시뮬레이터.", tags: ["실험실", "sim"] },
    { slug: "glossary",    num: "17",           title: "용어집 & 종합 퀴즈",           desc: "산업 용어와 회사 이름을 검색하고, 종합 퀴즈로 지도를 머릿속에 그려 보자.", tags: ["정리"] },
  ];
  const CB = (window.CB = {});
  CB.CHAPTERS = CHAPTERS;
  CB.STAGES = STAGES;

  /* ------------------------------------------------------------ math utils */
  CB.clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  CB.lerp = (a, b, t) => a + (b - a) * t;
  CB.map = (x, a, b, c, d) => c + ((x - a) * (d - c)) / (b - a);
  CB.randn = function () {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  CB.poisson = function (lambda) {
    if (lambda <= 0) return 0;
    if (lambda > 40) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * CB.randn()));
    const L = Math.exp(-lambda);
    let k = 0, p = 1;
    do { k++; p *= Math.random(); } while (p > L);
    return k - 1;
  };
  /** 숫자 포맷: 유효 자리 */
  CB.fmt = function (x, digits = 3) {
    if (!isFinite(x)) return "—";
    if (x === 0) return "0";
    const a = Math.abs(x);
    if (a >= 1e5 || a < 1e-3) return x.toExponential(digits - 1).replace("e+", "e");
    return Number(x.toPrecision(digits)).toLocaleString("en-US", { maximumFractionDigits: 6 });
  };
  /** SI 접두사 포맷: CB.si(2.3e-9,'m') → "2.3 nm" */
  CB.si = function (x, unit = "", digits = 3) {
    if (!isFinite(x)) return "—";
    if (x === 0) return "0 " + unit;
    const pre = [[1e12, "T"], [1e9, "G"], [1e6, "M"], [1e3, "k"], [1, ""], [1e-3, "m"], [1e-6, "µ"], [1e-9, "n"], [1e-12, "p"], [1e-15, "f"]];
    const a = Math.abs(x);
    for (const [v, p] of pre) if (a >= v * 0.9995) return Number((x / v).toPrecision(digits)) + " " + p + unit;
    return x.toExponential(digits - 1) + " " + unit;
  };


  /** 오차 함수 (Abramowitz–Stegun 7.1.26, |ε| < 1.5e-7) */
  CB.erf = function (x) {
    const s = Math.sign(x); x = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * x);
    const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  };
  CB.erfc = (x) => 1 - CB.erf(x);
  /** 캔버스 글꼴 문자열: CB.font(12) / CB.font(11, true) */
  CB.font = function (px, mono, weight) {
    const cs = getComputedStyle(document.body);
    return (weight ? weight + " " : "") + px + "px " + (mono ? cs.getPropertyValue("--mono") : cs.getPropertyValue("--font"));
  };
  /** 호출을 묶어 마지막 한 번만 실행 */
  CB.debounce = function (fn, ms = 120) { let t = 0; return function () { const a = arguments; clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); }; };
  /** 정규 난수 시드 고정용 간단 PRNG (mulberry32) */
  CB.rng = function (seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  CB.kB = 8.617333e-5; // eV/K

  /* ------------------------------------------------------------ physics consts */
  CB.C = { h: 6.62607015e-34, c: 2.99792458e8, q: 1.602176634e-19, k: 1.380649e-23, eps0: 8.8541878128e-12, hbar: 1.054571817e-34, me: 9.1093837015e-31 };

  /** 파장(nm) → [r,g,b] 0..255 (가시광 380~780, 밖은 어두운 색) */
  CB.wl2rgbArr = function (nm) {
    let r = 0, g = 0, b = 0;
    if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; b = 1; }
    else if (nm < 490 && nm >= 440) { g = (nm - 440) / 50; b = 1; }
    else if (nm < 510 && nm >= 490) { g = 1; b = -(nm - 510) / 20; }
    else if (nm < 580 && nm >= 510) { r = (nm - 510) / 70; g = 1; }
    else if (nm < 645 && nm >= 580) { r = 1; g = -(nm - 645) / 65; }
    else if (nm <= 780 && nm >= 645) { r = 1; }
    let f = 0;
    if (nm >= 380 && nm < 420) f = 0.3 + (0.7 * (nm - 380)) / 40;
    else if (nm >= 420 && nm <= 700) f = 1;
    else if (nm > 700 && nm <= 780) f = 0.3 + (0.7 * (780 - nm)) / 80;
    const gm = 0.8;
    const c = (v) => Math.round(255 * Math.pow(v * f, gm));
    if (nm < 380) return [110, 60, 160];   // UV: 보라 계열 표시용
    if (nm > 780) return [120, 30, 30];    // IR: 어두운 적색 표시용
    return [c(r), c(g), c(b)];
  };
  CB.wl2rgb = function (nm, alpha = 1) {
    const [r, g, b] = CB.wl2rgbArr(nm);
    return alpha === 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;
  };

  /* ------------------------------------------------------------ industry helpers */
  /** 금액 포맷(입력 단위: 십억 달러). CB.usd(627) → "$627B", CB.usd(0.85) → "$850M", CB.usd(1520) → "$1.52T" */
  CB.usd = function (b, digits = 3) {
    if (!isFinite(b)) return "—";
    const a = Math.abs(b), sgn = b < 0 ? "−" : "";
    if (a >= 1000) return sgn + "$" + Number((a / 1000).toPrecision(digits)) + "T";
    if (a >= 1) return sgn + "$" + Number(a.toPrecision(digits)).toLocaleString("en-US") + "B";
    if (a >= 0.001) return sgn + "$" + Number((a * 1000).toPrecision(digits)) + "M";
    return sgn + "$" + Number((a * 1e6).toPrecision(digits)).toLocaleString("en-US") + "K";
  };
  /** 퍼센트: CB.pct(0.234) → "23.4%" */
  CB.pct = (x, d = 1) => (isFinite(x) ? (x * 100).toFixed(d) + "%" : "—");
  /** 가치사슬 단계 색: ip design equip mat fab mem atp mkt */
  CB.segColor = (k) => CB.color("seg-" + k) || CB.color("text-dim");
  /** 지역 색: us tw kr jp cn eu nl other */
  CB.regionColor = (k) => CB.color("rg-" + k) || CB.color("rg-other");
  /** "#rrggbb" 또는 rgb() 색에 투명도 */
  CB.alpha = function (c, a) {
    c = (c || "").trim();
    if (c[0] === "#") { const h = c.length === 4 ? c.slice(1).split("").map((x) => x + x).join("") : c.slice(1, 7); return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`; }
    const m = c.match(/rgba?\(([^)]+)\)/); if (m) { const p = m[1].split(",").slice(0, 3).join(","); return `rgba(${p},${a})`; }
    return c;
  };
  /**
   * 캔버스 위 떠 있는 정보 상자. const tip = CB.tip(canvas); tip.show(x, y, html); tip.hide();
   * x, y는 캔버스 CSS px. 부모(.sim-view)는 position: relative.
   */
  CB.tip = function (canvas) {
    if (typeof canvas === "string") canvas = document.querySelector(canvas);
    const el = document.createElement("div");
    el.className = "cb-tip";
    canvas.parentElement.appendChild(el);
    return {
      el,
      show(x, y, html) {
        el.innerHTML = html; el.classList.add("on");
        const pw = canvas.parentElement.clientWidth, w = el.offsetWidth, h = el.offsetHeight;
        let left = x + 14, top = y + 14;
        if (left + w > pw - 4) left = Math.max(4, x - w - 14);
        if (top + h > canvas.clientHeight - 4) top = Math.max(4, y - h - 10);
        el.style.left = left + "px"; el.style.top = top + "px";
      },
      hide() { el.classList.remove("on"); },
    };
  };
  /** 둥근 사각형 경로 */
  CB.rrect = function (ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  };
  /** 상자 폭에 맞춰 글자를 줄바꿈해 그린다(공백 기준). 그린 줄 수를 돌려준다 */
  CB.wrapText = function (ctx, text, x, y, maxW, lineH, maxLines = 9) {
    const words = String(text).split(/(\s+)/); let line = "", n = 0;
    const flush = () => { ctx.fillText(line.trim(), x, y + n * lineH); n++; line = ""; };
    for (const w of words) {
      if (ctx.measureText(line + w).width <= maxW || !line) { line += w; continue; }
      if (n >= maxLines - 1) { line += w; break; }
      flush(); line = w.trimStart();
    }
    if (line && n < maxLines) flush();
    return n;
  };

  /* ------------------------------------------------------------ theme */
  const themeCbs = [];
  CB.onTheme = (cb) => themeCbs.push(cb);
  CB.isDark = function () {
    const t = document.documentElement.getAttribute("data-theme");
    if (t) return t === "dark";
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  };
  /** CSS 변수 값 읽기: CB.color('accent') */
  CB.color = function (name) {
    return getComputedStyle(document.documentElement).getPropertyValue("--" + name).trim();
  };
  /** 자주 쓰는 색 묶음 (테마 변경 시 다시 호출할 것) */
  CB.palette = function () {
    const c = CB.color;
    return {
      bg: c("canvas-bg"), text: c("text"), dim: c("text-dim"), faint: c("text-faint"),
      grid: c("grid"), axis: c("axis"), border: c("border"), surface: c("surface"),
      accent: c("accent"), accent2: c("accent-2"), ok: c("ok"), warn: c("warn"), bad: c("bad"),
      red: c("red"), green: c("green"), blue: c("blue"),
      // 데이터 시리즈용 기본 순서
      series: [c("accent"), c("accent-2"), c("warn"), c("ok"), c("bad"), c("text-dim")],
    };
  };
  function applyTheme(t) {
    if (t) document.documentElement.setAttribute("data-theme", t);
    else document.documentElement.removeAttribute("data-theme");
    themeCbs.forEach((cb) => { try { cb(); } catch (e) { console.error(e); } });
  }
  try { const saved = localStorage.getItem("semi-theme"); if (saved) document.documentElement.setAttribute("data-theme", saved); } catch (e) {}
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
      if (!document.documentElement.getAttribute("data-theme")) applyTheme(null);
    });
  }

  /* ------------------------------------------------------------ canvas helper */
  /**
   * HiDPI 캔버스. 폭은 부모 폭을 따르고 높이는 aspect(높이/폭) 또는 height(px)로 결정.
   * draw(ctx, w, h)는 리사이즈·테마 변경 시 자동 호출된다. 애니메이션이면 직접 redraw() 호출.
   *   const cv = CB.canvas(el, (ctx,w,h)=>{...}, {aspect:0.5, maxHeight: 420});
   *   cv.redraw(); cv.ctx; cv.w; cv.h
   */
  CB.canvas = function (canvas, draw, opts = {}) {
    if (typeof canvas === "string") canvas = document.querySelector(canvas);
    const ctx = canvas.getContext("2d");
    const st = { ctx, w: 0, h: 0, canvas, dpr: 1 };
    function resize() {
      const parent = canvas.parentElement;
      const w = Math.max(200, Math.floor(opts.width || parent.clientWidth || 600));
      let h = opts.height || Math.round(w * (opts.aspect || 0.5));
      if (opts.minHeight) h = Math.max(h, opts.minHeight);
      if (opts.maxHeight) h = Math.min(h, opts.maxHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      st.w = w; st.h = h; st.dpr = dpr;
      st.redraw();
    }
    st.redraw = function () {
      if (!st.w) return;
      ctx.save();
      ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
      if (!opts.noClear) {
        ctx.clearRect(0, 0, st.w, st.h);
        ctx.fillStyle = canvas.closest(".sim-view.scope") ? "#0b0d12" : CB.color("canvas-bg");
        ctx.fillRect(0, 0, st.w, st.h);
      }
      try { draw && draw(ctx, st.w, st.h); } finally { ctx.restore(); }
    };
    st.resize = resize;
    if (window.ResizeObserver) {
      let lastW = -1;
      new ResizeObserver(() => { const w = canvas.parentElement.clientWidth; if (w !== lastW) { lastW = w; resize(); } }).observe(canvas.parentElement);
    } else window.addEventListener("resize", resize);
    CB.onTheme(() => st.redraw());
    resize();
    return st;
  };

  /**
   * 화면에 보일 때만 도는 애니메이션 루프. fn(dt초, t초)
   *   const loop = CB.loop(el, (dt,t)=>{...}); loop.stop(); loop.start();
   */
  CB.loop = function (el, fn) {
    let raf = 0, last = 0, t = 0, visible = true, running = true;
    function frame(ts) {
      raf = 0;
      if (!running || !visible) return;
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016;
      last = ts; t += dt;
      fn(dt, t);
      raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && running && visible) { last = 0; raf = requestAnimationFrame(frame); } }
    if (window.IntersectionObserver && el) {
      new IntersectionObserver((es) => { visible = es[0].isIntersecting; kick(); }).observe(el);
    }
    kick();
    return {
      start() { running = true; kick(); },
      stop() { running = false; },
      get running() { return running; },
      toggle() { running ? (running = false) : ((running = true), kick()); return running; },
    };
  };

  /* ------------------------------------------------------------ chart helper */
  /**
   * 간단한 선 그래프. box = {x,y,w,h}(생략 시 캔버스 전체에 여백 자동)
   * opts: { x:[min,max], y:[min,max], logX, logY, xLabel, yLabel, xTicks, yTicks,
   *         xFmt, yFmt, series:[{data:[[x,y],...], color, width, dash, fill, label}],
   *         vlines:[{x,color,label,dash}], hlines:[{y,color,label,dash}], points:[{x,y,color,r,label}],
   *         bands:[{x0,x1,color}] }
   * 반환: { X(v)->px, Y(v)->px, box }
   */
  CB.chart = function (ctx, box, opts) {
    const P = CB.palette();
    const dpr = (ctx.getTransform && ctx.getTransform().a) || 1;
    const W = ctx.canvas.width / dpr, H = ctx.canvas.height / dpr;
    if (!box) box = { x: 58, y: 16, w: W - 58 - 18, h: H - 16 - 46 };
    const [x0, x1] = opts.x, [y0, y1] = opts.y;
    const lx = (v) => (opts.logX ? Math.log10(v) : v);
    const ly = (v) => (opts.logY ? Math.log10(v) : v);
    const X = (v) => box.x + ((lx(v) - lx(x0)) / (lx(x1) - lx(x0))) * box.w;
    const Y = (v) => box.y + box.h - ((ly(v) - ly(y0)) / (ly(y1) - ly(y0))) * box.h;
    const ticks = (a, b, log, n) => {
      if (log) { const out = []; for (let e = Math.ceil(Math.log10(a) - 1e-9); e <= Math.log10(b) + 1e-9; e++) out.push(Math.pow(10, e)); return out; }
      const span = b - a, raw = span / (n || 5), mag = Math.pow(10, Math.floor(Math.log10(raw)));
      const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= (n || 5) + 0.5) || raw;
      const out = []; for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + step * 1e-6; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
      return out;
    };
    const defFmt = (v) => (Math.abs(v) >= 1e4 || (Math.abs(v) < 1e-2 && v !== 0) ? v.toExponential(0).replace("e+", "e") : String(Number(v.toPrecision(4))));
    const xFmt = opts.xFmt || defFmt, yFmt = opts.yFmt || defFmt;
    ctx.save();
    ctx.font = "11px " + getComputedStyle(document.body).getPropertyValue("--mono");
    ctx.lineWidth = 1;
    // bands
    (opts.bands || []).forEach((b) => { ctx.fillStyle = b.color; ctx.fillRect(X(b.x0), box.y, X(b.x1) - X(b.x0), box.h); });
    // grid + ticks
    const xt = opts.xTicks || ticks(x0, x1, opts.logX, 6);
    const yt = opts.yTicks || ticks(y0, y1, opts.logY, 5);
    ctx.strokeStyle = P.grid; ctx.fillStyle = P.dim;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    xt.forEach((v) => { const px = X(v); if (px < box.x - 1 || px > box.x + box.w + 1) return; ctx.beginPath(); ctx.moveTo(px, box.y); ctx.lineTo(px, box.y + box.h); ctx.stroke(); ctx.fillText(xFmt(v), px, box.y + box.h + 6); });
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    yt.forEach((v) => { const py = Y(v); if (py < box.y - 1 || py > box.y + box.h + 1) return; ctx.beginPath(); ctx.moveTo(box.x, py); ctx.lineTo(box.x + box.w, py); ctx.stroke(); ctx.fillText(yFmt(v), box.x - 6, py); });
    ctx.strokeStyle = P.axis;
    ctx.beginPath(); ctx.moveTo(box.x, box.y); ctx.lineTo(box.x, box.y + box.h); ctx.lineTo(box.x + box.w, box.y + box.h); ctx.stroke();
    // labels
    ctx.fillStyle = P.dim; ctx.font = "12px " + getComputedStyle(document.body).getPropertyValue("--font");
    if (opts.xLabel) { ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText(opts.xLabel, box.x + box.w / 2, box.y + box.h + 40); }
    if (opts.yLabel) { ctx.save(); ctx.translate(box.x - 44, box.y + box.h / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(opts.yLabel, 0, 0); ctx.restore(); }
    // clip plot area
    ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y - 2, box.w + 2, box.h + 4); ctx.clip();
    (opts.series || []).forEach((s, i) => {
      if (!s.data || !s.data.length) return;
      ctx.strokeStyle = s.color || P.series[i % P.series.length];
      ctx.lineWidth = s.width || 2; ctx.setLineDash(s.dash || []);
      ctx.beginPath();
      let started = false;
      s.data.forEach(([x, y]) => { if (!isFinite(y) || (opts.logY && y <= 0) || (opts.logX && x <= 0)) { started = false; return; } const px = X(x), py = Y(y); started ? ctx.lineTo(px, py) : ctx.moveTo(px, py); started = true; });
      ctx.stroke();
      if (s.fill) {
        ctx.lineTo(X(s.data[s.data.length - 1][0]), Y(opts.logY ? y0 : Math.max(y0, 0)));
        ctx.lineTo(X(s.data[0][0]), Y(opts.logY ? y0 : Math.max(y0, 0)));
        ctx.closePath(); ctx.fillStyle = s.fill; ctx.fill();
      }
      ctx.setLineDash([]);
    });
    (opts.vlines || []).forEach((l) => { ctx.strokeStyle = l.color || P.faint; ctx.setLineDash(l.dash || [4, 4]); ctx.lineWidth = l.width || 1.2; ctx.beginPath(); ctx.moveTo(X(l.x), box.y); ctx.lineTo(X(l.x), box.y + box.h); ctx.stroke(); ctx.setLineDash([]); if (l.label) { ctx.fillStyle = l.color || P.dim; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(l.label, X(l.x) + 4, box.y + 4); } });
    (opts.hlines || []).forEach((l) => { ctx.strokeStyle = l.color || P.faint; ctx.setLineDash(l.dash || [4, 4]); ctx.lineWidth = l.width || 1.2; ctx.beginPath(); ctx.moveTo(box.x, Y(l.y)); ctx.lineTo(box.x + box.w, Y(l.y)); ctx.stroke(); ctx.setLineDash([]); if (l.label) { ctx.fillStyle = l.color || P.dim; ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText(l.label, box.x + box.w - 4, Y(l.y) - 3); } });
    (opts.points || []).forEach((p) => { ctx.fillStyle = p.color || P.accent; ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), p.r || 4, 0, Math.PI * 2); ctx.fill(); if (p.label) { ctx.fillStyle = P.text; ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.fillText(p.label, X(p.x) + 6, Y(p.y) - 4); } });
    ctx.restore();
    ctx.restore();
    return { X, Y, box };
  };

  /* ------------------------------------------------------------ controls */
  /**
   * range 입력 바인딩. output은 id+"-out" 요소 또는 <output for=id>.
   *   const get = CB.range('wl', v => v+' nm', v => redraw());  get() → 현재 값(Number)
   */
  CB.range = function (id, fmt, onInput) {
    const el = typeof id === "string" ? document.getElementById(id) : id;
    const out = document.getElementById(el.id + "-out") || document.querySelector(`output[for="${el.id}"]`);
    const update = (fire) => {
      const v = Number(el.value);
      const pct = ((v - Number(el.min || 0)) / (Number(el.max || 100) - Number(el.min || 0))) * 100;
      el.style.setProperty("--fill", pct + "%");
      if (out) out.textContent = fmt ? fmt(v) : String(v);
      if (fire && onInput) onInput(v);
    };
    el.addEventListener("input", () => update(true));
    update(false);
    const get = () => Number(el.value);
    get.set = (v) => { el.value = v; update(true); };
    get.el = el;
    return get;
  };
  /**
   * 세그먼트 버튼: <div class="seg" id="mode"><button data-value="a" class="on">A</button>...</div>
   *   const mode = CB.seg('mode', v => redraw());  mode() → 현재 값
   */
  CB.seg = function (id, onChange) {
    const el = typeof id === "string" ? document.getElementById(id) : id;
    const btns = [...el.querySelectorAll("button")];
    let cur = (btns.find((b) => b.classList.contains("on")) || btns[0]).dataset.value;
    const set = (v, fire = true) => {
      cur = v;
      btns.forEach((b) => { const on = b.dataset.value === v; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
      if (fire && onChange) onChange(v);
    };
    btns.forEach((b) => b.addEventListener("click", () => set(b.dataset.value)));
    set(cur, false);
    const get = () => cur;
    get.set = set;
    return get;
  };
  /**
   * 캔버스 위 끌기(마우스·터치). 좌표는 CSS px.
   *   CB.drag(cv.canvas, { start(x, y, e) {}, move(x, y, e) {}, end() {}, hover(x, y, e) {} });
   * 누르는 순간 start와 move가 한 번씩 불린다. 끄는 동안 페이지 스크롤은 막힌다.
   */
  CB.drag = function (canvas, on) {
    if (typeof canvas === "string") canvas = document.querySelector(canvas);
    canvas.classList.add("drag");
    let act = false;
    const pos = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    canvas.addEventListener("pointerdown", (e) => { act = true; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} const [x, y] = pos(e); if (on.start) on.start(x, y, e); if (on.move) on.move(x, y, e); e.preventDefault(); });
    canvas.addEventListener("pointermove", (e) => { const [x, y] = pos(e); if (act) { if (on.move) on.move(x, y, e); } else if (on.hover) on.hover(x, y, e); });
    const up = () => { if (act) { act = false; if (on.end) on.end(); } };
    canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
  };
  /** 통계 표시: CB.stat('snr', '32.1 dB') → id 요소의 textContent 설정(HTML 허용) */
  CB.stat = function (id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; };

  /* ------------------------------------------------------------ three.js helper */
  /**
   * three.js 씬 준비 (전역 THREE, THREE.OrbitControls 필요).
   *   const T = CB.three(containerEl, { camera:[x,y,z], target:[x,y,z], fov:40, autoRotate:false });
   *   T.scene, T.camera, T.renderer, T.controls, T.THREE
   *   T.onFrame((dt,t)=>{...});   T.label('텍스트', new THREE.Vector3(...)) → HTML 라벨(자동 투영)
   *   T.material(color, opts)  → MeshStandardMaterial 헬퍼
   * 조명(환경광+방향광 2개), 리사이즈, 화면 밖 일시정지, 테마 대응 포함.
   */
  CB.three = function (container, opts = {}) {
    if (typeof container === "string") container = document.querySelector(container);
    if (!window.THREE) { container.innerHTML = '<p style="padding:20px;color:var(--text-dim)">3D 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인하세요.</p>'; return null; }
    const THREE = window.THREE;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(opts.fov || 40, 1, 0.01, 2000);
    camera.position.set(...(opts.camera || [6, 5, 8]));
    const controls = THREE.OrbitControls ? new THREE.OrbitControls(camera, renderer.domElement) : null;
    if (controls) {
      controls.target.set(...(opts.target || [0, 0, 0]));
      controls.enableDamping = true; controls.dampingFactor = 0.08;
      controls.autoRotate = !!opts.autoRotate; controls.autoRotateSpeed = opts.autoRotateSpeed || 0.8;
      controls.enablePan = opts.pan !== false;
      if (opts.minDistance) controls.minDistance = opts.minDistance;
      if (opts.maxDistance) controls.maxDistance = opts.maxDistance;
      controls.update();
    } else camera.lookAt(...(opts.target || [0, 0, 0]));
    scene.add(new THREE.HemisphereLight(0xffffff, 0x445066, 0.75));
    const d1 = new THREE.DirectionalLight(0xffffff, 0.85); d1.position.set(5, 10, 7); scene.add(d1);
    const d2 = new THREE.DirectionalLight(0xbfd7ff, 0.35); d2.position.set(-6, 4, -5); scene.add(d2);

    const labelLayer = document.createElement("div");
    labelLayer.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden";
    container.appendChild(labelLayer);
    const labels = [];
    const frameCbs = [];
    const T = { THREE, scene, camera, renderer, controls, container, labels };
    T.onFrame = (cb) => frameCbs.push(cb);
    T.label = function (text, pos, cls) {
      const el = document.createElement("div");
      el.className = "overlay-label" + (cls ? " " + cls : "");
      el.innerHTML = text;
      labelLayer.appendChild(el);
      const L = { el, pos: pos.clone ? pos.clone() : new THREE.Vector3(...pos), visible: true, obj: null };
      L.setVisible = (v) => { L.visible = v; el.style.display = v ? "" : "none"; };
      L.remove = () => { el.remove(); labels.splice(labels.indexOf(L), 1); };
      labels.push(L);
      return L;
    };
    T.material = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.55, metalness: 0.05 }, o));
    function resize() {
      const w = container.clientWidth, h = container.clientHeight || 400;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = w + "px"; renderer.domElement.style.height = h + "px";
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    if (window.ResizeObserver) new ResizeObserver(resize).observe(container); else window.addEventListener("resize", resize);
    resize();
    const v = new THREE.Vector3();
    T.loop = CB.loop(container, (dt, t) => {
      frameCbs.forEach((cb) => cb(dt, t));
      if (controls) controls.update();
      renderer.render(scene, camera);
      const w = container.clientWidth, h = container.clientHeight;
      labels.forEach((L) => {
        if (!L.visible) return;
        v.copy(L.pos); if (L.obj) L.obj.localToWorld(v);
        v.project(camera);
        const behind = v.z > 1;
        L.el.style.display = behind ? "none" : "";
        L.el.style.left = ((v.x + 1) / 2) * w + "px";
        L.el.style.top = ((1 - v.y) / 2) * h + "px";
      });
    });
    return T;
  };

  /* ------------------------------------------------------------ layout build */
  const LOGO = `<svg class="mark" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="cbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent-2)"/></linearGradient></defs><rect x="2" y="2" width="28" height="28" rx="8" fill="url(#cbg)"/><path d="M9 10.5L16 8l7 4.5-2 8.5-8 2.5-4.5-6z" fill="none" stroke="#fff" stroke-width="1.6" stroke-linejoin="round" opacity=".85"/><path d="M16 8l-1.5 7.5L21 21M14.5 15.5L8.5 17.5M14.5 15.5L23 12.5" stroke="#fff" stroke-width="1.2" opacity=".6"/><g fill="#fff"><circle cx="9" cy="10.5" r="2"/><circle cx="16" cy="8" r="2"/><circle cx="23" cy="12.5" r="2"/><circle cx="21" cy="21" r="2"/><circle cx="13" cy="23.5" r="2"/><circle cx="8.5" cy="17.5" r="2"/><rect x="12" y="13" width="5" height="5" rx="1"/></g></svg>`;
  const ICON_SIM = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></svg>`;
  const ICON_GRID = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`;
  const ICON_MENU = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>`;
  const ICON_MOON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`;
  const ICON_SUN = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`;

  function build() {
    const body = document.body;
    const root = body.dataset.root != null ? body.dataset.root : body.dataset.chapter ? "../" : "";
    const curSlug = body.dataset.chapter || "";
    const href = (slug) => (slug ? `${root}chapters/${slug}.html` : `${root}index.html`);
    const feedbackUrl = "https://books.euiyun.com/feedback.html?book=chipindustrybook&page=" + encodeURIComponent(location.href);

    // favicon
    if (!document.querySelector('link[rel="icon"]')) { const fi = document.createElement("link"); fi.rel = "icon"; fi.type = "image/svg+xml"; fi.href = root + "favicon.svg"; document.head.appendChild(fi); }

    // top bar
    const bar = document.createElement("header");
    bar.className = "cb-topbar";
    bar.innerHTML = `
      <button class="cb-btn icon" id="cb-menu" aria-label="챕터 목록">${ICON_MENU}</button>
      <a class="cb-logo" href="${href("")}">${LOGO}<span>ChipIndustryBook <small>반도체 산업 지도</small></span></a>
      <span class="spacer"></span>
      <a class="cb-btn series-link" href="https://books.euiyun.com/" aria-label="전체 책 보기" title="전체 책 보기"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5h6v14H4zM10 5.5h6v14h-6zM17 7l3-1 2 13-3 1z"/></svg><span>전체 책</span></a>
      <a class="cb-btn" href="${root}sims.html" aria-label="시뮬레이터 갤러리" title="시뮬레이터 갤러리">${ICON_GRID}<span class="lbl-wide">시뮬레이터</span></a>
      ${curSlug ? `<button class="cb-btn toggle" id="cb-simonly" aria-pressed="false" title="글을 숨기고 시뮬레이터만 본다">${ICON_SIM}<span class="lbl-wide">시뮬레이터만</span></button>` : ""}
      <button class="cb-btn icon" id="cb-theme" aria-label="테마 전환"></button>
      <div class="cb-progress" id="cb-progress"></div>`;
    const feedbackButton = document.createElement("a");
    feedbackButton.className = bar.className.replace("-topbar", "-btn") + " icon feedback-button";
    feedbackButton.href = feedbackUrl;
    feedbackButton.target = "_blank";
    feedbackButton.rel = "noopener";
    feedbackButton.setAttribute("aria-label", "독자 의견 보내기");
    feedbackButton.title = "독자 의견 보내기";
    feedbackButton.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 4V6a2 2 0 0 1 2-2z"/><path d="M8 9h8M8 13h5"/></svg>';
    bar.querySelector("[id$='-theme']").before(feedbackButton);
    body.prepend(bar);

    // Search chapter metadata immediately; load section and visual titles on demand.
    const progressBar = bar.querySelector("[id$='-progress']");
    const spacer = bar.querySelector(".spacer");
    const leftNav = document.createElement("div");
    leftNav.className = "book-nav-left";
    leftNav.append(bar.querySelector("[id$='-menu']"), bar.querySelector("a[class$='-logo']"));
    const rightNav = document.createElement("div");
    rightNav.className = "book-nav-right";
    [...bar.children].filter((el) => el !== spacer && el !== progressBar).forEach((el) => rightNav.appendChild(el));
    spacer.remove();
    const search = document.createElement("div");
    search.className = "book-search";
    search.innerHTML = '<svg class="book-search-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg><input type="search" aria-label="이 책의 챕터, 섹션, 시뮬레이터, 그림 검색" placeholder="이 책 검색" autocomplete="off"><div class="book-search-results" aria-live="polite"></div>';
    bar.prepend(leftNav);
    bar.insertBefore(search, progressBar);
    bar.insertBefore(rightNav, progressBar);
    const searchInput = search.querySelector("input");
    const searchResults = search.querySelector(".book-search-results");
    const closeSearch = () => { search.classList.remove("open"); searchResults.replaceChildren(); };
    let detailEntries = [];
    let detailsLoaded = false;
    let detailPromise;
    function loadDetails() {
      if (detailPromise) return detailPromise;
      detailPromise = Promise.all(CHAPTERS.map(async (chapter) => {
        try {
          const response = await fetch(href(chapter.slug));
          if (!response.ok) return [];
          const doc = new DOMParser().parseFromString(await response.text(), "text/html");
          const main = doc.querySelector("main.chapter");
          if (!main) return [];
          // 미리 렌더링된 수식은 TeX 원문으로 되돌려 검색어와 맞춘다.
          main.querySelectorAll(".katex").forEach((k) => k.replaceWith(k.querySelector("annotation")?.textContent || k.textContent));
          const entries = [];
          [...main.querySelectorAll("section > h2")].forEach((heading, i) => {
            entries.push({ type: "섹션", title: heading.textContent.trim(), chapter, hash: heading.parentElement.id || `s${i + 1}` });
          });
          [...main.querySelectorAll(".sim")].filter((sim) => sim.querySelector(".sim-head h3")).forEach((sim, i) => {
            entries.push({ type: "시뮬레이터", title: sim.querySelector(".sim-head h3").textContent.trim(), chapter, hash: sim.id || `search-sim-${i + 1}` });
          });
          [...main.querySelectorAll("figure")].filter((figure) => figure.querySelector("figcaption")).forEach((figure, i) => {
            const caption = figure.querySelector("figcaption").textContent.replace(/\s+/g, " ").trim();
            entries.push({ type: "그림", title: caption.slice(0, 140), chapter, hash: figure.id || `search-fig-${i + 1}` });
          });
          return entries;
        } catch (error) { return []; }
      })).then((parts) => { detailEntries = parts.flat(); detailsLoaded = true; renderSearch(); });
      return detailPromise;
    }
    function renderSearch() {
      const words = searchInput.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
      searchResults.replaceChildren();
      if (!words.length) { closeSearch(); return; }
      const includesWords = (value) => words.every((word) => value.toLocaleLowerCase().includes(word));
      const chapterMatches = CHAPTERS.filter((c) => includesWords([c.num, c.title, c.desc, ...(c.tags || [])].join(" ")))
        .map((c) => ({ type: "챕터", title: c.title, chapter: c, hash: "" }));
      const detailMatches = detailEntries.filter((entry) => includesWords(entry.title));
      const matches = [
        ...chapterMatches.slice(0, 4),
        ...detailMatches.filter((entry) => entry.type === "섹션").slice(0, 5),
        ...detailMatches.filter((entry) => entry.type === "시뮬레이터").slice(0, 4),
        ...detailMatches.filter((entry) => entry.type === "그림").slice(0, 4),
      ];
      matches.forEach((entry) => {
        const link = document.createElement("a");
        link.href = href(entry.chapter.slug) + (entry.hash ? `#${entry.hash}` : "");
        const title = document.createElement("strong");
        title.textContent = entry.title;
        const context = document.createElement("small");
        context.textContent = `${entry.chapter.num} · ${entry.chapter.title} · ${entry.type}`;
        link.append(title, context);
        searchResults.appendChild(link);
      });
      if (chapterMatches.length + detailMatches.length > matches.length) {
        const more = document.createElement("p");
        more.textContent = `상위 ${matches.length}개 표시 · 검색어를 더 구체적으로 입력해 보세요`;
        searchResults.appendChild(more);
      }
      if (detailPromise && !detailsLoaded) {
        const status = document.createElement("p");
        status.textContent = "섹션·시뮬레이터·그림 목록을 불러오는 중…";
        searchResults.appendChild(status);
      } else if (!matches.length) {
        const empty = document.createElement("p");
        empty.textContent = "검색 결과가 없습니다";
        searchResults.appendChild(empty);
      }
      search.classList.add("open");
    }
    searchInput.addEventListener("input", () => { if (searchInput.value.trim()) loadDetails(); renderSearch(); });
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { closeSearch(); searchInput.blur(); }
      else if (e.key === "ArrowDown") { const first = searchResults.querySelector("a"); if (first) { e.preventDefault(); first.focus(); } }
      else if (e.key === "Enter") { const first = searchResults.querySelector("a"); if (first) { e.preventDefault(); first.click(); } }
    });
    searchResults.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { closeSearch(); searchInput.focus(); }
      else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const links = [...searchResults.querySelectorAll("a")];
        const next = links.indexOf(document.activeElement) + (e.key === "ArrowDown" ? 1 : -1);
        e.preventDefault();
        (links[next] || searchInput).focus();
      }
    });
    document.addEventListener("pointerdown", (e) => { if (!search.contains(e.target)) closeSearch(); });


    // drawer
    const drawer = document.createElement("nav");
    drawer.className = "cb-drawer";
    drawer.innerHTML = `<h4>Chapters</h4><ul class="cb-chlist">
      <li><a href="${href("")}" class="${curSlug ? "" : "active"}"><span class="num">00</span><span>홈 · 산업 지도</span></a></li>
      <li><a href="${root}sims.html" class="${body.dataset.page === "sims" ? "active" : ""}"><span class="num">▦</span><span>시뮬레이터 갤러리</span></a></li>
      ${CHAPTERS.map((c) => `<li><a href="${href(c.slug)}" class="${c.slug === curSlug ? "active" : ""}"><span class="num">${c.num}</span><span>${c.title}</span></a></li>`).join("")}
    </ul>`;
    const backdrop = document.createElement("div");
    backdrop.className = "cb-drawer-backdrop";
    body.append(backdrop, drawer);
    const toggleDrawer = (o) => body.classList.toggle("drawer-open", o);
    bar.querySelector("#cb-menu").addEventListener("click", () => toggleDrawer(true));
    backdrop.addEventListener("click", () => toggleDrawer(false));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") toggleDrawer(false); });

    // theme toggle
    const tbtn = bar.querySelector("#cb-theme");
    const setIcon = () => (tbtn.innerHTML = CB.isDark() ? ICON_SUN : ICON_MOON);
    setIcon();
    tbtn.addEventListener("click", () => {
      const next = CB.isDark() ? "light" : "dark";
      try { localStorage.setItem("semi-theme", next); } catch (e) {}
      applyTheme(next); setIcon();
    });

    // progress
    const prog = bar.querySelector("#cb-progress");
    const onScroll = () => { const h = document.documentElement.scrollHeight - innerHeight; prog.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + "%"; };
    addEventListener("scroll", onScroll, { passive: true }); onScroll();

    // chapter page extras
    const main = document.querySelector("main.chapter");
    if (main) {
      // Give search results stable anchors even when the source has no id.
      [...main.querySelectorAll(".sim")].filter((sim) => sim.querySelector(".sim-head h3")).forEach((sim, i) => { if (!sim.id) sim.id = `search-sim-${i + 1}`; });
      [...main.querySelectorAll("figure")].filter((figure) => figure.querySelector("figcaption")).forEach((figure, i) => { if (!figure.id) figure.id = `search-fig-${i + 1}`; });
      if (/^#(?:s\d+|search-(?:sim|fig)-)/.test(location.hash)) {
        requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView());
      }
      // 가치사슬 띠
      const curCh = CHAPTERS.find((c) => c.slug === curSlug);
      const hero = main.querySelector(".chapter-hero");
      if (hero && curCh && curSlug !== "glossary") {
        const first = (i) => CHAPTERS.find((c) => c.stage === i);
        const strip = document.createElement("nav");
        strip.className = "cb-stages";
        strip.setAttribute("aria-label", "가치사슬");
        strip.innerHTML = STAGES.map((st, i) => `<a href="${href(first(i).slug)}" class="${i === curCh.stage ? "cur" : ""}"${i === curCh.stage ? ' aria-current="step"' : ""}><b>${st.name}</b><small>${st.en}</small></a>`).join("");
        hero.after(strip);
      }
      // 시뮬레이터만 보기
      const banner = document.createElement("div");
      banner.className = "sim-only-banner";
      banner.innerHTML = "시뮬레이터만 보는 중입니다. 설명을 함께 보려면 상단의 <b>시뮬레이터만</b> 버튼을 다시 누르세요.";
      if (hero) hero.appendChild(banner);
      const sbtn = bar.querySelector("#cb-simonly");
      // 버튼으로 켠 상태는 기억하고, 갤러리 링크(?sims=1)로 들어온 경우는 그 페이지에만 적용한다
      const setSimOnly = (on, persist) => {
        body.classList.toggle("sim-only", on);
        if (sbtn) sbtn.setAttribute("aria-pressed", on);
        if (persist) try { localStorage.setItem("cb-simonly", on ? "1" : ""); } catch (e) {}
        window.dispatchEvent(new Event("resize"));
      };
      let simOnly = /[?&]sims?=1/.test(location.search);
      try { if (!simOnly) simOnly = localStorage.getItem("cb-simonly") === "1"; } catch (e) {}
      setSimOnly(simOnly, false);
      if (sbtn) sbtn.addEventListener("click", () => setSimOnly(!body.classList.contains("sim-only"), true));
      // 시뮬레이터마다 바로가기 링크
      main.querySelectorAll(".sim[id] > .sim-head").forEach((h) => {
        const a = document.createElement("a");
        a.className = "sim-link"; a.href = "#" + h.parentElement.id; a.textContent = "#"; a.title = "이 시뮬레이터로 가는 링크";
        h.appendChild(a);
      });
      const flash = () => { const t = location.hash && document.getElementById(location.hash.slice(1)); if (t && t.classList.contains("sim")) { t.classList.remove("flash"); void t.offsetWidth; t.classList.add("flash"); } };
      addEventListener("hashchange", flash);
      setTimeout(() => { const t = location.hash && document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView({ block: "start" }); flash(); }, 250);
      // numbered h2 + TOC
      const layout = document.createElement("div");
      layout.className = "cb-layout";
      main.parentNode.insertBefore(layout, main);
      layout.appendChild(main);
      const toc = document.createElement("aside");
      toc.className = "cb-toc";
      const h2s = [...main.querySelectorAll("section > h2")];
      let n = 0;
      toc.innerHTML = "<h4>ON THIS PAGE</h4>" + h2s.map((h, i) => {
        const sec = h.parentElement;
        if (!sec.id) sec.id = "s" + (i + 1);
        const numbered = !sec.classList.contains("keypoints") && !sec.classList.contains("quiz-sec") && !sec.hasAttribute("data-nonum");
        if (numbered && !h.querySelector(".h-num")) { n++; h.insertAdjacentHTML("afterbegin", `<span class="h-num">${String(n).padStart(2, "0")}</span>`); }
        // 제목 텍스트를 쓰되, 빌드가 렌더링한 수식은 마크업 그대로 옮긴다.
        const label = [...h.childNodes].filter((node) => !node.classList?.contains("h-num"))
          .map((node) => (node.querySelector?.(".katex") ? node.outerHTML : node.textContent)).join("").trim();
        return `<a href="#${sec.id}">${label}</a>`;
      }).join("");
      layout.appendChild(toc);
      const links = [...toc.querySelectorAll("a")];
      if (window.IntersectionObserver && h2s.length) {
        const io = new IntersectionObserver((es) => {
          es.forEach((e) => { if (e.isIntersecting) { links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id)); } });
        }, { rootMargin: "-20% 0px -70% 0px" });
        h2s.forEach((h) => io.observe(h.parentElement));
      }

      // pager
      const idx = CHAPTERS.findIndex((c) => c.slug === curSlug);
      const prev = idx > 0 ? CHAPTERS[idx - 1] : null;
      const next = idx >= 0 && idx < CHAPTERS.length - 1 ? CHAPTERS[idx + 1] : null;
      const pager = document.createElement("nav");
      pager.className = "cb-pager";
      pager.innerHTML =
        (prev ? `<a class="prev" href="${href(prev.slug)}"><small>← 이전 · ${prev.num}</small>${prev.title}</a>` : `<a class="prev" href="${href("")}"><small>← 처음으로</small>홈 · 산업 지도</a>`) +
        (next ? `<a class="next" href="${href(next.slug)}"><small>다음 · ${next.num} →</small>${next.title}</a>` : "");
      layout.after(pager);
    }
    const foot = document.createElement("footer");
    foot.className = "cb-foot";
    foot.innerHTML = `ChipIndustryBook — 만져 보며 읽는 반도체 산업 지도 · 수치는 공개 자료 기반 근사치이며 투자 조언이 아닙니다.<br>
      © 2026 geniuskey 및 ChipIndustryBook 기여자 · 콘텐츠 <a rel="license" href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a> · 코드 <a href="${root}LICENSE-MIT">MIT</a> · <a href="${root}LICENSE.md">라이선스 안내</a>`;
    const feedbackLink = document.createElement("a");
    feedbackLink.href = feedbackUrl;
    feedbackLink.target = "_blank";
    feedbackLink.rel = "noopener";
    feedbackLink.textContent = "독자 의견";
    foot.append(" · ", feedbackLink);
    body.appendChild(foot);

    // quiz
    document.querySelectorAll(".quiz-q").forEach((q) => {
      const opts = [...q.querySelectorAll("button.opt")];
      opts.forEach((b) => b.addEventListener("click", () => {
        opts.forEach((o) => { o.disabled = true; if (o.hasAttribute("data-correct")) o.classList.add("right"); });
        if (!b.hasAttribute("data-correct")) b.classList.add("wrong");
        q.classList.add("done");
        q.dispatchEvent(new CustomEvent("answered", { bubbles: true, detail: { correct: b.hasAttribute("data-correct") } }));
      }));
    });

    // KaTeX: 배포물의 수식은 빌드(tools/katex.mjs)가 미리 렌더링한다. 소스 파일을 바로 열었을 때만 CDN에서 불러와 렌더링한다.
    if (!document.querySelector(".katex") && /\\\(|\\\[|\$\$/.test(document.body.innerText)) {
      const KATEX = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/";
      const load = (tag, props) => new Promise((resolve, reject) => {
        const el = Object.assign(document.createElement(tag), props, { onload: resolve, onerror: reject });
        document.head.insertBefore(el, tag === "link" ? document.head.querySelector('link[rel="stylesheet"]') : null);
      });
      Promise.all([load("link", { rel: "stylesheet", href: KATEX + "katex.min.css" }), load("script", { src: KATEX + "katex.min.js" })])
        .then(() => load("script", { src: KATEX + "contrib/auto-render.min.js" }))
        .then(() => renderMathInElement(document.body, {
          delimiters: [{ left: "$$", right: "$$", display: true }, { left: "\\(", right: "\\)", display: false }, { left: "\\[", right: "\\]", display: true }],
          throwOnError: false,
          ignoredClasses: ["no-math"],
        }))
        .catch(() => {});
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();

// Series glossary tooltips (same runtime across independently deployed books).
(function () {
  const base = new URL(".", document.currentScript.src);
  window.BOOK_GLOSSARY_CONFIG = { dataUrl: new URL("glossary-data.js", base).href };
  const script = document.createElement("script");
  script.src = new URL("glossary-tooltips.js", base).href;
  document.head.append(script);
})();
