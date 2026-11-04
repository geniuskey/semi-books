/* Copyright (c) 2026 geniuskey and DeviceBook contributors.
   Executable code: MIT (see ../LICENSE-MIT).
   Educational content and illustrations: CC-BY-4.0 (see ../LICENSE.md). */
/* ==========================================================================
   DeviceBook 공통 스크립트 — 전역 객체 PB
   - 레이아웃(상단바, 목차, 이전/다음, 테마) 자동 생성
   - 시뮬레이터 헬퍼: canvas, chart, range, seg, 색/난수/포맷, three.js 씬
   이 파일은 <head>에서 defer 없이 로드된다. 페이지 스크립트는 </body> 직전에 둔다.
   ========================================================================== */
(function () {
  "use strict";

  const CHAPTERS = [
    { slug: "crystal",   num: "01", title: "결정과 에너지 밴드",      desc: "다이아몬드 격자와 밀러 지수, 원자 준위가 밴드로 갈라지는 과정. 크로니히–페니 모형, E–k 관계와 유효 질량, 직접·간접 밴드갭.", tags: ["기초", "3d", "sim"] },
    { slug: "carriers",  num: "02", title: "캐리어 통계",            desc: "상태 밀도와 페르미–디랙 분포, 진성 캐리어 농도, 도너·억셉터 도핑. 온도에 따라 움직이는 페르미 준위와 동결·외인성·진성 영역.", tags: ["통계", "sim"] },
    { slug: "transport", num: "03", title: "캐리어 수송",            desc: "열 운동과 산란, 드리프트와 이동도, 속도 포화, 확산과 아인슈타인 관계, 홀 효과와 비저항 측정.", tags: ["수송", "sim"] },
    { slug: "gr",        num: "04", title: "생성과 재결합",          desc: "직접·SRH·오제 재결합, 트랩 준위와 수명, 연속 방정식과 확산 길이, 헤인스–쇼클리 실험, 표면 재결합.", tags: ["수송", "sim"] },
    { slug: "pn",        num: "05", title: "pn 접합 I: 정전기",       desc: "접합이 만들어질 때 밴드가 휘는 이유. 내부 전위, 공핍층과 전기장, 공핍 근사와 수치 해, 접합 용량과 C–V.", tags: ["접합", "sim"] },
    { slug: "diode",     num: "06", title: "pn 접합 II: 다이오드 전류", desc: "준페르미 준위와 소수 캐리어 주입, 쇼클리 방정식, 이상 계수와 직렬 저항, 항복, 확산 용량과 역회복.", tags: ["접합", "sim"] },
    { slug: "ms",        num: "07", title: "금속–반도체 접합",        desc: "일함수와 쇼트키 장벽, 페르미 준위 고정, 열전자 방출, 영상력 장벽 저하, 터널링 오믹 접촉과 접촉 비저항.", tags: ["접합", "sim"] },
    { slug: "mos",       num: "08", title: "MOS 커패시터",           desc: "축적·공핍·반전에서의 밴드 휨과 전하. 평탄대 전압, 문턱 전압, 저주파·고주파·깊은 공핍 C–V, 산화막 전하.", tags: ["MOS", "sim"] },
    { slug: "mosfet",    num: "09", title: "MOSFET",                 desc: "점진 채널 근사와 전류–전압 특성, 핀치오프와 포화, 문턱 이하 기울기, 바디 효과, CMOS 인버터.", tags: ["MOS", "sim"] },
    { slug: "scaling",   num: "10", title: "스케일링과 단채널 효과",  desc: "데너드 스케일링, 자연 길이와 DIBL·Vth 롤오프, 속도 포화, 누설 전류, FinFET·GAA의 정전기 제어.", tags: ["첨단", "3d", "sim"] },
    { slug: "bjt",       num: "11", title: "바이폴라 트랜지스터",     desc: "동작 영역과 소수 캐리어 분포, 이미터 효율과 전류 이득, 거멜 플롯, 얼리 효과, 에버스–몰 모델, HBT.", tags: ["BJT", "sim"] },
    { slug: "opto",      num: "12", title: "광전자 소자",            desc: "흡수 계수와 광 생성, 포토다이오드, 태양 전지의 I–V와 효율 한계, LED의 발광과 효율, 레이저 기초.", tags: ["광소자", "sim"] },
    { slug: "hetero",    num: "13", title: "이종 접합과 밴드 공학",    desc: "앤더슨 규칙과 밴드 오프셋, 2차원 전자 가스와 양자 우물, 변형과 SiGe 밴드 공학, 양자 구속과 부밴드. 재료를 바꿔 밴드를 설계한다.", tags: ["접합", "sim"] },
    { slug: "power",     num: "14", title: "전력 반도체 소자",         desc: "항복 전압과 온저항의 트레이드오프, 드리프트층 설계, 전력 MOSFET·슈퍼정션·IGBT, SiC·GaN 와이드 밴드갭과 HEMT, 스위칭 손실.", tags: ["첨단", "sim"] },
    { slug: "rf",        num: "15", title: "고주파 소자와 잡음",       desc: "소신호 등가 회로와 y·S 파라미터, 차단 주파수 f_T와 최대 발진 주파수 f_max, 열·산탄·1/f 잡음과 잡음 지수, RF CMOS·HBT·HEMT 비교.", tags: ["첨단", "sim"] },
    { slug: "reliability", num: "16", title: "소자 신뢰성",            desc: "핫 캐리어, BTI, 산화막 TDDB와 와이블 통계, 가속 시험과 수명 외삽, 정전기 방전(ESD) 보호, 자가 발열과 변동성.", tags: ["MOS", "sim"] },
    { slug: "esd",       num: "17", title: "ESD와 래치업",            desc: "HBM·CDM·IEC 61000-4-2 펄스와 TLP, GGNMOS 스냅백과 실리사이드 블록, RC 트리거 레일 클램프, CDM 전원 영역 경계, CMOS 래치업과 JESD78, 시스템 수준 ESD와 고속 I/O.", tags: ["MOS", "sim"] },
    { slug: "lab",       num: "18", title: "소자 실험실",            desc: "1차원 드리프트–확산 솔버로 다이오드·저항·pin 구조를 직접 설계하고 바이어스를 걸어 밴드·캐리어·전류를 본다.", tags: ["샌드박스", "sim"] },
    { slug: "glossary",  num: "19", title: "용어집 & 종합 퀴즈",       desc: "핵심 소자 물리 용어를 검색하고, 종합 퀴즈로 실력을 점검하자.", tags: ["정리"] },
  ];

  const PB = (window.PB = {});
  PB.CHAPTERS = CHAPTERS;



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
    const pre = [[1e12, "T"], [1e9, "G"], [1e6, "M"], [1e3, "k"], [1, ""], [1e-3, "m"], [1e-6, "µ"], [1e-9, "n"], [1e-12, "p"], [1e-15, "f"], [1e-18, "a"]];
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
  /** 호출을 묶어 마지막 한 번만 실행 */
  PB.debounce = function (fn, ms = 120) { let t = 0; return function () { const a = arguments; clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); }; };
  /** 시드 고정 난수(mulberry32): const rnd = PB.rng(7); rnd() → [0,1) */
  PB.rng = function (seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  PB.kB = 8.617333e-5; // eV/K

  /* ------------------------------------------------------------ easing */
  PB.ease = {
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    out: (t) => 1 - Math.pow(1 - t, 3),
    in: (t) => t * t * t,
    smooth: (t) => t * t * (3 - 2 * t),
  };
  /** 지수 접근(프레임 독립): x = PB.approach(x, target, dt, 0.12) — 0.12초 시정수로 따라감 */
  PB.approach = (x, target, dt, tau = 0.12) => target + (x - target) * Math.exp(-dt / Math.max(1e-4, tau));

  /* ------------------------------------------------------------ color utils */
  /** 색에 투명도: PB.alpha('#0e9384', .2), PB.alpha('rgb(1,2,3)', .5), PB.alpha('accent', .2)(CSS 변수 이름) */
  PB.alpha = function (c, a) {
    c = String(c || "").trim();
    if (/^[a-z][a-z0-9-]*$/i.test(c) && !/^(rgb|hsl)/i.test(c)) { const v = PB.color(c); if (v) c = v; }
    if (c[0] === "#") {
      const h = c.length <= 5 ? c.slice(1).split("").map((x) => x + x).join("") : c.slice(1);
      return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
    }
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (m) return `rgba(${m[1].split(/[ ,/]+/).filter(Boolean).slice(0, 3).join(",")},${a})`;
    return c;
  };
  /** 두 색 섞기(#hex/rgb): PB.mix(a, b, t) */
  PB.mix = function (a, b, t) {
    const p = (c) => { const m = PB.alpha(c, 1).match(/rgba\((\d+),(\d+),(\d+)/); return m ? [+m[1], +m[2], +m[3]] : [128, 128, 128]; };
    const A = p(a), B = p(b);
    return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`;
  };

  /* ------------------------------------------------------------ canvas drawing utils */
  /** 둥근 사각형 경로(채우기/선은 호출자가): PB.rrect(ctx,x,y,w,h,r); ctx.fill() */
  PB.rrect = function (ctx, x, y, w, h, r = 6) {
    r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  };
  /** 화살표: PB.arrow(ctx, x0,y0, x1,y1, {color, width, head, dash, both}) */
  PB.arrow = function (ctx, x0, y0, x1, y1, o = {}) {
    const col = o.color || PB.color("text-dim"), lw = o.width || 1.5, hd = o.head || 4 + lw * 2.2;
    const a = Math.atan2(y1 - y0, x1 - x0), len = Math.hypot(x1 - x0, y1 - y0);
    if (len < 0.5) return;
    ctx.save();
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw; ctx.lineCap = "round";
    ctx.setLineDash(o.dash || []);
    const sh = Math.min(hd * 0.8, len / 2);
    ctx.beginPath();
    ctx.moveTo(x0 + (o.both ? Math.cos(a) * sh : 0), y0 + (o.both ? Math.sin(a) * sh : 0));
    ctx.lineTo(x1 - Math.cos(a) * sh, y1 - Math.sin(a) * sh); ctx.stroke();
    ctx.setLineDash([]);
    const head = (x, y, ang) => {
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.lineTo(x - hd * Math.cos(ang - 0.42), y - hd * Math.sin(ang - 0.42));
      ctx.lineTo(x - hd * 0.62 * Math.cos(ang), y - hd * 0.62 * Math.sin(ang));
      ctx.lineTo(x - hd * Math.cos(ang + 0.42), y - hd * Math.sin(ang + 0.42));
      ctx.closePath(); ctx.fill();
    };
    head(x1, y1, a);
    if (o.both) head(x0, y0, a + Math.PI);
    ctx.restore();
  };

  /**
   * 서식 텍스트(아래·위첨자): "V_DD", "C_{BL}", "10^{-9}", "I_on/I_off", "cm^-3". 밑줄 문자 그대로는 "\_".
   *   PB.text(ctx, "V_t = 0.5 V", x, y, {align, baseline, font, color, halo, weight, size}) → 그린 폭(px)
   * align/baseline/font/color를 주지 않으면 ctx의 현재 값을 쓴다. halo: 배경색 테두리로 선·격자 위에서도 읽히게.
   */
  const RICH_RE = /[_^]/;
  const SUBCH = /[A-Za-z0-9Ͱ-Ͽ′'*]/;
  function parseRich(str) {
    const out = [];
    let buf = "", i = 0;
    const flush = () => { if (buf) out.push({ t: buf, k: 0 }); buf = ""; };
    while (i < str.length) {
      const c = str[i];
      if (c === "\\" && (str[i + 1] === "_" || str[i + 1] === "^")) { buf += str[i + 1]; i += 2; continue; }
      if (c === "_" || c === "^") {
        let j = i + 1, t = "", braced = false;
        if (str[j] === "{") {
          const e = str.indexOf("}", j);
          if (e > j) { t = str.slice(j + 1, e); j = e + 1; braced = true; }
        } else {
          if (c === "^" && /[+\-−]/.test(str[j] || "")) { t += str[j]; j++; }
          // 숫자로 시작하면 숫자만(화학식 Si_3N_4), 아니면 글자·숫자 묶음(V_DD, t_ox, V_t0)
          const digitsOnly = /[0-9]/.test(str[j] || "");
          while (j < str.length && (digitsOnly ? /[0-9]/.test(str[j]) : SUBCH.test(str[j]))) { t += str[j]; j++; }
        }
        // 부호 하나만 있는 위첨자(n^+, p^-, ^{+})도 받는다. 아래첨자는 중괄호로 감쌀 때만.
        if (t && (braced || c === "^" || !/^[+\-−]$/.test(t))) { flush(); out.push({ t: c === "^" ? t.replace(/^-/, "−") : t, k: c === "_" ? 1 : -1 }); i = j; continue; }
      }
      buf += c; i++;
    }
    flush();
    return out;
  }
  PB.parseRich = parseRich;
  function richRuns(ctx, str) {
    const base = ctx.font, m = base.match(/(\d*\.?\d+)px/), size = m ? parseFloat(m[1]) : 12;
    const small = m ? base.replace(m[0], (size * 0.74).toFixed(2) + "px") : base;
    const runs = RICH_RE.test(str) ? parseRich(str) : [{ t: str, k: 0 }];
    let w = 0;
    runs.forEach((r) => { ctx.font = r.k ? small : base; r.w = ctx.measureText(r.t).width; r.f = ctx.font; w += r.w; });
    ctx.font = base;
    return { runs, w, size };
  }
  function applyTextOpts(ctx, o) {
    if (o.font) ctx.font = o.font;
    else if (o.size || o.weight || o.mono) {
      const fam = o.mono ? PB.fontMono() : PB.fontSans();
      ctx.font = `${o.weight || 400} ${o.size || 12}px ${fam}`;
    }
    if (o.color) ctx.fillStyle = o.color;
    if (o.align) ctx.textAlign = o.align;
    if (o.baseline) ctx.textBaseline = o.baseline;
  }
  PB.text = function (ctx, str, x, y, o = {}) {
    str = String(str);
    ctx.save();
    applyTextOpts(ctx, o);
    const align = ctx.textAlign;
    const { runs, w, size } = richRuns(ctx, str);
    let sx = align === "center" ? x - w / 2 : align === "right" || align === "end" ? x - w : x;
    ctx.textAlign = "left";
    const dyOf = (k) => (k === 1 ? size * 0.3 : k === -1 ? -size * 0.42 : 0);
    if (o.halo) {
      ctx.save();
      ctx.strokeStyle = o.halo === true ? PB.color("canvas-bg") : o.halo;
      ctx.lineWidth = o.haloWidth || 3.5; ctx.lineJoin = "round";
      let hx = sx;
      runs.forEach((r) => { ctx.font = r.f; ctx.strokeText(r.t, hx, y + dyOf(r.k)); hx += r.w; });
      ctx.restore();
    }
    runs.forEach((r) => { ctx.font = r.f; ctx.fillText(r.t, sx, y + dyOf(r.k)); sx += r.w; });
    ctx.restore();
    return w;
  };
  /** 서식 텍스트 폭(px): PB.textWidth(ctx, "V_DD", {size}) */
  PB.textWidth = function (ctx, str, o = {}) {
    ctx.save(); applyTextOpts(ctx, o);
    const w = richRuns(ctx, String(str)).w;
    ctx.restore();
    return w;
  };
  /** 상자 폭에 맞춰 줄바꿈해 그린다(공백 기준). 그린 줄 수를 돌려준다. PB.wrapText(ctx, s, x, y, maxW, lineH, maxLines) */
  PB.wrapText = function (ctx, text, x, y, maxW, lineH, maxLines = 9) {
    const words = String(text).split(/(\s+)/); let line = "", n = 0;
    const flush = () => { PB.text(ctx, line.trim(), x, y + n * lineH); n++; line = ""; };
    for (const w of words) {
      if (PB.textWidth(ctx, line + w) <= maxW || !line) { line += w; continue; }
      if (n >= maxLines - 1) { line += w; break; }
      flush(); line = w.replace(/^\s+/, "");
    }
    if (line && n < maxLines) flush();
    return n;
  };
  /** 캔버스 글꼴 패밀리(CSS 변수 --font, --mono) */
  let famSans = "", famMono = "";
  PB.fontSans = () => famSans || (famSans = getComputedStyle(document.documentElement).getPropertyValue("--font").trim() || "sans-serif");
  PB.fontMono = () => famMono || (famMono = getComputedStyle(document.documentElement).getPropertyValue("--mono").trim() || "monospace");
  /** ctx.font 문자열: PB.font(12, 600) / PB.font(11, 400, true) → 모노 */
  /**
   * ctx.font 문자열. 두 가지 호출 형식을 모두 받는다.
   *   PB.font(12, 600) / PB.font(11, 400, true) → (크기, 굵기, 모노)
   *   PB.font(11, true) / PB.font(12, false, 700) → (크기, 모노, 굵기) — 예전 형식
   */
  PB.font = function (size = 12, a, b) {
    let weight = 400, mono = false;
    if (typeof a === "boolean") { mono = a; if (b != null) weight = b; }
    else { if (a != null) weight = a; mono = !!b; }
    return `${weight} ${size}px ${mono ? PB.fontMono() : PB.fontSans()}`;
  };
  /** 둥근 배지(라벨 상자): PB.badge(ctx, "ACT", x, y, {bg, fg, border, align:'center', pad, r, size, weight, mono}) → {w,h} */
  PB.badge = function (ctx, str, x, y, o = {}) {
    ctx.save();
    ctx.font = PB.font(o.size || 11, o.weight || 600, !!o.mono);
    const pad = o.pad != null ? o.pad : 6, h = (o.size || 11) + 8;
    const w = PB.textWidth(ctx, str) + pad * 2;
    const align = o.align || "center";
    const bx = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    const by = y - h / 2;
    PB.rrect(ctx, bx, by, w, h, o.r != null ? o.r : h / 2);
    ctx.fillStyle = o.bg || PB.color("bg-elev"); ctx.fill();
    if (o.border !== false) { ctx.strokeStyle = o.border || PB.color("border"); ctx.lineWidth = 1; ctx.stroke(); }
    ctx.fillStyle = o.fg || PB.color("text"); ctx.textBaseline = "middle"; ctx.textAlign = "left";
    PB.text(ctx, str, bx + pad, y + 0.5);
    ctx.restore();
    return { w, h, x: bx, y: by };
  };

  /**
   * 선 끝 라벨을 겹치지 않게 놓는다(밴드 끝 E_C·E_V·E_F, 곡선 이름 등).
   *   PB.endLabels(ctx, [{y, text, color, x?}], {x, align:'right'|'left', top, bottom, gap, size:12.5, weight:700, halo:true})
   * y는 원하는 위치(px, 글자 가운데). 가까운 라벨은 한 묶음으로 모아 원래 위치들의 평균 둘레에 gap 간격으로 늘어놓고,
   * top~bottom 안으로 밀어 넣는다. 실제로 그린 위치 [{text, y, py}]를 돌려준다.
   */
  PB.endLabels = function (ctx, items, o = {}) {
    const size = o.size || 12.5, gap = o.gap || size + 3;
    const top = o.top != null ? o.top : -1e9, bottom = o.bottom != null ? o.bottom : 1e9;
    const list = items.filter((it) => it && isFinite(it.y)).map((it) => Object.assign({}, it)).sort((a, b) => a.y - b.y);
    let cl = list.map((l) => ({ items: [l], y: l.y }));
    const half = (c) => ((c.items.length - 1) * gap) / 2;
    for (let guard = 0; guard < 200; guard++) {
      let merged = false;
      for (let k = 1; k < cl.length; k++) {
        const a = cl[k - 1], b = cl[k];
        if (b.y - half(b) - (a.y + half(a)) < gap) {
          const its = a.items.concat(b.items);
          cl.splice(k - 1, 2, { items: its, y: its.reduce((s, l) => s + l.y, 0) / its.length });
          merged = true; break;
        }
      }
      if (!merged) break;
    }
    cl.forEach((c) => {
      const h = half(c);
      c.y = Math.max(top + gap / 2 + h, Math.min(bottom - gap / 2 - h, c.y));
      c.items.forEach((l, j) => { l.py = c.y - h + j * gap; });
    });
    ctx.save();
    list.forEach((l) => {
      PB.text(ctx, l.text, l.x != null ? l.x : o.x, l.py, { size, weight: o.weight || 700, color: l.color || PB.color("text"), align: o.align || "right", baseline: "middle", halo: o.halo !== false });
    });
    ctx.restore();
    return list.map((l) => ({ text: l.text, y: l.y, py: l.py }));
  };

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
  /** 재질색(style.css의 --m-<재질>-1/-2/-e, 라이트·다크): PB.matColor('cu') 아래쪽 색, ('cu','1') 위쪽 색, ('cu','e') 경계색 */
  PB.matColor = (k, which) => PB.color(`m-${k}-${which === "1" || which === "e" ? which : "2"}`);
  /** 캔버스 재질 사각형(SVG .m-*와 같은 위→아래 음영 + 경계선): PB.matRect(ctx, x, y, w, h, 'np', {r, edge:true, alpha}) */
  PB.matRect = function (ctx, x, y, w, h, mat, o = {}) {
    if (!(w > 0 && h > 0)) return;
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, PB.matColor(mat, "1")); g.addColorStop(1, PB.matColor(mat, "2"));
    PB.rrect(ctx, x, y, w, h, o.r || 0);
    ctx.fillStyle = g; ctx.fill();
    if (o.edge !== false) { ctx.lineWidth = o.lineWidth || 1; ctx.strokeStyle = PB.matColor(mat, "e"); ctx.stroke(); }
    ctx.restore();
  };
  /** 자주 쓰는 색 묶음 (테마 변경 시 다시 호출할 것) */
  PB.palette = function () {
    const c = PB.color;
    return {
      bg: c("canvas-bg"), text: c("text"), dim: c("text-dim"), faint: c("text-faint"),
      grid: c("grid"), axis: c("axis"), border: c("border"), surface: c("surface"),
      accent: c("accent"), accent2: c("accent-2"), ok: c("ok"), warn: c("warn"), bad: c("bad"),
      red: c("red"), green: c("green"), blue: c("blue"),
      // 소자 물리 전용: 전자·정공·밴드·페르미 준위
      e: c("electron"), h: c("hole"), ec: c("band-c"), ev: c("band-v"), ef: c("fermi"), ei: c("text-faint"),
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
    canvas._pb = st;
    function resize() {
      const parent = canvas.parentElement;
      const w = Math.max(200, Math.floor(opts.width || parent.clientWidth || 600));
      // aspect·height·minHeight·maxHeight는 폭을 받는 함수여도 된다(좁은 화면에서 패널을 쌓을 때)
      const val = (v) => (typeof v === "function" ? v(w) : v);
      let h = val(opts.height) || Math.round(w * (val(opts.aspect) || 0.5));
      if (val(opts.minHeight)) h = Math.max(h, val(opts.minHeight));
      if (val(opts.maxHeight)) h = Math.min(h, val(opts.maxHeight));
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
    PB.onTheme(() => { famSans = famMono = ""; st.redraw(); });
    // hover: true → 포인터 위치를 추적해 다시 그린다(PB.chart의 hover 십자선이 이를 쓴다).
    // 그리기 함수가 난수를 쓰면 움직일 때마다 결과가 바뀌므로 결정적인 그림에만 켠다. 'track'은 위치만 추적(애니메이션 루프용).
    if (opts.hover) PB.pointer(canvas, opts.hover === "track" ? null : () => st.redraw());
    st.pointer = () => canvas._pbPtr || null;
    resize();
    return st;
  };

  /**
   * 캔버스 포인터 추적: canvas._pbPtr = {x, y, type} (CSS px) 또는 null. onMove는 rAF로 묶어 호출.
   * 터치는 손을 떼도 마지막 위치를 유지한다(다시 탭하면 이동).
   */
  PB.pointer = function (canvas, onMove) {
    if (canvas._pbPtrOn) return;
    canvas._pbPtrOn = true;
    let raf = 0;
    const kick = () => { if (onMove && !raf) raf = requestAnimationFrame(() => { raf = 0; onMove(); }); };
    const upd = (e) => {
      const r = canvas.getBoundingClientRect();
      canvas._pbPtr = { x: e.clientX - r.left, y: e.clientY - r.top, type: e.pointerType };
      kick();
    };
    canvas.addEventListener("pointermove", upd);
    canvas.addEventListener("pointerdown", upd);
    canvas.addEventListener("pointerleave", (e) => { if (e.pointerType === "touch") return; canvas._pbPtr = null; kick(); });
  };

  /**
   * 캔버스 드래그: PB.drag(canvas, { hit(x,y)→handle|null, move(handle,x,y,e), end(handle), cursor:'grab' })
   * hit이 null이면 드래그하지 않는다(페이지 스크롤 유지). 좌표는 CSS px.
   * hit은 마우스를 움직일 때 커서 모양을 정하려고도 불리므로 부작용이 없어야 한다(시작 처리는 move의 첫 호출에서).
   */
  PB.drag = function (canvas, o) {
    let cur = null;
    const pos = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    canvas.addEventListener("pointerdown", (e) => {
      const [x, y] = pos(e);
      const h = o.hit ? o.hit(x, y) : true;
      if (h == null || h === false) return;
      cur = h; try { canvas.setPointerCapture?.(e.pointerId); } catch (err) {}
      canvas.style.cursor = "grabbing";
      o.move && o.move(cur, x, y, e);
      e.preventDefault();
    });
    canvas.addEventListener("pointermove", (e) => {
      const [x, y] = pos(e);
      if (cur != null) { o.move && o.move(cur, x, y, e); return; }
      if (e.pointerType === "mouse" && o.hit) { const h = o.hit(x, y); canvas.style.cursor = h != null && h !== false ? (o.cursor || "grab") : ""; }
    });
    const end = () => { if (cur == null) return; const h = cur; cur = null; canvas.style.cursor = ""; o.end && o.end(h); };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
    if (o.touchAction !== false) canvas.style.touchAction = o.touchAction || "pan-y";
  };

  /**
   * 캔버스 위에 떠 있는 정보 상자(DOM). const tip = PB.tip(canvas); tip.show(x, y, html); tip.hide();
   * x, y는 캔버스 CSS px. 부모(.sim-view)는 position: relative.
   */
  PB.tip = function (canvas) {
    if (typeof canvas === "string") canvas = document.querySelector(canvas);
    const el = document.createElement("div");
    el.className = "pb-tip";
    el.setAttribute("role", "status");
    canvas.parentElement.appendChild(el);
    return {
      el,
      show(x, y, html) {
        el.innerHTML = html; el.classList.add("on");
        const pw = canvas.parentElement.clientWidth, w = el.offsetWidth, h = el.offsetHeight;
        let left = x + 14, top = y + 14;
        if (left + w > pw - 4) left = Math.max(4, x - w - 14);
        if (top + h > canvas.clientHeight - 4) top = Math.max(4, y - h - 10);
        el.style.left = left + canvas.offsetLeft + "px"; el.style.top = top + canvas.offsetTop + "px";
      },
      hide() { el.classList.remove("on"); },
    };
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
   * 선 그래프. box = {x,y,w,h}(생략 시 캔버스 전체에 여백 자동)
   * opts: { x:[min,max], y:[min,max], logX, logY, xLabel, yLabel, xTicks, yTicks, xFmt, yFmt,
   *         series:[{data:[[x,y],...], color, width, dash, fill(색 | true=그라데이션), label, fmt, dots(반지름), line:false,
   *                  legend:false, hover:false}],
   *         vlines:[{x,color,label,dash,width}], hlines:[{y,color,label,dash,width,align:'left',labelPos:'below'}], points:[{x,y,color,r,label,ring}],
   *         bands:[{x0,x1,color,label,labelPos:'top'|'bottom'}], hbands:[{y0,y1,color,label}],
   *         legend: true | 'auto'|'tl'|'tr'|'bl'|'br'|'above' | {pos, cols, items:[{label,color,dash,type:'line'|'box'|'dot'}]}
   *           ('above'는 그림 영역 위 바깥 한 줄 — box 위에 줄당 ~18px 여백), 반환값 legend = {x,y,w,h}(그린 범례 자리),
   *         hover: true | {xFmt, yFmt, xLabel, all} — PB.canvas(…, {hover:true})로 만든 캔버스에서 십자선·값 상자,
   *         onHover(h), after(ctx, {X,Y,invX,invY,box}) 범례·hover 전에 덧그리기, minor(로그 축 보조 눈금, 기본 true), grid:false }
   * 모든 글자는 PB.text 서식(V_DD, C_{BL}, 10^{-9})을 따른다.
   * 반환: { X(v)->px, Y(v)->px, invX(px)->v, invY(px)->v, box, hover: {x, px, values:[{label,y,color}]} | null }
   */
  const supExp = (e) => String(e).replace("-", "−");
  /** 숫자 → 서식 문자열(지수는 10^{n}): PB.num(4.9e-9) → "4.9×10^{−9}" */
  PB.num = function (v, digits = 3) {
    if (!isFinite(v)) return "—";
    const s = PB.fmt(v, digits);
    const m = s.match(/^(-?[\d.]+)e([+-]?\d+)$/);
    if (!m) return s.replace(/^-/, "−");
    const mant = Number(m[1]), e = Number(m[2]);
    return (mant === 1 ? "" : mant === -1 ? "−" : String(mant).replace("-", "−") + "×") + "10^{" + supExp(e) + "}";
  };
  function logTickFmt(v) {
    const e = Math.floor(Math.log10(v) + 1e-9), mant = Number((v / Math.pow(10, e)).toPrecision(2));
    if (e >= -2 && e <= 4) return String(Number(v.toPrecision(3)));
    return (mant === 1 ? "" : mant + "×") + "10^{" + supExp(e) + "}";
  }
  function linTickFmt(v) {
    if (v === 0) return "0";
    const a = Math.abs(v);
    if (a >= 1e5 || a < 1e-3) {
      const e = Math.floor(Math.log10(a) + 1e-9), m = Number((v / Math.pow(10, e)).toPrecision(3));
      return (m === 1 ? "" : m === -1 ? "−" : String(m).replace("-", "−") + "×") + "10^{" + supExp(e) + "}";
    }
    return String(Number(v.toPrecision(4))).replace("-", "−");
  }
  function niceTicks(a, b, log, n, room) {
    if (log) {
      const la = Math.log10(a), lb = Math.log10(b);
      const out = [];
      const span = lb - la;
      let step = 1;
      if (room && span / step > room) step = Math.ceil(span / room);
      for (let e = Math.ceil(la - 1e-9); e <= lb + 1e-9; e++) if (e % step === 0 || step === 1) out.push(Math.pow(10, e));
      if (out.length < 3 && span <= 2.5) {
        // 한두 자리 범위: 1·2·5 눈금
        const extra = [];
        for (let e = Math.floor(la) - 1; e <= Math.ceil(lb); e++) [1, 2, 5].forEach((m) => { const v = m * Math.pow(10, e); if (v >= a * (1 - 1e-9) && v <= b * (1 + 1e-9)) extra.push(v); });
        return extra.sort((p, q) => p - q);
      }
      return out;
    }
    const span = b - a, raw = span / (n || 5), mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= (n || 5) + 0.5) || raw;
    const out = []; for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + step * 1e-6; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
    return out;
  }
  function minorLogTicks(a, b) {
    const out = [];
    for (let e = Math.floor(Math.log10(a)); e <= Math.ceil(Math.log10(b)); e++) for (let m = 2; m <= 9; m++) { const v = m * Math.pow(10, e); if (v > a && v < b) out.push(v); }
    return out;
  }
  PB.ticks = niceTicks;

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
    const invX = (px) => { const u = lx(x0) + ((px - box.x) / box.w) * (lx(x1) - lx(x0)); return opts.logX ? Math.pow(10, u) : u; };
    const invY = (py) => { const u = ly(y0) + ((box.y + box.h - py) / box.h) * (ly(y1) - ly(y0)); return opts.logY ? Math.pow(10, u) : u; };
    const powFmt = (v) => { const e = Math.floor(Math.log10(v) + 1e-9), mant = Number((v / Math.pow(10, e)).toPrecision(2)); return (mant === 1 ? "" : mant + "×") + "10^{" + supExp(e) + "}"; };
    const logFmtFor = (a, b) => { const e0 = Math.floor(Math.log10(a) + 1e-9), e1 = Math.ceil(Math.log10(b) - 1e-9); return e0 < -2 || e1 > 4 ? powFmt : logTickFmt; };
    const xFmt = opts.xFmt || (opts.logX ? logFmtFor(x0, x1) : linTickFmt), yFmt = opts.yFmt || (opts.logY ? logFmtFor(y0, y1) : linTickFmt);
    const crisp = (v) => Math.round(v) + 0.5;
    const series = opts.series || [];
    const colorOf = (s, i) => s.color || P.series[i % P.series.length];
    const monoF = PB.font(11, 400, true), sansF = PB.font(12, 400);
    ctx.save();
    ctx.font = monoF;
    ctx.lineWidth = 1;
    // bands
    // 띠는 그림 영역 밖으로 넘치지 않게 자른다
    const clampX = (v) => Math.max(box.x, Math.min(box.x + box.w, v)), clampY = (v) => Math.max(box.y, Math.min(box.y + box.h, v));
    const bandLabels = [];  // 띠 이름은 선·곡선 위에 오도록 맨 나중에 그린다
    (opts.bands || []).forEach((b) => {
      const a = clampX(X(b.x0)), c = clampX(X(b.x1));
      if (Math.abs(c - a) < 0.5) return;
      ctx.fillStyle = b.color || PB.alpha(P.accent, 0.08); ctx.fillRect(Math.min(a, c), box.y, Math.abs(c - a), box.h);
      if (b.label) { const bot = b.labelPos === "bottom"; bandLabels.push({ t: b.label, x: (a + c) / 2, y: bot ? box.y + box.h - 4 : box.y + 4, align: "center", base: bot ? "bottom" : "top", color: b.labelColor || P.dim }); }
    });
    (opts.hbands || []).forEach((b) => {
      const a = clampY(Y(b.y0)), c = clampY(Y(b.y1));
      if (Math.abs(c - a) < 0.5) return;
      ctx.fillStyle = b.color || PB.alpha(P.accent, 0.08); ctx.fillRect(box.x, Math.min(a, c), box.w, Math.abs(c - a));
      if (b.label) bandLabels.push({ t: b.label, x: box.x + 6, y: Math.min(a, c) + 3, align: "left", base: "top", color: b.labelColor || P.dim });
    });
    // grid + ticks
    const xt = opts.xTicks || niceTicks(x0, x1, opts.logX, 6, Math.max(2, box.w / 46));
    const yt = opts.yTicks || niceTicks(y0, y1, opts.logY, 5, Math.max(2, box.h / 22));
    if (opts.grid !== false) {
      ctx.strokeStyle = P.grid;
      if (opts.minor !== false) {
        ctx.save(); ctx.globalAlpha = 0.5;
        if (opts.logX && Math.log10(x1 / x0) <= 9) minorLogTicks(x0, x1).forEach((v) => { const px = crisp(X(v)); ctx.beginPath(); ctx.moveTo(px, box.y); ctx.lineTo(px, box.y + box.h); ctx.stroke(); });
        if (opts.logY && Math.log10(y1 / y0) <= 9) minorLogTicks(y0, y1).forEach((v) => { const py = crisp(Y(v)); ctx.beginPath(); ctx.moveTo(box.x, py); ctx.lineTo(box.x + box.w, py); ctx.stroke(); });
        ctx.restore();
      }
      // 로그 축에서 눈금을 건너뛰어 표시하면 격자는 모든 자릿수에 긋는다.
      const xg = opts.logX && !opts.xTicks ? niceTicks(x0, x1, true, 6, 0) : xt;
      const yg = opts.logY && !opts.yTicks ? niceTicks(y0, y1, true, 5, 0) : yt;
      ctx.strokeStyle = P.grid;
      xg.forEach((v) => { const px = X(v); if (px < box.x - 1 || px > box.x + box.w + 1) return; ctx.beginPath(); ctx.moveTo(crisp(px), box.y); ctx.lineTo(crisp(px), box.y + box.h); ctx.stroke(); });
      yg.forEach((v) => { const py = Y(v); if (py < box.y - 1 || py > box.y + box.h + 1) return; ctx.beginPath(); ctx.moveTo(box.x, crisp(py)); ctx.lineTo(box.x + box.w, crisp(py)); ctx.stroke(); });
    }
    ctx.fillStyle = P.dim; ctx.strokeStyle = P.axis;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    xt.forEach((v) => { const px = X(v); if (px < box.x - 1 || px > box.x + box.w + 1) return; ctx.beginPath(); ctx.moveTo(crisp(px), box.y + box.h); ctx.lineTo(crisp(px), box.y + box.h + 4); ctx.stroke(); PB.text(ctx, xFmt(v), px, box.y + box.h + 7); });
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    let yTickW = 0;
    yt.forEach((v) => { const py = Y(v); if (py < box.y - 1 || py > box.y + box.h + 1) return; ctx.beginPath(); ctx.moveTo(box.x - 4, crisp(py)); ctx.lineTo(box.x, crisp(py)); ctx.stroke(); yTickW = Math.max(yTickW, PB.text(ctx, yFmt(v), box.x - 7, py)); });
    ctx.strokeStyle = P.axis;
    ctx.beginPath(); ctx.moveTo(crisp(box.x), box.y); ctx.lineTo(crisp(box.x), crisp(box.y + box.h)); ctx.lineTo(box.x + box.w, crisp(box.y + box.h)); ctx.stroke();
    // axis labels
    ctx.fillStyle = P.dim; ctx.font = sansF;
    if (opts.xLabel) { ctx.textAlign = "center"; ctx.textBaseline = "bottom"; PB.text(ctx, opts.xLabel, box.x + box.w / 2, box.y + box.h + 40); }
    if (opts.yLabel) { ctx.save(); ctx.translate(Math.max(12, Math.min(box.x - 44, box.x - 7 - yTickW - 10)), box.y + box.h / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.textBaseline = "middle"; PB.text(ctx, opts.yLabel, 0, 0); ctx.restore(); }
    // clip plot area
    ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y - 2, box.w + 2, box.h + 4); ctx.clip();
    const valid = (x, y) => isFinite(y) && isFinite(x) && !(opts.logY && y <= 0) && !(opts.logX && x <= 0);
    series.forEach((s, i) => {
      if (!s.data || !s.data.length) return;
      const col = colorOf(s, i);
      if (s.fill) {
        const base = Y(opts.logY ? y0 : PB.clamp(0, y0, y1));
        ctx.beginPath();
        let first = null, last = null;
        s.data.forEach(([x, y]) => { if (!valid(x, y)) return; const px = X(x), py = Y(y); if (!first) { first = px; ctx.moveTo(px, py); } else ctx.lineTo(px, py); last = px; });
        if (first != null) {
          ctx.lineTo(last, base); ctx.lineTo(first, base); ctx.closePath();
          if (s.fill === true) { const g = ctx.createLinearGradient(0, box.y, 0, box.y + box.h); g.addColorStop(0, PB.alpha(col, 0.26)); g.addColorStop(1, PB.alpha(col, 0.03)); ctx.fillStyle = g; }
          else ctx.fillStyle = s.fill;
          ctx.fill();
        }
      }
      if (s.line !== false) {
        ctx.strokeStyle = col;
        ctx.lineWidth = s.width || 2; ctx.setLineDash(s.dash || []);
        ctx.lineJoin = "round"; ctx.lineCap = s.dash ? "butt" : "round";
        ctx.beginPath();
        let started = false;
        s.data.forEach(([x, y]) => { if (!valid(x, y)) { started = false; return; } const px = X(x), py = Y(y); started ? ctx.lineTo(px, py) : ctx.moveTo(px, py); started = true; });
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (s.dots) {
        ctx.fillStyle = col;
        s.data.forEach(([x, y]) => { if (!valid(x, y)) return; ctx.beginPath(); ctx.arc(X(x), Y(y), s.dots, 0, Math.PI * 2); ctx.fill(); });
      }
    });
    ctx.font = PB.font(11.5, 600);
    (opts.vlines || []).forEach((l) => { const px = X(l.x); ctx.strokeStyle = l.color || P.faint; ctx.setLineDash(l.dash || [4, 4]); ctx.lineWidth = l.width || 1.2; ctx.beginPath(); ctx.moveTo(px, box.y); ctx.lineTo(px, box.y + box.h); ctx.stroke(); ctx.setLineDash([]); if (l.label) { ctx.fillStyle = l.color || P.dim; const right = px > box.x + box.w * 0.82; ctx.textAlign = right ? "right" : "left"; ctx.textBaseline = "top"; PB.text(ctx, l.label, px + (right ? -4 : 4), box.y + 4, { halo: true }); } });
    (opts.hlines || []).forEach((l) => { const py = Y(l.y); ctx.strokeStyle = l.color || P.faint; ctx.setLineDash(l.dash || [4, 4]); ctx.lineWidth = l.width || 1.2; ctx.beginPath(); ctx.moveTo(box.x, py); ctx.lineTo(box.x + box.w, py); ctx.stroke(); ctx.setLineDash([]); if (l.label) { ctx.fillStyle = l.color || P.dim; const left = l.align === "left"; ctx.textAlign = left ? "left" : "right"; const below = l.labelPos === "below" || py < box.y + 16; ctx.textBaseline = below ? "top" : "bottom"; PB.text(ctx, l.label, left ? box.x + 4 : box.x + box.w - 4, below ? py + 3 : py - 3, { halo: true }); } });
    const ptLabels = [];
    (opts.points || []).forEach((p) => {
      const px = X(p.x), py = Y(p.y);
      ctx.fillStyle = p.color || P.accent; ctx.beginPath(); ctx.arc(px, py, p.r || 4, 0, Math.PI * 2); ctx.fill();
      if (p.ring !== false) { ctx.lineWidth = 1.5; ctx.strokeStyle = P.bg; ctx.stroke(); }
      if (p.label) ptLabels.push([p, px, py]);
    });
    ctx.restore();
    bandLabels.forEach((l) => PB.text(ctx, l.t, l.x, l.y, { font: PB.font(11, 600), color: l.color, align: l.align, baseline: l.base, halo: true }));
    // 점 라벨은 그림 영역 자르기 밖에서 그린다(위 가장자리 근처 점의 라벨이 잘리지 않게), 캔버스 안으로 당긴다
    ptLabels.forEach(([p, px, py]) => {
      if (px < box.x - 1 || px > box.x + box.w + 1 || py < box.y - 1 || py > box.y + box.h + 1) return;
      ctx.font = PB.font(11.5, 600);
      const right = px > box.x + box.w * 0.78, below = py - 5 - 15 < 2;
      ctx.fillStyle = p.labelColor || P.text; ctx.textAlign = right ? "right" : "left"; ctx.textBaseline = below ? "top" : "bottom";
      PB.text(ctx, p.label, px + (right ? -7 : 7), below ? py + 5 : py - 5, { halo: true });
    });

    // legend
    // after: 곡선·선 다음, 범례·hover 상자 전에 덧그리기(덧그림이 hover 상자를 덮지 않게)
    if (opts.after) { ctx.save(); try { opts.after(ctx, { X, Y, invX, invY, box }); } finally { ctx.restore(); } }
    const lg = opts.legend;
    let legendRect = null;
    if (lg) {
      const items = [];
      series.forEach((s, i) => { if (s.label && s.legend !== false) items.push({ label: s.label, color: colorOf(s, i), dash: s.dash, width: s.width, type: s.legendType || (s.line === false ? (s.dots ? "dot" : "box") : "line") }); });
      ((lg && lg.items) || []).forEach((it) => items.push(it));
      const lpos = typeof lg === "string" ? lg : (lg.pos || "auto");
      const swatch = (it, ix, iy, sw) => {
        ctx.strokeStyle = it.color; ctx.fillStyle = it.color;
        if (it.type === "dot") { ctx.beginPath(); ctx.arc(ix + sw / 2, iy, 3.5, 0, Math.PI * 2); ctx.fill(); }
        else if (it.type === "box") { PB.rrect(ctx, ix + 2, iy - 5, sw - 4, 10, 2); ctx.fillStyle = PB.alpha(it.color, 0.35); ctx.fill(); ctx.lineWidth = 1; ctx.stroke(); }
        else { ctx.lineWidth = Math.min(3, it.width || 2); ctx.setLineDash(it.dash || []); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(ix + sw, iy); ctx.stroke(); ctx.setLineDash([]); }
      };
      if (items.length && lpos === "above") {
        // 그림 영역 위 바깥에 한 줄(넘치면 여러 줄)로, 오른쪽 정렬. 호출자가 box 위에 줄당 ~18px을 비워 둔다.
        ctx.font = PB.font(11.5, 500);
        const sw = 16, gap = 14, rh = 17;
        const ws = items.map((it) => sw + 5 + PB.textWidth(ctx, it.label));
        const lines = [[]]; let lineW = 0;
        ws.forEach((w, k) => { if (lines[lines.length - 1].length && lineW + gap + w > box.w) { lines.push([]); lineW = 0; } lineW += (lines[lines.length - 1].length ? gap : 0) + w; lines[lines.length - 1].push(k); });
        ctx.textAlign = "left"; ctx.textBaseline = "middle";
        let minX = Infinity;
        lines.forEach((ln, r) => {
          const tw = ln.reduce((a, k, j) => a + ws[k] + (j ? gap : 0), 0);
          let ix = box.x + box.w - tw; minX = Math.min(minX, ix);
          const iy = box.y - 9 - (lines.length - 1 - r) * rh;
          ln.forEach((k) => { swatch(items[k], ix, iy, sw); ctx.fillStyle = P.text; PB.text(ctx, items[k].label, ix + sw + 5, iy); ix += ws[k] + gap; });
        });
        legendRect = { x: minX, y: box.y - 9 - (lines.length - 1) * rh - rh / 2, w: box.x + box.w - minX, h: lines.length * rh };
      } else if (items.length) {
        ctx.font = PB.font(11.5, 500);
        const cols = Math.max(1, (lg && lg.cols) || 1), rows = Math.ceil(items.length / cols), rh = 17, pad = 8, sw = 18;
        const colW = Math.max(...items.map((it) => PB.textWidth(ctx, it.label))) + sw + 6;
        const lw = cols * colW + (cols - 1) * 12 + pad * 2, lh = rows * rh + pad + 2;
        const pos = lpos;
        const cand = { tr: [box.x + box.w - lw - 6, box.y + 6], tl: [box.x + 6, box.y + 6], br: [box.x + box.w - lw - 6, box.y + box.h - lh - 6], bl: [box.x + 6, box.y + box.h - lh - 6] };
        let at = cand[pos];
        if (!at) {
          // 자동: 데이터가 가장 적게 지나가는 모서리
          let best = Infinity;
          ["tr", "tl", "br", "bl"].forEach((k) => {
            const [cx, cy] = cand[k]; let n = 0;
            const inBox = (px, py) => px >= cx - 4 && px <= cx + lw + 4 && py >= cy - 4 && py <= cy + lh + 4;
            series.forEach((s) => {
              const d = s.data || [];
              d.forEach(([x, y], j) => { if (j % 2 && d.length > 200) return; if (!valid(x, y)) return; if (inBox(X(x), Y(y))) n++; });
              // 점이 적은 시리즈(직선·꺾은선)는 선분 위도 표본을 찍어 본다
              if (d.length > 1 && d.length < 60 && s.line !== false) for (let j = 1; j < d.length; j++) {
                const [x0, y0] = d[j - 1], [x1, y1] = d[j];
                if (!valid(x0, y0) || !valid(x1, y1)) continue;
                const ax = X(x0), ay = Y(y0), bx = X(x1), by = Y(y1), m = Math.min(24, Math.ceil(Math.hypot(bx - ax, by - ay) / 12));
                for (let t = 1; t < m; t++) if (inBox(ax + ((bx - ax) * t) / m, ay + ((by - ay) * t) / m)) n++;
              }
            });
            const hit = (px, py) => px >= cx - 4 && px <= cx + lw + 4 && py >= cy - 4 && py <= cy + lh + 4;
            const hitR = (x0, y0, x1, y1) => x1 >= cx - 4 && x0 <= cx + lw + 4 && y1 >= cy - 4 && y0 <= cy + lh + 4;
            const lf = { font: PB.font(11.5, 600) };
            // 선 라벨은 글자 폭 전체로 겹침을 본다(선 위치만 보면 긴 라벨을 범례가 가린다)
            (opts.vlines || []).forEach((l) => {
              if (!l.label) return;
              const px = X(l.x), tw = PB.textWidth(ctx, l.label, lf), right = px > box.x + box.w * 0.82;
              if (hitR(right ? px - 4 - tw : px + 4, box.y + 3, right ? px - 4 : px + 4 + tw, box.y + 19)) n += 40;
            });
            (opts.hlines || []).forEach((l) => {
              if (!l.label) return;
              const py = Y(l.y), tw = PB.textWidth(ctx, l.label, lf), left = l.align === "left", below = l.labelPos === "below" || py < box.y + 16;
              const x0 = left ? box.x + 4 : box.x + box.w - 4 - tw;
              if (hitR(x0, below ? py + 2 : py - 17, x0 + tw, below ? py + 17 : py - 2)) n += 40;
            });
            (opts.bands || []).forEach((b) => {
              if (!b.label) return;
              const a = Math.max(box.x, Math.min(box.x + box.w, X(b.x0))), c = Math.max(box.x, Math.min(box.x + box.w, X(b.x1))), tw = PB.textWidth(ctx, b.label, { font: PB.font(11, 600) });
              const bot = b.labelPos === "bottom", ty = bot ? box.y + box.h - 18 : box.y + 3;
              if (hitR((a + c) / 2 - tw / 2, ty, (a + c) / 2 + tw / 2, ty + 15)) n += 40;
            });
            (opts.points || []).forEach((p) => { if (hit(X(p.x), Y(p.y))) n += 20; });
            if (n < best) { best = n; at = cand[k]; }
          });
        }
        const [lx0, ly0] = at;
        legendRect = { x: lx0, y: ly0, w: lw, h: lh };
        PB.rrect(ctx, lx0, ly0, lw, lh, 7);
        ctx.fillStyle = PB.alpha(P.bg, 0.9); ctx.fill();
        ctx.strokeStyle = P.border; ctx.lineWidth = 1; ctx.stroke();
        ctx.textAlign = "left"; ctx.textBaseline = "middle";
        items.forEach((it, k) => {
          const c = Math.floor(k / rows), r = k % rows;
          const ix = lx0 + pad + c * (colW + 12), iy = ly0 + pad / 2 + 1 + r * rh + rh / 2;
          swatch(it, ix, iy, sw);
          ctx.fillStyle = P.text; PB.text(ctx, it.label, ix + sw + 6, iy);
        });
      }
    }

    // hover crosshair
    let hov = null;
    const ptr = opts.hover && ctx.canvas._pbPtr;
    if (ptr) {
      let lp = { x: ptr.x, y: ptr.y };
      try { const m = ctx.getTransform(); if (m && m.inverse) { const q = m.inverse().transformPoint(new DOMPoint(ptr.x * dpr, ptr.y * dpr)); lp = { x: q.x, y: q.y }; } } catch (e) {}
      if (lp.x >= box.x && lp.x <= box.x + box.w && lp.y >= box.y - 6 && lp.y <= box.y + box.h + 6) {
        const ho = typeof opts.hover === "object" ? opts.hover : {};
        const xv = invX(lp.x);
        const anyLabel = series.some((s) => s.label);
        const vals = [];
        series.forEach((s, i) => {
          if (s.hover === false || !s.data || s.data.length < 2) return;
          if (anyLabel && !s.label && !ho.all) return;
          const d = s.data, asc = d[d.length - 1][0] >= d[0][0];
          let lo = 0, hi = d.length - 1;
          const xa = asc ? d[0][0] : d[hi][0], xb = asc ? d[hi][0] : d[0][0];
          if (!(xv >= xa && xv <= xb)) return;
          while (hi - lo > 1) { const mid = (lo + hi) >> 1; if ((d[mid][0] <= xv) === asc) lo = mid; else hi = mid; }
          const [ax, ay] = d[lo], [bx, by] = d[hi];
          if (!valid(ax, ay) || !valid(bx, by)) return;
          const t = lx(bx) === lx(ax) ? 0 : (lx(xv) - lx(ax)) / (lx(bx) - lx(ax));
          const yv = opts.logY ? Math.pow(10, ly(ay) + t * (ly(by) - ly(ay))) : ay + t * (by - ay);
          vals.push({ label: s.label || "", y: yv, color: colorOf(s, i), fmt: s.fmt });
        });
        ctx.save();
        ctx.strokeStyle = P.dim; ctx.globalAlpha = 0.7; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(crisp(lp.x), box.y); ctx.lineTo(crisp(lp.x), box.y + box.h); ctx.stroke();
        ctx.restore();
        vals.forEach((v) => { const py = Y(v.y); if (py < box.y - 2 || py > box.y + box.h + 2) return; ctx.beginPath(); ctx.arc(lp.x, py, 4, 0, Math.PI * 2); ctx.fillStyle = v.color; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.bg; ctx.stroke(); });
        const hx = ho.xFmt ? ho.xFmt(xv) : PB.num(xv, 3);
        const head = (ho.xLabel || "") + hx;
        const rows = vals.map((v) => ({ c: v.color, t: (v.label ? v.label + "  " : "") + (v.fmt || ho.yFmt || ((y) => PB.num(y, 3)))(v.y) }));
        ctx.font = PB.font(11.5, 500);
        const tw = Math.max(PB.textWidth(ctx, head, { font: PB.font(11.5, 700) }), ...rows.map((r) => PB.textWidth(ctx, r.t) + 14)) + 16;
        const th = 20 + rows.length * 16;
        let tx = lp.x + 12; if (tx + tw > box.x + box.w + 14 || tx + tw > W - 2) tx = lp.x - 12 - tw;
        tx = Math.max(2, Math.min(tx, W - tw - 2));
        let ty = PB.clamp(lp.y - th / 2, box.y, Math.max(box.y, box.y + box.h - th));
        PB.rrect(ctx, tx, ty, tw, th, 7);
        ctx.fillStyle = PB.alpha(P.bg, 0.94); ctx.fill(); ctx.strokeStyle = P.border; ctx.lineWidth = 1; ctx.stroke();
        ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillStyle = P.text; PB.text(ctx, head, tx + 8, ty + 11, { font: PB.font(11.5, 700) });
        rows.forEach((r, k) => {
          const ry = ty + 27 + k * 16;
          ctx.fillStyle = r.c; ctx.beginPath(); ctx.arc(tx + 12, ry, 3.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = P.text; PB.text(ctx, r.t, tx + 22, ry, { font: PB.font(11.5, 500) });
        });
        hov = { x: xv, px: lp.x, values: vals.map((v) => ({ label: v.label, y: v.y, color: v.color })) };
      }
    }
    ctx.restore();
    if (opts.onHover) opts.onHover(hov);
    return { X, Y, invX, invY, box, hover: hov, legend: legendRect };
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
      if (out) { const txt = fmt ? fmt(v) : String(v); if (/<\/?[a-z][^>]*>/i.test(txt)) out.innerHTML = txt; else out.textContent = txt; }
      if (fire && onInput) onInput(v);
    };
    el.addEventListener("input", () => update(true));
    update(false);
    const get = () => Number(el.value);
    get.set = (v) => { el.value = v; update(true); };
    get.refresh = () => update(false);  // min/max를 코드로 바꾼 뒤 출력·채움을 다시 맞춘다
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
   * three.js 씬 준비 (전역 THREE, THREE.OrbitControls 필요. THREE.RoomEnvironment를 불러 두면 금속 반사용 환경광을 쓴다).
   *   const T = PB.three(containerEl, { camera:[x,y,z], target:[x,y,z], fov:40, autoRotate:false, env:true, exposure:1 });
   *   T.scene, T.camera, T.renderer, T.controls, T.THREE
   *   T.onFrame((dt,t)=>{...});
   *   T.label('텍스트', Vector3|[x,y,z], cls) → HTML 라벨. 화면에 투영하고, 겹치면 위아래로 비켜서 지시선을 긋는다.
   *     L.obj = mesh(로컬 좌표 추종), L.setVisible(v), L.setText(html), L.priority(클수록 먼저 자리 잡음), L.remove()
   *   T.material(color, opts)  → MeshStandardMaterial 헬퍼
   *   T.fit(object3D, {pad:1.08, dir:[x,y,z], target:[x,y,z]}) 카메라가 물체를 꽉 차게 본다(사용자가 돌리기 전까지 리사이즈 때 유지)
   *   T.ground(y, size, opacity) 바닥 접촉 그림자 · T.edges(mesh, color, opacity) 윤곽선
   *   T.pick(objects | () => objects, {click(obj, hit, e), hover(obj, hit, e)}) 레이캐스트 선택(드래그와 구분)
   * 조명(환경광+방향광 2개), 리사이즈, 화면 밖 일시정지 포함.
   */
  const SVGNS = "http://www.w3.org/2000/svg";
  PB.three = function (container, opts = {}) {
    if (typeof container === "string") container = document.querySelector(container);
    if (!window.THREE) { container.innerHTML = '<p style="padding:20px;color:var(--text-dim)">3D 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인하세요.</p>'; return null; }
    const THREE = window.THREE;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch (e) { container.innerHTML = '<p style="padding:20px;color:var(--text-dim)">이 브라우저에서 WebGL을 쓸 수 없어 3D 모델을 표시하지 못했습니다.</p>'; return null; }
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
    // 환경광: 금속(TiN·W·Cu)이 주변을 비춰 재질감이 산다. 없으면 기존 3점 조명만.
    let frameEI = null;
    // 색 관리: 재질의 16진 색을 sRGB로 해석해 지정한 색 그대로 보이게 한다(legacy 모드는 색이 옅게 뜬다).
    if (THREE.ColorManagement && opts.legacyColor !== true) THREE.ColorManagement.legacyMode = false;
    const useEnv = opts.env !== false && !!THREE.RoomEnvironment && !!THREE.PMREMGenerator;
    if (useEnv) {
      try {
        const pmrem = new THREE.PMREMGenerator(renderer);
        const room = new THREE.RoomEnvironment();
        scene.environment = pmrem.fromScene(room, 0.04).texture;
        room.dispose && room.dispose(); pmrem.dispose();
      } catch (e) { scene.environment = null; }
    }
    const envOn = !!scene.environment;
    // 톤 매핑 없이 약한 환경광 + 3점 조명: 금속 하이라이트는 살리고 재질 색은 바래지 않게(ACES는 색이 옅어진다).
    if (envOn && opts.toneMapping === "aces" && THREE.ACESFilmicToneMapping != null) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = opts.exposure || 1.05;
    }
    const LI = opts.lights || (envOn ? [0.9, 1.5, 0.45] : [1.35, 1.6, 0.6]);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x445066, LI[0]); scene.add(hemi);
    const d1 = new THREE.DirectionalLight(0xffffff, LI[1]); d1.position.set(5, 10, 7); scene.add(d1);
    const d2 = new THREE.DirectionalLight(0xbfd7ff, LI[2]); d2.position.set(-6, 4, -5); scene.add(d2);
    if (envOn) {
      // 환경광 세기: 금속은 반사가 살도록 강하게, 유전체(산화막·기판·플라스틱)는 색이 바래지 않게 약하게.
      // 재질에 userData.env = 값을 주면 그 값을 쓴다. 30프레임마다 새 재질을 찾아 적용한다.
      const pick = (m) => (m.userData && m.userData.env != null ? m.userData.env : opts.envIntensity != null ? opts.envIntensity : m.metalness >= 0.4 ? 0.85 : m.metalness >= 0.15 ? 0.45 : 0.22);
      const setEI = () => scene.traverse((o) => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; ms.forEach((m) => { if (m && "envMapIntensity" in m && m.userData.pbEI !== m.metalness) { m.envMapIntensity = pick(m); m.userData.pbEI = m.metalness; } }); });
      let n = 0; frameEI = () => { if (n++ % 30 === 0) setEI(); };
    }

    const labelLayer = document.createElement("div");
    labelLayer.className = "pb-3d-labels";
    labelLayer.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden";
    const leaders = document.createElementNS(SVGNS, "svg");
    leaders.setAttribute("class", "pb-3d-leaders");
    leaders.setAttribute("aria-hidden", "true");
    labelLayer.appendChild(leaders);
    container.appendChild(labelLayer);
    const labels = [];
    const frameCbs = [];
    const T = { THREE, scene, camera, renderer, controls, container, labels, lights: { hemi, d1, d2 }, env: envOn };
    T.onFrame = (cb) => frameCbs.push(cb);
    let labelSeq = 0;
    T.label = function (text, pos, cls) {
      const el = document.createElement("div");
      el.className = "overlay-label" + (cls ? " " + cls : "");
      el.innerHTML = text;
      labelLayer.appendChild(el);
      const line = document.createElementNS(SVGNS, "path");
      const dot = document.createElementNS(SVGNS, "circle");
      dot.setAttribute("r", "2.6");
      line.style.display = dot.style.display = "none";
      leaders.appendChild(line); leaders.appendChild(dot);
      const L = { el, line, dot, pos: pos.clone ? pos.clone() : new THREE.Vector3(...pos), visible: true, obj: null, priority: 0, idx: labelSeq++, off: 0, slot: 0, w: 0, h: 0, _t: null };
      L.setVisible = (v) => { L.visible = v; el.style.display = v ? "" : "none"; if (!v) line.style.display = dot.style.display = "none"; };
      L.setText = (html) => { el.innerHTML = html; L._t = null; };
      L.remove = () => { el.remove(); line.remove(); dot.remove(); const i = labels.indexOf(L); if (i >= 0) labels.splice(i, 1); };
      labels.push(L);
      return L;
    };
    T.material = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.55, metalness: 0.05 }, o));

    let userMoved = false;
    if (controls) controls.addEventListener("start", () => { userMoved = true; });
    let fitReq = null;
    function doFit() {
      if (!fitReq) return;
      const { obj, o } = fitReq;
      const box = obj.isBox3 ? obj.clone() : new THREE.Box3().setFromObject(obj);
      if (box.isEmpty()) return;
      const tgt = o.target ? new THREE.Vector3(...o.target) : box.getCenter(new THREE.Vector3());
      const dir = o.dir ? new THREE.Vector3(...o.dir).normalize() : camera.position.clone().sub(controls ? controls.target : tgt).normalize();
      const corners = [];
      for (let i = 0; i < 8; i++) corners.push(new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z));
      let d = box.getBoundingSphere(new THREE.Sphere()).radius / Math.sin((camera.fov * Math.PI) / 360);
      const pad = o.pad || 1.08, p = new THREE.Vector3();
      for (let it = 0; it < 5; it++) {
        camera.position.copy(tgt).addScaledVector(dir, d); camera.lookAt(tgt); camera.updateMatrixWorld(true);
        let m = 0;
        corners.forEach((c) => { p.copy(c).project(camera); m = Math.max(m, Math.abs(p.x), Math.abs(p.y)); });
        if (!(m > 0)) break;
        d *= Math.pow(m * pad, 0.9);
      }
      camera.position.copy(tgt).addScaledVector(dir, d);
      if (controls) {
        controls.target.copy(tgt);
        if (o.limits !== false) { controls.minDistance = Math.min(controls.minDistance || Infinity, d * 0.35); controls.maxDistance = Math.max(controls.maxDistance || 0, d * 2.4); }
        controls.update();
      } else camera.lookAt(tgt);
      camera.near = Math.max(0.01, d / 200); camera.far = d * 50; camera.updateProjectionMatrix();
    }
    T.fit = function (obj, o = {}) { fitReq = { obj, o }; userMoved = false; doFit(); };
    T.ground = function (y = 0, size = 20, opacity = 0.3, scaleZ = 1) {
      const cv = document.createElement("canvas"); cv.width = cv.height = 128;
      const g = cv.getContext("2d"), grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grd.addColorStop(0, "rgba(0,0,0,1)"); grd.addColorStop(0.55, "rgba(0,0,0,0.45)"); grd.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
      const tex = new THREE.CanvasTexture(cv);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, depthWrite: false });
      mat.toneMapped = false;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size * scaleZ), mat);
      m.rotation.x = -Math.PI / 2; m.position.y = y; m.renderOrder = -1;
      scene.add(m);
      return m;
    };
    T.edges = function (mesh, color = 0x0b1220, opacity = 0.28, threshold = 20) {
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, threshold), new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
      e.raycast = () => {};
      mesh.add(e);
      return e;
    };
    T.pick = function (objects, o = {}) {
      const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), dom = renderer.domElement;
      let down = null, hov = null;
      const hitAt = (e) => {
        const r = dom.getBoundingClientRect();
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        const list = (typeof objects === "function" ? objects() : objects).filter((m) => m.visible !== false);
        return ray.intersectObjects(list, o.recursive !== false)[0] || null;
      };
      dom.addEventListener("pointerdown", (e) => { down = [e.clientX, e.clientY]; });
      dom.addEventListener("pointerup", (e) => {
        if (!down) return;
        const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]); down = null;
        if (moved > 5 || !o.click) return;
        const h = hitAt(e); o.click(h ? h.object : null, h, e);
      });
      if (o.hover) {
        dom.addEventListener("pointermove", (e) => {
          if (e.buttons || e.pointerType !== "mouse") return;
          const h = hitAt(e), obj = h ? h.object : null;
          if (obj !== hov) { hov = obj; dom.style.cursor = obj ? "pointer" : ""; }
          o.hover(obj, h, e);
        });
        dom.addEventListener("pointerleave", () => { if (hov) { hov = null; dom.style.cursor = ""; } o.hover(null, null, null); });
      }
    };

    function resize() {
      const w = container.clientWidth, h = container.clientHeight || 400;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = w + "px"; renderer.domElement.style.height = h + "px";
      camera.aspect = w / h; camera.updateProjectionMatrix();
      if (fitReq && !userMoved) doFit();
    }
    if (window.ResizeObserver) new ResizeObserver(resize).observe(container); else window.addEventListener("resize", resize);
    resize();
    const v = new THREE.Vector3();
    const declutter = opts.declutter !== false;
    T.loop = PB.loop(container, (dt, t) => {
      if (frameEI) frameEI();
      frameCbs.forEach((cb) => cb(dt, t));
      if (controls) controls.update();
      renderer.render(scene, camera);
      const W = container.clientWidth, H = container.clientHeight;
      const vis = [];
      labels.forEach((L) => {
        if (!L.visible) return;
        v.copy(L.pos); if (L.obj) L.obj.localToWorld(v);
        v.project(camera);
        if (v.z > 1 || v.z < -1) { L.el.style.display = "none"; L.line.style.display = L.dot.style.display = "none"; return; }
        L.el.style.display = "";
        L.sx = ((v.x + 1) / 2) * W; L.sy = ((1 - v.y) / 2) * H;
        const txt = L.el.textContent;
        if (txt !== L._t || !L.w) { L._t = txt; L.w = L.el.offsetWidth; L.h = L.el.offsetHeight; }
        vis.push(L);
      });
      if (!declutter) {
        vis.forEach((L) => { L.el.style.left = L.sx + "px"; L.el.style.top = L.sy + "px"; });
        return;
      }
      // 겹침 회피: 우선순위 → 생성 순서로 자리를 잡고, 겹치면 위아래 칸으로 비켜 지시선을 긋는다.
      vis.sort((a, b) => (b.priority || 0) - (a.priority || 0) || a.idx - b.idx);
      const placed = [];
      const free = (x, y, w, h) => placed.every((r) => x + w / 2 + 4 < r.x - r.w / 2 || x - w / 2 - 4 > r.x + r.w / 2 || y + h / 2 + 3 < r.y - r.h / 2 || y - h / 2 - 3 > r.y + r.h / 2);
      vis.forEach((L) => {
        const step = L.h + 6, hx = L.w / 2 + 14;
        const x0 = PB.clamp(L.sx, L.w / 2 + 3, W - L.w / 2 - 3);
        // 후보 자리: 제자리 → 이전 자리 → 위아래 칸 → 좌우로 비켜 선 칸(가까운 순)
        const cands = [[0, 0], L.slotXY || [0, 0]];
        for (let k = 1; k <= 5; k++) { cands.push([0, -k], [0, k]); if (k <= 3) cands.push([-1, -k + 1], [1, -k + 1], [-1, k], [1, k]); }
        let pick = null;
        for (const c of cands) {
          const x = PB.clamp(x0 + c[0] * hx, L.w / 2 + 3, W - L.w / 2 - 3), y = L.sy + c[1] * step;
          if (y - L.h / 2 < 2 || y + L.h / 2 > H - 2) continue;
          if (free(x, y, L.w, L.h)) { pick = c; break; }
        }
        if (!pick) pick = [0, 0];
        L.slotXY = pick;
        const tx = PB.clamp(x0 + pick[0] * hx, L.w / 2 + 3, W - L.w / 2 - 3) - L.sx, ty = pick[1] * step;
        const k = dt || 0.016, far = Math.abs((L.ox || 0) - tx) > W / 3 || Math.abs((L.off || 0) - ty) > step * 6;
        L.ox = far ? tx : PB.approach(L.ox || 0, tx, k, 0.07);
        L.off = far ? ty : PB.approach(L.off || 0, ty, k, 0.07);
        const x = L.sx + L.ox, y = PB.clamp(L.sy + L.off, L.h / 2 + 2, H - L.h / 2 - 2);
        placed.push({ x: L.sx + tx, y: L.sy + ty, w: L.w, h: L.h });
        L.el.style.left = x + "px"; L.el.style.top = y + "px";
        const dx = x - L.sx, dy = y - L.sy;
        if (Math.abs(dy) > L.h / 2 + 1 || Math.abs(dx) > L.w / 2 + 1) {
          // 지시선: 앵커에서 라벨 상자의 가장 가까운 점까지
          const ex = PB.clamp(L.sx, x - L.w / 2 + 4, x + L.w / 2 - 4), ey = PB.clamp(L.sy, y - L.h / 2, y + L.h / 2);
          L.line.setAttribute("d", `M${L.sx.toFixed(1)} ${L.sy.toFixed(1)}L${ex.toFixed(1)} ${ey.toFixed(1)}`);
          L.dot.setAttribute("cx", L.sx.toFixed(1)); L.dot.setAttribute("cy", L.sy.toFixed(1));
          L.line.style.display = L.dot.style.display = "";
        } else L.line.style.display = L.dot.style.display = "none";
      });
    });
    return T;
  };

  /* ------------------------------------------------------------ SVG figure kit */
  /* 그림(인라인 SVG)이 함께 쓰는 재질 그라데이션·화살촉·무늬·그림자·캐리어 기호. 문서 전체에서 url(#pb-…)·href="#pb-…"로 참조한다.
     재질: .m-<이름>(위→아래 음영), .mc-<이름>(원기둥 음영). 색은 style.css의 --m-<이름>-1/-2/-e. */
  // 실리콘과 도핑 영역(n·p, n⁺ np·p⁺ pp, n⁻ nm·p⁻ pm), 공정 재질, 화합물 반도체, 접촉 금속, 패키징. .m-sin은 .m-nit과 같다.
  PB.MATERIALS = ["si", "n", "p", "np", "pp", "nm", "pm", "ox", "nit", "poly", "pr", "w", "cu", "al", "tin", "hk", "sil", "epi",
    "ge", "gaas", "algaas", "ingaas", "inp", "gan", "algan", "sic", "metal", "au", "die", "sol", "mold", "pcb", "glass"];
  function injectSvgDefs() {
    if (document.getElementById("pb-svg-defs")) return;
    const st = (v) => `style="stop-color:var(${v})"`;
    const grads = PB.MATERIALS.map((m) =>
      `<linearGradient id="pb-m-${m}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" ${st(`--m-${m}-1`)}/><stop offset="1" ${st(`--m-${m}-2`)}/></linearGradient>` +
      `<linearGradient id="pb-mc-${m}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" ${st(`--m-${m}-2`)}/><stop offset=".32" style="stop-color:color-mix(in srgb, var(--m-${m}-1) 78%, #fff)"/><stop offset=".55" ${st(`--m-${m}-1`)}/><stop offset="1" ${st(`--m-${m}-2`)}/></linearGradient>`
    ).join("");
    const head = (id, color) => `<marker id="${id}" viewBox="0 0 10 10" refX="8.6" refY="5" markerWidth="5.2" markerHeight="5.2" orient="auto-start-reverse"><path d="M0.6 0.9 L10 5 L0.6 9.1 L2.9 5 Z" style="fill:var(${color})"/></marker>`;
    const markers = [["pb-ah", "--text-dim"], ["pb-ah-t", "--text"], ["pb-ah-f", "--text-faint"], ["pb-ah-a", "--accent"], ["pb-ah-a2", "--accent-2"], ["pb-ah-ok", "--ok"], ["pb-ah-warn", "--warn"], ["pb-ah-bad", "--bad"], ["pb-ah-blue", "--blue"], ["pb-ah-red", "--red"], ["pb-ah-e", "--electron"], ["pb-ah-h", "--hole"], ["pb-ah-ef", "--fermi"]].map(([id, c]) => head(id, c)).join("");
    const svg = `<svg id="pb-svg-defs" aria-hidden="true" focusable="false" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden"><defs>${grads}${markers}
      <marker id="pb-dot" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5"><circle cx="5" cy="5" r="3.6" style="fill:var(--text-dim)"/></marker>
      <marker id="pb-dot-a" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5"><circle cx="5" cy="5" r="3.6" style="fill:var(--accent)"/></marker>
      <marker id="pb-bar" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M5 0V10" style="stroke:var(--text-dim);stroke-width:1.6"/></marker>
      <pattern id="pb-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" style="fill:var(--m-hatch-bg)"/><path d="M0 0V7" style="stroke:var(--m-hatch);stroke-width:1.3"/></pattern>
      <pattern id="pb-dots" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="0.9" style="fill:var(--m-hatch)"/></pattern>
      <pattern id="pb-grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" style="fill:none;stroke:var(--grid);stroke-width:1"/></pattern>
      <filter id="pb-sh" x="-15%" y="-15%" width="130%" height="140%"><feDropShadow dx="0" dy="1.4" stdDeviation="1.8" style="flood-color:var(--m-shadow);flood-opacity:1"/></filter>
      <filter id="pb-glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <radialGradient id="pb-qe" cx=".36" cy=".32" r=".72"><stop offset="0" style="stop-color:color-mix(in srgb, var(--electron) 50%, #fff)"/><stop offset="1" style="stop-color:var(--electron)"/></radialGradient>
      <g id="pb-e"><circle r="4.4" class="q-e"/></g>
      <g id="pb-h"><circle r="4.1" class="q-h"/></g>
      <g id="pb-don"><rect x="-5.5" y="-5.5" width="11" height="11" rx="2.6" class="q-don"/><path d="M-3 0H3M0-3V3" class="q-sign q-sign-d"/></g>
      <g id="pb-acc"><rect x="-5.5" y="-5.5" width="11" height="11" rx="2.6" class="q-acc"/><path d="M-3 0H3" class="q-sign q-sign-a"/></g>
      <g id="pb-e-sm"><circle r="3.3" class="q-e"/></g>
      <g id="pb-h-sm"><circle r="3.1" class="q-h"/></g>
    </defs></svg>`;
    document.body.insertAdjacentHTML("afterbegin", svg);
  }

  /* 슬라이더 라벨: <span>이름 V<sub>DD</sub> <output/></span>의 첨자가 flex 항목으로 흩어지지 않도록 이름을 한 덩어리로 감싼다. */
  function enhanceControls(root) {
    (root || document).querySelectorAll(".ctrl > span").forEach((s) => {
      if (s.querySelector(":scope > .ctrl-l")) return;
      const out = s.querySelector(":scope > output");
      const nodes = [...s.childNodes].filter((n) => n !== out);
      if (!nodes.length) return;
      const l = document.createElement("span");
      l.className = "ctrl-l";
      nodes.forEach((n) => l.appendChild(n));
      s.insertBefore(l, out || null);
    });
  }
  /* 체크박스 라벨: <label class="check"><input> 이름 V<sub>DD</sub></label>도 flex 항목으로 흩어지지 않게 글자를 한 덩어리로 감싼다. */
  function enhanceChecks(root) {
    (root || document).querySelectorAll(".check").forEach((c) => {
      if (c.querySelector(":scope > .check-l")) return;
      const nodes = [...c.childNodes].filter((n) => !(n.nodeType === 1 && /^(INPUT|SELECT|BUTTON)$/.test(n.tagName)));
      const meaningful = nodes.filter((n) => n.nodeType === 1 || n.textContent.trim());
      if (meaningful.length < 2) return;
      const l = document.createElement("span");
      l.className = "check-l";
      c.insertBefore(l, nodes[0]);
      nodes.forEach((n) => l.appendChild(n));
    });
  }
  PB.enhanceControls = function (root) { enhanceControls(root); enhanceChecks(root); };

  /* 그림 크게 보기: 모든 figure.diagram에 확대 단추. 모바일에서도 글자를 읽을 수 있게 넓게 펼쳐 보여 준다. */
  let lightbox = null;
  function openLightbox(fig) {
    if (!lightbox) {
      lightbox = document.createElement("dialog");
      lightbox.className = "pb-lightbox";
      lightbox.innerHTML = '<div class="lb-bar"><span class="lb-title"></span><button type="button" class="lb-close" aria-label="닫기">✕</button></div><div class="lb-body"><div class="lb-fig"></div><p class="lb-cap"></p></div>';
      document.body.appendChild(lightbox);
      lightbox.querySelector(".lb-close").addEventListener("click", () => lightbox.close());
      lightbox.addEventListener("click", (e) => { if (e.target === lightbox) lightbox.close(); });
      lightbox.addEventListener("close", () => { lightbox.querySelector(".lb-fig").innerHTML = ""; document.documentElement.classList.remove("pb-lb-open"); });
    }
    const cap = fig.querySelector("figcaption");
    const title = cap && cap.querySelector("b") ? cap.querySelector("b").textContent.replace(/\.\s*$/, "") : "그림";
    lightbox.querySelector(".lb-title").textContent = title;
    const holder = lightbox.querySelector(".lb-fig");
    holder.innerHTML = "";
    fig.querySelectorAll(":scope > svg, :scope > .fig-row, :scope > div:not(.fig-zoom)").forEach((n) => holder.appendChild(n.cloneNode(true)));
    if (!holder.childNodes.length) fig.querySelectorAll("svg").forEach((n) => holder.appendChild(n.cloneNode(true)));
    holder.querySelectorAll(".fig-zoom").forEach((n) => n.remove());
    const capEl = lightbox.querySelector(".lb-cap");
    capEl.innerHTML = cap ? cap.innerHTML : "";
    capEl.querySelectorAll(".gl-term").forEach((t) => t.replaceWith(document.createTextNode(t.textContent)));
    document.documentElement.classList.add("pb-lb-open");
    if (lightbox.showModal) lightbox.showModal(); else lightbox.setAttribute("open", "");
    lightbox.querySelector(".lb-body").scrollTo(0, 0);
  }
  function figureZoom() {
    document.querySelectorAll("figure.diagram").forEach((fig) => {
      if (fig.hasAttribute("data-nozoom") || !fig.querySelector("svg") || fig.querySelector(":scope > .fig-zoom")) return;
      const b = document.createElement("button");
      b.type = "button"; b.className = "fig-zoom";
      b.title = "그림 크게 보기"; b.setAttribute("aria-label", "그림 크게 보기");
      b.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9.5 2.5h4v4M6.5 13.5h-4v-4M13.5 2.5 9.2 6.8M2.5 13.5l4.3-4.3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      b.addEventListener("click", () => openLightbox(fig));
      fig.appendChild(b);
      fig.querySelectorAll(":scope > svg, :scope > .fig-row svg, :scope > .fig-panels > svg").forEach((s) => { s.classList.add("zoomable"); s.addEventListener("click", () => openLightbox(fig)); });
      // 넓은 단일 그림: 좁은 화면에서는 글자를 읽을 만한 크기(약 72 %)로 두고 옆으로 밀어 보게 한다.
      fig.querySelectorAll(":scope > svg").forEach((s) => {
        const vb = s.viewBox && s.viewBox.baseVal;
        if (!vb || vb.width < 560) return;
        const w = document.createElement("div");
        w.className = "fig-scroll";
        s.style.setProperty("--fig-mw", Math.round(vb.width * 0.72) + "px");
        s.parentNode.insertBefore(w, s); w.appendChild(s);
        scrollers.push(w);
        w.addEventListener("scroll", () => markScroll(w), { passive: true });
      });
    });
    scrollers.forEach(markScroll);
    window.addEventListener("resize", () => scrollers.forEach(markScroll));
  }
  const scrollers = [];
  function markScroll(w) {
    const can = w.scrollWidth > w.clientWidth + 2;
    w.classList.toggle("can-scroll", can);
    w.classList.toggle("at-start", w.scrollLeft < 4);
    w.classList.toggle("at-end", !can || w.scrollLeft + w.clientWidth >= w.scrollWidth - 4);
  }
  PB.openFigure = openLightbox;

  /* ------------------------------------------------------------ layout build */
  const LOGO = `<svg class="mark" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="pbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent-2)"/></linearGradient></defs><rect x="2" y="2" width="28" height="28" rx="8" fill="url(#pbg)"/><path d="M6 10h7c3 0 3 6 6 6h7" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M6 18h7c3 0 3 6 6 6h7" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M6 15.5h20" stroke="#fff" stroke-width="1.2" stroke-dasharray="2 2" opacity=".75"/><circle cx="21.5" cy="13.2" r="1.7" fill="#fff"/><circle cx="10" cy="20.8" r="1.7" fill="none" stroke="#fff" stroke-width="1.3"/></svg>`;

  function build() {
    const body = document.body;
    const root = body.dataset.root != null ? body.dataset.root : body.dataset.chapter ? "../" : "";
    const curSlug = body.dataset.chapter || "";
    const href = (slug) => (slug ? `${root}chapters/${slug}.html` : `${root}index.html`);

    // favicon
    if (!document.querySelector('link[rel="icon"]')) { const fi = document.createElement("link"); fi.rel = "icon"; fi.type = "image/svg+xml"; fi.href = root + "favicon.svg"; document.head.appendChild(fi); }

    // top bar: the series standard from @euiyun/book (shared/js/book-ui.js)
    const { bar } = EuiyunBook.topbar({
      name: "DeviceBook", subtitle: "반도체 소자 물리 교과서", logo: LOGO, home: href(""),
      chapters: CHAPTERS, chapterHref: href, feedback: "devicebook",
      theme: { isDark: () => PB.isDark(), set: (next) => { try { localStorage.setItem("semi-theme", next); } catch (e) {} applyTheme(next); } },
    });

    // drawer, pager and footer: the series standard from @euiyun/book (shared/js/book-ui.js)
    EuiyunBook.drawer({ home: href(""), homeLabel: "홈 · 로드맵", chapters: CHAPTERS, chapterHref: href, current: curSlug });

    // chapter page extras
    const main = document.querySelector("main.chapter");
    if (main) {
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

      EuiyunBook.pager({ after: layout, home: href(""), homeLabel: "홈 · 로드맵", chapters: CHAPTERS, chapterHref: href, current: curSlug });
    }
    EuiyunBook.footer({ name: "DeviceBook", note: "공학도를 위한 인터랙티브 반도체 소자 물리 교과서 · 수치는 교육용 근사 모델입니다.", root, feedback: "devicebook" });

    injectSvgDefs();
    enhanceControls();
    enhanceChecks();
    figureZoom();

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
