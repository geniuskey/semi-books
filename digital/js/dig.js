/* Copyright (c) 2026 geniuskey and DigitalBook contributors.
   Executable code: MIT (see ../LICENSE-MIT).
   Educational content and illustrations: CC-BY-4.0 (see ../LICENSE.md). */
/* ==========================================================================
   DigitalBook 디지털 회로 헬퍼 — 전역 객체 DG
   - 기준 공정 DG-7 파라미터, MOSFET 근사 모델(알파 전력 법칙), 인버터 VTC
   - 논리 게이트·트랜지스터 기호 그리기, 타이밍 파형, 포인터, 화살표
   - 이벤트 구동 게이트 수준 논리 시뮬레이터 DG.Circuit
   - 장 머리말의 추상화 사다리 DG.ladder
   common.js 다음에 로드한다.
   ========================================================================== */
(function () {
  "use strict";
  const DG = (window.DG = {});

  /* ------------------------------------------------------------ 색 */
  function hex2rgb(c) {
    c = String(c).trim();
    if (c.startsWith("rgb")) { const m = c.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]]; }
    if (c[0] === "#") c = c.slice(1);
    if (c.length === 3) c = c.split("").map((x) => x + x).join("");
    const n = parseInt(c || "888888", 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  DG.rgb = hex2rgb;
  DG.mix = function (a, b, t) { const A = hex2rgb(a), B = hex2rgb(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`; };
  DG.alpha = function (c, a) { const A = hex2rgb(c); return `rgba(${A[0]},${A[1]},${A[2]},${a})`; };
  /** 0..1 → 파랑-청록-노랑-빨강 열 지도 색 */
  DG.heat = function (t) {
    t = SB.clamp(t, 0, 1);
    const stops = [[0, [40, 70, 160]], [0.35, [30, 170, 190]], [0.65, [245, 200, 60]], [1, [220, 50, 40]]];
    for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) {
      const [a, ca] = stops[i - 1], [b, cb] = stops[i], u = (t - a) / (b - a);
      return `rgb(${ca.map((v, k) => Math.round(v + (cb[k] - v) * u)).join(",")})`;
    }
    return "rgb(220,50,40)";
  };
  /**
   * 논리값 → 색. v: 1/true → --hi, 0/false → --lo, "x"/null/undefined → --lx, "z" → --lz.
   * 0..1 사이 실수(아날로그 전압 비율)를 주면 lo→hi로 섞는다.
   */
  DG.lv = function (v) {
    const P = SB.palette();
    if (v === "z" || v === "Z") return P.z;
    if (v === "x" || v === "X" || v == null || (typeof v === "number" && isNaN(v))) return P.x;
    if (v === true || v === 1) return P.hi;
    if (v === false || v === 0) return P.lo;
    if (typeof v === "number") return DG.mix(P.lo, P.hi, SB.clamp(v, 0, 1));
    return P.x;
  };

  /* ------------------------------------------------------------ 기준 공정 DG-7 */
  /**
   * 책 전체가 함께 쓰는 교육용 기준 공정. 실제 7 nm급 FinFET 공정의 대략적인 크기 감각을 따르되
   * 손으로 계산하기 쉽게 단순화했다. 단위: V, A, F, s, m.
   *   W는 "단위 폭" 배수(1 = 최소 nMOS)로 쓰는 것이 편하다.
   */
  DG.TECH = {
    name: "DG-7",
    desc: "7 nm급 교육용 기준 공정",
    vdd: 0.75,          // 공급 전압
    vtn: 0.30, vtp: 0.30, // 문턱 전압 크기
    alpha: 1.3,          // 알파 전력 법칙 지수 (속도 포화 → 1에 가까움)
    kn: 120e-6,          // 단위 폭 nMOS 포화 계수 (A / V^alpha): Vgs=Vds=Vdd에서 약 50 µA
    mu: 1.6,             // nMOS/pMOS 이동도(구동력) 비 → pMOS를 약 1.6배 넓혀야 대칭
    lambda: 0.35,        // 채널 길이 변조 (1/V) — 짧은 채널이라 크다 (인버터 최대 이득 수십)
    ss: 0.075,           // 부문턱 기울기 (V/decade) — 75 mV/dec
    cg: 0.08e-15,        // 단위 폭 게이트 커패시턴스, F (≈0.08 fF)
    cd: 0.06e-15,        // 단위 폭 드레인 확산 커패시턴스, F
    tau: 1.5e-12,        // 기본 지연 단위 τ = R·C (단위 인버터) ≈ 1.5 ps
    fo4: 7.5e-12,        // FO4 인버터 지연 ≈ 5τ
    wireR: 15,           // 중간층 배선 저항, Ω/µm
    wireC: 0.2e-15,      // 배선 커패시턴스, F/µm
    temp: 25,
  };

  /**
   * MOSFET 드레인 전류 (교육용 근사: 알파 전력 법칙 + 부문턱 + 채널 길이 변조).
   *   DG.ids({vgs, vds, type:"n"|"p", W:1, tech}) → A (항상 ≥0, pMOS는 |Vgs|,|Vds|를 넣는다)
   *   vt 덮어쓰기: {vt:0.25}
   */
  DG.ids = function (o) {
    const T = o.tech || DG.TECH;
    const W = o.W != null ? o.W : 1;
    const vt = o.vt != null ? o.vt : o.type === "p" ? T.vtp : T.vtn;
    const k = (o.type === "p" ? T.kn / T.mu : T.kn) * W;
    const vgs = Math.max(0, o.vgs), vds = Math.max(0, o.vds);
    // 문턱 근처를 부드럽게 잇는 유효 과구동 전압 (EKV식 smoothing).
    // 문턱 아래에서는 vov ≈ vt0·e^((Vgs−Vt)/vt0) → 전류가 ss(V/decade)마다 10배씩 준다.
    const vt0 = (T.alpha * T.ss) / Math.LN10;
    const vov = vt0 * Math.log(1 + Math.exp((vgs - vt) / vt0));
    const idsat = k * Math.pow(vov, T.alpha);
    const vdsat = Math.max(1e-3, 0.9 * Math.pow(vov, T.alpha / 2) + 0.02);
    const shape = vds >= vdsat ? 1 : (2 - vds / vdsat) * (vds / vdsat); // 선형 영역 포물선
    return idsat * shape * (1 + T.lambda * vds) * (1 - Math.exp(-vds / 0.02585));
  };

  /**
   * CMOS 인버터 출력 전압: nMOS(Wn)와 pMOS(Wp) 전류가 같아지는 Vout을 이분법으로 찾는다.
   *   DG.invOut(vin, {Wn:1, Wp:1.6, vdd, tech, vtn, vtp}) → Vout
   */
  DG.invOut = function (vin, o = {}) {
    const T = o.tech || DG.TECH, vdd = o.vdd != null ? o.vdd : T.vdd;
    const Wn = o.Wn != null ? o.Wn : 1, Wp = o.Wp != null ? o.Wp : T.mu;
    let lo = 0, hi = vdd;
    for (let i = 0; i < 50; i++) {
      const v = (lo + hi) / 2;
      const In = DG.ids({ vgs: vin, vds: v, type: "n", W: Wn, tech: T, vt: o.vtn });
      const Ip = DG.ids({ vgs: vdd - vin, vds: vdd - v, type: "p", W: Wp, tech: T, vt: o.vtp });
      if (In > Ip) hi = v; else lo = v;
    }
    return (lo + hi) / 2;
  };
  /** 인버터 VTC 배열 [[vin,vout],...] (N점) */
  DG.vtc = function (o = {}, N = 161) {
    const T = o.tech || DG.TECH, vdd = o.vdd != null ? o.vdd : T.vdd, out = [];
    for (let i = 0; i < N; i++) { const vin = (vdd * i) / (N - 1); out.push([vin, DG.invOut(vin, o)]); }
    return out;
  };
  /** VTC에서 VM, VIL, VIH, VOL, VOH, NML, NMH 계산 (기울기 -1 점 기준) */
  DG.vtcMetrics = function (curve) {
    let VM = null, VIL = null, VIH = null;
    for (let i = 1; i < curve.length; i++) {
      const [x0, y0] = curve[i - 1], [x1, y1] = curve[i];
      if (VM == null && (y0 - x0) * (y1 - x1) <= 0) VM = x0 + ((x1 - x0) * (y0 - x0)) / ((y0 - x0) - (y1 - x1) || 1e-12);
      const g = (y1 - y0) / (x1 - x0);
      if (VIL == null && g <= -1) VIL = x0;
      if (VIL != null && VIH == null && g > -1 && i > 1) VIH = x0;
    }
    const at = (x) => { for (let i = 1; i < curve.length; i++) if (curve[i][0] >= x) { const [x0, y0] = curve[i - 1], [x1, y1] = curve[i]; return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1); } return curve[curve.length - 1][1]; };
    const VOH = VIL != null ? at(VIL) : curve[0][1], VOL = VIH != null ? at(VIH) : curve[curve.length - 1][1];
    return { VM, VIL, VIH, VOH, VOL, NML: VIL != null ? VIL - VOL : 0, NMH: VIH != null ? VOH - VIH : 0 };
  };

  /* ------------------------------------------------------------ 그리기 기본 */
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  DG.roundRect = roundRect;
  function hatch(ctx, x, y, w, h, col) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.strokeStyle = DG.alpha(col, 0.55); ctx.lineWidth = 1;
    ctx.beginPath(); for (let k = -h; k < w; k += 5) { ctx.moveTo(x + k, y + h); ctx.lineTo(x + k + h, y); } ctx.stroke();
    ctx.restore();
  }
  DG.hatch = hatch;
  /** 화살표 */
  DG.arrow = function (ctx, x0, y0, x1, y1, color, width = 1.6, head = 7) {
    const a = Math.atan2(y1 - y0, x1 - x0);
    ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - Math.cos(a) * head * 0.6, y1 - Math.sin(a) * head * 0.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - head * Math.cos(a - 0.4), y1 - head * Math.sin(a - 0.4)); ctx.lineTo(x1 - head * Math.cos(a + 0.4), y1 - head * Math.sin(a + 0.4)); ctx.closePath(); ctx.fill();
    ctx.restore();
  };
  /** 둥근 상자 + 가운데 글자 */
  DG.box = function (ctx, x, y, w, h, fill, text, opts = {}) {
    ctx.save();
    roundRect(ctx, x, y, w, h, opts.r != null ? opts.r : 6);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (opts.stroke) { ctx.strokeStyle = opts.stroke; ctx.lineWidth = opts.lw || 1.2; ctx.stroke(); }
    if (text != null) {
      ctx.fillStyle = opts.color || "#fff"; ctx.font = SB.font(opts.size || 12, opts.mono, opts.weight || 700);
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, x + w / 2, y + h / 2 + 0.5);
    }
    ctx.restore();
  };
  /** 선(배선) — 논리값 색으로. pts=[[x,y],...] */
  DG.wire = function (ctx, pts, v, width = 2) {
    ctx.save();
    ctx.strokeStyle = DG.lv(v); ctx.lineWidth = width; ctx.lineJoin = "round"; ctx.lineCap = "round";
    if (v === "z" || v === "Z") ctx.setLineDash([5, 4]);
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
    ctx.restore();
  };
  /** 연결 점 */
  DG.dot = function (ctx, x, y, color, r = 3.2) { ctx.save(); ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore(); };

  /* ------------------------------------------------------------ 포인터 */
  /**
   * 캔버스(또는 요소) 위 포인터 이벤트를 CSS px 좌표로.
   *   DG.pointer(canvas, { down(x,y,e), move(x,y,down,e), up(x,y,e), leave() }, { drag:true })
   * drag:true면 누른 채 움직이는 동안 페이지 스크롤을 막는다(touch-action:none). 끌기가 없으면 생략해 스크롤을 살린다.
   */
  DG.pointer = function (el, h, opts = {}) {
    if (typeof el === "string") el = document.querySelector(el);
    let isDown = false;
    if (opts.drag) el.style.touchAction = "none";
    const pos = (e) => { const r = el.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    el.addEventListener("pointerdown", (e) => { isDown = true; try { el.setPointerCapture(e.pointerId); } catch (_) {} const [x, y] = pos(e); h.down && h.down(x, y, e); });
    el.addEventListener("pointermove", (e) => { const [x, y] = pos(e); h.move && h.move(x, y, isDown, e); });
    const end = (e) => { if (!isDown) return; isDown = false; const [x, y] = pos(e); h.up && h.up(x, y, e); };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("pointerleave", () => { if (!isDown) h.leave && h.leave(); });
  };

  /* ------------------------------------------------------------ 논리 게이트 기호 */
  /**
   * 게이트 기호를 그린다(ANSI 모양). 입력은 왼쪽, 출력은 오른쪽.
   *   const g = DG.gate(ctx, "NAND", x, y, w, h, { n:2, fill, stroke, label, inV:[1,0], outV:1, lw })
   *   type: BUF NOT AND NAND OR NOR XOR XNOR
   *   반환: { inputs:[[x,y],...], output:[x,y] } — 핀 끝 좌표 (리드선 길이 포함)
   * 입력·출력 리드선은 inV/outV가 주어지면 논리값 색으로 칠한다.
   */
  DG.gate = function (ctx, type, x, y, w, h, o = {}) {
    type = String(type).toUpperCase();
    const P = SB.palette();
    const n = o.n || (type === "NOT" || type === "BUF" ? 1 : 2);
    const lead = o.lead != null ? o.lead : w * 0.18;
    const bx = x + lead, bw = w - 2 * lead, by = y, bh = h;
    const neg = /^(NOT|NAND|NOR|XNOR)$/.test(type);
    const br = neg ? Math.max(3, Math.min(bw, bh) * 0.09) : 0;
    const body = bw - 2 * br;
    const stroke = o.stroke || P.text, fill = o.fill || SB.color("bg-elev");
    ctx.save();
    ctx.lineWidth = o.lw || 1.8; ctx.lineJoin = "round";
    // 입력 핀 위치
    const inputs = [];
    for (let i = 0; i < n; i++) {
      const py = n === 1 ? by + bh / 2 : by + bh * (0.5 + (i - (n - 1) / 2) * (0.62 / Math.max(1, n - 1)) * (n > 2 ? 1.25 : 1));
      inputs.push([x, py]);
    }
    // 입력 리드선 끝(기호 왼쪽 경계)
    const leftEdge = (py) => {
      if (/^(OR|NOR|XOR|XNOR)$/.test(type)) { const t = (py - by) / bh - 0.5; return bx + body * 0.18 * Math.cos(t * Math.PI); }
      return bx;
    };
    inputs.forEach(([px, py], i) => {
      ctx.strokeStyle = o.inV ? DG.lv(o.inV[i]) : stroke;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(leftEdge(py) + 1, py); ctx.stroke();
    });
    // 몸체
    ctx.beginPath();
    if (type === "AND" || type === "NAND") {
      ctx.moveTo(bx, by); ctx.lineTo(bx + body - bh / 2, by);
      ctx.arc(bx + body - bh / 2, by + bh / 2, bh / 2, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(bx, by + bh); ctx.closePath();
    } else if (/^(OR|NOR|XOR|XNOR)$/.test(type)) {
      const tip = bx + body;
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + body * 0.62, by, tip, by + bh / 2);
      ctx.quadraticCurveTo(bx + body * 0.62, by + bh, bx, by + bh);
      ctx.quadraticCurveTo(bx + body * 0.3, by + bh / 2, bx, by);
      ctx.closePath();
    } else { // BUF, NOT
      ctx.moveTo(bx, by); ctx.lineTo(bx + body, by + bh / 2); ctx.lineTo(bx, by + bh); ctx.closePath();
    }
    ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.stroke();
    if (type === "XOR" || type === "XNOR") {
      const off = Math.max(4, body * 0.1);
      ctx.beginPath(); ctx.moveTo(bx - off, by); ctx.quadraticCurveTo(bx - off + body * 0.3, by + bh / 2, bx - off, by + bh); ctx.stroke();
    }
    if (neg) { ctx.beginPath(); ctx.arc(bx + body + br, by + bh / 2, br, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); ctx.stroke(); }
    // 출력 리드선
    const ox = x + w, oy = by + bh / 2;
    ctx.strokeStyle = o.outV != null ? DG.lv(o.outV) : stroke;
    ctx.beginPath(); ctx.moveTo(bx + bw, oy); ctx.lineTo(ox, oy); ctx.stroke();
    if (o.label) { ctx.fillStyle = P.dim; ctx.font = SB.font(o.labelSize || 11, true, 700); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(o.label, bx + body * 0.42, oy); }
    ctx.restore();
    return { inputs, output: [ox, oy] };
  };

  /** 정적 SVG용 게이트 경로 문자열: DG.gateSVG("NOR", x, y, w, h) → '<g>…</g>' (class="gate") */
  DG.gateSVG = function (type, x, y, w, h, n) {
    type = String(type).toUpperCase(); n = n || (type === "NOT" || type === "BUF" ? 1 : 2);
    const lead = w * 0.18, bx = x + lead, bw = w - 2 * lead, neg = /^(NOT|NAND|NOR|XNOR)$/.test(type);
    const br = neg ? Math.max(3, Math.min(bw, h) * 0.09) : 0, body = bw - 2 * br, cy = y + h / 2;
    let d = "", extra = "";
    if (type === "AND" || type === "NAND") d = `M${bx} ${y}H${bx + body - h / 2}A${h / 2} ${h / 2} 0 0 1 ${bx + body - h / 2} ${y + h}H${bx}Z`;
    else if (/^(OR|NOR|XOR|XNOR)$/.test(type)) {
      d = `M${bx} ${y}Q${bx + body * 0.62} ${y} ${bx + body} ${cy}Q${bx + body * 0.62} ${y + h} ${bx} ${y + h}Q${bx + body * 0.3} ${cy} ${bx} ${y}Z`;
      if (/X/.test(type[0])) { const off = Math.max(4, body * 0.1); extra += `<path class="s-acc" style="stroke:var(--text);stroke-width:1.8" d="M${bx - off} ${y}Q${bx - off + body * 0.3} ${cy} ${bx - off} ${y + h}"/>`; }
    } else d = `M${bx} ${y}L${bx + body} ${cy}L${bx} ${y + h}Z`;
    let leads = "";
    for (let i = 0; i < n; i++) {
      const py = n === 1 ? cy : y + h * (0.5 + (i - (n - 1) / 2) * (0.62 / Math.max(1, n - 1)) * (n > 2 ? 1.25 : 1));
      leads += `M${x} ${py}H${bx + (/^(OR|NOR|XOR|XNOR)$/.test(type) ? body * 0.18 * Math.cos(((py - y) / h - 0.5) * Math.PI) : 0)}`;
    }
    leads += `M${bx + bw} ${cy}H${x + w}`;
    return `<g><path class="wire" style="stroke:var(--text)" d="${leads}"/><path class="gate" d="${d}"/>${extra}${neg ? `<circle class="gate" cx="${bx + body + br}" cy="${cy}" r="${br}"/>` : ""}</g>`;
  };

  /* ------------------------------------------------------------ 트랜지스터 기호 */
  /**
   * MOSFET 기호 (세로 방향: 드레인 위, 소스 아래 — pMOS는 소스 위).
   *   DG.mos(ctx, "n"|"p", x, y, {s:28, on:true|false|0..1, gateLeft:true, label})
   *   (x,y) = 채널 중심. 반환 {gate:[x,y], top:[x,y], bottom:[x,y]}
   *   on: 켜진 정도에 따라 채널을 nmos/pmos 색으로 채운다.
   */
  DG.mos = function (ctx, type, x, y, o = {}) {
    const P = SB.palette();
    const s = o.s || 28, dir = o.gateLeft === false ? 1 : -1;
    const col = type === "p" ? P.pmos : P.nmos;
    const on = o.on === true ? 1 : o.on === false ? 0 : o.on != null ? o.on : 0;
    ctx.save();
    ctx.lineWidth = o.lw || 1.8; ctx.lineCap = "round";
    const cx = x, top = y - s * 0.5, bot = y + s * 0.5;
    // 채널(세로 막대) + 켜짐 표시
    if (on > 0) { ctx.fillStyle = DG.alpha(col, 0.25 + 0.6 * on); ctx.fillRect(cx - 3, top + s * 0.12, 6, s * 0.76); }
    ctx.strokeStyle = col;
    ctx.beginPath(); ctx.moveTo(cx, top + s * 0.12); ctx.lineTo(cx, bot - s * 0.12); ctx.stroke();
    // 게이트 판
    const gx = cx + dir * s * 0.22;
    ctx.strokeStyle = P.text;
    ctx.beginPath(); ctx.moveTo(gx, top + s * 0.18); ctx.lineTo(gx, bot - s * 0.18); ctx.stroke();
    // 게이트 리드 (pMOS는 버블)
    let gEnd = gx + dir * s * 0.55;
    if (type === "p") {
      const r = s * 0.09;
      ctx.beginPath(); ctx.arc(gx + dir * r, y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gx + dir * 2 * r, y); ctx.lineTo(gEnd, y); ctx.stroke();
    } else { ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gEnd, y); ctx.stroke(); }
    // 드레인·소스 리드
    ctx.strokeStyle = col;
    ctx.beginPath();
    ctx.moveTo(cx, top + s * 0.18); ctx.lineTo(cx - dir * s * 0.3, top + s * 0.18); ctx.lineTo(cx - dir * s * 0.3, top);
    ctx.moveTo(cx, bot - s * 0.18); ctx.lineTo(cx - dir * s * 0.3, bot - s * 0.18); ctx.lineTo(cx - dir * s * 0.3, bot);
    ctx.stroke();
    if (o.label) { ctx.fillStyle = P.dim; ctx.font = SB.font(11, true, 600); ctx.textAlign = dir < 0 ? "left" : "right"; ctx.textBaseline = "middle"; ctx.fillText(o.label, cx - dir * s * 0.42, y); }
    ctx.restore();
    const lx = cx - dir * s * 0.3;
    return { gate: [gEnd, y], top: [lx, top], bottom: [lx, bot] };
  };
  /** 전원(VDD) 막대와 접지 기호 */
  DG.vdd = function (ctx, x, y, w = 22, label = "VDD") {
    const P = SB.palette(); ctx.save(); ctx.strokeStyle = P.text; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x + w / 2, y); ctx.stroke();
    if (label) { ctx.fillStyle = SB.color("vdd") || P.accent2; ctx.font = SB.font(11, true, 700); ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText(label, x, y - 3); }
    ctx.restore();
  };
  DG.gnd = function (ctx, x, y, w = 20) {
    const P = SB.palette(); ctx.save(); ctx.strokeStyle = P.text; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x + w / 2, y); ctx.moveTo(x - w / 3, y + 4); ctx.lineTo(x + w / 3, y + 4); ctx.moveTo(x - w / 7, y + 8); ctx.lineTo(x + w / 7, y + 8); ctx.stroke();
    ctx.restore();
  };

  /* ------------------------------------------------------------ 타이밍 파형 */
  /**
   * 디지털 타이밍 파형 (칸 단위 시간).
   *   DG.wave(ctx, {x,y,w,h}, {
   *     cycles: 12,
   *     signals: [ {name:"CLK", type:"clk"}, {name:"D", type:"bit", v:[0,1,1,null,...]},
   *                {name:"Q[3:0]", type:"bus", v:["3","3","4",...]}, {name:"A", type:"analog", v:[0..1 per sample], samples} ],
   *     marks: [{c:3.5, label:"setup", color}], shade:[{c0,c1,color}], cursor: c, nameW: 70, skew: 0.12
   *   })
   *   bit 값: 1/0, null=X(빗금), "z"=가운데 점선. bit 신호에 color를 생략하면 논리값 색을 쓴다(lvColor:true).
   *   analog: v는 0..1 배열(길이 자유), 칸 전체에 균등 분포.
   * 반환: { X(c)->px, cw, rowY(i)->[top,bottom], colAt(px)->c }
   */
  DG.wave = function (ctx, box, o) {
    const P = SB.palette();
    const n = o.signals.length, nameW = o.nameW != null ? o.nameW : 70;
    const rowH = box.h / n, cw = (box.w - nameW) / o.cycles, sk = Math.min(6, cw * (o.skew != null ? o.skew : 0.12));
    const X = (c) => box.x + nameW + c * cw;
    ctx.save();
    (o.shade || []).forEach((s) => { ctx.fillStyle = s.color || SB.color("accent-soft"); ctx.fillRect(X(s.c0), box.y, (s.c1 - s.c0) * cw, box.h); });
    if (o.cursor != null) { ctx.fillStyle = SB.color("accent-soft"); ctx.fillRect(X(Math.floor(o.cursor)), box.y, cw, box.h); }
    ctx.strokeStyle = P.grid; ctx.lineWidth = 1;
    const gstep = o.gridStep || 1;
    for (let c = 0; c <= o.cycles; c += gstep) { ctx.beginPath(); ctx.moveTo(X(c) + 0.5, box.y); ctx.lineTo(X(c) + 0.5, box.y + box.h); ctx.stroke(); }
    o.signals.forEach((sg, i) => {
      const top = box.y + i * rowH + rowH * 0.2, bot = box.y + (i + 1) * rowH - rowH * 0.2, mid = (top + bot) / 2;
      ctx.fillStyle = P.dim; ctx.font = SB.font(12, true); ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText(sg.name, box.x + 2, mid);
      const col = sg.color || (sg.type === "clk" ? P.dim : P.accent);
      ctx.lineWidth = 1.8; ctx.lineJoin = "round";
      if (sg.type === "clk") {
        ctx.strokeStyle = col; ctx.beginPath();
        const per = sg.period || 1;
        for (let c = 0; c < o.cycles; c += per) { const x0 = X(c), xm = X(c + per / 2), x1 = X(c + per); ctx.moveTo(x0, bot); ctx.lineTo(x0 + 1, top); ctx.lineTo(xm, top); ctx.lineTo(xm + 1, bot); ctx.lineTo(x1, bot); }
        ctx.stroke();
      } else if (sg.type === "bit") {
        const v = sg.v, useLv = !sg.color;
        let prev;
        for (let c = 0; c < o.cycles; c++) {
          const cur = v[c];
          if (cur == null) { hatch(ctx, X(c), top, cw, bot - top, P.x); prev = null; continue; }
          if (cur === "z" || cur === "Z") {
            ctx.save(); ctx.strokeStyle = P.z; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(X(c), mid); ctx.lineTo(X(c + 1), mid); ctx.stroke(); ctx.restore(); prev = "z"; continue;
          }
          const y = cur ? top : bot;
          ctx.strokeStyle = useLv ? DG.lv(cur ? 1 : 0) : col;
          ctx.beginPath();
          if (prev === 0 || prev === 1 || prev === true || prev === false) {
            if (!!prev !== !!cur) { ctx.moveTo(X(c), prev ? top : bot); ctx.lineTo(X(c) + sk, y); }
            else ctx.moveTo(X(c), y);
          } else if (prev === "z") { ctx.moveTo(X(c), mid); ctx.lineTo(X(c) + sk, y); }
          else ctx.moveTo(X(c), y);
          ctx.lineTo(X(c + 1), y); ctx.stroke();
          if (sg.fill && cur) { ctx.fillStyle = DG.alpha(useLv ? P.hi : col, 0.12); ctx.fillRect(X(c), top, cw, bot - top); }
          prev = cur ? 1 : 0;
        }
      } else if (sg.type === "bus") {
        const v = sg.v; let c = 0;
        ctx.strokeStyle = col;
        while (c < o.cycles) {
          let e = c + 1; while (e < o.cycles && v[e] === v[c]) e++;
          const x0 = X(c), x1 = X(e), val = v[c];
          if (val == null) hatch(ctx, x0, top, x1 - x0, bot - top, P.x);
          else if (val === "") { ctx.beginPath(); ctx.moveTo(x0 + sk / 2, mid); ctx.lineTo(x1 - sk / 2, mid); ctx.strokeStyle = P.faint; ctx.stroke(); ctx.strokeStyle = col; }
          else {
            ctx.beginPath(); ctx.moveTo(x0, mid); ctx.lineTo(x0 + sk, top); ctx.lineTo(x1 - sk, top); ctx.lineTo(x1, mid); ctx.lineTo(x1 - sk, bot); ctx.lineTo(x0 + sk, bot); ctx.closePath();
            ctx.fillStyle = DG.alpha(col, 0.14); ctx.fill(); ctx.stroke();
            ctx.fillStyle = P.text; ctx.font = SB.font(11.5, true, 600); ctx.textAlign = "center";
            const label = String(val); if (ctx.measureText(label).width < x1 - x0 - 2 * sk) ctx.fillText(label, (x0 + x1) / 2, mid + 0.5);
          }
          c = e;
        }
      } else if (sg.type === "analog") {
        const v = sg.v, m = v.length; ctx.strokeStyle = col; ctx.beginPath();
        for (let k = 0; k < m; k++) { const px = X((k / Math.max(1, m - 1)) * o.cycles), py = bot - SB.clamp(v[k], -0.1, 1.1) * (bot - top); k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.stroke();
        if (sg.th != null) { ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = P.faint; ctx.lineWidth = 1; const py = bot - sg.th * (bot - top); ctx.beginPath(); ctx.moveTo(X(0), py); ctx.lineTo(X(o.cycles), py); ctx.stroke(); ctx.restore(); }
      }
    });
    (o.marks || []).forEach((mk) => {
      ctx.strokeStyle = mk.color || P.accent; ctx.setLineDash(mk.dash || [4, 3]); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(X(mk.c), box.y); ctx.lineTo(X(mk.c), box.y + box.h); ctx.stroke(); ctx.setLineDash([]);
      if (mk.label) { ctx.fillStyle = mk.color || P.accent; ctx.font = SB.font(11, false, 700); ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(mk.label, X(mk.c) + 3, box.y + 1); }
    });
    ctx.restore();
    return { X, cw, rowY: (i) => [box.y + i * rowH, box.y + (i + 1) * rowH], colAt: (px) => (px - box.x - nameW) / cw };
  };

  /* ------------------------------------------------------------ 진리표 */
  /** n입력 진리표 행 배열: DG.truth(2, (a,b)=>a&b) → [{in:[0,0], out:0}, ...] (out은 수 또는 배열) */
  DG.truth = function (n, fn) {
    const rows = [];
    for (let i = 0; i < 1 << n; i++) { const ins = []; for (let k = n - 1; k >= 0; k--) ins.push((i >> k) & 1); rows.push({ in: ins, out: fn.apply(null, ins) }); }
    return rows;
  };
  /** 기본 게이트 함수 */
  DG.OPS = {
    BUF: (a) => a, NOT: (a) => 1 - a,
    AND: (...a) => +a.every((x) => x), NAND: (...a) => +!a.every((x) => x),
    OR: (...a) => +a.some((x) => x), NOR: (...a) => +!a.some((x) => x),
    XOR: (...a) => a.reduce((p, q) => p ^ q, 0), XNOR: (...a) => 1 - a.reduce((p, q) => p ^ q, 0),
  };
  /** 3값 논리(0,1,"x")로 게이트 평가 — X 전파 규칙 포함 */
  DG.eval3 = function (type, ins) {
    type = type.toUpperCase();
    const X = "x", isX = (v) => v !== 0 && v !== 1;
    const inv = (v) => (isX(v) ? X : 1 - v);
    switch (type) {
      case "BUF": return isX(ins[0]) ? X : ins[0];
      case "NOT": return inv(ins[0]);
      case "AND": case "NAND": { let r = ins.some((v) => v === 0) ? 0 : ins.some(isX) ? X : 1; return type === "AND" ? r : inv(r); }
      case "OR": case "NOR": { let r = ins.some((v) => v === 1) ? 1 : ins.some(isX) ? X : 0; return type === "OR" ? r : inv(r); }
      case "XOR": case "XNOR": { if (ins.some(isX)) return X; const r = ins.reduce((p, q) => p ^ q, 0); return type === "XOR" ? r : 1 - r; }
      case "MUX": { const [a, b, s] = ins; if (s === 0) return isX(a) ? X : a; if (s === 1) return isX(b) ? X : b; return a === b && !isX(a) ? a : X; }
    }
    return X;
  };

  /* ------------------------------------------------------------ 게이트 수준 논리 시뮬레이터 */
  /**
   * 이벤트 구동 논리 시뮬레이터 (관성 지연 없음 = 전송 지연, 글리치가 그대로 보인다).
   *   const C = new DG.Circuit();
   *   C.input("a", 0); C.input("b", 0);
   *   C.gate("NAND", ["a","b"], "n1", 1);     // type, 입력 넷들, 출력 넷, 지연(시간 단위)
   *   C.gate("NOT", ["n1"], "y", 1);
   *   C.dff("q", "d", "clk", {tcq:1, init:0});  // 상승 에지 D 플립플롭
   *   C.set("a", 1, t);  C.run(tEnd);  C.v("y");  C.trace("y") → [[t,v],...]
   *   C.reset();  // 모든 넷 X, 입력은 초기값으로, 시간 0
   * 지원 type: BUF NOT AND NAND OR NOR XOR XNOR MUX(입력 [a,b,s])
   * C.toggles[net] — 0↔1 천이 횟수 (전력 계산용)
   */
  class Circuit {
    constructor() { this.nets = {}; this.gates = []; this.ffs = []; this.inputs = {}; this.fan = {}; this._seq = 0; this.reset(); }
    _net(n) { if (!(n in this.nets)) { this.nets[n] = "x"; this.fan[n] = this.fan[n] || []; } return n; }
    input(name, v = 0) { this._net(name); this.inputs[name] = v; this.nets[name] = v; this.traces[name] = [[0, v]]; return this; }
    gate(type, ins, out, delay = 1) { ins.forEach((n) => this._net(n)); this._net(out); const g = { type, ins, out, delay }; this.gates.push(g); ins.forEach((n) => this.fan[n].push(g)); return this; }
    dff(q, d, clk, o = {}) { [q, d, clk].forEach((n) => this._net(n)); const f = { q, d, clk, tcq: o.tcq != null ? o.tcq : 1, init: o.init != null ? o.init : "x", last: "x", en: o.en, rst: o.rst }; this.ffs.push(f); this.fan[clk].push(f); if (o.rst) this.fan[o.rst].push(f); return this; }
    reset() {
      this.t = 0; this.queue = []; this.traces = {}; this.toggles = {}; this._tstep = {};
      for (const n in this.nets) this.nets[n] = "x";
      for (const n in this.inputs) { this.nets[n] = this.inputs[n]; }
      for (const n in this.nets) { this.traces[n] = [[0, this.nets[n]]]; this.toggles[n] = 0; }
      (this.ffs || []).forEach((f) => { f.last = this.nets[f.clk]; if (f.init !== "x") { this.nets[f.q] = f.init; this.traces[f.q] = [[0, f.init]]; } });
      // 초기 평가: 모든 게이트를 한 번 계산
      (this.gates || []).forEach((g) => this._sched(g, 0));
      (this.ffs || []).forEach((f) => this._fanout(f.q, 0));
      return this;
    }
    _sched(g, t) { const v = DG.eval3(g.type, g.ins.map((n) => this.nets[n])); this.queue.push({ t: t + g.delay, net: g.out, v, seq: this._seq = (this._seq || 0) + 1 }); }
    _fanout(net, t) { (this.fan[net] || []).forEach((g) => { if (g.type) this._sched(g, t); else this._ff(g, t, net); }); }
    _ff(f, t, net) {
      if (f.rst && net === f.rst) { if (this.nets[f.rst] === 1) this.queue.push({ t: t + f.tcq, net: f.q, v: 0, seq: ++this._seq }); return; }
      const c = this.nets[f.clk];
      if (f.last === 0 && c === 1 && !(f.rst && this.nets[f.rst] === 1)) {
        const en = f.en ? this.nets[f.en] : 1;
        const v = en === 1 ? this.nets[f.d] : en === 0 ? this.nets[f.q] : "x";
        this.queue.push({ t: t + f.tcq, net: f.q, v: v === 0 || v === 1 ? v : "x", seq: ++this._seq });
      }
      f.last = c;
    }
    _apply(net, v, t) {
      if (this.nets[net] === v) return;
      const old = this.nets[net];
      this.nets[net] = v;
      // 같은 시각에 여러 번 바뀌면(폭 0 펄스) 그 시각의 처음 값과 마지막 값만 비교해 천이를 센다
      const st = (this._tstep = this._tstep || {});
      let s0 = st[net];
      if (!s0 || s0.t !== t) s0 = st[net] = { t, v0: old, c: 0 };
      const c = (s0.v0 === 0 && v === 1) || (s0.v0 === 1 && v === 0) ? 1 : 0;
      this.toggles[net] = (this.toggles[net] || 0) + c - s0.c;
      s0.c = c;
      (this.traces[net] = this.traces[net] || []).push([t, v]);
      this._fanout(net, t);
    }
    set(net, v, t) { if (t == null) t = this.t; this.queue.push({ t, net, v, seq: ++this._seq, ext: true }); return this; }
    run(tEnd, maxEvents = 200000) {
      let k = 0;
      while (this.queue.length && k++ < maxEvents) {
        let bi = 0;
        for (let i = 1; i < this.queue.length; i++) { const a = this.queue[i], b = this.queue[bi]; if (a.t < b.t || (a.t === b.t && a.seq < b.seq)) bi = i; }
        const e = this.queue[bi];
        if (e.t > tEnd) break;
        this.queue.splice(bi, 1);
        this.t = e.t;
        this._apply(e.net, e.v, e.t);
      }
      this.t = Math.max(this.t, tEnd);
      return this;
    }
    /** 클럭 생성: period마다 0→1→0, [t0, t1) 구간 */
    clock(net, period, t0, t1, phase = 0) { this._net(net); for (let t = t0 + phase; t < t1; t += period) { this.set(net, 1, t); this.set(net, 0, t + period / 2); } return this; }
    v(net) { return this.nets[net]; }
    trace(net) { return this.traces[net] || []; }
    /** 시각 t의 값 */
    at(net, t) { const tr = this.trace(net); let v = "x"; for (const [tt, vv] of tr) { if (tt <= t) v = vv; else break; } return v; }
    /** 일정 간격 샘플 배열 (DG.wave bit 형식) */
    sample(net, t0, dt, n) { const out = []; for (let i = 0; i < n; i++) { const v = this.at(net, t0 + i * dt + dt * 0.5); out.push(v === "x" ? null : v); } return out; }
    /** 정적 해석: 임계 경로 지연 (입력·플립플롭 출력에서 각 넷까지의 최장 도착 시각) */
    arrival() {
      const arr = {}; for (const n in this.inputs) arr[n] = 0; this.ffs.forEach((f) => (arr[f.q] = f.tcq));
      for (let pass = 0; pass < this.gates.length + 1; pass++) {
        let changed = false;
        this.gates.forEach((g) => { const a = Math.max(...g.ins.map((n) => (arr[n] != null ? arr[n] : -Infinity))); if (a > -Infinity && (arr[g.out] == null || a + g.delay > arr[g.out])) { arr[g.out] = a + g.delay; changed = true; } });
        if (!changed) break;
      }
      return arr;
    }
  }
  DG.Circuit = Circuit;

  /* ------------------------------------------------------------ 추상화 사다리 */
  /**
   * 장 머리말에 이 장이 추상화 사다리의 어느 칸인지 표시.
   *   <div class="dg-ladder" data-level="gate" data-caption="..."></div>
   * level: device | gate | seq | datapath | block | system  (공백으로 여러 개)
   */
  DG.LEVELS = [
    { id: "device", name: "소자", en: "Device", ch: "mosfet" },
    { id: "gate", name: "게이트", en: "Gate", ch: "inverter" },
    { id: "seq", name: "순차 회로", en: "Sequential", ch: "latch" },
    { id: "datapath", name: "데이터패스", en: "Datapath", ch: "adder" },
    { id: "block", name: "블록·메모리", en: "Block", ch: "memory" },
    { id: "system", name: "칩", en: "Chip", ch: "hdl" },
  ];
  DG.ladder = function (el) {
    const on = (el.dataset.level || "").split(/\s+/).filter(Boolean);
    const root = document.body.dataset.root != null ? document.body.dataset.root : document.body.dataset.chapter ? "../" : "";
    const inCh = !!document.body.dataset.chapter;
    el.innerHTML = DG.LEVELS.map((L, i) =>
      (i ? '<span class="arr">→</span>' : "") +
      `<a class="rung${on.includes(L.id) ? " on" : ""}" href="${inCh ? "" : root + "chapters/"}${L.ch}.html" title="${L.en}">${L.name}</a>`
    ).join("") + `<span class="cap">${el.dataset.caption || "추상화의 사다리에서 이 장이 다루는 칸"}</span>`;
  };
  function initLadders() { document.querySelectorAll(".dg-ladder").forEach(DG.ladder); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initLadders); else initLadders();

  /* ------------------------------------------------------------ 기타 */
  /** 시간·지연 포맷: DG.ps(3.2e-12) → "3.2 ps" */
  DG.ps = (s, d = 3) => SB.si(s, "s", d);
  /** 정수 → 부호 있는 n비트 해석 */
  DG.signed = (v, n) => ((v >>> 0) & ((1 << n) - 1)) >= 1 << (n - 1) ? (v & ((1 << n) - 1)) - (1 << n) : v & ((1 << n) - 1);
})();
