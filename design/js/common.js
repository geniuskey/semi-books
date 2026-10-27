/* Copyright (c) 2026 geniuskey and DesignBook contributors.
   Executable code: MIT (see ../LICENSE-MIT).
   Educational content and illustrations: CC-BY-4.0 (see ../LICENSE.md). */
/* ==========================================================================
   DesignBook 공통 스크립트 — 전역 객체 PB (ProcessBook과 같은 API)
   - 레이아웃(상단바, 목차, 이전/다음, 테마) 자동 생성
   - 시뮬레이터 헬퍼: canvas, chart, range, seg, 색/난수/포맷, three.js 씬
   이 파일은 <head>에서 defer 없이 로드된다. 페이지 스크립트는 </body> 직전에 둔다.
   ========================================================================== */
(function () {
  "use strict";

  const CHAPTERS = [
    { slug: "overview",  num: "01", title: "칩 설계 흐름 개요",        desc: "사양에서 마스크까지. RTL → 합성 → P&R → 타이밍 → 물리 검증 → OPC → 마스크로 이어지는 흐름과 PPA, PDK의 큰 그림.", tags: ["기초", "sim"] },
    { slug: "rtl",       num: "02", title: "RTL과 기능 검증",          desc: "Verilog로 하드웨어를 적는다. 조합·순차 논리, 클럭과 레지스터, 시뮬레이션 파형과 테스트벤치.", tags: ["프런트엔드", "sim"] },
    { slug: "synthesis", num: "03", title: "논리 합성",               desc: "불 대수 최적화와 기술 매핑. 진리표가 표준 셀 넷리스트가 되기까지, 면적과 지연의 맞바꿈.", tags: ["프런트엔드", "sim"] },
    { slug: "stdcell",   num: "04", title: "표준 셀과 레이아웃",        desc: "인버터·NAND 한 개의 레이아웃을 레이어별로 뜯어 본다. 각 사각형이 ProcessBook의 어떤 공정·마스크가 되는지.", tags: ["핵심", "sim"] },
    { slug: "place",     num: "05", title: "플로어플랜과 배치",         desc: "다이 크기, 전원망, 행(row)과 셀 배치. 배선 길이를 줄이는 배치 알고리즘을 직접 돌려 본다.", tags: ["백엔드", "sim"] },
    { slug: "cts",       num: "06", title: "클럭 트리 합성",            desc: "수십만 개 플립플롭에 같은 순간 클럭을. H-트리, 버퍼 삽입, 스큐와 지연의 균형.", tags: ["백엔드", "sim"] },
    { slug: "route",     num: "07", title: "배선",                    desc: "격자 위 미로 탐색(Lee 알고리즘), 혼잡도와 우회, 금속층 방향과 비아. 배선이 칩 면적을 정한다.", tags: ["백엔드", "sim"] },
    { slug: "timing",    num: "08", title: "정적 타이밍 분석",          desc: "셋업·홀드, 슬랙, 임계 경로. 셀 지연 표(NLDM)와 엘모어 배선 지연, PVT 코너.", tags: ["사인오프", "sim"] },
    { slug: "power",     num: "09", title: "전력과 신뢰성",            desc: "동적·누설 전력, 클럭 게이팅과 전압 스케일링, 전원망 IR 드롭과 전자 이동.", tags: ["사인오프", "sim"] },
    { slug: "signoff",   num: "10", title: "물리 검증: DRC · LVS",     desc: "설계 규칙의 근거(노광·식각·CMP)와 규칙 검사, 레이아웃과 회로도 비교, 밀도와 안테나 규칙.", tags: ["사인오프", "sim"] },
    { slug: "opc",       num: "11", title: "OPC와 리소그래피 친화 설계", desc: "그린 대로 찍히지 않는다. 공중상과 근접 효과, 규칙·모델 기반 OPC, 세리프·해머헤드·SRAF.", tags: ["DFM", "sim"] },
    { slug: "mask",      num: "12", title: "테이프아웃과 마스크 제작",   desc: "GDS에서 레티클까지. 레이어→마스크 대응, 분할(fracturing)과 전자빔 묘화, 마스크 수와 비용.", tags: ["제조 인계", "sim"] },
    { slug: "lab",       num: "13", title: "레이아웃 실험실",           desc: "레이어를 골라 사각형을 그리면 DRC가 실시간으로 검사하고, 자른 선의 공정 단면이 그려지는 샌드박스.", tags: ["샌드박스", "sim"] },
    { slug: "flow",      num: "14", title: "칩 하나 끝까지",           desc: "식 한 줄을 써서 합성·배치·배선·타이밍·DRC·LVS·마스크·GDS까지 한 화면에서 끝낸다. 진짜 GDSII 파일을 내려받는다.", tags: ["종합 실습", "sim"] },
    { slug: "arcade",    num: "15", title: "도전 과제",               desc: "타이밍 맞추기, 배선 퍼즐, DRC 위반 찾기, 멀티 패터닝 색칠. 점수와 배지로 실력을 겨룬다.", tags: ["게임", "sim"] },
    { slug: "glossary",  num: "16", title: "용어집 & 종합 퀴즈",        desc: "핵심 설계 용어를 검색하고, 종합 퀴즈로 실력을 점검하자.", tags: ["정리"] },
  ];
  /** 시리즈의 다른 책 */
  const SERIES = [
    { name: "ProcessBook", sub: "반도체 제조 공정 교과서", url: "https://semi.euiyun.com/process/" },
    { name: "DesignBook", sub: "반도체 설계 교과서", url: "https://semi.euiyun.com/design/", self: true },
  ];

  const PB = (window.PB = {});
  PB.CHAPTERS = CHAPTERS;
  PB.SERIES = SERIES;
  /** ProcessBook 챕터 링크: PB.pbook('litho') */
  PB.PBOOK = "https://semi.euiyun.com/process/";
  PB.pbook = (slug) => PB.PBOOK + (slug ? "chapters/" + slug + ".html" : "");

  /* ------------------------------------------------------------ math utils */
  PB.clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  PB.lerp = (a, b, t) => a + (b - a) * t;
  PB.map = (x, a, b, c, d) => c + ((x - a) * (d - c)) / (b - a);
  PB.randn = function () {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  PB.poisson = function (lambda) {
    if (lambda <= 0) return 0;
    if (lambda > 40) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * PB.randn()));
    const L = Math.exp(-lambda);
    let k = 0, p = 1;
    do { k++; p *= Math.random(); } while (p > L);
    return k - 1;
  };
  /** 숫자 포맷: 유효 자리 */
  PB.fmt = function (x, digits = 3) {
    if (!isFinite(x)) return "—";
    if (x === 0) return "0";
    const a = Math.abs(x);
    if (a >= 1e5 || a < 1e-3) return x.toExponential(digits - 1).replace("e+", "e");
    return Number(x.toPrecision(digits)).toLocaleString("en-US", { maximumFractionDigits: 6 });
  };
  /** SI 접두사 포맷: PB.si(2.3e-9,'m') → "2.3 nm" */
  PB.si = function (x, unit = "", digits = 3) {
    if (!isFinite(x)) return "—";
    if (x === 0) return "0 " + unit;
    const pre = [[1e12, "T"], [1e9, "G"], [1e6, "M"], [1e3, "k"], [1, ""], [1e-3, "m"], [1e-6, "µ"], [1e-9, "n"], [1e-12, "p"], [1e-15, "f"]];
    const a = Math.abs(x);
    for (const [v, p] of pre) if (a >= v * 0.9995) return Number((x / v).toPrecision(digits)) + " " + p + unit;
    return x.toExponential(digits - 1) + " " + unit;
  };

  /** 이진 접두사 바이트 포맷: PB.bytes(3*2**30) → "3 GiB" (bin=false면 10진 GB) */
  PB.bytes = function (x, digits = 3, bin = true) {
    if (!isFinite(x)) return "—";
    const base = bin ? 1024 : 1000, units = bin ? ["B", "KiB", "MiB", "GiB", "TiB", "PiB"] : ["B", "KB", "PB", "GB", "TB", "PB"];
    let i = 0, a = Math.abs(x);
    while (a >= base * 0.9995 && i < units.length - 1) { a /= base; i++; }
    return Number((Math.sign(x) * a).toPrecision(digits)) + " " + units[i];
  };
  /** 정수 → 2진 문자열 (자리수 고정): PB.bin(5,4) → "0101" */
  PB.bin = (n, width = 8) => (n >>> 0).toString(2).padStart(width, "0").slice(-width);

  /** 오차 함수 (Abramowitz–Stegun 7.1.26, |ε| < 1.5e-7) */
  PB.erf = function (x) {
    const s = Math.sign(x); x = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * x);
    const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  };
  PB.erfc = (x) => 1 - PB.erf(x);
  /** 캔버스 글꼴 문자열: PB.font(12) / PB.font(11, true) */
  PB.font = function (px, mono, weight) {
    const cs = getComputedStyle(document.body);
    return (weight ? weight + " " : "") + px + "px " + (mono ? cs.getPropertyValue("--mono") : cs.getPropertyValue("--font"));
  };
  /** 호출을 묶어 마지막 한 번만 실행 */
  PB.debounce = function (fn, ms = 120) { let t = 0; return function () { const a = arguments; clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); }; };
  /** 정규 난수 시드 고정용 간단 PRNG (mulberry32) */
  PB.rng = function (seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  PB.kB = 8.617333e-5; // eV/K

  /* ------------------------------------------------------------ physics consts */
  PB.C = { h: 6.62607015e-34, c: 2.99792458e8, q: 1.602176634e-19, k: 1.380649e-23, eps0: 8.8541878128e-12, hbar: 1.054571817e-34, me: 9.1093837015e-31 };

  /** 파장(nm) → [r,g,b] 0..255 (가시광 380~780, 밖은 어두운 색) */
  PB.wl2rgbArr = function (nm) {
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
  PB.wl2rgb = function (nm, alpha = 1) {
    const [r, g, b] = PB.wl2rgbArr(nm);
    return alpha === 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;
  };

  /* ------------------------------------------------------------ theme */
  const themeCbs = [];
  PB.onTheme = (cb) => themeCbs.push(cb);
  PB.isDark = function () {
    const t = document.documentElement.getAttribute("data-theme");
    if (t) return t === "dark";
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  };
  /** CSS 변수 값 읽기: PB.color('accent') */
  PB.color = function (name) {
    return getComputedStyle(document.documentElement).getPropertyValue("--" + name).trim();
  };
  /** 자주 쓰는 색 묶음 (테마 변경 시 다시 호출할 것) */
  PB.palette = function () {
    const c = PB.color;
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
   *   const cv = PB.canvas(el, (ctx,w,h)=>{...}, {aspect:0.5, maxHeight: 420});
   *   cv.redraw(); cv.ctx; cv.w; cv.h
   */
  PB.canvas = function (canvas, draw, opts = {}) {
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
        ctx.fillStyle = PB.color("canvas-bg");
        ctx.fillRect(0, 0, st.w, st.h);
      }
      try { draw && draw(ctx, st.w, st.h); } finally { ctx.restore(); }
    };
    st.resize = resize;
    if (window.ResizeObserver) {
      let lastW = -1;
      new ResizeObserver(() => { const w = canvas.parentElement.clientWidth; if (w !== lastW) { lastW = w; resize(); } }).observe(canvas.parentElement);
    } else window.addEventListener("resize", resize);
    PB.onTheme(() => st.redraw());
    resize();
    return st;
  };

  /**
   * 화면에 보일 때만 도는 애니메이션 루프. fn(dt초, t초)
   *   const loop = PB.loop(el, (dt,t)=>{...}); loop.stop(); loop.start();
   */
  PB.loop = function (el, fn) {
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
  PB.chart = function (ctx, box, opts) {
    const P = PB.palette();
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
    if (opts.yLabel) { ctx.save(); ctx.translate(14, box.y + box.h / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(opts.yLabel, 0, 0); ctx.restore(); }
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
   *   const get = PB.range('wl', v => v+' nm', v => redraw());  get() → 현재 값(Number)
   */
  PB.range = function (id, fmt, onInput) {
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
   *   const mode = PB.seg('mode', v => redraw());  mode() → 현재 값
   */
  PB.seg = function (id, onChange) {
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
  /** 통계 표시: PB.stat('snr', '32.1 dB') → id 요소의 textContent 설정(HTML 허용) */
  PB.stat = function (id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; };

  /* ------------------------------------------------------------ three.js helper */
  /**
   * three.js 씬 준비 (전역 THREE, THREE.OrbitControls 필요).
   *   const T = PB.three(containerEl, { camera:[x,y,z], target:[x,y,z], fov:40, autoRotate:false });
   *   T.scene, T.camera, T.renderer, T.controls, T.THREE
   *   T.onFrame((dt,t)=>{...});   T.label('텍스트', new THREE.Vector3(...)) → HTML 라벨(자동 투영)
   *   T.material(color, opts)  → MeshStandardMaterial 헬퍼
   * 조명(환경광+방향광 2개), 리사이즈, 화면 밖 일시정지, 테마 대응 포함.
   */
  PB.three = function (container, opts = {}) {
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
    T.loop = PB.loop(container, (dt, t) => {
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


  /* ------------------------------------------------------------ 학습 진행 · 배지 (브라우저 저장소) */
  const PKEY = "db-progress";
  const BADGES = [
    { id: "first", icon: "🚀", name: "첫 걸음", desc: "아무 장이나 하나 열기", test: (p) => Object.keys(p.v).length >= 1 },
    { id: "explorer", icon: "🧭", name: "시뮬레이터 탐험가", desc: "서로 다른 시뮬레이터 20개 써 보기", test: (p) => simCount(p) >= 20 },
    { id: "tinker", icon: "🔧", name: "만지작 장인", desc: "시뮬레이터 40개 써 보기", test: (p) => simCount(p) >= 40 },
    { id: "quiz", icon: "🎯", name: "퀴즈 명사수", desc: "장 퀴즈 30문항 맞히기", test: (p) => quizRight(p) >= 30 },
    { id: "allch", icon: "📚", name: "완독", desc: "모든 장 열어 보기", test: (p) => CHAPTERS.every((c) => p.v[c.slug]) },
    { id: "cell", icon: "🧱", name: "셀 해부학자", desc: "4장 시뮬레이터 6개 모두 써 보기", test: (p) => Object.keys(p.s.stdcell || {}).length >= 6 },
    { id: "bridge", icon: "🌉", name: "설계 ↔ 제조", desc: "레이아웃을 ProcessBook 공정 엔진으로 넘기기", test: (p) => !!p.e.pbook },
    { id: "tapeout", icon: "💾", name: "테이프아웃", desc: "14장에서 GDSII 파일 내려받기", test: (p) => !!p.e.gds },
    { id: "lvs", icon: "✅", name: "LVS 통과", desc: "13장 실험실에서 DRC·LVS를 모두 통과", test: (p) => !!p.e.labclean },
    { id: "timing", icon: "⏱️", name: "타이밍 클로저", desc: "타이밍 퍼즐 3단계 모두 슬랙 ≥ 0", test: (p) => (p.g.timing || 0) >= 3 },
    { id: "router", icon: "🧵", name: "배선 장인", desc: "배선 퍼즐 5판 해결", test: (p) => (p.g.route || 0) >= 5 },
    { id: "hunter", icon: "🔍", name: "DRC 사냥꾼", desc: "DRC 찾기에서 한 판 만점", test: (p) => !!p.g.drcperfect },
    { id: "color", icon: "🎨", name: "멀티 패터닝 분해사", desc: "색칠 퍼즐 4단계 모두 해결", test: (p) => (p.g.color || 0) >= 4 },
  ];
  function simCount(p) { return Object.values(p.s).reduce((a, o) => a + Object.keys(o).length, 0); }
  function quizRight(p) { return Object.values(p.q).reduce((a, o) => a + Object.values(o).filter(Boolean).length, 0); }
  function pload() { try { const o = JSON.parse(localStorage.getItem(PKEY) || "{}"); return Object.assign({ v: {}, s: {}, q: {}, g: {}, e: {}, b: {}, n: {} }, o); } catch (e) { return { v: {}, s: {}, q: {}, g: {}, e: {}, b: {}, n: {} }; } }
  function psave(p) { try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch (e) {} }
  function checkBadges(p) {
    const fresh = BADGES.filter((b) => !p.b[b.id] && b.test(p));
    fresh.forEach((b) => (p.b[b.id] = Date.now()));
    if (fresh.length) { psave(p); fresh.forEach((b, i) => setTimeout(() => toast(b.icon + " 배지 획득: <b>" + b.name + "</b><br><small>" + b.desc + "</small>"), i * 900)); }
  }
  function toast(html) {
    if (!document.body) return;
    let box = document.getElementById("pb-toasts");
    if (!box) { box = document.createElement("div"); box.id = "pb-toasts"; document.body.appendChild(box); }
    const t = document.createElement("div"); t.className = "pb-toast"; t.innerHTML = html; box.appendChild(t);
    setTimeout(() => t.classList.add("in"), 20); setTimeout(() => { t.classList.remove("in"); setTimeout(() => t.remove(), 400); }, 3800);
  }
  PB.BADGES = BADGES;
  PB.toast = toast;
  PB.progress = function () { return pload(); };
  PB.progressStats = function (p) { p = p || pload(); return { visited: Object.keys(p.v).length, sims: simCount(p), quiz: quizRight(p), badges: Object.keys(p.b).length }; };
  /** PB.track('e','gds') 이벤트 · PB.track('g','route', n) 게임 최고 기록(큰 값 유지) */
  PB.track = function (kind, key, val) {
    const p = pload();
    if (kind === "e") p.e[key] = val == null ? true : val;
    else if (kind === "g") { if (typeof val === "boolean") p.g[key] = p.g[key] || val; else p.g[key] = Math.max(p.g[key] || 0, val || 0); }
    psave(p); checkBadges(p);
  };
  PB.resetProgress = function () { try { localStorage.removeItem(PKEY); } catch (e) {} };
  function trackPage(slug) {
    const p = pload();
    if (slug) { p.v[slug] = (p.v[slug] || 0) + 1; p.n[slug] = [document.querySelectorAll(".sim").length, document.querySelectorAll(".quiz-q").length]; }
    psave(p); checkBadges(p);
    let simT = 0;
    const touch = (e) => {
      const sim = e.target.closest && e.target.closest(".sim"); if (!sim || !slug) return;
      const id = sim.id || "sim" + [...document.querySelectorAll(".sim")].indexOf(sim);
      const q = pload(); q.s[slug] = q.s[slug] || {}; if (q.s[slug][id]) return;
      q.s[slug][id] = 1; psave(q); clearTimeout(simT); simT = setTimeout(() => checkBadges(pload()), 300);
    };
    document.addEventListener("input", touch, true); document.addEventListener("click", touch, true);
    document.addEventListener("answered", (e) => {
      if (!slug) return;
      const qs = [...document.querySelectorAll(".quiz-q")], i = qs.indexOf(e.target);
      const q = pload(); q.q[slug] = q.q[slug] || {}; if (q.q[slug][i] == null) q.q[slug][i] = !!e.detail.correct; psave(q); checkBadges(q);
    });
    document.addEventListener("click", (e) => { const a = e.target.closest && e.target.closest('a[href*="processbook.euiyun.com/chapters/lab.html#r="]'); if (a) PB.track("e", "pbook"); }, true);
  }

  /* ------------------------------------------------------------ layout build */
  const LOGO = `<svg class="mark" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="pbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent-2)"/></linearGradient></defs><rect x="2" y="2" width="28" height="28" rx="8" fill="url(#pbg)"/><path d="M6 7.5h20M6 24.5h20" stroke="#fff" stroke-width="2.2"/><rect x="9" y="11" width="14" height="4" rx="1" fill="#fff" opacity=".45"/><rect x="9" y="17.5" width="14" height="4" rx="1" fill="#fff" opacity=".45"/><path d="M14 9.5v13M18 9.5v13" stroke="#fff" stroke-width="1.8"/><circle cx="11.5" cy="13" r="1.1" fill="#fff"/><circle cx="20.5" cy="19.5" r="1.1" fill="#fff"/></svg>`;
  const ICON_MENU = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>`;
  const ICON_MOON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`;
  const ICON_SUN = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`;

  function build() {
    const body = document.body;
    const root = body.dataset.root != null ? body.dataset.root : body.dataset.chapter ? "../" : "";
    const curSlug = body.dataset.chapter || "";
    const href = (slug) => (slug ? `${root}chapters/${slug}.html` : `${root}index.html`);
    const feedbackUrl = "https://books.euiyun.com/feedback.html?book=designbook&page=" + encodeURIComponent(location.href);

    // favicon
    if (!document.querySelector('link[rel="icon"]')) { const fi = document.createElement("link"); fi.rel = "icon"; fi.type = "image/svg+xml"; fi.href = root + "favicon.svg"; document.head.appendChild(fi); }

    // top bar
    const bar = document.createElement("header");
    bar.className = "pb-topbar";
    bar.innerHTML = `
      <button class="pb-btn icon" id="pb-menu" aria-label="챕터 목록">${ICON_MENU}</button>
      <a class="pb-logo" href="${href("")}">${LOGO}<span>DesignBook <small>반도체 설계 교과서</small></span></a>
      <span class="spacer"></span>
      <a class="pb-btn series-link" href="https://books.euiyun.com/" aria-label="전체 책 보기" title="전체 책 보기"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5h6v14H4zM10 5.5h6v14h-6zM17 7l3-1 2 13-3 1z"/></svg><span>전체 책</span></a>
      <a class="pb-btn pb-prog" id="pb-prog" href="${href("arcade")}#progress" title="학습 진행 · 배지">🏅 <span id="pb-prog-n">0</span></a>
      <button class="pb-btn icon" id="pb-theme" aria-label="테마 전환"></button>
      <div class="pb-progress" id="pb-progress"></div>`;
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
    drawer.className = "pb-drawer";
    drawer.innerHTML = `<h4>Chapters</h4><ul class="pb-chlist">
      <li><a href="${href("")}" class="${curSlug ? "" : "active"}"><span class="num">00</span><span>홈 · 로드맵</span></a></li>
      ${CHAPTERS.map((c) => `<li><a href="${href(c.slug)}" class="${c.slug === curSlug ? "active" : ""}"><span class="num">${c.num}</span><span>${c.title}</span></a></li>`).join("")}
    </ul>
    <h4 style="margin-top:22px">Book Series</h4><ul class="pb-chlist">
      ${SERIES.map((b) => `<li><a href="${b.self ? href("") : b.url}" class="${b.self ? "self" : ""}"><span class="num">${b.self ? "●" : "↗"}</span><span>${b.name} <small style="color:var(--text-faint)">${b.sub}</small></span></a></li>`).join("")}
    </ul>`;
    const backdrop = document.createElement("div");
    backdrop.className = "pb-drawer-backdrop";
    body.append(backdrop, drawer);
    const toggleDrawer = (o) => body.classList.toggle("drawer-open", o);
    bar.querySelector("#pb-menu").addEventListener("click", () => toggleDrawer(true));
    backdrop.addEventListener("click", () => toggleDrawer(false));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") toggleDrawer(false); });

    // theme toggle
    const tbtn = bar.querySelector("#pb-theme");
    const setIcon = () => (tbtn.innerHTML = PB.isDark() ? ICON_SUN : ICON_MOON);
    setIcon();
    tbtn.addEventListener("click", () => {
      const next = PB.isDark() ? "light" : "dark";
      try { localStorage.setItem("semi-theme", next); } catch (e) {}
      applyTheme(next); setIcon();
    });

    trackPage(curSlug);
    const pn = bar.querySelector("#pb-prog-n"); const st0 = PB.progressStats(); pn.textContent = st0.badges + "/" + BADGES.length;
    // progress
    const prog = bar.querySelector("#pb-progress");
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
      // numbered h2 + TOC
      const layout = document.createElement("div");
      layout.className = "pb-layout";
      main.parentNode.insertBefore(layout, main);
      layout.appendChild(main);
      const toc = document.createElement("aside");
      toc.className = "pb-toc";
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
      pager.className = "pb-pager";
      pager.innerHTML =
        (prev ? `<a class="prev" href="${href(prev.slug)}"><small>← 이전 · ${prev.num}</small>${prev.title}</a>` : `<a class="prev" href="${href("")}"><small>← 처음으로</small>홈 · 로드맵</a>`) +
        (next ? `<a class="next" href="${href(next.slug)}"><small>다음 · ${next.num} →</small>${next.title}</a>` : "");
      layout.after(pager);
    }
    const foot = document.createElement("footer");
    foot.className = "pb-foot";
    foot.innerHTML = `DesignBook — 공학도를 위한 인터랙티브 반도체 설계 교과서 · 수치는 교육용 근사 모델입니다.<br>
      시리즈: <a href="${PB.PBOOK}">ProcessBook · 제조 공정</a> · <a href="${href("")}">DesignBook · 설계</a><br>
      © 2026 geniuskey 및 DesignBook 기여자 · 콘텐츠 <a rel="license" href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a> · 코드 <a href="${root}LICENSE-MIT">MIT</a> · <a href="${root}LICENSE.md">라이선스 안내</a>`;
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

// Simulator deep links: add a shareable # link to each simulator heading.
(function () {
  function addSimulatorLinks() {
    document.querySelectorAll(".sim[id] > .sim-head").forEach((head) => {
      if (head.querySelector(".sim-link")) return;
      const link = document.createElement("a");
      link.className = "sim-link";
      link.href = "#" + head.parentElement.id;
      link.textContent = "#";
      link.title = "이 시뮬레이터로 가는 링크";
      link.setAttribute("aria-label", "이 시뮬레이터로 가는 링크");
      head.appendChild(link);
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addSimulatorLinks, { once: true });
  } else {
    addSimulatorLinks();
  }
})();

// Series glossary tooltips (same runtime across independently deployed books).
(function () {
  const base = new URL(".", document.currentScript.src);
  window.BOOK_GLOSSARY_CONFIG = { dataUrl: new URL("glossary-data.js", base).href };
  const script = document.createElement("script");
  script.src = new URL("glossary-tooltips.js", base).href;
  document.head.append(script);
})();
