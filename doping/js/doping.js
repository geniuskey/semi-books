/* Copyright (c) 2026 geniuskey and DopingBook contributors.
   Executable code: MIT (see ../LICENSE-MIT).
   Educational content and illustrations: CC-BY-4.0 (see ../LICENSE.md). */
/* ==========================================================================
   DopingBook 도핑 엔진 — 전역 객체 DP
   모든 장이 같은 숫자를 쓰게 하는 공통 모델. 전부 교육용 근사다.
   - 이온 종 데이터, 사정거리 표(Rp, ΔRp, 비대칭도), 피어슨 IV 분포, 채널링 꼬리
   - ZBL 핵 저지 + LSS 전자 저지, 단순화한 몬테카를로 궤적(이체 충돌 근사의 축약판)
   - 린하드 임계각, 다이아몬드 격자 투영
   - 열 이력(퍼니스·RTA·스파이크·플래시·레이저), 1차원 확산(암시적 차분, 페르미 준위 효과, TED), 활성화
   - 이동도(코헤이-토머스형), 면저항, 접합 깊이
   - 2차원 단면(공정 흐름): 가우시안 주입 + 마스크·틸트·그림자 + 열처리 번짐
   단위: 깊이 nm, 농도 cm⁻³, 도즈 cm⁻², 에너지 keV, 온도 °C(내부 계산은 K).
   node에서도 돈다(그리기 제외): global.window = global; require("./js/doping.js");
   ========================================================================== */
