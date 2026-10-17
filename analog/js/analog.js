/* Copyright (c) 2026 geniuskey and AnalogBook contributors.
   Executable code: MIT (see ../LICENSE-MIT).
   Educational content and illustrations: CC-BY-4.0 (see ../LICENSE.md). */
/* ==========================================================================
   AnalogBook 회로 엔진 — 전역 객체 AN
   - 가상의 교육용 공정 AB180 (180 nm CMOS, 1.8 V)과 MOSFET 모델(약반전~강반전 연속)
   - 브라우저 SPICE: 수정 마디 해석(MNA) 기반 동작점·DC 스윕·AC·과도·잡음 해석
   - 선형 시스템: 극점/영점 전달 함수, 보드 데이터, 위상 여유, 계단 응답
   - 신호: FFT, 스펙트럼, SNDR/ENOB, 양자화
   - 그리기: 회로도 기호(AN.sch), 오실로스코프(AN.scope), 보드 선도(AN.bode)
   단위는 SI(V, A, Ω, F, H, m, s, Hz). 온도는 K.
   ========================================================================== */
(function () {
  "use strict";
  const AN = (window.AN = {});
  const KB = 1.380649e-23, QE = 1.602176634e-19;
  AN.k = KB; AN.q = QE;
  /** 열전압 kT/q (V) */
  AN.Ut = (T = 300) => (KB * T) / QE;
  AN.kT = (T = 300) => KB * T;

  /* ------------------------------------------------------------------ 공정 */
  // AB180: 가상의 교육용 180 nm CMOS. 교과서(Razavi, Sansen, Johns & Martin)의 대표값 수준으로 맞췄다.
  // kp = µCox (A/V²), lam: λ·L 곱(m/V) → λ = lam / L, gamma: 바디 효과(√V), phi: 2φF(V)
  // kf: 1/f 잡음 계수(V²·F) → Svg = kf / (Cox·W·L·f), avt: 펠그롬 Vth 계수(V·m), abeta: β 부정합 계수(m)
  // tcv: Vth 온도 계수(V/K), mu: 이동도 온도 지수
  AN.PROC = {
    name: "AB180", node: "180 nm", vdd: 1.8, Lmin: 0.18e-6, Wmin: 0.22e-6, Tnom: 300,
    cox: 8.5e-3,      // F/m² (tox ≈ 4 nm) → 8.5 fF/µm²
    cov: 0.3e-9,      // F/m 겹침 커패시턴스 (0.3 fF/µm)
    cj: 1.0e-9,       // F/m 드레인·소스 접합 (폭당, 1 fF/µm)
    gammaN: 2 / 3,    // 채널 열잡음 계수
    n: { vth0: 0.45, kp: 280e-6, lam: 0.08e-6, gamma: 0.45, phi: 0.8, nsub: 1.3, kf: 1e-25, avt: 5e-9, abeta: 0.01e-6, tcv: -1.0e-3, mu: -1.5 },
    p: { vth0: 0.48, kp: 70e-6, lam: 0.10e-6, gamma: 0.40, phi: 0.8, nsub: 1.35, kf: 3e-26, avt: 6e-9, abeta: 0.012e-6, tcv: -1.2e-3, mu: -1.5 },
    res: { poly: 300, nwell: 1000, tcPoly: -1.0e-3 }, // Ω/□, TC (1/K)
    capMim: 2e-3,     // F/m² (2 fF/µm²) MIM 커패시터
    pnp: { is: 1e-17, xti: 3, eg: 1.17 }, // 기판 PNP(다이오드 연결) 포화 전류(단위 소자), 밴드갭에 쓴다
  };
  AN.REGION = { off: "차단", triode: "선형(트라이오드)", sub: "약반전 포화", sat: "포화" };

  const sp = (x) => (x > 35 ? x : x < -35 ? Math.exp(x) : Math.log1p(Math.exp(x)));

  /**
   * MOSFET 드레인 전류(유효 n형 좌표, vds ≥ 0이 정상). 강반전에서 정확히 제곱 법칙
   * ID = ½·µCox·W/L·(VGS−VTH)²·(1+λVDS)이 되고, 약반전에서는 exp(VOV/(n·Ut))로 이어진다.
   */
  function idCore(P, d, vgs, vds, vbs, T) {
    const Ut = AN.Ut(T), n = P.nsub;
    const vsb = Math.max(-vbs, -0.3);
    const vth = P.vth0 + P.gamma * (Math.sqrt(P.phi + vsb) - Math.sqrt(P.phi)) + P.tcv * (T - 300) + (d.dvth || 0);
    const beta = P.kp * Math.pow(T / 300, P.mu) * (d.W / d.L) * (1 + (d.dbeta || 0)) * (d.m || 1);
    const a = 2 * n * Ut;
    const sf = sp((vgs - vth) / a), sr = sp((vgs - vth - vds) / a);
    const I0 = 2 * n * n * beta * Ut * Ut;
    const lam = (P.lam / d.L) * (d.lamScale == null ? 1 : d.lamScale);
    return { id: I0 * (sf * sf - sr * sr) * (1 + lam * vds), vth, beta, sf, I0, lam, a };
  }

  /**
   * 소자 하나의 동작점. dev = {type: "n"|"p", W, L, m?, dvth?, dbeta?}
   * pMOS는 크기(|VGS|, |VDS|, |VBS| = VSG, VSD, VBS→VSB 부호 반전)로 넘긴다: AN.mos(dev, vsg, vsd, vbs_eff)
   * → {id, gm, gds, gmb, ro, vth, vov, vdsat, region, ic, gmid, cgs, cgd, cdb, csb, ft, intrinsic}
   */
  AN.mos = function (dev, vgs, vds, vbs = 0, T = 300) {
    const P = dev.type === "p" ? AN.PROC.p : AN.PROC.n;
    const sw = vds < 0;
    if (sw) { vgs = vgs - vds; vbs = vbs - vds; vds = -vds; }
    const c = idCore(P, dev, vgs, vds, vbs, T);
    const h = 1e-6;
    const gm = (idCore(P, dev, vgs + h, vds, vbs, T).id - idCore(P, dev, vgs - h, vds, vbs, T).id) / (2 * h);
    const gds = (idCore(P, dev, vgs, vds + h, vbs, T).id - idCore(P, dev, vgs, Math.max(0, vds - h), vbs, T).id) / (h + Math.min(h, vds));
    const gmb = (idCore(P, dev, vgs, vds, vbs + h, T).id - idCore(P, dev, vgs, vds, vbs - h, T).id) / (2 * h);
    const Ut = AN.Ut(T);
    const ic = c.sf * c.sf;
    const vov = vgs - c.vth;
    const vdsat = Math.sqrt(Math.pow(c.a * c.sf, 2) + Math.pow(4 * Ut, 2));
    const region = ic < 1e-3 ? "off" : vds < vdsat ? "triode" : ic < 0.1 ? "sub" : "sat";
    const W = dev.W * (dev.m || 1), L = dev.L, pr = AN.PROC;
    const q = ic / (1 + ic), s = Math.min(1, vds / vdsat), wlc = W * L * pr.cox;
    let cgs = W * pr.cov + q * wlc * (0.5 + s / 6), cgd = W * pr.cov + q * wlc * 0.5 * (1 - s) * (1 - s);
    const cdb = W * pr.cj, csb = W * pr.cj;
    let id = c.id;
    if (sw) { id = -id; const t = cgs; cgs = cgd; cgd = t; }
    return {
      id, gm, gds, gmb, ro: 1 / gds, vth: c.vth, vov, vdsat, region, ic, swapped: sw,
      gmid: gm / Math.max(Math.abs(c.id), 1e-30), intrinsic: gm / gds,
      cgs, cgd, cdb, csb, ft: gm / (2 * Math.PI * (cgs + cgd)), beta: c.beta, lam: c.lam,
    };
  };
  /** VGS를 찾아 원하는 드레인 전류를 낸다(이분법). 포화 가정 vds 기본 0.9 V */
  AN.vgsFor = function (dev, id, vds = 0.9, vbs = 0, T = 300) {
    let lo = -0.5, hi = 3;
    for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (AN.mos(dev, m, vds, vbs, T).id > id) hi = m; else lo = m; }
    return (lo + hi) / 2;
  };
  /** gm/ID 설계표: 주어진 L, gm/ID에서 전류 밀도(ID/W), fT, 고유 이득. W는 1 µm 기준으로 계산해 비례시킨다 */
  AN.gmidLookup = function (type, L, gmid, vds = 0.9, T = 300) {
    const dev = { type, W: 1e-6, L };
    let lo = -0.4, hi = 2;
    for (let i = 0; i < 70; i++) { const m = (lo + hi) / 2; if (AN.mos(dev, m, vds, 0, T).gmid > gmid) lo = m; else hi = m; }
    const vgs = (lo + hi) / 2, r = AN.mos(dev, vgs, vds, 0, T);
    return { vgs, vov: r.vov, jd: r.id / 1e-6, ft: r.ft, intrinsic: r.intrinsic, gmid: r.gmid, ic: r.ic };
  };
  /** 펠그롬 부정합: σ(ΔVth) = Avt/√(WL), σ(Δβ/β) = Aβ/√(WL). 쌍(두 소자 차이)의 표준편차 */
  AN.pelgrom = function (type, W, L) {
    const P = type === "p" ? AN.PROC.p : AN.PROC.n, s = Math.sqrt(W * L);
    return { svth: P.avt / s, sbeta: P.abeta / s };
  };
  /** 소자 하나에 무작위 부정합을 입힌 복사본(소자 하나의 σ = 쌍의 σ/√2) */
  AN.mcDev = function (dev, rnd) {
    rnd = rnd || window.AB?.randn || (() => 0);
    const pg = AN.pelgrom(dev.type, dev.W * (dev.m || 1), dev.L);
    return Object.assign({}, dev, { dvth: (dev.dvth || 0) + (pg.svth / Math.SQRT2) * rnd(), dbeta: (dev.dbeta || 0) + (pg.sbeta / Math.SQRT2) * rnd() });
  };

  /* ------------------------------------------------------------------ 파형 */
  AN.wave = {
    /** 사인: off + amp·sin(2πf(t−td)+ph) */
    sin: (off, amp, f, td = 0, ph = 0) => (t) => off + (t < td ? amp * Math.sin(ph) : amp * Math.sin(2 * Math.PI * f * (t - td) + ph)),
    /** 펄스(SPICE PULSE) */
    pulse: (v1, v2, td, tr, tf, pw, per) => (t) => {
      if (t < td) return v1;
      let u = t - td; if (per) u %= per;
      if (u < tr) return v1 + ((v2 - v1) * u) / tr;
      if (u < tr + pw) return v2;
      if (u < tr + pw + tf) return v2 + ((v1 - v2) * (u - tr - pw)) / tf;
      return v1;
    },
    /** 계단: t0에서 v0 → v1, 상승 시간 tr */
    step: (v0, v1, t0 = 0, tr = 1e-12) => (t) => (t <= t0 ? v0 : t >= t0 + tr ? v1 : v0 + ((v1 - v0) * (t - t0)) / tr),
    /** 구간 선형 [[t, v], …] */
    pwl: (pts) => (t) => {
      if (t <= pts[0][0]) return pts[0][1];
      for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) { const [t0, v0] = pts[i - 1], [t1, v1] = pts[i]; return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0); }
      return pts[pts.length - 1][1];
    },
    /** 클록: 주기 per, 듀티 duty, 높은 값 vh, 낮은 값 vl(위상 비중첩용 지연 td) */
    clock: (per, duty = 0.5, vh = 1.8, vl = 0, td = 0) => (t) => { if (t < td) return vl; const u = ((t - td) % per) / per; return u < duty ? vh : vl; },
  };

  /* ------------------------------------------------------------------ 선형 대수 */
  function solveReal(A, b, N) {
    // 부분 피벗 가우스 소거. A, b는 덮어쓴다
    for (let k = 0; k < N; k++) {
      let p = k, mx = Math.abs(A[k * N + k]);
      for (let i = k + 1; i < N; i++) { const v = Math.abs(A[i * N + k]); if (v > mx) { mx = v; p = i; } }
      if (mx < 1e-300) return null;
      if (p !== k) {
        for (let j = 0; j < N; j++) { const t = A[k * N + j]; A[k * N + j] = A[p * N + j]; A[p * N + j] = t; }
        const t = b[k]; b[k] = b[p]; b[p] = t;
      }
      const piv = A[k * N + k];
      for (let i = k + 1; i < N; i++) {
        const f = A[i * N + k] / piv;
        if (f === 0) continue;
        for (let j = k; j < N; j++) A[i * N + j] -= f * A[k * N + j];
        b[i] -= f * b[k];
      }
    }
    const x = new Float64Array(N);
    for (let i = N - 1; i >= 0; i--) {
      let s = b[i];
      for (let j = i + 1; j < N; j++) s -= A[i * N + j] * x[j];
      x[i] = s / A[i * N + i];
    }
    return x;
  }
  function solveComplex(Ar, Ai, br, bi, N) {
    for (let k = 0; k < N; k++) {
      let p = k, mx = Math.hypot(Ar[k * N + k], Ai[k * N + k]);
      for (let i = k + 1; i < N; i++) { const v = Math.hypot(Ar[i * N + k], Ai[i * N + k]); if (v > mx) { mx = v; p = i; } }
      if (mx < 1e-300) return null;
      if (p !== k) {
        for (let j = 0; j < N; j++) {
          let t = Ar[k * N + j]; Ar[k * N + j] = Ar[p * N + j]; Ar[p * N + j] = t;
          t = Ai[k * N + j]; Ai[k * N + j] = Ai[p * N + j]; Ai[p * N + j] = t;
        }
        let t = br[k]; br[k] = br[p]; br[p] = t; t = bi[k]; bi[k] = bi[p]; bi[p] = t;
      }
      const pr = Ar[k * N + k], pi = Ai[k * N + k], pd = pr * pr + pi * pi;
      for (let i = k + 1; i < N; i++) {
        const ar = Ar[i * N + k], ai = Ai[i * N + k];
        if (ar === 0 && ai === 0) continue;
        const fr = (ar * pr + ai * pi) / pd, fi = (ai * pr - ar * pi) / pd;
        for (let j = k; j < N; j++) {
          const xr = Ar[k * N + j], xi = Ai[k * N + j];
          Ar[i * N + j] -= fr * xr - fi * xi; Ai[i * N + j] -= fr * xi + fi * xr;
        }
        br[i] -= fr * br[k] - fi * bi[k]; bi[i] -= fr * bi[k] + fi * br[k];
      }
    }
    const xr = new Float64Array(N), xi = new Float64Array(N);
    for (let i = N - 1; i >= 0; i--) {
      let sr = br[i], si = bi[i];
      for (let j = i + 1; j < N; j++) { const ar = Ar[i * N + j], ai = Ai[i * N + j]; sr -= ar * xr[j] - ai * xi[j]; si -= ar * xi[j] + ai * xr[j]; }
      const pr = Ar[i * N + i], pi = Ai[i * N + i], pd = pr * pr + pi * pi;
      xr[i] = (sr * pr + si * pi) / pd; xi[i] = (si * pr - sr * pi) / pd;
    }
    return [xr, xi];
  }
  AN.solve = solveReal;
  AN.logspace = (a, b, n) => Array.from({ length: n }, (_, i) => a * Math.pow(b / a, n > 1 ? i / (n - 1) : 0));
  AN.linspace = (a, b, n) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / Math.max(1, n - 1));

  /* ------------------------------------------------------------------ 회로 시뮬레이터 */
  /**
   * 브라우저 SPICE. 마디 이름은 문자열 또는 숫자, 0 / "0" / "gnd"는 접지.
   *   const c = AN.circuit({T: 300});
   *   c.V("vdd", 0, 1.8); c.V("in", 0, {dc: 0.7, ac: 1, wave: AN.wave.sin(0.7, 0.01, 1e6)}, {name: "Vin"});
   *   c.R("vdd", "out", 10e3); c.M("out", "in", 0, 0, {type: "n", W: 10e-6, L: 0.5e-6}, {name: "M1"}); c.C("out", 0, 1e-12);
   *   const op = c.op();          // op.v.out, op.dev.M1.gm, op.i.Vin
   *   const ac = c.ac({f0: 1e3, f1: 1e10, n: 120});   // ac.f, ac.mag("out"), ac.db("out"), ac.ph("out"), ac.re/im
   *   const tr = c.tran({tstop: 5e-6, dt: 5e-9});     // tr.t, tr.v("out")
   *   const nz = c.noise("out", {f0: 1, f1: 1e9, n: 100, input: "Vin"}); // nz.out(V²/Hz), nz.inp, nz.contrib
   */
  AN.circuit = function (o) { return new Circuit(o); };

  function Circuit(o = {}) {
    this.T = o.T == null ? 300 : o.T;
    this.gmin = o.gmin == null ? 1e-12 : o.gmin;
    this.mosCaps = o.mosCaps == null ? true : o.mosCaps;
    this.nodeMap = new Map([["0", 0], ["gnd", 0]]);
    this.nodeNames = ["0"];
    this.els = [];
    this.byName = {};
    this.count = {};
    this.xLast = null;
  }
  const CP = Circuit.prototype;
  CP.node = function (a) {
    if (a === 0 || a == null) return 0;
    const k = String(a);
    if (!this.nodeMap.has(k)) { this.nodeMap.set(k, this.nodeNames.length); this.nodeNames.push(k); this.xLast = null; }
    return this.nodeMap.get(k);
  };
  CP._add = function (type, nodes, props, o) {
    this.count[type] = (this.count[type] || 0) + 1;
    const name = (o && o.name) || type + this.count[type];
    const el = Object.assign({ type, name, nodes: nodes.map((n) => this.node(n)) }, props);
    this.els.push(el); this.byName[name] = el; this.xLast = null;
    return this;
  };
  const srcSpec = (v) => (typeof v === "number" ? { dc: v } : Object.assign({ dc: 0 }, v));
  CP.R = function (a, b, r, o) { return this._add("R", [a, b], { r }, o); };
  CP.C = function (a, b, c, o) { return this._add("C", [a, b], { c, ic: o && o.ic }, o); };
  CP.L = function (a, b, l, o) { return this._add("L", [a, b], { l }, o); };
  /** 전압원: a(+) − b(−) = 값. 값은 숫자 또는 {dc, ac, acPh(도), wave(t)} */
  CP.V = function (a, b, v, o) { return this._add("V", [a, b], srcSpec(v), o); };
  /** 전류원: 소스 안을 a → b로 흐른다(즉 b 마디로 들어간다) */
  CP.I = function (a, b, v, o) { return this._add("I", [a, b], srcSpec(v), o); };
  /** 전압 제어 전압원: v(a)−v(b) = gain·(v(cp)−v(cn)). gain 대신 {fn: vd => vout}이면 비선형(포화 증폭기, 비교기) */
  CP.E = function (a, b, cp, cn, gain, o) { return this._add("E", [a, b, cp, cn], typeof gain === "number" ? { gain } : gain, o); };
  /** 전압 제어 전류원: gm·(v(cp)−v(cn))가 소스 안을 a → b로 흐른다 */
  CP.G = function (a, b, cp, cn, gm, o) { return this._add("G", [a, b, cp, cn], { gm }, o); };
  /** MOSFET (d, g, s, b). dev = {type: "n"|"p", W, L, m?, dvth?, dbeta?} */
  CP.M = function (d, g, s, b, dev, o) { return this._add("M", [d, g, s, b], { dev: Object.assign({}, dev) }, o); };
  /** 다이오드(a → k). {is, n, area} 또는 생략. 기판 PNP(다이오드 연결)는 {pnp: true, area} */
  CP.D = function (a, k, p, o) { return this._add("D", [a, k], Object.assign({ is: 1e-15, n: 1, area: 1 }, p || {}), o); };
  /** 스위치: ctrl(t) → true/1이면 닫힘. 또는 {cp, cn, vt}: v(cp)−v(cn) > vt이면 닫힘 */
  CP.S = function (a, b, ctrl, o) {
    const p = typeof ctrl === "function" ? { ctrl } : ctrl && ctrl.cp != null ? { cp: this.node(ctrl.cp), cn: this.node(ctrl.cn || 0), vt: ctrl.vt || 0 } : { ctrl: () => !!ctrl };
    return this._add("S", [a, b], Object.assign({ ron: (o && o.ron) || 100, roff: (o && o.roff) || 1e12 }, p), o);
  };
  CP.el = function (name) { return this.byName[name]; };
  /** 소자 값 바꾸기: c.set("R1", "r", 2e3), c.set("M1", "W", 20e-6), c.set("Vin", "dc", 0.8) */
  CP.set = function (name, key, val) {
    const e = this.byName[name]; if (!e) throw new Error("no element " + name);
    if (e.type === "M" && key in { W: 1, L: 1, m: 1, dvth: 1, dbeta: 1, type: 1, lamScale: 1 }) e.dev[key] = val; else e[key] = val;
    return this;
  };
  CP.nodes = function () { return this.nodeNames.slice(1); };

  CP._index = function () {
    const nn = this.nodeNames.length - 1;
    let k = nn;
    for (const e of this.els) if (e.type === "V" || e.type === "L" || e.type === "E") e.br = k++;
    return { nn, N: k };
  };

  function mosStamp(ckt, e, x, A, b, N, T) {
    const [d, g, s, bb] = e.nodes;
    const v = (i) => (i ? x[i - 1] : 0);
    const sg = e.dev.type === "p" ? -1 : 1;
    const vg = v(g), vd = v(d), vs = v(s), vb = v(bb);
    const r = AN.mos(e.dev, sg * (vg - vs), sg * (vd - vs), sg * (vb - vs), T);
    const ids = sg * r.id; // 실제 d → s 전류
    const gm = r.gm, gds = r.gds, gmb = r.gmb;
    // AN.mos는 vds<0이면 내부에서 d/s를 바꿔 계산하고 소신호값은 바뀐 기준이다. 선형화는 실제 단자 기준으로 다시 맞춘다.
    let Gg, Gd, Gs, Gb;
    if (!r.swapped) { Gg = gm; Gd = gds; Gb = gmb; Gs = -(gm + gds + gmb); }
    else { Gg = -gm; Gs = -gds; Gb = -gmb; Gd = gm + gds + gmb; }
    const Ieq = ids - (Gg * vg + Gd * vd + Gs * vs + Gb * vb);
    const add = (row, col, val) => { if (row && col) A[(row - 1) * N + col - 1] += val; };
    for (const [col, G] of [[g, Gg], [d, Gd], [s, Gs], [bb, Gb]]) { add(d, col, G); add(s, col, -G); }
    if (d) b[d - 1] -= Ieq;
    if (s) b[s - 1] += Ieq;
    const gmin = 1e-12; add(d, d, gmin); add(s, s, gmin); add(d, s, -gmin); add(s, d, -gmin);
    e.op = r; e.op.ids = ids;
  }

  function diodeIs(e, T) {
    if (e.pnp) { const P = AN.PROC.pnp; return P.is * e.area * Math.pow(T / 300, P.xti) * Math.exp((P.eg / AN.Ut(T)) * (T / 300 - 1)); }
    return e.is * e.area;
  }
  function diodeStamp(e, x, A, b, N, T) {
    const [a, k] = e.nodes;
    const v = (i) => (i ? x[i - 1] : 0);
    const vd = v(a) - v(k), nUt = e.n * AN.Ut(T), Is = diodeIs(e, T);
    const vmax = nUt * Math.log(1 / Is) ; // 약 1 A 지점까지만 지수, 그 뒤는 직선 연장
    let id, gd;
    if (vd > vmax) { const i0 = Is * (Math.exp(vmax / nUt) - 1), g0 = (Is / nUt) * Math.exp(vmax / nUt); id = i0 + g0 * (vd - vmax); gd = g0; }
    else { const ex = Math.exp(Math.max(vd, -40 * nUt) / nUt); id = Is * (ex - 1); gd = (Is / nUt) * ex; }
    gd += 1e-12;
    const Ieq = id - gd * vd;
    const add = (r, c, val) => { if (r && c) A[(r - 1) * N + c - 1] += val; };
    add(a, a, gd); add(k, k, gd); add(a, k, -gd); add(k, a, -gd);
    if (a) b[a - 1] -= Ieq;
    if (k) b[k - 1] += Ieq;
    e.op = { id, gd, vd };
  }

  /**
   * 행렬 조립. mode: {kind: "op"|"tran", t, dt, trap, scale, gminX, st(상태)}
   */
  CP._assemble = function (x, N, nn, mode) {
    const A = new Float64Array(N * N), b = new Float64Array(N);
    const T = this.T, sc = mode.scale == null ? 1 : mode.scale;
    const add = (r, c, val) => { if (r && c) A[(r - 1) * N + c - 1] += val; };
    const v = (i) => (i ? x[i - 1] : 0);
    const gx = this.gmin + (mode.gminX || 0);
    for (let i = 0; i < nn; i++) A[i * N + i] += gx;
    const stampG = (a, c, g) => { add(a, a, g); add(c, c, g); add(a, c, -g); add(c, a, -g); };
    for (const e of this.els) {
      const [a, c] = e.nodes;
      switch (e.type) {
        case "R": stampG(a, c, 1 / e.r); break;
        case "C": case "Cm": {
          if (mode.kind === "tran") {
            const s = mode.st.cap.get(e);
            const geq = (mode.trap ? 2 : 1) * e.c / mode.dt;
            const ieq = geq * s.v + (mode.trap ? s.i : 0); // 등가 전류원(a로 들어감)
            stampG(a, c, geq);
            if (a) b[a - 1] += ieq; if (c) b[c - 1] -= ieq;
          }
          break;
        }
        case "L": {
          const k = e.br; // 가지 전류 a → b
          if (a) { A[(a - 1) * N + k] += 1; A[k * N + a - 1] += 1; }
          if (c) { A[(c - 1) * N + k] -= 1; A[k * N + c - 1] -= 1; }
          if (mode.kind === "tran") {
            const s = mode.st.ind.get(e);
            const req = (mode.trap ? 2 : 1) * e.l / mode.dt;
            A[k * N + k] -= req;
            b[k] = mode.trap ? -req * s.i - s.v : -req * s.i;
          }
          break;
        }
        case "V": {
          const k = e.br;
          if (a) { A[(a - 1) * N + k] += 1; A[k * N + a - 1] += 1; }
          if (c) { A[(c - 1) * N + k] -= 1; A[k * N + c - 1] -= 1; }
          b[k] += (e.wave && mode.useWave ? e.wave(mode.t) : e.dc) * sc;
          break;
        }
        case "I": {
          const val = (e.wave && mode.useWave ? e.wave(mode.t) : e.dc) * sc;
          if (a) b[a - 1] -= val; if (c) b[c - 1] += val;
          break;
        }
        case "G": {
          const [, , cp, cn] = e.nodes;
          add(a, cp, e.gm); add(a, cn, -e.gm); add(c, cp, -e.gm); add(c, cn, e.gm);
          break;
        }
        case "E": {
          const [, , cp, cn] = e.nodes, k = e.br;
          if (a) { A[(a - 1) * N + k] += 1; A[k * N + a - 1] += 1; }
          if (c) { A[(c - 1) * N + k] -= 1; A[k * N + c - 1] -= 1; }
          if (e.fn) {
            const vd = v(cp) - v(cn), h = 1e-6;
            const f0 = e.fn(vd), d = (e.fn(vd + h) - e.fn(vd - h)) / (2 * h);
            if (cp) A[k * N + cp - 1] -= d; if (cn) A[k * N + cn - 1] += d;
            b[k] += f0 - d * vd; e.lin = d;
          } else {
            if (cp) A[k * N + cp - 1] -= e.gain; if (cn) A[k * N + cn - 1] += e.gain;
            e.lin = e.gain;
          }
          break;
        }
        case "S": {
          let on;
          if (e.ctrl) on = !!e.ctrl(mode.t == null ? 0 : mode.t);
          else on = v(e.cp) - v(e.cn) > e.vt;
          stampG(a, c, on ? 1 / e.ron : 1 / e.roff);
          e.on = on;
          break;
        }
        case "M": mosStamp(this, e, x, A, b, N, T); break;
        case "D": diodeStamp(e, x, A, b, N, T); break;
      }
    }
    return { A, b };
  };

  CP._newton = function (x0, N, nn, mode, maxIt = 150) {
    let x = x0 ? Float64Array.from(x0) : new Float64Array(N);
    for (let it = 0; it < maxIt; it++) {
      const { A, b } = this._assemble(x, N, nn, mode);
      const xn = solveReal(A, b, N);
      if (!xn) return null;
      let mx = 0, lim = 1;
      for (let i = 0; i < nn; i++) { const d = Math.abs(xn[i] - x[i]); if (d > mx) mx = d; }
      if (mx > 0.4) lim = 0.4 / mx; // 마디 전압 갱신 제한
      let conv = true;
      for (let i = 0; i < N; i++) {
        const d = xn[i] - x[i];
        if (i < nn ? Math.abs(d) > 1e-7 + 1e-6 * Math.abs(xn[i]) : Math.abs(d) > 1e-10 + 1e-5 * Math.abs(xn[i])) conv = false;
        x[i] += lim * d;
      }
      if (conv && lim === 1) { x.iters = it + 1; return x; }
    }
    return null;
  };

  CP._pack = function (x, nn) {
    const v = { 0: 0, gnd: 0 };
    this.nodeNames.forEach((n, i) => { if (i) v[n] = x[i - 1]; });
    const i = {}, dev = {};
    for (const e of this.els) {
      if (e.br != null) i[e.name] = x[e.br];
      if (e.type === "M") dev[e.name] = e.op;
      if (e.type === "D") dev[e.name] = e.op;
      if (e.type === "R") { const [a, c] = e.nodes; i[e.name] = ((a ? x[a - 1] : 0) - (c ? x[c - 1] : 0)) / e.r; }
    }
    return { v, i, dev, x: Float64Array.from(x), ok: true };
  };

  /**
   * 동작점. opts.guess = {마디: V}로 초기값을 줄 수 있다. 수렴 실패 시 gmin·전원 스텝으로 재시도.
   * → {v: {마디: V}, i: {V소스·L·E·R 이름: A}, dev: {M이름: AN.mos 결과 + ids}, ok}
   * V 소스 전류는 + 단자에서 소스 안으로 들어가는 방향이 +(SPICE 규약). 공급 전류는 −op.i.Vdd.
   */
  CP.op = function (opts = {}) {
    const { nn, N } = this._index();
    let x0 = null;
    if (this.xLast && this.xLast.length === N) x0 = this.xLast;
    if (opts.guess) {
      x0 = x0 ? Float64Array.from(x0) : new Float64Array(N);
      for (const k in opts.guess) { const i = this.nodeMap.get(String(k)); if (i) x0[i - 1] = opts.guess[k]; }
    }
    const mode = { kind: "op", t: opts.t == null ? 0 : opts.t, useWave: opts.t != null };
    let x = this._newton(x0, N, nn, mode);
    if (!x) { // gmin 스텝
      let xs = x0;
      for (let gx = 1e-2; gx >= 1e-11; gx /= 10) { const r = this._newton(xs, N, nn, Object.assign({}, mode, { gminX: gx })); if (r) xs = r; }
      x = this._newton(xs, N, nn, mode);
    }
    if (!x) { // 전원 스텝
      let xs = null;
      for (let s = 0.05; s <= 1.0001; s += 0.05) { const r = this._newton(xs, N, nn, Object.assign({}, mode, { scale: s, gminX: 1e-9 })) || this._newton(xs, N, nn, Object.assign({}, mode, { scale: s, gminX: 1e-6 })); if (r) xs = r; }
      x = this._newton(xs, N, nn, mode);
    }
    if (!x) { const r = this._pack(x0 || new Float64Array(N), nn); r.ok = false; return r; }
    this.xLast = x;
    // 소자 동작점 정보를 수렴값으로 갱신
    this._assemble(x, N, nn, mode);
    return this._pack(x, nn);
  };

  /** DC 스윕: setter(c, val)로 값을 바꿔 가며 동작점을 구한다 → {x: vals, v(마디), i(이름), ops} */
  CP.dc = function (vals, setter) {
    const ops = [];
    for (const val of vals) { setter(this, val); ops.push(this.op()); }
    return {
      x: vals, ops,
      v: (n) => Float64Array.from(ops, (o) => o.v[n]),
      i: (n) => Float64Array.from(ops, (o) => o.i[n]),
      dev: (n, k) => Float64Array.from(ops, (o) => (o.dev[n] ? o.dev[n][k] : NaN)),
    };
  };

  // 소신호 커패시턴스 목록(명시 C + MOSFET 기생)
  CP._caps = function () {
    const list = [];
    for (const e of this.els) {
      if (e.type === "C") list.push({ a: e.nodes[0], b: e.nodes[1], c: e.c, el: e });
      if (e.type === "M" && this.mosCaps && e.op) {
        const [d, g, s, bb] = e.nodes, r = e.op;
        list.push({ a: g, b: s, c: r.cgs }, { a: g, b: d, c: r.cgd }, { a: d, b: bb, c: r.cdb }, { a: s, b: bb, c: r.csb });
      }
    }
    return list;
  };

  /**
   * AC 해석(동작점 주변 선형화). opts: {f: [Hz…]} 또는 {f0, f1, n}. 입력은 ac 값을 가진 V·I 소스.
   * → {f, re(마디), im(마디), mag(마디), db(마디), ph(마디, 도·펼침), op}
   */
  CP.ac = function (opts = {}) {
    const op = opts.op || this.op();
    const { nn, N } = this._index();
    const f = opts.f || AN.logspace(opts.f0 || 1, opts.f1 || 1e9, opts.n || 100);
    const { A: G } = this._assemble(op.x, N, nn, { kind: "op", t: 0 });
    const caps = this._caps();
    const bac = new Float64Array(N), baci = new Float64Array(N);
    for (const e of this.els) {
      if (!e.ac) continue;
      const ph = ((e.acPh || 0) * Math.PI) / 180, ar = e.ac * Math.cos(ph), ai = e.ac * Math.sin(ph);
      const [a, c] = e.nodes;
      if (e.type === "V") { bac[e.br] += ar; baci[e.br] += ai; }
      if (e.type === "I") { if (a) { bac[a - 1] -= ar; baci[a - 1] -= ai; } if (c) { bac[c - 1] += ar; baci[c - 1] += ai; } }
    }
    const R = [], I = [];
    for (const fr of f) {
      const w = 2 * Math.PI * fr;
      const Ar = Float64Array.from(G), Ai = new Float64Array(N * N);
      for (const cp of caps) {
        const y = w * cp.c, a = cp.a, c = cp.b;
        if (a) Ai[(a - 1) * N + a - 1] += y; if (c) Ai[(c - 1) * N + c - 1] += y;
        if (a && c) { Ai[(a - 1) * N + c - 1] -= y; Ai[(c - 1) * N + a - 1] -= y; }
      }
      for (const e of this.els) if (e.type === "L") Ai[e.br * N + e.br] -= w * e.l;
      const sol = solveComplex(Ar, Ai, Float64Array.from(bac), Float64Array.from(baci), N);
      R.push(sol ? sol[0] : new Float64Array(N)); I.push(sol ? sol[1] : new Float64Array(N));
    }
    const idx = (n) => { const i = this.nodeMap.get(String(n)); if (i == null) throw new Error("no node " + n); return i; };
    const re = (n) => { const i = idx(n); return Float64Array.from(R, (r) => (i ? r[i - 1] : 0)); };
    const im = (n) => { const i = idx(n); return Float64Array.from(I, (r) => (i ? r[i - 1] : 0)); };
    const mag = (n) => { const a = re(n), b = im(n); return a.map((v, k) => Math.hypot(v, b[k])); };
    const db = (n) => mag(n).map((m) => 20 * Math.log10(Math.max(m, 1e-30)));
    const ph = (n) => { const a = re(n), b = im(n); return AN.unwrap(Array.from(a, (v, k) => (Math.atan2(b[k], v) * 180) / Math.PI)); };
    const ibr = (name) => { const e = this.byName[name]; return { re: Float64Array.from(R, (r) => r[e.br]), im: Float64Array.from(I, (r) => r[e.br]) }; };
    return { f, re, im, mag, db, ph, ibr, op };
  };

  /**
   * 과도 해석. opts: {tstop, dt, trap: true(사다리꼴)/false(후진 오일러), tstart: 저장 시작, uic: false}
   * C의 {ic}를 주고 uic: true면 동작점 대신 그 초기 전압에서 시작한다.
   * → {t, v(마디), i(가지 이름), op}
   */
  CP.tran = function (opts) {
    const { nn, N } = this._index();
    const dt = opts.dt, tstop = opts.tstop, trap = opts.trap !== false;
    const op = opts.uic ? null : this.op({ t: 0 });
    let x = op ? Float64Array.from(op.x) : new Float64Array(N);
    if (opts.uic) {
      for (const e of this.els) if (e.type === "C" && e.ic != null) { const [a, c] = e.nodes; if (a && !c) x[a - 1] = e.ic; }
      this._assemble(x, N, nn, { kind: "op", t: 0 });
    }
    // MOSFET 기생 커패시턴스는 동작점 값으로 고정한 선형 커패시터로 넣는다
    const extra = [];
    if (this.mosCaps) for (const e of this.els) if (e.type === "M" && e.op) {
      const [d, g, s, bb] = e.nodes, r = e.op;
      for (const [a, c, cv] of [[g, s, r.cgs], [g, d, r.cgd], [d, bb, r.cdb], [s, bb, r.csb]]) if (cv > 0 && (a || c) && a !== c) extra.push({ type: "Cm", nodes: [a, c], c: cv });
    }
    const saveEls = this.els;
    this.els = this.els.concat(extra);
    const st = { cap: new Map(), ind: new Map() };
    const v = (xx, i) => (i ? xx[i - 1] : 0);
    for (const e of this.els) {
      if (e.type === "C" || e.type === "Cm") st.cap.set(e, { v: v(x, e.nodes[0]) - v(x, e.nodes[1]), i: 0 });
      if (e.type === "L") st.ind.set(e, { i: x[e.br], v: 0 });
    }
    const nSteps = Math.ceil(tstop / dt);
    const keep = opts.tstart || 0;
    const T = [], X = [];
    if (keep <= 0) { T.push(0); X.push(Float64Array.from(x)); }
    let ok = true;
    for (let k = 1; k <= nSteps; k++) {
      const t = k * dt;
      const mode = { kind: "tran", t, dt, trap: trap && k > 1, st, useWave: true };
      let xn = this._newton(x, N, nn, mode, 60);
      if (!xn) { // 시간 간격을 쪼개 재시도
        let xs = x, sub = 8, good = true;
        const sdt = dt / sub;
        const st2 = { cap: new Map([...st.cap].map(([e, s]) => [e, Object.assign({}, s)])), ind: new Map([...st.ind].map(([e, s]) => [e, Object.assign({}, s)])) };
        for (let j = 1; j <= sub; j++) {
          const r = this._newton(xs, N, nn, { kind: "tran", t: t - dt + j * sdt, dt: sdt, trap: false, st: st2, useWave: true }, 100);
          if (!r) { good = false; break; }
          this._update(st2, r, sdt, false);
          xs = r;
        }
        if (!good) { ok = false; xn = x; } else { xn = xs; for (const [e, s] of st2.cap) st.cap.set(e, s); for (const [e, s] of st2.ind) st.ind.set(e, s); x = xn; if (t >= keep) { T.push(t); X.push(Float64Array.from(x)); } continue; }
      }
      this._update(st, xn, dt, mode.trap);
      x = xn;
      if (t >= keep - 1e-18) { T.push(t); X.push(Float64Array.from(x)); }
    }
    this.els = saveEls;
    const idx = (n) => { const i = this.nodeMap.get(String(n)); if (i == null) throw new Error("no node " + n); return i; };
    return {
      t: Float64Array.from(T), ok, op,
      v: (n) => { const i = idx(n); return Float64Array.from(X, (r) => (i ? r[i - 1] : 0)); },
      i: (name) => { const e = this.byName[name]; if (e.br != null) return Float64Array.from(X, (r) => r[e.br]); const [a, c] = e.nodes; return Float64Array.from(X, (r) => (v(r, a) - v(r, c)) / e.r); },
    };
  };
  CP._update = function (st, x, dt, trap) {
    const v = (i) => (i ? x[i - 1] : 0);
    for (const [e, s] of st.cap) {
      const vn = v(e.nodes[0]) - v(e.nodes[1]);
      const geq = ((trap ? 2 : 1) * e.c) / dt;
      s.i = trap ? geq * (vn - s.v) - s.i : geq * (vn - s.v);
      s.v = vn;
    }
    for (const [e, s] of st.ind) { s.i = x[e.br]; s.v = v(e.nodes[0]) - v(e.nodes[1]); }
  };

  /**
   * 잡음 해석. out: 출력 마디(접지 기준) 또는 [p, n] 차동. opts: {f | f0, f1, n, input: 입력 V 소스 이름(ac 1로 가정)}
   * 저항 4kT/R, MOSFET 채널 4kTγgm + kf·gm²/(Cox·W·L·f) (드레인-소스 전류 잡음), 다이오드 2qI.
   * → {f, out: V²/Hz, inp: V²/Hz(입력 환산), gain: |H|, contrib: {이름: V²/Hz 배열}, total(f0,f1) 적분 rms}
   */
  CP.noise = function (out, opts = {}) {
    const op = opts.op || this.op();
    const { nn, N } = this._index();
    const f = opts.f || AN.logspace(opts.f0 || 1, opts.f1 || 1e9, opts.n || 100);
    const { A: G } = this._assemble(op.x, N, nn, { kind: "op", t: 0 });
    const caps = this._caps();
    const [po, no] = Array.isArray(out) ? out.map((n) => this.node(n)) : [this.node(out), 0];
    const kT4 = 4 * KB * this.T;
    const srcs = [];
    for (const e of this.els) {
      if (e.type === "R") srcs.push({ name: e.name, a: e.nodes[0], b: e.nodes[1], S: () => kT4 / e.r });
      if (e.type === "M" && e.op) {
        const r = e.op, P = e.dev.type === "p" ? AN.PROC.p : AN.PROC.n, d = e.dev;
        const wl = d.W * (d.m || 1) * d.L * AN.PROC.cox;
        srcs.push({ name: e.name, a: e.nodes[0], b: e.nodes[2], S: (fr) => kT4 * AN.PROC.gammaN * Math.abs(r.gm) + (P.kf * r.gm * r.gm) / (wl * fr),
          Sth: () => kT4 * AN.PROC.gammaN * Math.abs(r.gm), Sfl: (fr) => (P.kf * r.gm * r.gm) / (wl * fr) });
      }
      if (e.type === "D" && e.op) srcs.push({ name: e.name, a: e.nodes[0], b: e.nodes[1], S: () => 2 * QE * Math.abs(e.op.id) });
    }
    let inEl = opts.input ? this.byName[opts.input] : null;
    const outPsd = new Float64Array(f.length), gain = new Float64Array(f.length);
    const contrib = {}; srcs.forEach((s) => (contrib[s.name] = new Float64Array(f.length)));
    const thermal = new Float64Array(f.length), flicker = new Float64Array(f.length);
    f.forEach((fr, k) => {
      const w = 2 * Math.PI * fr;
      // Yᵀ y = e_out
      const Ar = new Float64Array(N * N), Ai = new Float64Array(N * N);
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) Ar[j * N + i] = G[i * N + j];
      for (const cp of caps) {
        const y = w * cp.c, a = cp.a, c = cp.b;
        if (a) Ai[(a - 1) * N + a - 1] += y; if (c) Ai[(c - 1) * N + c - 1] += y;
        if (a && c) { Ai[(a - 1) * N + c - 1] -= y; Ai[(c - 1) * N + a - 1] -= y; }
      }
      for (const e of this.els) if (e.type === "L") Ai[e.br * N + e.br] -= w * e.l;
      const br = new Float64Array(N), bi = new Float64Array(N);
      if (po) br[po - 1] += 1; if (no) br[no - 1] -= 1;
      const sol = solveComplex(Ar, Ai, br, bi, N);
      if (!sol) return;
      const [yr, yi] = sol;
      const yv = (i) => (i ? [yr[i - 1], yi[i - 1]] : [0, 0]);
      let tot = 0;
      for (const s of srcs) {
        const [ar, ai] = yv(s.a), [br2, bi2] = yv(s.b);
        const z2 = (ar - br2) ** 2 + (ai - bi2) ** 2;
        const p = z2 * s.S(fr);
        contrib[s.name][k] = p; tot += p;
        if (s.Sth) { thermal[k] += z2 * s.Sth(); flicker[k] += z2 * s.Sfl(fr); } else thermal[k] += p;
      }
      outPsd[k] = tot;
      if (inEl) { // 입력 V 소스(가지)에서 출력까지의 이득 = y[br]
        const gr = yr[inEl.br], gi = yi[inEl.br];
        gain[k] = Math.hypot(gr, gi);
      }
    });
    const inp = inEl ? outPsd.map((p, k) => p / Math.max(gain[k] * gain[k], 1e-60)) : null;
    const total = (arr, f0 = f[0], f1 = f[f.length - 1]) => { let s = 0; for (let k = 1; k < f.length; k++) { if (f[k] < f0 || f[k - 1] > f1) continue; s += 0.5 * (arr[k] + arr[k - 1]) * (f[k] - f[k - 1]); } return Math.sqrt(s); };
    return { f, out: outPsd, inp, gain, contrib, thermal, flicker, total, op };
  };

  /* ------------------------------------------------------------------ 복소수·전달 함수 */
  AN.unwrap = function (deg) {
    const out = Array.from(deg);
    for (let i = 1; i < out.length; i++) { let d = out[i] - out[i - 1]; while (d > 180) { out[i] -= 360; d -= 360; } while (d < -180) { out[i] += 360; d += 360; } }
    return out;
  };
  const cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const cdiv = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
  AN.cx = { mul: cmul, div: cdiv, abs: (a) => Math.hypot(a[0], a[1]), arg: (a) => Math.atan2(a[1], a[0]), add: (a, b) => [a[0] + b[0], a[1] + b[1]] };

  /**
   * 극점·영점으로 정의한 전달 함수. 주파수는 Hz.
   *   H = AN.pz({k: 1000, poles: [1e4, 1e8], zeros: [-5e8]})   // 음수 영점 = 우반면 영점
   *   복소 극점 쌍은 {f0, q}: poles: [{f0: 1e6, q: 2}]
   *   H(f) → [re, im],  H.s(sRe, sIm) → s 평면 값
   */
  AN.pz = function (o) {
    const k = o.k == null ? 1 : o.k, poles = o.poles || [], zeros = o.zeros || [];
    const term = (p, s) => {
      if (typeof p === "number") { const w = 2 * Math.PI * Math.abs(p), sg = p < 0 ? -1 : 1; return [1 + (sg * s[0]) / w, (sg * s[1]) / w]; }
      const w0 = 2 * Math.PI * p.f0, q = p.q; // 1 + s/(w0 q) + s²/w0²
      const s2 = cmul(s, s);
      return [1 + s[0] / (w0 * q) + s2[0] / (w0 * w0), s[1] / (w0 * q) + s2[1] / (w0 * w0)];
    };
    const Hs = (sr, si) => {
      let num = [k, 0], den = [1, 0];
      const s = [sr, si];
      for (const z of zeros) num = cmul(num, term(z, s));
      for (const p of poles) den = cmul(den, term(p, s));
      if (o.delay) { const ph = -si * o.delay; num = cmul(num, [Math.cos(ph) * Math.exp(-sr * o.delay), Math.sin(ph) * Math.exp(-sr * o.delay)]); }
      return cdiv(num, den);
    };
    const H = (f) => Hs(0, 2 * Math.PI * f);
    H.s = Hs; H.o = o;
    return H;
  };
  /** 다항식(오름차순 계수)의 jω 값 */
  AN.polyEval = (c, sr, si) => { let r = [0, 0]; for (let i = c.length - 1; i >= 0; i--) r = [r[0] * sr - r[1] * si + c[i], r[0] * si + r[1] * sr]; return r; };
  AN.polyMul = (a, b) => { const r = new Array(a.length + b.length - 1).fill(0); a.forEach((x, i) => b.forEach((y, j) => (r[i + j] += x * y))); return r; };
  AN.polyAdd = (a, b) => Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] || 0) + (b[i] || 0));
  /** 극점·영점 표현 → 다항식(오름차순, s 단위 rad/s): {num, den} */
  AN.pzPoly = function (o) {
    const k = o.k == null ? 1 : o.k;
    const fac = (p) => (typeof p === "number" ? [1, (p < 0 ? -1 : 1) / (2 * Math.PI * Math.abs(p))] : [1, 1 / (2 * Math.PI * p.f0 * p.q), 1 / Math.pow(2 * Math.PI * p.f0, 2)]);
    let num = [k], den = [1];
    for (const z of o.zeros || []) num = AN.polyMul(num, fac(z));
    for (const p of o.poles || []) den = AN.polyMul(den, fac(p));
    return { num, den };
  };
  /** 전달 함수(오름차순 다항식) 계산기 */
  AN.tf = function (num, den) { const H = (f) => cdiv(AN.polyEval(num, 0, 2 * Math.PI * f), AN.polyEval(den, 0, 2 * Math.PI * f)); H.num = num; H.den = den; return H; };
  /** 루프 이득 다항식 L = N/D, 귀환 β에서 폐루프 A/(1+Aβ) = N/(D + βN) */
  AN.closeLoop = function (num, den, beta = 1) { return { num: num.slice(), den: AN.polyAdd(den, num.map((x) => x * beta)) }; };

  /** 보드 데이터: H(f) → {f, mag(배), db, ph(도, 펼침)} */
  AN.bodeData = function (H, f0 = 1, f1 = 1e10, n = 300) {
    const f = Array.isArray(f0) ? f0 : AN.logspace(f0, f1, n);
    const v = f.map((x) => H(x));
    const mag = v.map((c) => Math.hypot(c[0], c[1]));
    return { f, mag, db: mag.map((m) => 20 * Math.log10(Math.max(m, 1e-30))), ph: AN.unwrap(v.map((c) => (Math.atan2(c[1], c[0]) * 180) / Math.PI)) };
  };
  /** 안정도 여유: 루프 이득 보드 데이터 → {fu: 단위 이득 주파수, pm: 위상 여유(도), f180, gm: 이득 여유(dB)} */
  AN.margins = function (bd, o = {}) {
    const { f, db, ph } = bd;
    let fu = NaN, pm = NaN, f180 = NaN, gm = NaN;
    // 기준 위상: 저주파 기울기로 적분기 개수 k(−20k dB/dec)를 세고, 적분기 몫(−90k°)을 뺀 나머지를
    // 180°의 배수로 맞춘다(반전 증폭기의 ±180°만 걷어 낸다). o.ref로 직접 줄 수도 있다.
    let ref = o.ref;
    if (ref == null) {
      const j = Math.min(f.length - 1, Math.max(1, Math.round(f.length / 40)));
      const slope = (db[j] - db[0]) / Math.log10(f[j] / f[0]);
      const k = Math.max(0, Math.round(-slope / 20 - 0.25));
      ref = Math.round((ph[0] + 90 * k) / 180) * 180;
    }
    for (let i = 1; i < f.length; i++) {
      if (isNaN(fu) && db[i - 1] >= 0 && db[i] < 0) {
        const t = db[i - 1] / (db[i - 1] - db[i]);
        fu = Math.exp(Math.log(f[i - 1]) + t * (Math.log(f[i]) - Math.log(f[i - 1])));
        const p = ph[i - 1] + t * (ph[i] - ph[i - 1]);
        pm = 180 + (p - ref);
      }
      const l0 = ph[i - 1] - ref, l1 = ph[i] - ref;
      if (isNaN(f180) && l0 > -180 && l1 <= -180) {
        const t = (l0 + 180) / (l0 - l1);
        f180 = Math.exp(Math.log(f[i - 1]) + t * (Math.log(f[i]) - Math.log(f[i - 1])));
        gm = -(db[i - 1] + t * (db[i] - db[i - 1]));
      }
    }
    return { fu, pm, f180, gm, ref };
  };
  /** 이득이 DC보다 3 dB 떨어지는 주파수 */
  AN.f3db = function (bd) {
    const ref = bd.db[0] - 3.0103;
    for (let i = 1; i < bd.f.length; i++) if (bd.db[i - 1] >= ref && bd.db[i] < ref) { const t = (bd.db[i - 1] - ref) / (bd.db[i - 1] - bd.db[i]); return Math.exp(Math.log(bd.f[i - 1]) + t * Math.log(bd.f[i] / bd.f[i - 1])); }
    return NaN;
  };

  /**
   * 시간 응답(쌍선형 변환 이산화, 무조건 안정). num/den 오름차순(rad/s 기준)
   * AN.response(num, den, {tstop, n: 600, input: "step"|"impulse"|fn(t)}) → {t, y}
   */
  AN.response = function (num, den, o = {}) {
    const n = o.n || 600, tstop = o.tstop, dt = tstop / n;
    const ord = den.length - 1;
    const pad = (c) => { const r = c.slice(); while (r.length < ord + 1) r.push(0); return r; };
    const b = pad(num), a = pad(den);
    // s = (2/dt)(1 − z⁻¹)/(1 + z⁻¹): Σ c_k s^k → Σ c_k (2/dt)^k (1 − z⁻¹)^k (1 + z⁻¹)^(ord−k)
    const disc = (c) => {
      let out = new Array(ord + 1).fill(0);
      for (let k = 0; k <= ord; k++) {
        if (!c[k]) continue;
        let p = [c[k] * Math.pow(2 / dt, k)];
        for (let i = 0; i < k; i++) p = AN.polyMul(p, [1, -1]);
        for (let i = 0; i < ord - k; i++) p = AN.polyMul(p, [1, 1]);
        out = AN.polyAdd(out, p);
      }
      return out;
    };
    const B = disc(b), A = disc(a);
    const a0 = A[0];
    const u = typeof o.input === "function" ? o.input : o.input === "impulse" ? (t, i) => (i === 0 ? 1 / dt : 0) : () => 1;
    const t = new Float64Array(n + 1), y = new Float64Array(n + 1), uu = new Float64Array(n + 1);
    for (let i = 0; i <= n; i++) {
      t[i] = i * dt; uu[i] = u(t[i], i);
      let s = 0;
      for (let k = 0; k <= ord; k++) if (i - k >= 0) s += B[k] * uu[i - k];
      for (let k = 1; k <= ord; k++) if (i - k >= 0) s -= A[k] * y[i - k];
      y[i] = s / a0;
    }
    return { t, y };
  };
  /** 계단 응답의 지표: {overshoot(비율), ts(정착 시간, tol 기본 1%), tr(10→90%), final} */
  AN.stepInfo = function (t, y, tol = 0.01, final) {
    const yf = final == null ? y[y.length - 1] : final;
    let mx = -Infinity; for (const v of y) mx = Math.max(mx, v);
    let t10 = NaN, t90 = NaN, ts = 0;
    for (let i = 0; i < y.length; i++) { if (isNaN(t10) && y[i] >= 0.1 * yf) t10 = t[i]; if (isNaN(t90) && y[i] >= 0.9 * yf) t90 = t[i]; }
    for (let i = y.length - 1; i >= 0; i--) if (Math.abs(y[i] - yf) > tol * Math.abs(yf)) { ts = t[Math.min(i + 1, y.length - 1)]; break; }
    return { overshoot: Math.max(0, (mx - yf) / Math.abs(yf)), ts, tr: t90 - t10, final: yf };
  };
  /** 2차 시스템 위상 여유 → 감쇠비·오버슈트 근사 (단위 귀환, 두 극점) */
  AN.zetaToPm = (z) => (Math.atan2(2 * z, Math.sqrt(Math.sqrt(1 + 4 * z ** 4) - 2 * z * z)) * 180) / Math.PI;
  AN.pmToZeta = (pm) => { let lo = 0, hi = 3; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (AN.zetaToPm(m) < pm) lo = m; else hi = m; } return (lo + hi) / 2; };
  /** 2차 계단 응답 오버슈트(비율) */
  AN.overshoot = (z) => (z >= 1 ? 0 : Math.exp((-Math.PI * z) / Math.sqrt(1 - z * z)));

  /* ------------------------------------------------------------------ 신호 처리 */
  /** 제자리 radix-2 FFT. re, im 길이는 2의 거듭제곱 */
  AN.fft = function (re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let j = 0; j < len / 2; j++) {
          const ar = re[i + j + len / 2], ai = im[i + j + len / 2];
          const tr = ar * cr - ai * ci, ti = ar * ci + ai * cr;
          re[i + j + len / 2] = re[i + j] - tr; im[i + j + len / 2] = im[i + j] - ti;
          re[i + j] += tr; im[i + j] += ti;
          const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
        }
      }
    }
  };
  AN.window = function (n, kind = "hann") {
    const w = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const x = (2 * Math.PI * i) / n;
      w[i] = kind === "rect" ? 1 : kind === "bh" ? 0.35875 - 0.48829 * Math.cos(x) + 0.14128 * Math.cos(2 * x) - 0.01168 * Math.cos(3 * x) : 0.5 - 0.5 * Math.cos(x);
    }
    return w;
  };
  /**
   * 단측 파워 스펙트럼. x 길이는 2의 거듭제곱. full: 전체 스케일 사인 진폭(이 진폭의 사인이 0 dBFS)
   * → {f(fs 주면 Hz, 아니면 빈 번호), p(전력, 사인 진폭²/2 단위로 보정), db(dBFS), win}
   */
  AN.spectrum = function (x, o = {}) {
    const n = x.length, kind = o.window || "hann", w = AN.window(n, kind);
    let cg = 0; for (const v of w) cg += v; cg /= n;
    const re = new Float64Array(n), im = new Float64Array(n);
    let mean = 0; if (o.dc !== true) { for (const v of x) mean += v; mean /= n; }
    for (let i = 0; i < n; i++) re[i] = (x[i] - mean) * w[i];
    AN.fft(re, im);
    const half = n / 2, p = new Float64Array(half), db = new Float64Array(half), f = new Float64Array(half);
    const full = o.full || 1;
    for (let k = 0; k < half; k++) {
      const a = (Math.hypot(re[k], im[k]) / (n * cg)) * (k ? 2 : 1); // 사인 진폭
      p[k] = (a * a) / 2;
      db[k] = 20 * Math.log10(Math.max(a / full, 1e-15));
      f[k] = o.fs ? (k * o.fs) / n : k;
    }
    return { f, p, db, win: kind };
  };
  /**
   * 사인 시험 신호 분석(일관 표본화 가정). → {sndr, snr, thd, sfdr (dB), enob, bin(기본파 빈)}
   * o: {window: "bh"(기본), harm: 고조파 개수 7, span: 기본파 좌우 빈 수}
   */
  AN.sinad = function (x, o = {}) {
    const n = x.length, kind = o.window || "bh";
    const S = AN.spectrum(x, { window: kind });
    const P = S.p, half = n / 2, span = o.span == null ? (kind === "rect" ? 0 : kind === "hann" ? 2 : 4) : o.span;
    let fb = 1; for (let k = 2; k < half; k++) if (P[k] > P[fb]) fb = k;
    // 창 함수 에너지 보정은 비율이라 상쇄된다
    const sum = (a, b) => { let s = 0; for (let k = Math.max(1, a); k <= Math.min(half - 1, b); k++) s += P[k]; return s; };
    const used = new Uint8Array(half);
    const take = (c) => { let s = 0; for (let k = Math.max(1, c - span); k <= Math.min(half - 1, c + span); k++) if (!used[k]) { s += P[k]; used[k] = 1; } return s; };
    for (let k = 0; k <= span; k++) used[k] = 1; // DC 근처 제외
    const ps = take(fb);
    let ph = 0, spur = 0;
    for (let h = 2; h <= (o.harm || 7); h++) {
      let b = (h * fb) % n; if (b > half) b = n - b;
      if (b <= span || b >= half) continue;
      const v = take(b); ph += v;
    }
    let pn = 0; for (let k = 1; k < half; k++) if (!used[k]) pn += P[k];
    // 일관 표본화에서 기본파·최악 스퍼 모두 같은 창의 피크 빈으로 비교한다.
    // 기본파의 주엽 합산 ps와 스퍼 한 빈을 비교하면 창의 에너지 배수가 남는다.
    for (let k = span + 1; k < half; k++) if (Math.abs(k - fb) > span && P[k] > spur) spur = P[k];
    const sndr = 10 * Math.log10(ps / (pn + ph + 1e-300));
    return { sndr, snr: 10 * Math.log10(ps / (pn + 1e-300)), thd: 10 * Math.log10((ph + 1e-300) / ps), sfdr: 10 * Math.log10(P[fb] / (spur + 1e-300)), enob: (sndr - 1.76) / 6.02, bin: fb, spec: S };
  };
  /** 일관 표본화 주파수: fs, n 점에서 목표 f에 가장 가까운 홀수(서로소) 주기 수 → {f, cycles} */
  AN.coherent = function (fs, n, fTarget) {
    let c = Math.max(1, Math.round((fTarget * n) / fs));
    const gcd = (a, b) => (b ? gcd(b, a % b) : a);
    while (gcd(c, n) !== 1) c++;
    return { f: (c * fs) / n, cycles: c };
  };
  /** 이상적 양자화기: 입력 v(0~vref) → 코드(0..2^N−1). mid=true면 중간값 기준 */
  AN.quantize = function (v, bits, vref = 1) {
    const L = 1 << bits, c = Math.floor((v / vref) * L);
    return Math.max(0, Math.min(L - 1, c));
  };

  /* ------------------------------------------------------------------ 그리기 */
  const P_ = () => (window.AB ? window.AB.palette() : { text: "#111", dim: "#666", faint: "#999", grid: "#ddd", axis: "#888", accent: "#c2255c", accent2: "#0c8599", bad: "#d64545", ok: "#1f9d55", warn: "#d98a00", bg: "#fff" });
  const F_ = (px, mono, wt) => (window.AB ? window.AB.font(px, mono, wt) : `${wt || 400} ${px}px sans-serif`);
  const col = (name, fb) => (window.AB ? window.AB.color(name) || fb : fb);

  /**
   * 회로도 그리기. const S = AN.sch(ctx, {u: 12}); 좌표는 캔버스 CSS px.
   * 기호는 핀 좌표를 돌려주므로 S.wire([pins.d, [x, y], …])로 잇는다.
   *   S.wire(pts, {color, width, dash})   S.dot(x, y)   S.gnd(x, y)   S.vdd(x, y, "VDD")
   *   S.res(x1, y1, x2, y2, {label})      S.cap(...)   S.ind(...)    S.diode(...)   S.sw(x1, y1, x2, y2, {on})
   *   S.isrc(x1, y1, x2, y2, {label, dir: 1(1→2 방향)})   S.vsrc(x1, y1, x2, y2, {label, ac})
   *   S.nmos(x, y, {label, flip, body}) → {g, d, s}  (x, y = 채널 중심, 게이트 왼쪽·드레인 위; flip이면 게이트 오른쪽)
   *   S.pmos(x, y, {...}) → {g, d, s}  (소스 위, 드레인 아래)
   *   S.pnp(x, y) → {b, e, c}     S.opamp(x, y, {w, h, flip(− 입력이 아래), label}) → {inp, inn, out}
   *   S.label(x, y, text, {color, align, base, size, mono, bold})   S.tag(x, y, text, {color})  // 값 표시 상자
   *   S.arrow(x1, y1, x2, y2, {color, label})  S.flow(pts, phase, {color, gap, r})  // 움직이는 전류 점
   * opts.color로 기호마다 색을 바꿀 수 있다(강조할 소자: AB.color("sch-hot")).
   */
  AN.sch = function (ctx, opt = {}) {
    const u = opt.u || 12, P = P_();
    const W = col("sch-wire", P.text), D = col("sch-dev", P.text);
    const lw = opt.lw || Math.max(1.4, u / 7);
    const S = { u, ctx };
    const stroke = (c, w) => { ctx.strokeStyle = c || W; ctx.lineWidth = w || lw; ctx.lineCap = "round"; ctx.lineJoin = "round"; };
    S.wire = function (pts, o = {}) {
      if (pts.length < 2) return;
      ctx.save(); stroke(o.color || W, o.width); if (o.dash) ctx.setLineDash(o.dash);
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); ctx.restore();
    };
    S.dot = function (x, y, o = {}) { ctx.fillStyle = o.color || W; ctx.beginPath(); ctx.arc(x, y, o.r || u * 0.22, 0, 7); ctx.fill(); };
    S.open = function (x, y, o = {}) { ctx.save(); ctx.fillStyle = P.bg; stroke(o.color || W); ctx.beginPath(); ctx.arc(x, y, u * 0.25, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore(); };
    S.label = function (x, y, t, o = {}) {
      ctx.save(); ctx.fillStyle = o.color || P.text; ctx.font = F_(o.size || Math.max(11, u * 0.95), o.mono, o.bold ? 700 : 500);
      ctx.textAlign = o.align || "left"; ctx.textBaseline = o.base || "middle"; ctx.fillText(t, x, y); ctx.restore();
    };
    S.tag = function (x, y, t, o = {}) {
      ctx.save(); ctx.font = F_(o.size || Math.max(10.5, u * 0.85), true, 600);
      const w = ctx.measureText(t).width + 10, h = (o.size || Math.max(10.5, u * 0.85)) + 7;
      const c = o.color || P.accent;
      let x0 = o.align === "right" ? x - w : o.align === "center" ? x - w / 2 : x;
      ctx.fillStyle = P.bg; ctx.strokeStyle = c; ctx.lineWidth = 1.2;
      if (window.AB) window.AB.rrect(ctx, x0, y - h / 2, w, h, 5); else { ctx.beginPath(); ctx.rect(x0, y - h / 2, w, h); }
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = c; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(t, x0 + 5, y + 0.5); ctx.restore();
      return { w, h };
    };
    // 두 점 사이 축 정렬 소자의 공통 틀: 가운데 길이 len의 몸체를 그리고 양쪽을 선으로
    const along = (x1, y1, x2, y2, len, body, o) => {
      const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, h = Math.min(len, L) / 2;
      ctx.save(); stroke(o.color || W);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(mx - ux * h, my - uy * h); ctx.moveTo(mx + ux * h, my + uy * h); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.translate(mx, my); ctx.rotate(Math.atan2(uy, ux)); stroke(o.color || D, o.width);
      body(h);
      ctx.restore();
      if (o.label) {
        const vert = Math.abs(uy) > Math.abs(ux);
        const off = o.labelOff || u * 1.1;
        S.label(mx + (vert ? off : 0), my + (vert ? 0 : -off), o.label, { align: vert ? "left" : "center", color: o.labelColor || P.text, size: o.size });
      }
    };
    S.res = function (x1, y1, x2, y2, o = {}) {
      along(x1, y1, x2, y2, u * 3, (h) => {
        ctx.beginPath(); ctx.moveTo(-h, 0); const n = 6;
        for (let i = 0; i < n; i++) ctx.lineTo(-h + ((i + 0.5) * 2 * h) / n, (i % 2 ? 1 : -1) * u * 0.45);
        ctx.lineTo(h, 0); ctx.stroke();
      }, o);
    };
    S.cap = function (x1, y1, x2, y2, o = {}) {
      along(x1, y1, x2, y2, u * 0.6, (h) => {
        ctx.beginPath(); ctx.moveTo(-h, -u * 0.9); ctx.lineTo(-h, u * 0.9); ctx.moveTo(h, -u * 0.9); ctx.lineTo(h, u * 0.9); ctx.stroke();
      }, o);
    };
    S.ind = function (x1, y1, x2, y2, o = {}) {
      along(x1, y1, x2, y2, u * 3, (h) => {
        ctx.beginPath(); const n = 4, r = h / n;
        for (let i = 0; i < n; i++) ctx.arc(-h + r * (2 * i + 1), 0, r, Math.PI, 0);
        ctx.stroke();
      }, o);
    };
    S.diode = function (x1, y1, x2, y2, o = {}) {
      along(x1, y1, x2, y2, u * 1.2, (h) => {
        ctx.beginPath(); ctx.moveTo(-h, -u * 0.6); ctx.lineTo(h, 0); ctx.lineTo(-h, u * 0.6); ctx.closePath(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(h, -u * 0.6); ctx.lineTo(h, u * 0.6); ctx.stroke();
      }, o);
    };
    S.sw = function (x1, y1, x2, y2, o = {}) {
      along(x1, y1, x2, y2, u * 2, (h) => {
        ctx.beginPath(); ctx.arc(-h, 0, u * 0.18, 0, 7); ctx.moveTo(h + u * 0.18, 0); ctx.arc(h, 0, u * 0.18, 0, 7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-h, 0); if (o.on) ctx.lineTo(h, 0); else ctx.lineTo(h * 0.85, -u * 0.9); ctx.stroke();
      }, Object.assign({}, o, { color: o.color || (o.on ? P.accent : undefined) }));
    };
    S.isrc = function (x1, y1, x2, y2, o = {}) {
      along(x1, y1, x2, y2, u * 2, (h) => {
        ctx.beginPath(); ctx.arc(0, 0, h, 0, 7); ctx.stroke();
        const s = o.dir === -1 ? -1 : 1;
        ctx.beginPath(); ctx.moveTo(-h * 0.55 * s, 0); ctx.lineTo(h * 0.55 * s, 0); ctx.moveTo(h * 0.55 * s, 0); ctx.lineTo(h * 0.1 * s, -h * 0.35); ctx.moveTo(h * 0.55 * s, 0); ctx.lineTo(h * 0.1 * s, h * 0.35); ctx.stroke();
      }, o);
    };
    S.vsrc = function (x1, y1, x2, y2, o = {}) {
      along(x1, y1, x2, y2, u * 2, (h) => {
        ctx.beginPath(); ctx.arc(0, 0, h, 0, 7); ctx.stroke();
        if (o.ac) { ctx.beginPath(); for (let i = 0; i <= 20; i++) { const t = -h * 0.6 + (i / 20) * h * 1.2; ctx.lineTo(Math.sin((i / 20) * 2 * Math.PI) * h * 0.35, t); } ctx.stroke(); }
        else { ctx.beginPath(); ctx.moveTo(-h * 0.5, -h * 0.2); ctx.lineTo(-h * 0.5, h * 0.2); ctx.moveTo(-h * 0.7, 0); ctx.lineTo(-h * 0.3, 0); ctx.moveTo(h * 0.5, -h * 0.2); ctx.lineTo(h * 0.5, h * 0.2); ctx.stroke(); }
      }, o);
    };
    S.gnd = function (x, y, o = {}) {
      ctx.save(); stroke(o.color || W);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + u * 0.5);
      for (let i = 0; i < 3; i++) { const w = u * (0.8 - i * 0.28); ctx.moveTo(x - w, y + u * (0.5 + i * 0.3)); ctx.lineTo(x + w, y + u * (0.5 + i * 0.3)); }
      ctx.stroke(); ctx.restore();
    };
    S.vdd = function (x, y, t = "VDD", o = {}) {
      ctx.save(); stroke(o.color || W);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - u * 0.5); ctx.moveTo(x - u * 0.8, y - u * 0.5); ctx.lineTo(x + u * 0.8, y - u * 0.5); ctx.stroke(); ctx.restore();
      if (t) S.label(x, y - u * 1.2, t, { align: "center", size: Math.max(10, u * 0.85), color: P.dim });
    };
    const mosBody = (x, y, o, p) => {
      const f = o.flip ? -1 : 1, c = o.color || D;
      ctx.save(); stroke(c);
      const gx = x - f * u * 0.45;
      ctx.beginPath();
      ctx.moveTo(x, y - u); ctx.lineTo(x, y + u);                 // 채널
      ctx.moveTo(gx, y - u * 0.85); ctx.lineTo(gx, y + u * 0.85);  // 게이트 판
      ctx.moveTo(gx - f * (p ? u * 0.32 : 0), y); ctx.lineTo(x - f * u * 2, y); // 게이트 리드
      ctx.moveTo(x, y - u * 0.7); ctx.lineTo(x + f * u, y - u * 0.7); ctx.lineTo(x + f * u, y - u * 2);
      ctx.moveTo(x, y + u * 0.7); ctx.lineTo(x + f * u, y + u * 0.7); ctx.lineTo(x + f * u, y + u * 2);
      ctx.stroke();
      if (p) { ctx.fillStyle = P.bg; ctx.beginPath(); ctx.arc(gx - f * u * 0.16, y, u * 0.16, 0, 7); ctx.fill(); ctx.stroke(); }
      // 소스 화살표
      ctx.fillStyle = c; ctx.beginPath();
      const sy = p ? y - u * 0.7 : y + u * 0.7, ax = x + f * u * 0.55;
      if (!p) { ctx.moveTo(ax + f * u * 0.3, sy); ctx.lineTo(ax - f * u * 0.1, sy - u * 0.25); ctx.lineTo(ax - f * u * 0.1, sy + u * 0.25); }
      else { ctx.moveTo(ax - f * u * 0.3, sy); ctx.lineTo(ax + f * u * 0.1, sy - u * 0.25); ctx.lineTo(ax + f * u * 0.1, sy + u * 0.25); }
      ctx.closePath(); ctx.fill();
      ctx.restore();
      if (o.label) S.label(x + f * u * 1.4, y, o.label, { align: o.flip ? "right" : "left", size: o.size, color: o.labelColor || P.dim });
      const top = [x + f * u, y - u * 2], bot = [x + f * u, y + u * 2], g = [x - f * u * 2, y];
      return p ? { g, s: top, d: bot } : { g, d: top, s: bot };
    };
    S.nmos = (x, y, o = {}) => mosBody(x, y, o, false);
    S.pmos = (x, y, o = {}) => mosBody(x, y, o, true);
    S.pnp = function (x, y, o = {}) {
      const c = o.color || D;
      ctx.save(); stroke(c);
      ctx.beginPath(); ctx.moveTo(x, y - u * 0.9); ctx.lineTo(x, y + u * 0.9); ctx.moveTo(x - u * 2, y); ctx.lineTo(x, y);
      ctx.moveTo(x, y - u * 0.4); ctx.lineTo(x + u, y - u * 1.2); ctx.lineTo(x + u, y - u * 2);
      ctx.moveTo(x, y + u * 0.4); ctx.lineTo(x + u, y + u * 1.2); ctx.lineTo(x + u, y + u * 2); ctx.stroke();
      ctx.fillStyle = c; ctx.beginPath(); const ax = x + u * 0.25, ay = y - u * 0.6; ctx.moveTo(ax, ay); ctx.lineTo(ax + u * 0.45, ay - u * 0.15); ctx.lineTo(ax + u * 0.2, ay - u * 0.45); ctx.closePath(); ctx.fill();
      ctx.restore();
      if (o.label) S.label(x + u * 1.4, y, o.label, { size: o.size, color: P.dim });
      return { b: [x - u * 2, y], e: [x + u, y - u * 2], c: [x + u, y + u * 2] };
    };
    S.opamp = function (x, y, o = {}) {
      const w = o.w || u * 5, h = o.h || u * 5, c = o.color || D;
      ctx.save(); stroke(c); ctx.fillStyle = o.fill || P.bg;
      ctx.beginPath(); ctx.moveTo(x - w / 2, y - h / 2); ctx.lineTo(x + w / 2, y); ctx.lineTo(x - w / 2, y + h / 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
      const yp = y + (o.flip ? -1 : 1) * h * 0.25, yn = y - (o.flip ? -1 : 1) * h * 0.25;
      S.label(x - w / 2 + u * 0.35, yp, "+", { size: u * 1.1, color: c, bold: true });
      S.label(x - w / 2 + u * 0.35, yn, "−", { size: u * 1.1, color: c, bold: true });
      if (o.label) S.label(x - w * 0.08, y, o.label, { size: Math.max(10, u * 0.8), color: P.dim, align: "center" });
      return { inp: [x - w / 2, yp], inn: [x - w / 2, yn], out: [x + w / 2, y] };
    };
    S.arrow = function (x1, y1, x2, y2, o = {}) {
      const c = o.color || P.accent, a = Math.atan2(y2 - y1, x2 - x1), hs = u * 0.55;
      ctx.save(); stroke(c, o.width || lw);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - hs * Math.cos(a - 0.45), y2 - hs * Math.sin(a - 0.45)); ctx.lineTo(x2 - hs * Math.cos(a + 0.45), y2 - hs * Math.sin(a + 0.45)); ctx.closePath(); ctx.fill();
      ctx.restore();
      if (o.label) S.label((x1 + x2) / 2 + (o.lx || u * 0.6), (y1 + y2) / 2 + (o.ly || 0), o.label, { color: c, size: o.size, align: o.align });
    };
    /** 경로를 따라 움직이는 점(전류). phase는 px 단위로 계속 증가시키면 된다. 점 간격 gap */
    S.flow = function (pts, phase, o = {}) {
      const gap = o.gap || u * 1.6, r = o.r || u * 0.2;
      let total = 0; const seg = [];
      for (let i = 1; i < pts.length; i++) { const L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(L); total += L; }
      ctx.save(); ctx.fillStyle = o.color || col("sch-hot", P.accent2); ctx.globalAlpha = o.alpha == null ? 0.9 : o.alpha;
      let s0 = ((phase % gap) + gap) % gap;
      for (let s = s0; s < total; s += gap) {
        let acc = 0, i = 0; while (i < seg.length && acc + seg[i] < s) { acc += seg[i]; i++; }
        if (i >= seg.length) break;
        const t = (s - acc) / seg[i], x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      }
      ctx.restore();
    };
    return S;
  };

  /**
   * 오실로스코프 화면(가로 10칸 × 세로 8칸). 부모 .sim-view에 class="scope"를 주면 어두운 화면이 된다.
   * AN.scope(ctx, box, {t: [t0, t1], y: [lo, hi], traces: [{t, v, color, label, width}], tDiv: "1 µs/div" 같은 글자, dark: true})
   * → {X(t), Y(v), box}
   */
  AN.scope = function (ctx, box, o) {
    const P = P_(), dark = o.dark !== false;
    const bg = dark ? "#0b0d12" : P.bg, grid = dark ? "rgba(160,190,220,0.13)" : P.grid, axis = dark ? "rgba(160,190,220,0.35)" : P.axis, txt = dark ? "#9aa6bf" : P.dim;
    const { x, y, w, h } = box;
    ctx.save();
    ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = grid; ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) { const xx = Math.round(x + (w * i) / 10) + 0.5; ctx.beginPath(); ctx.moveTo(xx, y); ctx.lineTo(xx, y + h); ctx.stroke(); }
    for (let j = 0; j <= 8; j++) { const yy = Math.round(y + (h * j) / 8) + 0.5; ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke(); }
    ctx.strokeStyle = axis;
    ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke();
    const [t0, t1] = o.t, [lo, hi] = o.y;
    const X = (t) => x + ((t - t0) / (t1 - t0)) * w, Y = (v) => y + h - ((v - lo) / (hi - lo)) * h;
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    const tc = [col("tr-1", "#ffd43b"), col("tr-2", "#66d9e8"), col("tr-3", "#f783ac"), col("tr-4", "#74c0fc")];
    (o.traces || []).forEach((tr, k) => {
      const c = tr.color || tc[k % 4];
      ctx.strokeStyle = c; ctx.lineWidth = tr.width || 2; ctx.lineJoin = "round";
      if (tr.dash) ctx.setLineDash(tr.dash); else ctx.setLineDash([]);
      if (dark) { ctx.shadowColor = c; ctx.shadowBlur = 4; }
      ctx.beginPath();
      const n = tr.v.length;
      for (let i = 0; i < n; i++) { const xx = X(tr.t[i]), yy = Y(tr.v[i]); if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); }
      ctx.stroke(); ctx.shadowBlur = 0;
    });
    ctx.restore();
    ctx.save(); ctx.font = F_(11.5, false, 600); ctx.textBaseline = "top";
    let lx = x + 6;
    (o.traces || []).forEach((tr, k) => {
      if (!tr.label) return;
      const c = tr.color || tc[k % 4];
      ctx.fillStyle = c; ctx.fillRect(lx, y + 7, 9, 9);
      ctx.fillStyle = txt; ctx.fillText(tr.label, lx + 13, y + 5); lx += ctx.measureText(tr.label).width + 28;
    });
    ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillStyle = txt;
    ctx.font = F_(11, true); if (o.tDiv || o.vDiv) ctx.fillText([o.vDiv, o.tDiv].filter(Boolean).join("   "), x + w - 6, y + h - 4);
    ctx.restore();
    return { X, Y, box };
  };

  /**
   * 보드 선도(크기 위, 위상 아래). bd = AN.bodeData(...) 또는 [{f, db, ph, color, label, dash}] 여러 개
   * opts: {f: [f0, f1], db: [lo, hi], ph: [lo, hi], split: 0.58, marks: true(fu·PM 표시), vlines, hlines}
   * → {X(f), Ym(dB), Yp(deg), top, bot}
   */
  AN.bode = function (ctx, box, bd, o = {}) {
    const P = P_(), AB = window.AB;
    const list = Array.isArray(bd) ? bd : [bd];
    const f0 = (o.f || [list[0].f[0], list[0].f[list[0].f.length - 1]])[0], f1 = (o.f || [0, list[0].f[list[0].f.length - 1]])[1];
    let lo = Infinity, hi = -Infinity, plo = Infinity, phi = -Infinity;
    list.forEach((b) => { b.db.forEach((v) => { if (isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }); b.ph.forEach((v) => { plo = Math.min(plo, v); phi = Math.max(phi, v); }); });
    const dbR = o.db || [Math.max(lo, hi - 140) - 5, hi + 10], phR = o.ph || [Math.floor(plo / 45) * 45, Math.ceil(phi / 45) * 45 || 0];
    const split = o.split || 0.56, gap = 30;
    const hTop = (box.h - gap) * split, hBot = box.h - gap - hTop;
    const series = (key) => list.map((b, k) => ({ data: b.f.map((f, i) => [f, b[key][i]]), color: b.color || P.series[k % P.series.length], width: b.width || 2, dash: b.dash }));
    const xFmt = (v) => AB.si(v, "Hz", 2).replace(" ", "");
    // 좁은 화면에서는 10배 눈금을 건너뛰어 글자가 겹치지 않게 한다
    const decs = Math.log10(f1 / f0), maxT = Math.max(2, Math.floor(box.w / 58)), step = Math.max(1, Math.ceil(decs / maxT));
    const xTicks = o.xTicks || (() => { const t = []; for (let e = Math.ceil(Math.log10(f0) - 1e-9); e <= Math.log10(f1) + 1e-9; e += step) t.push(Math.pow(10, e)); return t; })();
    const top = AB.chart(ctx, { x: box.x, y: box.y, w: box.w, h: hTop }, { x: [f0, f1], y: dbR, logX: true, yLabel: o.yLabel || "크기 (dB)", xFmt: () => "", xTicks, series: series("db"), hlines: (o.hlines || []).concat(o.zeroLine === false ? [] : [{ y: 0, color: P.axis }]), vlines: o.vlines });
    const bot = AB.chart(ctx, { x: box.x, y: box.y + hTop + gap, w: box.w, h: hBot }, { x: [f0, f1], y: phR, logX: true, yLabel: "위상 (°)", xLabel: o.xLabel || "주파수", xFmt, xTicks, series: series("ph"), yTicks: o.phTicks, hlines: o.phLines || [{ y: -180, color: P.bad, label: "−180°" }], vlines: o.vlines });
    if (o.marks && list[0]) {
      const m = AN.margins(list[0]);
      if (isFinite(m.fu)) {
        const xu = top.X(m.fu);
        ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = P.accent; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(xu, top.Y(dbR[1])); ctx.lineTo(xu, bot.Y(phR[0])); ctx.stroke(); ctx.restore();
        const base = m.ref - 180, pAt = base + m.pm;
        ctx.save(); ctx.strokeStyle = P.ok; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(xu, bot.Y(Math.max(phR[0], base))); ctx.lineTo(xu, bot.Y(pAt)); ctx.stroke();
        ctx.fillStyle = P.ok; ctx.font = F_(12, false, 700); ctx.textBaseline = "middle"; ctx.fillText(`PM ${m.pm.toFixed(0)}°`, xu + 6, bot.Y((pAt + Math.max(phR[0], base)) / 2)); ctx.restore();
      }
    }
    return { X: top.X, Ym: top.Y, Yp: bot.Y, top, bot };
  };

  /* ------------------------------------------------------------------ 이어지는 타깃: AB-1 */
  /**
   * AB-1: 가상의 센서 인터페이스 칩(AB180 공정). 압력 센서 브리지 신호를 증폭 → 스위치드 커패시터 필터 → 12비트 SAR ADC.
   * 칩 안의 밴드갭(1.2 V)과 LDO(1.8 V), PLL(32 MHz)이 이를 받친다. 실제 회사·제품과 무관하다.
   */
  AN.AB1 = {
    name: "AB-1", proc: "AB180", vdd: 1.8, vbat: [2.5, 3.6],
    spec: {
      ota: { a0: 70, gbw: 20e6, pm: 60, cl: 2e-12, sr: 10e6, noise: 30e-9, offset3s: 5e-3, power: 300e-6 }, // a0 dB, gbw Hz, pm °, sr V/s, noise V/√Hz @ 1 MHz, power W
      sensor: { span: 10e-3, bw: 10e3, rb: 5e3 },        // 브리지 출력 ±10 mV, 대역 10 kHz, 브리지 저항 5 kΩ
      pga: { gain: 40 },                                   // 10 mV → 0.4 V
      adc: { bits: 12, fs: 1e6, vref: 1.2, enob: 10.5 },
      sd: { bits: 16, osr: 128, fs: 2.048e6, bw: 8e3 },     // 온도 채널(ΔΣ)
      bg: { vref: 1.2, tc: 20e-6 },                         // 20 ppm/°C, −40~125 °C
      ldo: { vout: 1.8, iload: 10e-3, dropout: 0.2, psrr: 40 }, // PSRR dB @ 1 MHz
      pll: { fref: 4e6, fout: 32e6, n: 8, jitter: 17e-12 },
    },
    // 9장의 2단 밀러 OTA 기본 설계(엔진으로 확인한 값은 CONTRIBUTING.md 참고)
    ota: {
      vdd: 1.8, vcm: 0.9, cl: 2e-12, cc: 1e-12, rz: 2e3, itail: 20e-6, i2: 80e-6,
      m1: { type: "n", W: 10e-6, L: 1e-6 },   // 입력 쌍 M1·M2
      m3: { type: "p", W: 6e-6, L: 1e-6 },    // 능동 부하 M3·M4
      m5: { type: "n", W: 4e-6, L: 1e-6 },    // 꼬리 전류원 M5 (M8과 미러)
      m6: { type: "p", W: 24e-6, L: 0.5e-6 }, // 2단 공통 소스 M6
      m7: { type: "n", W: 16e-6, L: 1e-6 },   // 2단 전류원 M7 (M8과 미러, W는 M8.W·i2/itail로 다시 정한다)
      m8: { type: "n", W: 4e-6, L: 1e-6 },    // 바이어스 다이오드 M8
    },
  };
  /**
   * AB-1의 2단 밀러 OTA 넷리스트. o는 AN.AB1.ota를 덮어쓸 값. 마디: vdd, inp, inn, x(1단 미러 쪽), y(1단 출력), tail, out, nb
   * mode: "open"(개루프: inp에 ac 1, inn은 직류 vcm) | "follower"(단위 이득 버퍼, inp에 wave) | "none"
   * → circuit (이름: Vdd, Vp, Vn, M1~M8, Cc, Rz, CL, Ib)
   */
  AN.ota2 = function (o = {}, mode = "open", wave) {
    const p = Object.assign({}, AN.AB1.ota, o);
    const c = AN.circuit({ T: p.T || 300 });
    c.V("vdd", 0, p.vdd, { name: "Vdd" });
    if (mode === "follower") {
      c.V("inp", 0, { dc: p.vcm, ac: 1, wave }, { name: "Vp" });
    } else {
      c.V("inp", 0, { dc: p.vcm + (p.vos || 0), ac: mode === "open" ? 1 : 0, wave }, { name: "Vp" });
      c.V("inn", 0, { dc: p.vcm }, { name: "Vn" });
    }
    const inn = mode === "follower" ? "out" : "inn";
    c.I("vdd", "nb", p.itail, { name: "Ib" });
    c.M("nb", "nb", 0, 0, p.m8, { name: "M8" });
    c.M("tail", "nb", 0, 0, p.m5, { name: "M5" });
    c.M("x", inn, "tail", 0, p.m1, { name: "M1" });
    c.M("y", "inp", "tail", 0, p.m2 || p.m1, { name: "M2" });
    c.M("x", "x", "vdd", "vdd", p.m3, { name: "M3" });
    c.M("y", "x", "vdd", "vdd", p.m4 || p.m3, { name: "M4" });
    c.M("out", "y", "vdd", "vdd", p.m6, { name: "M6" });
    c.M("out", "nb", 0, 0, Object.assign({}, p.m7, { W: p.m8.W * (p.i2 / p.itail) }), { name: "M7" });
    if (p.rz > 0) { c.R("y", "z", p.rz, { name: "Rz" }); c.C("z", "out", p.cc, { name: "Cc" }); }
    else c.C("y", "out", p.cc, { name: "Cc" });
    c.C("out", 0, p.cl, { name: "CL" });
    return c;
  };
  /**
   * 개루프 측정용: 출력이 vcm에 오도록 입력 오프셋을 이분법으로 맞춘 뒤 AC 해석까지 한다.
   * AN.ota2Open(o, {f0, f1, n}) → {c, op, vos, bd: {f, db, ph}, m: AN.margins, a0(dB), gbw}
   */
  AN.ota2Open = function (o = {}, fo = {}) {
    const p = Object.assign({}, AN.AB1.ota, o);
    let lo = -0.08, hi = 0.08, c, op;
    for (let i = 0; i < 44; i++) {
      const m = (lo + hi) / 2;
      c = AN.ota2(Object.assign({}, o, { vos: (o.vos || 0) + m }));
      op = c.op();
      if (op.v.out > p.vcm) hi = m; else lo = m;
    }
    const ac = c.ac({ f0: fo.f0 || 10, f1: fo.f1 || 1e10, n: fo.n || 200, op });
    const bd = { f: ac.f, db: Array.from(ac.db("out")), ph: ac.ph("out") };
    const m = AN.margins(bd);
    return { c, op, vos: (lo + hi) / 2, bd, m, a0: bd.db[0], gbw: m.fu, ac };
  };
})();
