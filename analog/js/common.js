/* Copyright (c) 2026 geniuskey and AnalogBook contributors.
   Executable code: MIT (see ../LICENSE-MIT).
   Educational content and illustrations: CC-BY-4.0 (see ../LICENSE.md). */
/* ==========================================================================
   AnalogBook 공통 스크립트 — 전역 객체 AB
   - 레이아웃(상단바, 목차, 이전/다음, 테마) 자동 생성
   - 시뮬레이터 헬퍼: canvas, chart, range, seg, drag, 색/난수/포맷, three.js 씬
   이 파일은 <head>에서 defer 없이 로드된다. 페이지 스크립트는 </body> 직전에 둔다.
   ========================================================================== */
(function () {
  "use strict";

  // stage: 설계 계층(STAGES의 인덱스). 개요·실험실·용어집처럼 가로지르는 장은 생략한다.
  const STAGES = [
    { key: "device", name: "소자",        en: "Device",          seg: "dev" },
    { key: "block",  name: "기본 블록",    en: "Building blocks", seg: "blk" },
    { key: "amp",    name: "증폭기",      en: "Amplifiers",      seg: "amp" },
    { key: "prec",   name: "정밀도",      en: "Precision",       seg: "prec" },
    { key: "power",  name: "기준·전원",    en: "Ref & Power",     seg: "pwr" },
    { key: "conv",   name: "데이터 변환",  en: "Converters",      seg: "conv" },
    { key: "clock",  name: "클록",        en: "Clocking",        seg: "clk" },
  ];

  const CHAPTERS = [
    { slug: "overview",    num: "01",           title: "아날로그는 왜 어려운가",        desc: "세상은 아날로그다. 센서에서 ADC까지 신호 사슬, 디지털과 다른 설계 감각, 이득·대역폭·잡음·전력이 서로 발목을 잡는 트레이드오프 팔각형.", tags: ["기초", "sim"] },
    { slug: "mosfet",      num: "02", stage: 0, title: "MOSFET: 아날로그의 원재료",     desc: "게이트 전압으로 채널 전하를 조절하는 스위치가 아니라 전압 제어 전류원으로서의 MOSFET. 차단·선형·포화, 채널 길이 변조, 약반전과 바디 효과.", tags: ["소자", "sim"] },
    { slug: "smallsignal", num: "03", stage: 0, title: "소신호 모델과 gm/ID",          desc: "동작점 근처에서 곡선을 직선으로 본다. gm, ro, 고유 이득 gm·ro, 기생 커패시턴스와 fT, 그리고 현대 설계의 나침반 gm/ID 방법론.", tags: ["소자", "sim"] },
    { slug: "singlestage", num: "04", stage: 1, title: "단일단 증폭기",               desc: "공통 소스, 공통 게이트, 소스 팔로워, 캐스코드. 부하선과 동작점, 전압 이득 −gm·Rout, 출력 스윙과 이득의 맞바꿈.", tags: ["블록", "sim"] },
    { slug: "mirror",      num: "05", stage: 1, title: "전류 미러와 바이어스",          desc: "전류를 복사하는 회로. 단순 미러의 오차, 캐스코드와 광폭 스윙 미러, 출력 저항, 정전류 바이어스 생성기.", tags: ["블록", "sim"] },
    { slug: "diffpair",    num: "06", stage: 1, title: "차동 증폭기",                 desc: "두 입력의 차이만 키운다. 차동 쌍의 대신호 특성, 공통 모드 제거비(CMRR), 능동 부하 5트랜지스터 OTA.", tags: ["블록", "sim"] },
    { slug: "frequency",   num: "07", stage: 2, title: "주파수 응답",                 desc: "커패시터가 이득을 갉아먹는다. 극점과 영점, 보드 선도, 밀러 효과, 시정수 어림법, 단위 이득 주파수.", tags: ["증폭기", "sim"] },
    { slug: "feedback",    num: "08", stage: 2, title: "피드백",                     desc: "이득을 내주고 정확도를 산다. 루프 이득, 이득 둔감화, 대역폭 확장, 입출력 저항 변화, 네 가지 피드백 구조.", tags: ["증폭기", "sim"] },
    { slug: "opamp",       num: "09", stage: 2, title: "연산 증폭기 설계",            desc: "2단 밀러 OTA와 폴디드 캐스코드를 손으로 설계한다. 이득·스윙·슬루율·전력 예산, 공통 모드 피드백(CMFB).", tags: ["증폭기", "sim"] },
    { slug: "stability",   num: "10", stage: 2, title: "안정도와 주파수 보상",         desc: "피드백은 발진할 수 있다. 위상 여유, 나이퀴스트, 밀러 보상과 극점 분리, 우반면 영점, 계단 응답의 울림.", tags: ["증폭기", "sim"] },
    { slug: "noise",       num: "11", stage: 3, title: "잡음",                       desc: "열잡음과 1/f 잡음, kT/C, 입력 환산 잡음, 잡음 대역폭, 잡음과 전력의 교환 비율.", tags: ["정밀도", "sim"] },
    { slug: "mismatch",    num: "12", stage: 3, title: "부정합과 레이아웃",            desc: "똑같이 그린 두 트랜지스터는 다르다. 펠그롬 법칙, 오프셋 전압, 몬테카를로, 공통 중심 배치와 더미, 코너 시뮬레이션.", tags: ["정밀도", "sim"] },
    { slug: "bandgap",     num: "13", stage: 4, title: "밴드갭 기준 전압",            desc: "온도에 따라 내려가는 전압과 올라가는 전압을 더한다. PTAT·CTAT, 브로카우 셀, 곡률, 스타트업.", tags: ["기준·전원", "sim"] },
    { slug: "ldo",         num: "14", stage: 4, title: "LDO 레귤레이터",              desc: "흔들리는 전원을 깨끗하게. 패스 소자와 드롭아웃, 부하 과도 응답, 전원 잡음 제거비(PSRR), 출력 커패시터와 안정도.", tags: ["기준·전원", "sim"] },
    { slug: "switchedcap", num: "15", stage: 5, title: "스위치드 커패시터와 샘플링",    desc: "스위치와 커패시터로 저항을 흉내 낸다. 샘플-앤-홀드, 전하 주입과 클록 피드스루, 부트스트랩 스위치, SC 적분기와 필터.", tags: ["변환", "sim"] },
    { slug: "adc",         num: "16", stage: 5, title: "데이터 변환기: DAC와 ADC",     desc: "양자화 잡음과 SNR = 6.02N + 1.76 dB. DAC 구조, 비교기, 플래시·SAR·파이프라인 ADC, DNL·INL과 ENOB.", tags: ["변환", "sim"] },
    { slug: "sigmadelta",  num: "17", stage: 5, title: "오버샘플링과 ΔΣ 변환기",       desc: "1비트로 20비트를 얻는다. 오버샘플링, 잡음 성형, 루프 차수와 안정도, 데시메이션 필터.", tags: ["변환", "sim"] },
    { slug: "pll",         num: "18", stage: 6, title: "발진기와 PLL",                desc: "링·LC 발진기, 위상 잡음과 지터, 위상 비교기와 전하 펌프, 루프 필터, 주파수 합성.", tags: ["클록", "sim"] },
    { slug: "lab",         num: "19",           title: "아날로그 실험실",              desc: "회로도를 직접 그리고 브라우저 안의 SPICE로 동작점, 주파수 응답, 과도 응답, 잡음을 돌려 보는 종합 실험실.", tags: ["실험실", "sim"] },
    { slug: "glossary",    num: "20",           title: "용어집 & 종합 퀴즈",           desc: "아날로그 회로 용어를 검색하고, 종합 퀴즈로 설계 감각을 점검하자.", tags: ["정리"] },
  ];
  const AB = (window.AB = {});
  AB.CHAPTERS = CHAPTERS;
  AB.STAGES = STAGES;

  /* ------------------------------------------------------------ math utils */
  AB.clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  AB.lerp = (a, b, t) => a + (b - a) * t;
  AB.map = (x, a, b, c, d) => c + ((x - a) * (d - c)) / (b - a);
  AB.randn = function () {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  AB.poisson = function (lambda) {
    if (lambda <= 0) return 0;
    if (lambda > 40) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * AB.randn()));
    const L = Math.exp(-lambda);
    let k = 0, p = 1;
    do { k++; p *= Math.random(); } while (p > L);
    return k - 1;
  };
  /** 숫자 포맷: 유효 자리 */
  AB.fmt = function (x, digits = 3) {
    if (!isFinite(x)) return "—";
    if (x === 0) return "0";
    const a = Math.abs(x);
    if (a >= 1e5 || a < 1e-3) return x.toExponential(digits - 1).replace("e+", "e");
    return Number(x.toPrecision(digits)).toLocaleString("en-US", { maximumFractionDigits: 6 });
  };
  /** SI 접두사 포맷: AB.si(2.3e-9,'m') → "2.3 nm" */
  AB.si = function (x, unit = "", digits = 3) {
    if (!isFinite(x)) return "—";
    digits = Math.max(1, Math.min(21, Math.round(digits) || 3));
    if (x === 0) return "0 " + unit;
    const pre = [[1e12, "T"], [1e9, "G"], [1e6, "M"], [1e3, "k"], [1, ""], [1e-3, "m"], [1e-6, "µ"], [1e-9, "n"], [1e-12, "p"], [1e-15, "f"]];
    const a = Math.abs(x);
    for (const [v, p] of pre) if (a >= v * 0.9995) return Number((x / v).toPrecision(digits)) + " " + p + unit;
    return x.toExponential(digits - 1) + " " + unit;
  };


  /** 오차 함수 (Abramowitz–Stegun 7.1.26, |ε| < 1.5e-7) */
  AB.erf = function (x) {
    const s = Math.sign(x); x = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * x);
    const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  };
  AB.erfc = (x) => 1 - AB.erf(x);
  /** 캔버스 글꼴 문자열: AB.font(12) / AB.font(11, true) */
  AB.font = function (px, mono, weight) {
    const cs = getComputedStyle(document.body);
    return (weight ? weight + " " : "") + px + "px " + (mono ? cs.getPropertyValue("--mono") : cs.getPropertyValue("--font"));
  };
  /** 호출을 묶어 마지막 한 번만 실행 */
  AB.debounce = function (fn, ms = 120) { let t = 0; return function () { const a = arguments; clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); }; };
  /** 정규 난수 시드 고정용 간단 PRNG (mulberry32) */
  AB.rng = function (seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  AB.kB = 8.617333e-5; // eV/K

  /* ------------------------------------------------------------ physics consts */
  AB.C = { h: 6.62607015e-34, c: 2.99792458e8, q: 1.602176634e-19, k: 1.380649e-23, eps0: 8.8541878128e-12, hbar: 1.054571817e-34, me: 9.1093837015e-31 };

  /** 파장(nm) → [r,g,b] 0..255 (가시광 380~780, 밖은 어두운 색) */
  AB.wl2rgbArr = function (nm) {
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
  AB.wl2rgb = function (nm, alpha = 1) {
    const [r, g, b] = AB.wl2rgbArr(nm);
    return alpha === 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;
  };

  /* ------------------------------------------------------------ analog helpers */
  /** 퍼센트: AB.pct(0.234) → "23.4%" */
  AB.pct = (x, d = 1) => (isFinite(x) ? (x * 100).toFixed(d) + "%" : "—");
  /** 데시벨: AB.db(1000) → "60.0 dB" (전압비). power=true면 10·log10 */
  AB.db = (x, d = 1, power) => (isFinite(x) && x > 0 ? ((power ? 10 : 20) * Math.log10(x)).toFixed(d) + " dB" : "—");
  /** 설계 계층 색: dev blk amp prec pwr conv clk */
  AB.segColor = (k) => AB.color("seg-" + k) || AB.color("text-dim");
  /** 오실로스코프 채널 색: AB.trace(1..4) */
  AB.trace = (i) => AB.color("tr-" + i) || AB.color("accent");
  /** "#rrggbb" 또는 rgb() 색에 투명도 */
  AB.alpha = function (c, a) {
    c = (c || "").trim();
    if (c[0] === "#") { const h = c.length === 4 ? c.slice(1).split("").map((x) => x + x).join("") : c.slice(1, 7); return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`; }
    const m = c.match(/rgba?\(([^)]+)\)/); if (m) { const p = m[1].split(",").slice(0, 3).join(","); return `rgba(${p},${a})`; }
    return c;
  };
  /**
   * 캔버스 위 떠 있는 정보 상자. const tip = AB.tip(canvas); tip.show(x, y, html); tip.hide();
   * x, y는 캔버스 CSS px. 부모(.sim-view)는 position: relative.
   */
  AB.tip = function (canvas) {
    if (typeof canvas === "string") canvas = document.querySelector(canvas);
    const el = document.createElement("div");
    el.className = "ab-tip";
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
  AB.rrect = function (ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  };
  /** 상자 폭에 맞춰 글자를 줄바꿈해 그린다(공백 기준). 그린 줄 수를 돌려준다 */
  AB.wrapText = function (ctx, text, x, y, maxW, lineH, maxLines = 9) {
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
  AB.onTheme = (cb) => themeCbs.push(cb);
  AB.isDark = function () {
    const t = document.documentElement.getAttribute("data-theme");
    if (t) return t === "dark";
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  };
  /** CSS 변수 값 읽기: AB.color('accent') */
  AB.color = function (name) {
    return getComputedStyle(document.documentElement).getPropertyValue("--" + name).trim();
  };
  /** 자주 쓰는 색 묶음 (테마 변경 시 다시 호출할 것) */
  AB.palette = function () {
    const c = AB.color;
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
   *   const cv = AB.canvas(el, (ctx,w,h)=>{...}, {aspect:0.5, maxHeight: 420});
   *   cv.redraw(); cv.ctx; cv.w; cv.h
   */
  AB.canvas = function (canvas, draw, opts = {}) {
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
        ctx.fillStyle = canvas.closest(".sim-view.scope") ? "#0b0d12" : AB.color("canvas-bg");
        ctx.fillRect(0, 0, st.w, st.h);
      }
      try { draw && draw(ctx, st.w, st.h); } finally { ctx.restore(); }
    };
    st.resize = resize;
    if (window.ResizeObserver) {
      let lastW = -1;
      new ResizeObserver(() => { const w = canvas.parentElement.clientWidth; if (w !== lastW) { lastW = w; resize(); } }).observe(canvas.parentElement);
    } else window.addEventListener("resize", resize);
    AB.onTheme(() => st.redraw());
    resize();
    return st;
  };

  /**
   * 화면에 보일 때만 도는 애니메이션 루프. fn(dt초, t초)
   *   const loop = AB.loop(el, (dt,t)=>{...}); loop.stop(); loop.start();
   */
  AB.loop = function (el, fn) {
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
  AB.chart = function (ctx, box, opts) {
    const P = AB.palette();
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
    const xt = Array.isArray(opts.xTicks) ? opts.xTicks : ticks(x0, x1, opts.logX, typeof opts.xTicks === "number" ? opts.xTicks : 6);
    const yt = Array.isArray(opts.yTicks) ? opts.yTicks : ticks(y0, y1, opts.logY, typeof opts.yTicks === "number" ? opts.yTicks : 5);
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
   *   const get = AB.range('wl', v => v+' nm', v => redraw());  get() → 현재 값(Number)
   */
  AB.range = function (id, fmt, onInput) {
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
   *   const mode = AB.seg('mode', v => redraw());  mode() → 현재 값
   */
  AB.seg = function (id, onChange) {
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
   *   AB.drag(cv.canvas, { start(x, y, e) {}, move(x, y, e) {}, end() {}, hover(x, y, e) {} });
   * 누르는 순간 start와 move가 한 번씩 불린다. 끄는 동안 페이지 스크롤은 막힌다.
   */
  AB.drag = function (canvas, on) {
    if (typeof canvas === "string") canvas = document.querySelector(canvas);
    canvas.classList.add("drag");
    let act = false;
    const pos = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    canvas.addEventListener("pointerdown", (e) => { act = true; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} const [x, y] = pos(e); if (on.start) on.start(x, y, e); if (on.move) on.move(x, y, e); e.preventDefault(); });
    canvas.addEventListener("pointermove", (e) => { const [x, y] = pos(e); if (act) { if (on.move) on.move(x, y, e); } else if (on.hover) on.hover(x, y, e); });
    const up = () => { if (act) { act = false; if (on.end) on.end(); } };
    canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
  };
  /** 통계 표시: AB.stat('snr', '32.1 dB') → id 요소의 textContent 설정(HTML 허용) */
  AB.stat = function (id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; };

  /* ------------------------------------------------------------ three.js helper */
  /**
   * three.js 씬 준비 (전역 THREE, THREE.OrbitControls 필요).
   *   const T = AB.three(containerEl, { camera:[x,y,z], target:[x,y,z], fov:40, autoRotate:false });
   *   T.scene, T.camera, T.renderer, T.controls, T.THREE
   *   T.onFrame((dt,t)=>{...});   T.label('텍스트', new THREE.Vector3(...)) → HTML 라벨(자동 투영)
   *   T.material(color, opts)  → MeshStandardMaterial 헬퍼
   * 조명(환경광+방향광 2개), 리사이즈, 화면 밖 일시정지, 테마 대응 포함.
   */
  AB.three = function (container, opts = {}) {
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
    T.loop = AB.loop(container, (dt, t) => {
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
  const LOGO = `<svg class="mark" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="abg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent-2)"/></linearGradient></defs><rect x="2" y="2" width="28" height="28" rx="8" fill="url(#abg)"/><path d="M8 8.5v15l13-7.5z" fill="none" stroke="#fff" stroke-width="1.7" stroke-linejoin="round"/><path d="M4.5 12.5h3.5M4.5 19.5h3.5M21 16h6" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><path d="M10.2 16c.9-2.4 1.8-2.4 2.7 0s1.8 2.4 2.7 0" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".9"/></svg>`;
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
    const feedbackUrl = "https://books.euiyun.com/feedback.html?book=analogbook&page=" + encodeURIComponent(location.href);

    // favicon
    if (!document.querySelector('link[rel="icon"]')) { const fi = document.createElement("link"); fi.rel = "icon"; fi.type = "image/svg+xml"; fi.href = root + "favicon.svg"; document.head.appendChild(fi); }

    // top bar
    const bar = document.createElement("header");
    bar.className = "ab-topbar";
    bar.innerHTML = `
      <button class="ab-btn icon" id="ab-menu" aria-label="챕터 목록">${ICON_MENU}</button>
      <a class="ab-logo" href="${href("")}" aria-label="AnalogBook 홈">${LOGO}<span>AnalogBook <small>아날로그 회로설계</small></span></a>
      <span class="spacer"></span>
      <a class="ab-btn icon" href="https://books.euiyun.com/" aria-label="전체 책 보기" title="전체 책 보기"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5h6v14H4zM10 5.5h6v14h-6zM17 7l3-1 2 13-3 1z"/></svg></a>
      <a class="ab-btn" href="${root}sims.html" aria-label="시뮬레이터 갤러리" title="시뮬레이터 갤러리">${ICON_GRID}<span class="lbl-wide">시뮬레이터</span></a>
      ${curSlug ? `<button class="ab-btn toggle" id="ab-simonly" aria-pressed="false" title="글을 숨기고 시뮬레이터만 본다">${ICON_SIM}<span class="lbl-wide">시뮬레이터만</span></button>` : ""}
      <button class="ab-btn icon" id="ab-theme" aria-label="테마 전환"></button>
      <div class="ab-progress" id="ab-progress"></div>`;
    const feedbackButton = document.createElement("a");
    feedbackButton.className = "ab-btn icon";
    feedbackButton.href = feedbackUrl;
    feedbackButton.target = "_blank";
    feedbackButton.rel = "noopener";
    feedbackButton.setAttribute("aria-label", "독자 의견 보내기");
    feedbackButton.title = "독자 의견 보내기";
    feedbackButton.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 4V6a2 2 0 0 1 2-2z"/><path d="M8 9h8M8 13h5"/></svg>';
    bar.querySelector("#ab-theme").before(feedbackButton);
    body.prepend(bar);

    // drawer
    const drawer = document.createElement("nav");
    drawer.className = "ab-drawer";
    drawer.innerHTML = `<h4>Chapters</h4><ul class="ab-chlist">
      <li><a href="${href("")}" class="${curSlug ? "" : "active"}"><span class="num">00</span><span>홈 · 처음에</span></a></li>
      <li><a href="${root}sims.html" class="${body.dataset.page === "sims" ? "active" : ""}"><span class="num">▦</span><span>시뮬레이터 갤러리</span></a></li>
      ${CHAPTERS.map((c) => `<li><a href="${href(c.slug)}" class="${c.slug === curSlug ? "active" : ""}"><span class="num">${c.num}</span><span>${c.title}</span></a></li>`).join("")}
    </ul>`;
    const backdrop = document.createElement("div");
    backdrop.className = "ab-drawer-backdrop";
    body.append(backdrop, drawer);
    const toggleDrawer = (o) => body.classList.toggle("drawer-open", o);
    bar.querySelector("#ab-menu").addEventListener("click", () => toggleDrawer(true));
    backdrop.addEventListener("click", () => toggleDrawer(false));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") toggleDrawer(false); });

    // theme toggle
    const tbtn = bar.querySelector("#ab-theme");
    const setIcon = () => (tbtn.innerHTML = AB.isDark() ? ICON_SUN : ICON_MOON);
    setIcon();
    tbtn.addEventListener("click", () => {
      const next = AB.isDark() ? "light" : "dark";
      try { localStorage.setItem("semi-theme", next); } catch (e) {}
      applyTheme(next); setIcon();
    });

    // progress
    const prog = bar.querySelector("#ab-progress");
    const onScroll = () => { const h = document.documentElement.scrollHeight - innerHeight; prog.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + "%"; };
    addEventListener("scroll", onScroll, { passive: true }); onScroll();

    // chapter page extras
    const main = document.querySelector("main.chapter");
    if (main) {
      // 설계 계층 띠
      const curCh = CHAPTERS.find((c) => c.slug === curSlug);
      const hero = main.querySelector(".chapter-hero");
      if (hero && curCh && curCh.stage != null) {
        const first = (i) => CHAPTERS.find((c) => c.stage === i);
        const strip = document.createElement("nav");
        strip.className = "ab-stages";
        strip.setAttribute("aria-label", "설계 계층");
        strip.innerHTML = STAGES.map((st, i) => `<a href="${href(first(i).slug)}" class="${i === curCh.stage ? "cur" : ""}"${i === curCh.stage ? ' aria-current="step"' : ""}><b>${st.name}</b><small>${st.en}</small></a>`).join("");
        hero.after(strip);
      }
      // 시뮬레이터만 보기
      const banner = document.createElement("div");
      banner.className = "sim-only-banner";
      banner.innerHTML = "시뮬레이터만 보는 중입니다. 설명을 함께 보려면 상단의 <b>시뮬레이터만</b> 버튼을 다시 누르세요.";
      if (hero) hero.appendChild(banner);
      const sbtn = bar.querySelector("#ab-simonly");
      // 버튼으로 켠 상태는 기억하고, 갤러리 링크(?sims=1)로 들어온 경우는 그 페이지에만 적용한다
      const setSimOnly = (on, persist) => {
        body.classList.toggle("sim-only", on);
        if (sbtn) sbtn.setAttribute("aria-pressed", on);
        if (persist) try { localStorage.setItem("ab-simonly", on ? "1" : ""); } catch (e) {}
        window.dispatchEvent(new Event("resize"));
      };
      let simOnly = /[?&]sims?=1/.test(location.search);
      try { if (!simOnly) simOnly = localStorage.getItem("ab-simonly") === "1"; } catch (e) {}
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
      layout.className = "ab-layout";
      main.parentNode.insertBefore(layout, main);
      layout.appendChild(main);
      const toc = document.createElement("aside");
      toc.className = "ab-toc";
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
      pager.className = "ab-pager";
      pager.innerHTML =
        (prev ? `<a class="prev" href="${href(prev.slug)}"><small>← 이전 · ${prev.num}</small>${prev.title}</a>` : `<a class="prev" href="${href("")}"><small>← 처음으로</small>홈 · 처음에</a>`) +
        (next ? `<a class="next" href="${href(next.slug)}"><small>다음 · ${next.num} →</small>${next.title}</a>` : "");
      layout.after(pager);
    }
    const foot = document.createElement("footer");
    foot.className = "ab-foot";
    foot.innerHTML = `AnalogBook — 만져 보며 배우는 반도체 아날로그 회로설계 · 시뮬레이터의 수치는 가상의 교육용 공정(AB180) 모델입니다.<br>
      © 2026 geniuskey 및 AnalogBook 기여자 · 콘텐츠 <a rel="license" href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a> · 코드 <a href="${root}LICENSE-MIT">MIT</a> · <a href="${root}LICENSE.md">라이선스 안내</a>`;
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