(function () {
  "use strict";
  const DP = (window.DP = {});
  const kB = 8.617333e-5;            // eV/K
  const q = 1.602176634e-19;         // C
  const amu = 1.66053907e-27;        // kg
  const eps0 = 8.8541878128e-12;
  const NSI = 5.0e22;                // 실리콘 원자 밀도 cm⁻³
  DP.NSI = NSI; DP.q = q; DP.kB = kB; DP.amu = amu; DP.eps0 = eps0;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const K = (tc) => tc + 273.15;

  /* ------------------------------------------------------------ 이온 종 */
  // type: n(주개) / p(받개) / 0(전기적으로 중성, 비정질화·공동 주입용). carrier: 실리콘에 남는 도펀트
  DP.ION = {
    B:   { key: "B",   label: "B⁺",   name: "붕소",   Z: 5,  M: 11,     type: "p" },
    BF2: { key: "BF2", label: "BF₂⁺", name: "BF₂",    Z: 5,  M: 49,     type: "p", alias: "B", factor: 11 / 49 },
    In:  { key: "In",  label: "In⁺",  name: "인듐",   Z: 49, M: 114.8,  type: "p" },
    P:   { key: "P",   label: "P⁺",   name: "인",     Z: 15, M: 31,     type: "n" },
    As:  { key: "As",  label: "As⁺",  name: "비소",   Z: 33, M: 74.9,   type: "n" },
    Sb:  { key: "Sb",  label: "Sb⁺",  name: "안티모니", Z: 51, M: 121.8, type: "n" },
    Ge:  { key: "Ge",  label: "Ge⁺",  name: "저마늄", Z: 32, M: 72.6,   type: "0" },
    Si:  { key: "Si",  label: "Si⁺",  name: "실리콘", Z: 14, M: 28.1,   type: "0" },
    C:   { key: "C",   label: "C⁺",   name: "탄소",   Z: 6,  M: 12,     type: "0" },
    H:   { key: "H",   label: "H⁺",   name: "수소",   Z: 1,  M: 1.008,  type: "0" },
  };
  DP.SI = { Z: 14, M: 28.09 };

  /* ------------------------------------------------------------ 사정거리 표 */
  // 비정질 실리콘 속 투사 거리 Rp와 표준편차 ΔRp (nm). LSS·몬테카를로 계열 문헌값을 둥글린 대표값.
  // 문헌·계산 코드마다 10~20% 차이가 난다. 표 사이는 로그-로그 보간.
  const E_T = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000];
  const RANGE = {
    B:  { Rp: [3.0, 5.3, 9.5, 19, 35, 68, 160, 300, 530, 1000, 1750, 2900], dRp: [2.2, 3.6, 6, 11, 17, 28, 52, 73, 95, 125, 145, 165] },
    P:  { Rp: [2.2, 3.4, 5.2, 8.6, 14, 27, 63, 125, 255, 600, 1150, 2100], dRp: [1.2, 1.9, 2.9, 4.6, 7, 12, 25, 46, 80, 150, 210, 270] },
    As: { Rp: [1.9, 2.9, 4.2, 6.8, 10, 16, 32, 58, 111, 270, 530, 1000], dRp: [0.8, 1.2, 1.8, 2.9, 4, 6, 12, 20, 37, 75, 120, 170] },
    Sb: { Rp: [1.8, 2.6, 3.7, 5.8, 8.5, 13, 25, 43, 77, 180, 350, 650], dRp: [0.6, 0.9, 1.3, 2.1, 3, 4.5, 8.5, 14, 24, 48, 80, 120] },
    C:  { Rp: [2.8, 4.8, 8.5, 17, 31, 60, 145, 280, 510, 1000, 1700, 2800], dRp: [1.9, 3.1, 5.2, 9.5, 15, 25, 48, 70, 95, 125, 145, 165] },
    H:  { Rp: [12, 20, 34, 70, 120, 200, 400, 700, 1500, 4800, 15000, 45000], dRp: [9, 14, 22, 40, 60, 85, 120, 150, 180, 250, 400, 900] },
  };
  // 비슷한 질량·원자번호의 표를 비례로 빌려 쓴다(대표값 수준의 근사)
  const BORROW = { In: ["Sb", 1.04, 1.04], Ge: ["As", 1.03, 1.03], Si: ["P", 1.12, 1.08] };
  function loglog(xs, ys, x) {
    if (x <= xs[0]) return ys[0] * Math.pow(x / xs[0], Math.log(ys[1] / ys[0]) / Math.log(xs[1] / xs[0]));
    for (let i = 1; i < xs.length; i++) {
      if (x <= xs[i] || i === xs.length - 1) {
        const t = Math.log(x / xs[i - 1]) / Math.log(xs[i] / xs[i - 1]);
        return Math.exp(Math.log(ys[i - 1]) + t * (Math.log(ys[i]) - Math.log(ys[i - 1])));
      }
    }
  }
  /** 사정거리 모멘트: {Rp, dRp, gamma(비대칭도), beta(첨도), dRl(측면 퍼짐)} — nm */
  DP.range = function (ion, E) {
    const I = DP.ION[ion] || DP.ION.B;
    if (I.alias) { const r = DP.range(I.alias, E * I.factor); return Object.assign({}, r, { E, ion, eff: E * I.factor }); }
    let tab = RANGE[ion], f1 = 1, f2 = 1;
    if (!tab && BORROW[ion]) { tab = RANGE[BORROW[ion][0]]; f1 = BORROW[ion][1]; f2 = BORROW[ion][2]; }
    tab = tab || RANGE.B;
    const Rp = loglog(E_T, tab.Rp, E) * f1, dRp = loglog(E_T, tab.dRp, E) * f2;
    const lg = Math.log10(Math.max(0.5, E));
    // 비대칭도: 가벼운 이온은 음수(얕은 쪽이 두툼), 무거운 이온은 양수(깊은 쪽 꼬리). 대표 경향만 맞춘 근사.
    let gamma;
    if (I.M < 20) gamma = clamp(-0.25 - 0.28 * lg, -1.2, -0.15);
    else if (I.M < 40) gamma = clamp(0.35 - 0.35 * lg, -0.8, 0.4);
    else gamma = clamp(0.6 - 0.18 * lg, 0.05, 0.6);
    const beta = 3 + 1.9 * gamma * gamma + 0.6;
    const dRl = dRp * (I.M < 20 ? 1.05 : I.M < 40 ? 0.9 : 0.8);
    return { E, ion, Rp, dRp, gamma, beta, dRl };
  };
  DP.ENERGIES = E_T.slice();

  /* ------------------------------------------------------------ 피어슨 IV */
  /** 단위 면적(∫=1, 단위 1/nm)의 피어슨 IV 밀도를 depth 배열(nm)에서 계산. 유효하지 않으면 가우시안. */
  DP.pearson = function (xs, Rp, s, g, b) {
    const out = new Float64Array(xs.length);
    const A = 10 * b - 12 * g * g - 18;
    const b0 = -s * s * (4 * b - 3 * g * g) / A, b1 = -g * s * (b + 3) / A, b2 = -(2 * b - 3 * g * g - 6) / A;
    const disc = 4 * b0 * b2 - b1 * b1;
    const ok = A > 0 && b2 < 0 && disc > 0 && Math.abs(g) > 1e-3;
    if (!ok) { for (let i = 0; i < xs.length; i++) { const u = (xs[i] - Rp) / s; out[i] = Math.exp(-0.5 * u * u) / (s * Math.sqrt(2 * Math.PI)); } return out; }
    const D = Math.sqrt(disc), a = b1, c = (b1 / b2 + 2 * a) / D;
    const lf = (t) => (1 / (2 * b2)) * Math.log(Math.abs(b0 + b1 * t + b2 * t * t)) - c * Math.atan((2 * b2 * t + b1) / D);
    // 정규화 상수: 넓은 범위에서 수치 적분
    let norm = 0; const n = 4000, lo = -12 * s, hi = 16 * s, h = (hi - lo) / n; let mx = -Infinity;
    for (let i = 0; i <= n; i++) mx = Math.max(mx, lf(lo + i * h));
    for (let i = 0; i <= n; i++) norm += Math.exp(lf(lo + i * h) - mx) * (i === 0 || i === n ? 0.5 : 1) * h;
    for (let i = 0; i < xs.length; i++) out[i] = Math.exp(lf(xs[i] - Rp) - mx) / norm;
    return out;
  };
  DP.gauss = function (xs, Rp, s) {
    const out = new Float64Array(xs.length);
    for (let i = 0; i < xs.length; i++) { const u = (xs[i] - Rp) / s; out[i] = Math.exp(-0.5 * u * u) / (s * Math.sqrt(2 * Math.PI)); }
    return out;
  };
  /** 지수 꼬리를 붙인 가우시안(채널링 성분): 평균 mu, 폭 s, 꼬리 길이 lam (nm) */
  DP.emg = function (xs, mu, s, lam) {
    const out = new Float64Array(xs.length);
    for (let i = 0; i < xs.length; i++) {
      const x = xs[i], z = (s / lam - (x - mu) / s) / Math.SQRT2;
      const lv = (s * s) / (2 * lam * lam) - (x - mu) / lam;
      // erfc가 아주 작을 때 넘침을 피하는 근사
      let v;
      if (z > 5) v = Math.exp(-0.5 * ((x - mu) / s) ** 2) / (s * Math.sqrt(2 * Math.PI)) / (1 + 0); else v = Math.exp(lv) * erfc(z) / (2 * lam);
      out[i] = isFinite(v) ? v : 0;
    }
    return out;
  };
  function erf(x) {
    const s = Math.sign(x); x = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * x);
    const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  }
  function erfc(x) { return 1 - erf(x); }
  DP.erf = erf; DP.erfc = erfc;

  /** 깊이 격자 */
  DP.grid = function (max, n) { const xs = new Float64Array(n); for (let i = 0; i < n; i++) xs[i] = (max * i) / (n - 1); return xs; };

  /**
   * 주입 직후 농도 분포(cm⁻³). opts: {ion, E(keV), dose(cm⁻²), shape:"gauss"|"pearson", screen(nm 산화막), chan(채널링 비율 0~1), chanLen(꼬리 길이 배수)}
   * 반환: {xs, c(실리콘 속, cm⁻³), r(모멘트), retained(실리콘에 남은 도즈), inScreen(막에 남은 도즈)}
   * 깊이 0은 실리콘 표면. 스크린 산화막은 실리콘 1.1배의 저지력으로 본다(밀도 차이를 뭉뚱그린 근사).
   */
  DP.implant = function (xs, o) {
    const ion = o.ion || "B", E = o.E || 10, dose = o.dose == null ? 1e15 : o.dose;
    const r = DP.range(ion, E);
    const scr = (o.screen || 0) * 1.1;
    const shape = o.shape || "pearson";
    const sh = xs.map ? Array.from(xs, (x) => x + scr) : xs;
    let f = shape === "gauss" ? DP.gauss(sh, r.Rp, r.dRp) : DP.pearson(sh, r.Rp, r.dRp, r.gamma, r.beta);
    const chan = clamp(o.chan || 0, 0, 0.95);
    if (chan > 0) {
      const lam = (o.chanLen || 1.4) * r.Rp;
      const g = DP.emg(sh, r.Rp * 0.9, r.dRp, lam);
      f = f.map((v, i) => (1 - chan) * v + chan * g[i]);
    }
    const c = new Float64Array(xs.length);
    for (let i = 0; i < xs.length; i++) c[i] = dose * f[i] * 1e7; // 1/nm → 1/cm
    // 남은 도즈: 0 이상 적분
    const tot = (lo, hi) => { let s = 0; const n = 2000; const fx = shape === "gauss" ? (x) => DP.gauss([x], r.Rp, r.dRp)[0] : null; const xx = []; for (let i = 0; i <= n; i++) xx.push(lo + ((hi - lo) * i) / n); const ff = shape === "gauss" ? DP.gauss(xx, r.Rp, r.dRp) : DP.pearson(xx, r.Rp, r.dRp, r.gamma, r.beta); for (let i = 0; i <= n; i++) s += ff[i] * (i === 0 || i === n ? 0.5 : 1); return (s * (hi - lo)) / n; };
    const all = tot(-12 * r.dRp, r.Rp + 16 * r.dRp);
    const inSi = tot(Math.max(scr, -12 * r.dRp), Math.max(scr + 1e-6, r.Rp + 16 * r.dRp)) / all;
    const inScr = scr > 0 ? tot(0, scr) / all : 0;
    return { xs, c, r, retained: dose * clamp(inSi, 0, 1), inScreen: dose * clamp(inScr, 0, 1), lost: dose * clamp(1 - inSi - inScr, 0, 1) };
  };

  /** 첨두 농도 (가우시안) */
  DP.peak = (dose, dRp) => dose / (Math.sqrt(2 * Math.PI) * dRp * 1e-7);

  /* ------------------------------------------------------------ 저지능 */
  /** ZBL 보편 핵 저지와 LSS 전자 저지. 반환 eV/nm (실리콘). E는 keV */
  DP.stopping = function (ion, E) {
    const I = DP.ION[ion] || DP.ION.B;
    const Z1 = I.Z, M1 = I.M, Z2 = 14, M2 = 28.09;
    const zs = Math.pow(Z1, 0.23) + Math.pow(Z2, 0.23);
    const eps = (32.53 * M2 * E) / (Z1 * Z2 * (M1 + M2) * zs);
    const sn = eps <= 30 ? Math.log(1 + 1.1383 * eps) / (2 * (eps + 0.01321 * Math.pow(eps, 0.21226) + 0.19593 * Math.sqrt(eps))) : Math.log(eps) / (2 * eps);
    const Sn = (8.462e-15 * Z1 * Z2 * M1 * sn) / ((M1 + M2) * zs); // eV cm²
    const kL = (1.212 * Math.pow(Z1, 7 / 6) * Z2) / (Math.pow(Math.pow(Z1, 2 / 3) + Math.pow(Z2, 2 / 3), 1.5) * Math.sqrt(M1)); // eV Å² / eV^½
    const Se = kL * Math.sqrt(E * 1000) * 1e-16; // eV cm²
    const f = NSI * 1e-7; // cm⁻³ × nm→cm
    return { Sn: Sn * f, Se: Se * f, eps };
  };
  /** 핵 저지와 전자 저지가 같아지는 에너지(keV) */
  DP.crossover = function (ion) {
    let lo = 0.1, hi = 1e5;
    for (let i = 0; i < 80; i++) { const m = Math.sqrt(lo * hi); const s = DP.stopping(ion, m); if (s.Sn > s.Se) lo = m; else hi = m; }
    return Math.sqrt(lo * hi);
  };

  /* ------------------------------------------------------------ 몬테카를로 */
  /**
   * 단순화한 몬테카를로 궤적. 비정질 실리콘, 3차원.
   * - 다음 충돌까지의 거리: 평균 핵 저지(ZBL)를 맞추도록 정한다. 한 번에 넘겨주는 에너지 T는 거듭제곱 단면적 dσ ∝ T^(−1−m)에서 뽑는다.
   * - 충돌 사이에는 전자 저지(LSS)로 연속적으로 에너지를 잃는다.
   * - 편향각은 운동량 보존에서 T로 정해진다. 되튄 원자(반도)는 따라가지 않고 T > Ed면 변위 수만 센다(킨친-피즈).
   * opts: {ion, E(keV), tilt(°), n, seed, Ed(eV), keep(궤적을 저장할 이온 수)}
   */
  // 몬테카를로 저지능 보정 계수: 이 단순 모델이 표의 Rp보다 깊게 가는 만큼(주어진 에너지에서 MC Rp ÷ 표 Rp)을 저지능에 곱한다.
  // 분포의 폭·비대칭·측면 퍼짐과 궤적 모양은 보정하지 않은 모델의 결과다.
  const MC_CAL = {
    B: [1.288, 1.218, 1.149, 1.298, 1.351, 1.349, 1.419, 1.404, 1.4, 1.418, 1.248, 1.151],
    P: [1.024, 1.015, 1.021, 1.174, 1.227, 1.15, 1.139, 1.152, 1.12, 1.095, 1.027, 0.967],
    As: [1.495, 1.361, 1.28, 1.245, 1.282, 1.237, 1.222, 1.169, 1.144, 1.183, 1.175, 1.255],
    Sb: [1.951, 1.927, 1.871, 1.782, 1.631, 1.517, 1.347, 1.271, 1.224, 1.174, 1.174, 1.174],
    In: [1.827, 1.793, 1.736, 1.656, 1.54, 1.447, 1.305, 1.237, 1.193, 1.172, 1.172, 1.172],
    Ge: [1.431, 1.297, 1.222, 1.205, 1.231, 1.214, 1.205, 1.163, 1.143, 1.194, 1.194, 1.194],
    Si: [0.927, 0.923, 0.933, 1.102, 1.162, 1.093, 1.105, 1.114, 1.061, 1.055, 1.055, 1.055],
    C: [1.222, 1.181, 1.125, 1.24, 1.264, 1.272, 1.281, 1.272, 1.242, 1.211, 1.211, 1.211],
  };
  DP.mcCal = function (ion, E) { const t = MC_CAL[ion]; if (!t) return 1; return loglog(E_T, t, E); };
  DP.mc = function (o) {
    if (DP.ION[o.ion] && DP.ION[o.ion].alias) { const I0 = DP.ION[o.ion]; const r = DP.mc(Object.assign({}, o, { ion: I0.alias, E: o.E * I0.factor })); r.ion = o.ion; r.E = o.E; return r; }
    const I = DP.ION[o.ion] || DP.ION.B, A = DP.SI.M / I.M;
    const E0 = (o.E || 10) * 1000, n = o.n || 200, keep = o.keep == null ? 30 : o.keep, Ed = o.Ed || 15;
    const cal = o.raw ? 1 : DP.mcCal(o.ion, o.E || 10);
    const tilt = ((o.tilt || 0) * Math.PI) / 180;
    const rnd = rng(o.seed || 1);
    const gm = (4 * I.M * DP.SI.M) / (I.M + DP.SI.M) ** 2;
    const m = 0.333, Tmin = 3;
    const out = { ends: [], paths: [], displaced: [], nuc: [], back: 0, ion: o.ion, E: o.E };
    for (let k = 0; k < n; k++) {
      let x = 0, y = 0, z = 0, ux = Math.sin(tilt), uy = 0, uz = Math.cos(tilt), E = E0;
      const path = k < keep ? [[x, z]] : null;
      let guard = 0;
      while (E > 20 && guard++ < 20000) {
        const st0 = DP.stopping(o.ion, E / 1000); // eV/nm
        const st = { Sn: st0.Sn * cal, Se: st0.Se * cal };
        const Tmax = gm * E;
        const tm = Math.max(Tmin, Math.min(Tmin, Tmax * 0.5));
        if (Tmax <= tm * 1.01) { // 에너지가 너무 낮다: 남은 거리만 전자 저지로
          break;
        }
        const a = Math.pow(tm, -m), b = Math.pow(Tmax, -m);
        const meanT = (m / (1 - m)) * (Math.pow(Tmax, 1 - m) - Math.pow(tm, 1 - m)) / (a - b);
        let L = meanT / st.Sn;
        L = Math.min(L, 0.25 * E / st.Se + 0.27);
        L = Math.max(L, 0.2);
        // 자유 비행
        const dE = Math.min(E - 1, st.Se * L);
        x += ux * L; y += uy * L; z += uz * L; E -= dE;
        if (z < 0) { out.back++; break; }
        // 충돌
        const u = rnd();
        let T = Math.pow(a - u * (a - b), -1 / m);
        T = Math.min(T, gm * E * 0.999);
        if (T > 0 && E > T) {
          const cth = clamp((2 * E - (1 + A) * T) / (2 * Math.sqrt(E * (E - T))), -1, 1);
          const sth = Math.sqrt(1 - cth * cth), ph = 2 * Math.PI * rnd();
          // 방향 회전
          let wx, wy, wz;
          if (Math.abs(uz) < 0.99) { const s = Math.sqrt(1 - uz * uz); wx = (ux * uz * Math.cos(ph) - uy * Math.sin(ph)) / s; wy = (uy * uz * Math.cos(ph) + ux * Math.sin(ph)) / s; wz = -s * Math.cos(ph); }
          else { wx = Math.cos(ph); wy = Math.sin(ph); wz = 0; }
          ux = ux * cth + wx * sth; uy = uy * cth + wy * sth; uz = uz * cth + wz * sth;
          const nn = Math.hypot(ux, uy, uz); ux /= nn; uy /= nn; uz /= nn;
          E -= T;
          out.nuc.push([z, T]);
          if (T > Ed) { const nd = T < 2.5 * Ed ? 1 : Math.floor((0.8 * T) / (2 * Ed)); out.displaced.push([x, z, nd]); }
        }
        if (path) path.push([x, z]);
      }
      if (z >= 0) out.ends.push([x, y, z]);
      if (path) { path.push([x, z]); out.paths.push(path); }
    }
    const zs = out.ends.map((e) => e[2]);
    const mean = zs.reduce((s, v) => s + v, 0) / Math.max(1, zs.length);
    const sd = Math.sqrt(zs.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, zs.length - 1));
    const lat = Math.sqrt(out.ends.reduce((s, e) => s + e[0] * e[0], 0) / Math.max(1, out.ends.length));
    out.Rp = mean; out.dRp = sd; out.dRl = lat;
    return out;
  };
  /** 시드 난수 (mulberry32) */
  function rng(seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  DP.rng = rng;

  /* ------------------------------------------------------------ 손상 */
  /**
   * 핵 충돌로 쌓인 에너지 밀도 분포(eV/cm³)를 도즈로 환산. 비정질화 판정에 쓴다.
   * 핵 에너지 손실의 깊이 분포는 Rp보다 조금 얕은 가우시안으로 근사: 중심 0.75Rp, 폭 1.1ΔRp.
   * 핵 손실 총량은 저지능 적분에서 구한 비율 fn을 쓴다.
   */
  DP.nuclearFraction = function (ion, E) {
    const I = DP.ION[ion]; if (I && I.alias) return DP.nuclearFraction(I.alias, E * I.factor) ;
    let s = 0, t = 0; const n = 200;
    for (let i = 1; i <= n; i++) { const e = (E * i) / n; const st = DP.stopping(ion, e); s += st.Sn / (st.Sn + st.Se); t++; }
    return s / t;
  };
  DP.damage = function (xs, o) {
    const ion = o.ion || "As", E = o.E || 30, dose = o.dose || 1e14;
    const I = DP.ION[ion];
    const r = DP.range(ion, E);
    // BF₂는 분자 전체 에너지가 핵 충돌로 들어간다 → 분자 질량으로 본다
    const fn = DP.nuclearFraction(I.alias ? "Ge" : ion, I.alias ? E * 0.9 : E) * (I.alias ? 0.95 : 1);
    const mu = 0.75 * r.Rp, s = 1.1 * r.dRp;
    const g = DP.gauss(xs, mu, s);
    const e = new Float64Array(xs.length);
    for (let i = 0; i < xs.length; i++) e[i] = dose * fn * E * 1000 * g[i] * 1e7; // eV/cm³
    return { xs, e, fn, r };
  };
  /** 비정질화 문턱(핵 에너지 밀도, eV/cm³). 실온 문턱 도즈가 대표 문헌 범위(As·Ge 10¹⁴ cm⁻² 안팎, Si 수×10¹⁴, B 10¹⁶ 이상)에 들도록 맞춘 교육용 값.
   *  가벼운 이온은 동적 회복으로 사실상 더 높다. */
  DP.amorphThreshold = function (ion, Tsub) {
    const I = DP.ION[ion]; const M = I.alias ? 49 : I.M;
    const dyn = Math.min(1, Math.pow(M / 28, 2.5));
    const T = Tsub == null ? 25 : Tsub;
    // 기판 온도가 높을수록 동적 회복이 커진다(교육용 지수 근사)
    const temp = Math.exp((T - 25) / 90);
    return (1.5e24 / dyn) * temp;
  };

  /* ------------------------------------------------------------ 채널링 */
  /** 린하드 임계각(°). axis: 원자 열 간격 d(Å) */
  DP.critAngle = function (ion, E, d) {
    const I = DP.ION[ion] || DP.ION.B; const Z1 = I.Z, Z2 = 14;
    const Ee = E * 1000 * (I.alias ? I.factor : 1);
    const a = (0.8853 * 0.529) / (Math.pow(Z1, 0.23) + Math.pow(Z2, 0.23)); // Å
    const psi1 = Math.sqrt((2 * Z1 * Z2 * 14.4) / (Ee * d)); // rad
    const psi = psi1 < a / d ? psi1 : Math.sqrt((psi1 * a) / (Math.SQRT2 * d));
    return (psi * 180) / Math.PI;
  };
  // 주요 축: 방향, 원자 열 간격(Å), 통로가 넓은 정도(상대 가중치)
  DP.AXES = [
    { name: "⟨110⟩", v: [[1, 1, 0], [1, -1, 0], [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1]], d: 3.84, w: 1.0 },
    { name: "⟨100⟩", v: [[0, 0, 1], [1, 0, 0], [0, 1, 0]], d: 5.43, w: 0.62 },
    { name: "⟨111⟩", v: [[1, 1, 1], [1, -1, 1], [-1, 1, 1], [-1, -1, 1]], d: 4.7, w: 0.45 },
    { name: "⟨211⟩", v: [[2, 1, 1], [1, 2, 1], [-2, 1, 1], [-1, 2, 1], [2, -1, 1], [1, -2, 1], [-2, -1, 1], [-1, -2, 1], [1, 1, 2], [-1, 1, 2], [1, -1, 2], [-1, -1, 2]], d: 6.65, w: 0.18 },
  ];
  DP.PLANES = [
    { name: "{110}", v: [[1, 1, 0], [1, -1, 0], [1, 0, 1], [1, 0, -1], [0, 1, 1], [0, 1, -1]], w: 0.16, dp: 1.92 },
    { name: "{100}", v: [[1, 0, 0], [0, 1, 0]], w: 0.1, dp: 1.36 },
    { name: "{111}", v: [[1, 1, 1], [1, -1, 1], [-1, 1, 1], [1, 1, -1]], w: 0.12, dp: 3.14 },
  ];
  /**
   * 빔 방향(결정 좌표). (100) 웨이퍼, 표면 법선 [001]. tilt: 법선에서 기운 각, twist: 기울이는 방향의 방위각을 노치 ⟨110⟩에서 잰 값.
   */
  DP.beamDir = function (tilt, twist) {
    const t = (tilt * Math.PI) / 180, p = ((twist + 45) * Math.PI) / 180;
    return [Math.sin(t) * Math.cos(p), Math.sin(t) * Math.sin(p), Math.cos(t)];
  };
  /** 빔 방향에서 가장 가까운 축·면과 채널링 비율(0~1) */
  DP.channeling = function (ion, E, tilt, twist, o = {}) {
    const d = DP.beamDir(tilt, twist);
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const nrm = (v) => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
    let best = null, frac = 0;
    const axes = DP.AXES.map((ax) => {
      let ang = 180;
      ax.v.forEach((v) => { const c = Math.abs(dot(d, nrm(v))); ang = Math.min(ang, (Math.acos(Math.min(1, c)) * 180) / Math.PI); });
      const psi = DP.critAngle(ion, E, ax.d);
      const f = ax.w * Math.max(0, 1 - (ang / psi) ** 2);
      if (!best || ang / psi < best.ang / best.psi) best = { name: ax.name, ang, psi };
      frac = Math.max(frac, f);
      return { name: ax.name, ang, psi, f };
    });
    let pbest = null;
    const planes = DP.PLANES.map((pl) => {
      let ang = 90;
      pl.v.forEach((v) => { const s = Math.abs(dot(d, nrm(v))); ang = Math.min(ang, (Math.asin(Math.min(1, s)) * 180) / Math.PI); });
      const psi = 0.45 * DP.critAngle(ion, E, 3.84);
      const f = pl.w * Math.max(0, 1 - (ang / psi) ** 2);
      if (!pbest || ang / psi < pbest.ang / pbest.psi) pbest = { name: pl.name, ang, psi };
      frac = Math.max(frac, f + 0);
      return { name: pl.name, ang, psi, f };
    });
    const maxF = 0.55; // 완전히 정렬해도 입구에서 원자 열에 바로 부딪히는 이온이 있다
    let f = frac * maxF;
    // 표면의 비정질층(스크린 산화막, 자연 산화막, PAI)이 들어오는 각도를 흩뜨린다
    const scr = o.screen || 0, amor = o.amorph || 0;
    f *= Math.exp(-scr / 6) * (amor > 0 ? Math.exp(-amor / 3) : 1);
    return { dir: d, axes, planes, best, pbest, frac: f };
  };

  /** 다이아몬드 격자 원자 위치(격자 상수 단위). nx×ny×nz 단위 셀 */
  DP.diamond = function (nx, ny, nz) {
    const base = [[0, 0, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0], [0.25, 0.25, 0.25], [0.25, 0.75, 0.75], [0.75, 0.25, 0.75], [0.75, 0.75, 0.25]];
    const at = [];
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) base.forEach((b) => at.push([i + b[0], j + b[1], k + b[2]]));
    return at;
  };

  /* ------------------------------------------------------------ 확산·활성화 */
  // 확산 계수 (cm²/s) = Σ D_k (n/ni 또는 p/ni)^k. 플러머 외 「Silicon VLSI Technology」류 표의 대표값.
  DP.DIFF = {
    B:  { type: "p", terms: [[0.037, 3.46, 0], [0.72, 3.46, 1]] },
    P:  { type: "n", terms: [[3.85, 3.66, 0], [4.44, 4.0, 1], [44.2, 4.37, 2]] },
    As: { type: "n", terms: [[0.066, 3.44, 0], [12.0, 4.05, 1]] },
    Sb: { type: "n", terms: [[0.214, 3.65, 0], [15.0, 4.08, 1]] },
    In: { type: "p", terms: [[0.6, 3.5, 0]] },
  };
  /** 진성 캐리어 농도 (cm⁻³), T는 °C */
  DP.ni = function (tc) { const T = K(tc); return 5.29e19 * Math.pow(T / 300, 2.54) * Math.exp(-6726 / T); };
  /** 진성 확산 계수 (cm²/s) */
  DP.D = function (dop, tc, ratio = 1) {
    const d = DP.DIFF[dop === "BF2" ? "B" : dop] || DP.DIFF.B, T = K(tc);
    return d.terms.reduce((s, [D0, Ea, k]) => s + D0 * Math.exp(-Ea / (kB * T)) * Math.pow(ratio, k), 0);
  };
  /** 고용 한계(전기적으로 활성일 수 있는 최대 농도, cm⁻³). 대표 경향만 맞춘 아레니우스 근사 */
  DP.solubility = function (dop, tc) {
    const T = K(Math.max(400, tc));
    const tab = { B: [9.2e22, 0.73], P: [1.8e23, 0.62], As: [4.5e22, 0.6], Sb: [1.5e22, 0.62], In: [1.0e20, 0.62] };
    const [C0, Ea] = tab[dop === "BF2" ? "B" : dop] || tab.B;
    return C0 * Math.exp(-Ea / (kB * T));
  };

  /**
   * 열 이력: [[t(s), T(°C)], ...]. kind: furnace | rta | spike | flash | laser
   * opts: {peak(°C), hold(s)}
   */
  DP.history = function (kind, o = {}) {
    const pts = [];
    const peak = o.peak, hold = o.hold;
    if (kind === "furnace") {
      const T0 = 700, up = 10 / 60, dn = 5 / 60, h = hold == null ? 1800 : hold;
      pts.push([0, T0]); const t1 = (peak - T0) / up; pts.push([t1, peak]); pts.push([t1 + h, peak]); pts.push([t1 + h + (peak - T0) / dn, T0]);
    } else if (kind === "rta") {
      const T0 = 400, up = 50, dn = 35, h = hold == null ? 10 : hold;
      pts.push([0, T0]); const t1 = (peak - T0) / up; pts.push([t1, peak]); pts.push([t1 + h, peak]); pts.push([t1 + h + (peak - T0) / dn, T0]);
    } else if (kind === "spike") {
      const T0 = 600, up = 220, dn = 90;
      const t1 = (peak - T0) / up;
      pts.push([0, T0]);
      // 꼭대기를 둥글게: 꼭짓점 근처를 포물선으로
      for (let i = 0; i <= 40; i++) { const tt = t1 - 0.6 + (1.0 * i) / 40; const T = tt < t1 ? Math.min(peak, T0 + up * tt) - 0 : peak - dn * (tt - t1); pts.push([Math.max(0, tt), Math.max(T0, Math.min(peak, T - 25 * Math.exp(-(((tt - t1) / 0.25) ** 2)) + 25))]); }
      pts.push([t1 + (peak - T0) / dn, T0]);
    } else if (kind === "flash") {
      const Tb = o.base || 800, w = hold == null ? 1.5e-3 : hold;
      pts.push([0, 600]); pts.push([2, Tb]);
      for (let i = 0; i <= 60; i++) { const tt = 2 + (i / 60) * 8 * w; pts.push([tt, Tb + (peak - Tb) * Math.exp(-(((tt - 2 - 2 * w) / w) ** 2))]); }
      pts.push([2 + 8 * w + 1.5, Tb - 150]); pts.push([2 + 8 * w + 4, 600]);
    } else if (kind === "laser") {
      const Tb = o.base || 400, w = hold == null ? 3e-4 : hold;
      pts.push([0, Tb]);
      for (let i = 0; i <= 60; i++) { const tt = (i / 60) * 8 * w; pts.push([tt, Tb + (peak - Tb) * Math.exp(-(((tt - 2 * w) / w) ** 2))]); }
      pts.push([10 * w, Tb]);
    }
    pts.sort((a, b) => a[0] - b[0]);
    return pts;
  };
  /** 열 예산 Dt (cm²) = ∫D(T(t))dt (진성) */
  DP.budget = function (dop, hist) {
    let s = 0;
    for (let i = 1; i < hist.length; i++) {
      const [t0, T0] = hist[i - 1], [t1, T1] = hist[i];
      const n = Math.max(1, Math.ceil(Math.abs(T1 - T0) / 2));
      for (let k = 0; k < n; k++) { const T = T0 + ((T1 - T0) * (k + 0.5)) / n; s += DP.D(dop, T) * ((t1 - t0) / n); }
    }
    return s;
  };

  /**
   * 1차원 어닐: 주입 분포 c0(cm⁻³)에 열 이력 hist를 적용.
   * opts: {dop, xs(nm), background(반대형 cm⁻³), ted(true/false), tedDose(손상 도즈, cm⁻²), amorph(비정질층 깊이 nm), fermi(true), melt(nm)}
   * 반환: {c(화학), a(활성), xj, Rs, Dt, active(활성 도즈), log:[...]}
   * 수치: 후향 오일러 암시적 차분, 표면 무플럭스. D는 이전 단계의 n/ni로 계산(지연 선형화).
   */
  DP.anneal = function (c0, hist, o) {
    const xs = o.xs, n = xs.length, dx = (xs[1] - xs[0]) * 1e-7; // cm
    const dop = o.dop === "BF2" ? "B" : o.dop || "B";
    let c = Float64Array.from(c0);
    const bg = o.background || 0;
    let X = 1; // 남은 과잉 격자간 원자 비율(TED)
    const tedDose = o.tedDose == null ? 0 : o.tedDose;
    // 손상이 표면 가까이 있으면 과잉 격자간 원자가 표면에서 사라져 TED가 약해진다(대략 Rp/(Rp+30 nm))
    const tedNear = o.tedRp == null ? 1 : o.tedRp / (o.tedRp + 30);
    let Dt = 0, DtTED = 0;
    let L = 0; // 활성 상한
    const amorph = o.amorph || 0;
    let regrown = amorph > 0 ? 0 : 1; // 고체상 재성장 진행 (0→1)
    let Lmeta = 0;
    const a = new Float64Array(n), b = new Float64Array(n), cc = new Float64Array(n), d = new Float64Array(n);
    const steps = [];
    for (let i = 1; i < hist.length; i++) {
      const [t0, T0] = hist[i - 1], [t1, T1] = hist[i];
      const span = t1 - t0; if (span <= 0) continue;
      const m = Math.max(1, Math.ceil(Math.abs(T1 - T0) / 4), Math.ceil(span / Math.max(span / 3, 1e-9)) > 3 ? 3 : 1);
      for (let k = 0; k < m; k++) {
        const T = T0 + ((T1 - T0) * (k + 0.5)) / m, dt = span / m;
        steps.push([T, dt]);
      }
    }
    for (const [T, dt] of steps) {
      if (T < 450) continue;
      const nI = DP.ni(T);
      // 고체상 에피 재성장: 속도 v = v0 exp(-2.7 eV/kT)
      if (regrown < 1 && amorph > 0) {
        const v = DP.sperVelocity(T); // nm/s
        regrown = Math.min(1, regrown + (v * dt) / amorph);
        if (regrown >= 1 && Lmeta === 0) Lmeta = DP.metastable(dop);
      }
      // TED
      let S = 0;
      if (o.ted && tedDose > 0) {
        const tau = DP.tedTau(T);
        S = DP.tedS0(T, tedDose) * X * tedNear;
        X *= Math.exp(-dt / tau);
      }
      // 활성 상한
      const Css = DP.solubility(dop, T);
      const ta = DP.actTau(T);
      if (Css > L) L += (Css - L) * (1 - Math.exp(-dt / ta));
      else L += (Css - L) * (1 - Math.exp(-dt / (40 * ta)));
      if (Lmeta > 0) { Lmeta += (Math.min(Lmeta, Math.max(Css, L)) - Lmeta) * (1 - Math.exp(-dt / (DP.deactTau(T)))); }
      // 확산 계수(격자점마다). 고용 한계를 넘는 몫은 덩어리(클러스터)로 묶여 움직이지 않는다고 보고,
      // 움직이는 몫(활성 ÷ 화학)만큼만 확산 계수를 준다. 재성장 전 비정질 영역은 움직이지 않는다.
      const Dv = new Float64Array(n);
      const aDepth = amorph > 0 && regrown < 1 ? amorph * (1 - regrown) : 0;
      for (let j = 0; j < n; j++) {
        const act = Math.min(c[j], Math.max(L, Lmeta));
        const net = Math.max(0, act - bg);
        const r = o.fermi === false ? nI : net / 2 + Math.sqrt((net * net) / 4 + nI * nI);
        const mob = xs[j] < aDepth ? 0 : c[j] > 0 ? act / c[j] : 1;
        Dv[j] = DP.D(dop, T, r / nI) * (1 + S) * mob;
      }
      const Dmean = DP.D(dop, T);
      Dt += Dmean * dt; DtTED += Dmean * S * dt;
      // 암시적 단계 (필요하면 쪼갠다)
      const maxD = Dv.reduce((s, v) => Math.max(s, v), 0);
      const nsub = Math.min(200, Math.max(1, Math.ceil((maxD * dt) / (dx * dx) / 50)));
      const h = dt / nsub;
      for (let sI = 0; sI < nsub; sI++) {
        for (let j = 0; j < n; j++) {
          const Dm = j > 0 ? 0.5 * (Dv[j] + Dv[j - 1]) : 0, Dp = j < n - 1 ? 0.5 * (Dv[j] + Dv[j + 1]) : 0;
          const rm = (Dm * h) / (dx * dx), rp = (Dp * h) / (dx * dx);
          a[j] = -rm; cc[j] = -rp; b[j] = 1 + rm + rp; d[j] = c[j];
        }
        // 토마스 알고리즘
        for (let j = 1; j < n; j++) { const w = a[j] / b[j - 1]; b[j] -= w * cc[j - 1]; d[j] -= w * d[j - 1]; }
        c[n - 1] = d[n - 1] / b[n - 1];
        for (let j = n - 2; j >= 0; j--) c[j] = (d[j] - cc[j] * c[j + 1]) / b[j];
      }
    }
    // 용융 레이저: 녹은 깊이 안을 고르게 섞고 거의 전부 활성
    if (o.melt > 0) {
      const md = o.melt; let tot = 0, cnt = 0;
      for (let j = 0; j < n; j++) if (xs[j] <= md) { tot += c[j]; cnt++; }
      const avg = tot / Math.max(1, cnt);
      for (let j = 0; j < n; j++) if (xs[j] <= md) c[j] = avg * (0.9 + 0.2 * (xs[j] / md));
      Lmeta = Math.max(Lmeta, 1.5e21);
    }
    const cap = Math.max(L, Lmeta);
    const act = new Float64Array(n);
    for (let j = 0; j < n; j++) act[j] = (amorph > 0 && regrown < 1 && xs[j] < amorph * (1 - regrown)) ? 0 : Math.min(c[j], (amorph > 0 && xs[j] < amorph && Lmeta > 0) ? Math.max(Lmeta, L) : L);
    const xj = DP.junction(xs, c, bg);
    const Rs = DP.sheet(xs, act, bg, dop, xj);
    let ad = 0, cd = 0; for (let j = 0; j < n; j++) { ad += act[j] * dx; cd += c[j] * dx; }
    return { c, a: act, xj, Rs, Dt, DtTED, active: ad, chem: cd, L: cap, regrown };
  };
  DP.sperVelocity = (tc) => 3.07e15 * Math.exp(-2.68 / (kB * K(tc))); // nm/s, 도핑하지 않은 (100) Si의 올슨-로스 식 (600 °C에서 약 1 nm/s)
  DP.metastable = (dop) => ({ B: 3e20, P: 6e20, As: 5e20, Sb: 3e20, In: 1e20 }[dop] || 3e20);
  DP.actTau = (tc) => 0.05 * Math.exp((4.5 / kB) * (1 / K(tc) - 1 / K(1000)));
  DP.deactTau = (tc) => 30 * Math.exp((3.2 / kB) * (1 / K(tc) - 1 / K(900)));
  DP.tedTau = (tc) => 0.8 * Math.exp((3.5 / kB) * (1 / K(tc) - 1 / K(1000)));
  DP.tedS0 = (tc, dose) => 1 * Math.min(10, dose / 1e14) * Math.exp((1.5 / kB) * (1 / K(tc) - 1 / K(1000)));

  /** 접합 깊이: 화학 농도가 배경과 같아지는 가장 깊은 지점 (nm). 배경 0이면 1e18 기준 */
  DP.junction = function (xs, c, bg) {
    const ref = bg > 0 ? bg : 1e18;
    let pk = 0; for (let j = 0; j < xs.length; j++) if (c[j] > c[pk]) pk = j;
    if (c[pk] < ref) return 0;
    for (let j = pk; j < xs.length - 1; j++) if (c[j] >= ref && c[j + 1] < ref) { const t = Math.log(c[j] / ref) / Math.log(c[j] / c[j + 1]); return xs[j] + t * (xs[j + 1] - xs[j]); }
    return xs[xs.length - 1];
  };

  /* ------------------------------------------------------------ 이동도·면저항 */
  // 코헤이-토머스형 이동도 (cm²/V·s), 300 K. 마세티 계열 대표 파라미터
  DP.MOB = { n: { min: 68.5, max: 1414, Nref: 9.2e16, al: 0.711 }, p: { min: 44.9, max: 470.5, Nref: 2.23e17, al: 0.719 } };
  DP.mobility = function (type, Ntot) { const m = DP.MOB[type === "n" ? "n" : "p"]; return m.min + (m.max - m.min) / (1 + Math.pow(Ntot / m.Nref, m.al)); };
  DP.resistivity = function (type, N) { return 1 / (q * N * DP.mobility(type, N)); };
  /** 면저항 (Ω/□): Rs = 1 / (q ∫₀^xj μ(N) N_act dx). xs nm, act cm⁻³ */
  DP.sheet = function (xs, act, bg, dop, xj) {
    const type = (DP.DIFF[dop] || {}).type || (DP.ION[dop] || {}).type || "p";
    const dx = (xs[1] - xs[0]) * 1e-7;
    let g = 0;
    for (let j = 0; j < xs.length; j++) {
      if (xj > 0 && xs[j] > xj) break;
      const net = act[j] - (bg || 0);
      if (net <= 0) continue;
      g += q * DP.mobility(type, act[j] + (bg || 0)) * net * dx;
    }
    return g > 0 ? 1 / g : Infinity;
  };
  /** 누적 컨덕턴스 (면저항 계산기 그림용): [[x, Σσdx]] */
  DP.sheetCumulative = function (xs, act, bg, type) {
    const dx = (xs[1] - xs[0]) * 1e-7; let g = 0; const out = [];
    for (let j = 0; j < xs.length; j++) { const net = act[j] - (bg || 0); if (net > 0) g += q * DP.mobility(type, act[j] + (bg || 0)) * net * dx; out.push([xs[j], g]); }
    return out;
  };

  /* ------------------------------------------------------------ 빔 물리 */
  /** 자기 강성으로 구한 궤도 반지름 (m): r = √(2 m V / q) / B. m은 amu, V는 V(전하 상태 z) */
  DP.rigidity = function (mAmu, V, z = 1) { return Math.sqrt(2 * mAmu * amu * z * q * V) / (z * q); }; // T·m (전하 z, 추출 전압 V → 에너지 zqV)
  DP.radius = function (mAmu, V, B, z = 1) { return DP.rigidity(mAmu, V, z) / B; };
  /** 이온 속도 (m/s), 에너지 keV, 질량 amu */
  DP.speed = (Ek, mAmu) => Math.sqrt((2 * Ek * 1000 * q) / (mAmu * amu));
  /** 일반화 퍼비언스 K = qI / (2π ε0 m v³) */
  DP.perveance = function (Ik, mAmu, I) { const v = DP.speed(Ik, mAmu); return (q * I) / (2 * Math.PI * eps0 * mAmu * amu * v * v * v); };
  /** 차일드-랭뮤어 최대 전류 밀도 (A/m²) */
  DP.childLangmuir = function (mAmu, V, d) { return ((4 * eps0) / 9) * Math.sqrt((2 * q) / (mAmu * amu)) * Math.pow(V, 1.5) / (d * d); };

  /* ------------------------------------------------------------ 2차원 단면 (공정 흐름) */
  /**
   * 단면 격자. W(nm) × H(nm), 셀 nx × ny. 깊이 0은 실리콘 표면.
   * 각 주입은 별도의 장(field)으로 저장해 열처리 때 종마다 따로 번지게 한다.
   */
  DP.xsec = function (o) {
    const W = o.W || 1600, H = o.H || 1200, nx = o.nx || 320, ny = o.ny || 240;
    const S = { W, H, nx, ny, fields: [], masks: [], features: [], log: [] };
    // 세로 격자: 얕은 곳을 촘촘히 (제곱 간격)
    S.ys = new Float64Array(ny); for (let j = 0; j < ny; j++) S.ys[j] = H * Math.pow(j / (ny - 1), 2);
    S.xs = new Float64Array(nx); for (let i = 0; i < nx; i++) S.xs[i] = (W * (i + 0.5)) / nx;
    S.background = o.background || { type: "p", N: 1e15 };
    /** 구조물: {kind:"sti"|"gate"|"spacer"|"pr", x0, x1, h(높이, nm), depth(sti 깊이)} */
    S.add = function (f) { S.features.push(f); return S; };
    S.remove = function (kind) { S.features = S.features.filter((f) => f.kind !== kind); return S; };
    /** 열 x에서 빔이 실리콘에 닿기 전에 지나는 막(실리콘 환산 두께 nm)과 막힘 여부 */
    function stopping(x, tiltDeg) {
      const t = Math.tan((tiltDeg * Math.PI) / 180);
      let thick = 0;
      for (const f of S.features) {
        if (f.kind === "sti") continue;
        // 기울어진 빔이 높이 h인 구조물의 그림자: 위에서 내려오는 선이 [x0, x1]을 지나는지
        const h = f.h, k = f.kind === "pr" ? 0.6 : f.kind === "spacer" ? 1.4 : 1.0;
        // 높이 z(0~h)에서 빔의 x 위치 = x - t*z (빔이 +x로 진행, 즉 왼쪽 위에서 들어온다고 할 때 t>0)
        const xa = x - t * h, xb = x; // 구조물 꼭대기와 바닥에서의 x
        const lo = Math.min(xa, xb), hi = Math.max(xa, xb);
        if (hi < f.x0 || lo > f.x1) continue;
        // 겹치는 경로 길이(세로 환산)
        let frac;
        if (Math.abs(t) < 1e-6) frac = 1; else { const a = Math.max(lo, f.x0), b = Math.min(hi, f.x1); frac = (b - a) / (hi - lo); }
        thick += h * frac * k / Math.cos(Math.atan(t));
      }
      return thick;
    }
    /** 주입: {ion, E, dose, tilt, quad(true면 ±tilt 반씩), label} */
    S.implant = function (im) {
      const ion = im.ion, r = DP.range(ion, im.E);
      const type = DP.ION[ion].type;
      const fld = new Float32Array(nx * ny);
      const parts = im.quad ? [[im.tilt, 0.25], [-im.tilt, 0.25], [0, 0.5 * Math.cos((im.tilt * Math.PI) / 180)]] : [[im.tilt || 0, 1]];
      // 측면 퍼짐을 위해 열마다 표면 투과율을 계산한 뒤 가로로 번지게 한다
      for (const [tl, w] of parts) {
        const tt = Math.tan((tl * Math.PI) / 180);
        const cosT = Math.cos((tl * Math.PI) / 180);
        const RpV = r.Rp * cosT, dRpV = r.dRp;
        for (let i = 0; i < nx; i++) {
          const x0 = S.xs[i];
          // STI 산화막 위: 산화막 속에서 멈춘다고 본다(트렌치 깊이 > 주입 깊이인 경우만 정확)
          let sti = null; for (const f of S.features) if (f.kind === "sti" && x0 >= f.x0 && x0 <= f.x1) sti = f;
          for (let j = 0; j < ny; j++) {
            const z = S.ys[j];
            // 깊이 z에 도달하는 이온의 표면 입사 위치: x = x0 - z*tan
            const xs0 = x0 - z * tt;
            const blk = stopping(xs0, tl);
            const zEff = z + blk + (sti && z < sti.depth ? 1e9 : 0) + (sti ? sti.depth * 0.1 : 0);
            if (sti && z < sti.depth) continue;
            const u = (zEff - RpV) / dRpV;
            if (u > 8) continue;
            fld[j * nx + i] += w * im.dose * Math.exp(-0.5 * u * u) / (Math.sqrt(2 * Math.PI) * dRpV * 1e-7);
          }
        }
      }
      // 측면 번짐 (가로 가우시안, 폭 dRl)
      blurX(fld, nx, ny, r.dRl / (W / nx));
      S.fields.push({ ion, type, carrier: ion === "BF2" ? "B" : ion, f: fld, label: im.label, step: S.log.length });
      S.log.push({ kind: "implant", im });
      return S;
    };
    /** 열처리: 종마다 √(2Dt)만큼 2차원 가우시안 번짐 */
    S.anneal = function (hist, label) {
      S.fields.forEach((F) => {
        if (DP.ION[F.ion].type === "0") return;
        const Dt = DP.budget(F.carrier, hist);
        const L = Math.sqrt(2 * Dt) * 1e7; // nm
        if (L < 0.5) return;
        blurX(F.f, nx, ny, L / (W / nx));
        blurY(F.f, nx, ny, S.ys, L);
      });
      S.log.push({ kind: "anneal", label });
      return S;
    };
    S.net = function (i, j) {
      let nd = 0, na = 0;
      if (S.background.type === "p") na += S.background.N; else nd += S.background.N;
      for (const F of S.fields) { const v = F.f[j * nx + i]; if (F.type === "n") nd += v; else if (F.type === "p") na += v; }
      return nd - na;
    };
    S.column = function (x) { const i = clamp(Math.floor((x / W) * nx), 0, nx - 1); const out = []; for (let j = 0; j < ny; j++) out.push([S.ys[j], S.net(i, j)]); return out; };
    S.clone = function () {
      const T = DP.xsec({ W, H, nx, ny, background: S.background });
      T.features = S.features.map((f) => Object.assign({}, f));
      T.fields = S.fields.map((F) => Object.assign({}, F, { f: Float32Array.from(F.f) }));
      T.log = S.log.slice();
      return T;
    };
    return S;
  };
  function blurX(f, nx, ny, sig) {
    if (sig < 0.3) return;
    const R = Math.ceil(3 * sig), k = []; let ks = 0;
    for (let d = -R; d <= R; d++) { const v = Math.exp(-0.5 * (d / sig) ** 2); k.push(v); ks += v; }
    const row = new Float32Array(nx);
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) { let s = 0; for (let d = -R; d <= R; d++) { const ii = Math.min(nx - 1, Math.max(0, i + d)); s += f[j * nx + ii] * k[d + R]; } row[i] = s / ks; }
      f.set(row, j * nx);
    }
  }
  function blurY(f, nx, ny, ys, L) {
    // 깊이 격자가 고르지 않으므로 직접 가중 합. 표면은 반사 경계
    const col = new Float32Array(ny);
    const W = [];
    for (let j = 0; j < ny; j++) {
      const w = []; let s = 0;
      for (let k = 0; k < ny; k++) {
        const dy = k > 0 ? (ys[Math.min(ny - 1, k + 1)] - ys[k - 1]) / 2 : (ys[1] - ys[0]) / 2;
        const v = (Math.exp(-0.5 * ((ys[k] - ys[j]) / L) ** 2) + Math.exp(-0.5 * ((ys[k] + ys[j]) / L) ** 2)) * dy;
        w.push(v); s += v;
      }
      W.push(w.map((v) => v / s));
    }
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) { let s = 0; const w = W[j]; for (let k = 0; k < ny; k++) s += f[k * nx + i] * w[k]; col[j] = s; }
      for (let j = 0; j < ny; j++) f[j * nx + i] = col[j];
    }
  }

  /* ------------------------------------------------------------ 표시 도우미 */
  /** 농도 표기: 2.3e18 → "2.3×10¹⁸" */
  DP.sci = function (x, d = 2) {
    if (!isFinite(x) || x <= 0) return "—";
    const e = Math.floor(Math.log10(x)), m = x / Math.pow(10, e);
    const sup = String(e).replace(/-/g, "⁻").replace(/\d/g, (c) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[c]);
    const ms = Number(m.toPrecision(d));
    if (ms >= 10) return "10" + String(e + 1).replace(/-/g, "⁻").replace(/\d/g, (c) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[c]);
    return (ms === 1 ? "" : ms + "×") + "10" + sup;
  };
  /** 도펀트 형 색 */
  DP.typeColor = function (type) { const c = (n) => (window.getComputedStyle ? getComputedStyle(document.documentElement).getPropertyValue(n).trim() : "#888"); return type === "n" ? c("--n-type") : type === "p" ? c("--p-type") : c("--text-dim"); };
  DP.MAT = { si: "#8f99aa", ox: "#bcd8f0", nit: "#e2b05a", poly: "#c0604a", pr: "#e2648a" };
})();
